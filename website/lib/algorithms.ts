import type { Nurse, ScheduleResult } from "./schedule-context";
import { assertNurseCount, readApiErrorMessage } from "./api-errors";
import { WEB_RUNNER_CONFIG } from "./runner-config";

export interface TabuProgressUpdate {
  iteration?: number;
  currentScore?: number;
  bestScore?: number;
  tabuSize?: number;
  stagnation?: number;
}

function apiUrl(path: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

async function readJsonOrThrow(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(
      response.ok
        ? "Server returned invalid JSON."
        : `Request failed (${response.status}). ${text.slice(0, 200)}`
    );
  }
}

async function postAlgorithm(
  body: Record<string, unknown>,
  label: string,
  signal?: AbortSignal
): Promise<ScheduleResult> {
  const nurses = body.nurses as Nurse[];
  assertNurseCount(nurses);

  const response = await fetch(apiUrl("/api/run-algorithm"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

  const payload = (await response.json()) as ScheduleResult;
  if (!payload?.schedule || !Array.isArray(payload.schedule)) {
    throw new Error(`${label} returned an invalid schedule payload.`);
  }
  return payload;
}

export async function runSimulatedAnnealing(
  nurses: Nurse[],
  signal?: AbortSignal
): Promise<ScheduleResult> {
  return postAlgorithm(
    {
      algorithm: "sa",
      nurses,
      iterations: WEB_RUNNER_CONFIG.sa.iterations,
      seed: WEB_RUNNER_CONFIG.sa.seed,
    },
    "Simulated Annealing",
    signal
  );
}

export async function runTabuSearch(
  nurses: Nurse[],
  signal?: AbortSignal
): Promise<ScheduleResult> {
  return postAlgorithm(
    {
      algorithm: "tabu",
      nurses,
      seed: WEB_RUNNER_CONFIG.tabu.seed,
      iterations: WEB_RUNNER_CONFIG.tabu.iterations,
      maxNoImprove: WEB_RUNNER_CONFIG.tabu.maxNoImprove,
    },
    "Tabu Search",
    signal
  );
}

export async function runGreedy(nurses: Nurse[], signal?: AbortSignal): Promise<ScheduleResult> {
  return postAlgorithm({ algorithm: "greedy", nurses }, "Greedy", signal);
}

export async function runCSP(nurses: Nurse[], signal?: AbortSignal): Promise<ScheduleResult> {
  return postAlgorithm({ algorithm: "csp", nurses }, "CSP", signal);
}

export interface BatchRunResult {
  algorithm: string;
  runs: {
    score: number;
    execution_time: number;
    hard_violations: number;
  }[];
}

export async function runBatchAlgorithm(
  algorithm: string,
  nurses: Nurse[],
  batchRuns: number,
  signal?: AbortSignal
): Promise<BatchRunResult> {
  assertNurseCount(nurses);
  const response = await fetch(apiUrl("/api/run-algorithm"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ algorithm, nurses, batchRuns }),
    signal,
  });
  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }
  return response.json();
}

const DEFAULT_COMPARE_ORDER = ["sa", "tabu", "greedy", "csp"] as const;

/** One round-trip; server runs each algorithm sequentially (stable on Windows). */
export async function runAllSchedulers(
  nurses: Nurse[],
  algorithmIds: readonly string[] = DEFAULT_COMPARE_ORDER,
  signal?: AbortSignal
): Promise<{
  results: ScheduleResult[];
  errors?: { algorithm: string; message: string }[];
}> {
  assertNurseCount(nurses);
  const response = await fetch(apiUrl("/api/run-algorithm"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nurses, algorithms: [...algorithmIds] }),
    signal,
  });
  const payload = await readJsonOrThrow(response);
  if (!response.ok) {
    throw new Error(String(payload.error || "Failed to run schedulers"));
  }
  return {
    results: (payload.results || []) as ScheduleResult[],
    errors: payload.errors as { algorithm: string; message: string }[] | undefined,
  };
}

export interface FullBatchAnalysisResponse {
  results: BatchRunResult[];
  errors?: { algorithm: string; message: string }[];
}

export async function runFullBatchAnalysis(
  nurses: Nurse[],
  batchRuns: number
): Promise<FullBatchAnalysisResponse> {
  assertNurseCount(nurses);
  let response: Response;
  try {
    response = await fetch(apiUrl("/api/run-algorithm"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nurses, batchAnalysis: true, batchRuns, seed: 1 }),
    });
  } catch (err) {
    const hint =
      typeof window !== "undefined" && window.location?.protocol === "file:"
        ? " Open the app at http://localhost:3000 (npm run dev), not as a file:// page."
        : " Check that `npm run dev` is running and try again.";
    throw new Error(`Could not reach the scheduling API (network error).${hint}`, {
      cause: err,
    });
  }
  const payload = await readJsonOrThrow(response);
  if (!response.ok) {
    throw new Error(String(payload.error || "Batch analysis failed"));
  }
  return {
    results: (payload.results || []) as BatchRunResult[],
    errors: payload.errors as { algorithm: string; message: string }[] | undefined,
  };
}
