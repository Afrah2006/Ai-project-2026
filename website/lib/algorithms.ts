import type { Nurse, ScheduleResult } from "./schedule-context";
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

export async function runSimulatedAnnealing(nurses: Nurse[], signal?: AbortSignal): Promise<ScheduleResult> {
  const response = await fetch(apiUrl("/api/run-algorithm"), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      algorithm: "sa",
      nurses,
      iterations: WEB_RUNNER_CONFIG.sa.iterations,
    }),
    signal,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to run Simulated Annealing');
  }
  return response.json();
}

export async function runTabuSearch(
  nurses: Nurse[],
  signal?: AbortSignal
): Promise<ScheduleResult> {
  const response = await fetch(apiUrl("/api/run-algorithm"), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      algorithm: "tabu",
      nurses,
      seed: WEB_RUNNER_CONFIG.tabu.seed,
      iterations: WEB_RUNNER_CONFIG.tabu.iterations,
      maxNoImprove: WEB_RUNNER_CONFIG.tabu.maxNoImprove,
    }),
    signal,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to run Tabu Search');
  }
  return response.json();
}

export async function runGreedy(nurses: Nurse[], signal?: AbortSignal): Promise<ScheduleResult> {
  const response = await fetch(apiUrl("/api/run-algorithm"), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ algorithm: 'greedy', nurses }),
    signal,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to run Greedy Algorithm');
  }
  return response.json();
}

export async function runCSP(nurses: Nurse[], signal?: AbortSignal): Promise<ScheduleResult> {
  const response = await fetch(apiUrl("/api/run-algorithm"), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ algorithm: 'csp', nurses }),
    signal,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to run CSP');
  }
  return response.json();
}

export interface BatchRunResult {
  algorithm: string;
  runs: {
    score: number;
    execution_time: number;
    hard_violations: number;
  }[];
}

export async function runBatchAlgorithm(algorithm: string, nurses: Nurse[], batchRuns: number, signal?: AbortSignal): Promise<BatchRunResult> {
  const response = await fetch(apiUrl("/api/run-algorithm"), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ algorithm, nurses, batchRuns }),
    signal,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to run batch analysis for ${algorithm}`);
  }
  return response.json();
}

const DEFAULT_COMPARE_ORDER = ['sa', 'tabu', 'greedy', 'csp'] as const;

/** One round-trip: same Python `runner.py` as single runs, executed in parallel on the server. */
export async function runAllSchedulers(
  nurses: Nurse[],
  algorithmIds: readonly string[] = DEFAULT_COMPARE_ORDER,
  signal?: AbortSignal
): Promise<{
  results: ScheduleResult[];
  errors?: { algorithm: string; message: string }[];
}> {
  const response = await fetch(apiUrl("/api/run-algorithm"), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nurses, algorithms: [...algorithmIds] }),
    signal,
  });
  const payload = await readJsonOrThrow(response);
  if (!response.ok) {
    throw new Error(String(payload.error || 'Failed to run schedulers'));
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

/**
 * One round-trip for statistical tab: greedy → CSP → tabu → SA on the server
 * (sequential Python workers — stable on Windows; slower wall-clock than parallel).
 */
export async function runFullBatchAnalysis(
  nurses: Nurse[],
  batchRuns: number
): Promise<FullBatchAnalysisResponse> {
  let response: Response;
  try {
    response = await fetch(apiUrl("/api/run-algorithm"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nurses, batchAnalysis: true, batchRuns }),
    });
  } catch (err) {
    const hint =
      typeof window !== "undefined" && window.location?.protocol === "file:"
        ? " Open the app at http://localhost:3000 (npm run dev), not as a file:// page."
        : " Check that `npm run dev` is running and try again.";
    throw new Error(
      `Could not reach the scheduling API (network error).${hint}`,
      { cause: err }
    );
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
