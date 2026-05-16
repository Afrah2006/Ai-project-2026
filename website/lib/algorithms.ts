import type { Nurse, ScheduleResult, ShiftType, TraceSnapshot } from "./schedule-context";

function apiUrl(path: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
}

export interface AlgorithmOptions {
  signal?: AbortSignal;
  onProgress?: (data: Record<string, unknown>) => void;
  onTrace?: (trace: TraceSnapshot) => void;
}

export class AlgorithmCancelledError extends Error {
  partialResult: ScheduleResult | null;
  constructor(message: string, partial: ScheduleResult | null = null) {
    super(message);
    this.name = "AlgorithmCancelledError";
    this.partialResult = partial;
  }
}

function mapScheduleResult(
  data: Record<string, unknown>,
  convergenceData: { iteration: number; score: number }[]
): ScheduleResult {
  const result: ScheduleResult = {
    algorithm: String(data.algorithm ?? "Unknown"),
    schedule: (data.schedule as ShiftType[][]) ?? [],
    score: Number(data.score ?? 0),
    hardViolations: Number(data.hardViolations ?? 0),
    softViolations: Number(data.softViolations ?? 0),
    executionTime: Number(data.executionTime ?? 0),
    hoursPerNurse: (data.hoursPerNurse as number[]) ?? [],
    nightShiftsPerNurse: (data.nightShiftsPerNurse as number[]) ?? [],
    cancelled: Boolean(data.cancelled),
  };
  if (convergenceData.length > 0) result.convergenceData = convergenceData;
  return result;
}

async function consumeSse(
  response: Response,
  options?: AlgorithmOptions
): Promise<ScheduleResult | null> {
  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ScheduleResult | null = null;
  const convergenceData: { iteration: number; score: number }[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";

    for (const chunk of chunks) {
      const line = chunk.trim();
      if (!line.startsWith("data: ")) continue;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(line.slice(6)) as Record<string, unknown>;
      } catch {
        continue;
      }

      if (data.type === "cancelled") {
        if (result) {
          result.cancelled = true;
          return result;
        }
        throw new AlgorithmCancelledError(
          String(data.message ?? "Run cancelled"),
          null
        );
      }

      if (data.type === "progress" || data.type === "batch_progress") {
        options?.onProgress?.(data);
        const iter = data.iteration ?? data.day;
        const score = data.bestScore ?? data.currentScore ?? data.score;
        if (iter !== undefined && score !== undefined) {
          convergenceData.push({
            iteration: Number(iter),
            score: Number(score),
          });
        }
        continue;
      }

      if (data.type === "trace") {
        options?.onTrace?.(data as unknown as TraceSnapshot);
        if (data.score !== undefined) {
          convergenceData.push({
            iteration: Number(data.step ?? 0),
            score: Number(data.score),
          });
        }
        continue;
      }

      if (data.error) {
        throw new Error(String(data.error));
      }

      if (data.schedule) {
        result = mapScheduleResult(data, convergenceData);
      }
    }
  }

  return result;
}

async function runAlgorithmWithStream(
  algorithm: string,
  nurses: Nurse[],
  options?: AlgorithmOptions
): Promise<ScheduleResult> {
  const response = await fetch(apiUrl("/api/run-algorithm"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ algorithm, nurses }),
    signal: options?.signal,
  });

  if (!response.ok) {
    const text = await response.text();
    let msg = `Failed to run ${algorithm}`;
    try {
      const err = JSON.parse(text);
      msg = String(err.error || msg);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const result = await consumeSse(response, options);
  if (!result) {
    throw new Error("Algorithm finished without returning a schedule");
  }
  if (result.cancelled) {
    throw new AlgorithmCancelledError("Run cancelled", result);
  }
  return result;
}

export async function runSimulatedAnnealing(
  nurses: Nurse[],
  options?: AlgorithmOptions
): Promise<ScheduleResult> {
  return runAlgorithmWithStream("sa", nurses, options);
}

export async function runTabuSearch(
  nurses: Nurse[],
  options?: AlgorithmOptions
): Promise<ScheduleResult> {
  return runAlgorithmWithStream("tabu", nurses, options);
}

export async function runGreedy(
  nurses: Nurse[],
  options?: AlgorithmOptions
): Promise<ScheduleResult> {
  return runAlgorithmWithStream("greedy", nurses, options);
}

export async function runCSP(
  nurses: Nurse[],
  options?: AlgorithmOptions
): Promise<ScheduleResult> {
  return runAlgorithmWithStream("csp", nurses, options);
}

export interface BatchRunResult {
  algorithm: string;
  runs: {
    score: number;
    execution_time: number;
    hard_violations: number;
  }[];
}

async function consumeDoneEvent<T>(
  response: Response,
  options?: AlgorithmOptions
): Promise<T> {
  if (!response.body) throw new Error("No response body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let donePayload: T | null = null;
  const partialResults: unknown[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() || "";

    for (const chunk of chunks) {
      if (!chunk.trim().startsWith("data: ")) continue;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(chunk.trim().slice(6)) as Record<string, unknown>;
      } catch {
        continue;
      }

      if (data.type === "progress" || data.type === "batch_progress" || data.type === "phase") {
        options?.onProgress?.(data);
      }
      if (data.type === "trace") {
        options?.onTrace?.(data as unknown as TraceSnapshot);
      }
      if (data.type === "cancelled") {
        throw new AlgorithmCancelledError(
          String(data.message ?? "Run cancelled"),
          null
        );
      }
      if (data.type === "done") {
        donePayload = data as T;
      }
      if (data.partialResults) {
        partialResults.push(...(data.partialResults as unknown[]));
      }
    }
  }

  if (!donePayload) {
    if (partialResults.length) {
      return { results: partialResults } as T;
    }
    throw new Error("Stream ended without a result");
  }
  return donePayload;
}

const DEFAULT_COMPARE_ORDER = ["sa", "tabu", "greedy", "csp"] as const;

export async function runAllSchedulers(
  nurses: Nurse[],
  algorithmIds: readonly string[] = DEFAULT_COMPARE_ORDER,
  options?: AlgorithmOptions
): Promise<{
  results: ScheduleResult[];
  errors?: { algorithm: string; message: string }[];
  cancelled?: boolean;
}> {
  const response = await fetch(apiUrl("/api/run-algorithm"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nurses, algorithms: [...algorithmIds] }),
    signal: options?.signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text.slice(0, 200) || "Failed to run schedulers");
  }

  try {
    const payload = await consumeDoneEvent<{
      results: ScheduleResult[];
      errors?: { algorithm: string; message: string }[];
    }>(response, options);

    return {
      results: (payload.results || []).map((r) =>
        mapScheduleResult(r as unknown as Record<string, unknown>, [])
      ),
      errors: payload.errors,
    };
  } catch (e) {
    if (e instanceof AlgorithmCancelledError) {
      return { results: [], cancelled: true };
    }
    throw e;
  }
}

export interface FullBatchAnalysisResponse {
  results: BatchRunResult[];
  errors?: { algorithm: string; message: string }[];
  cancelled?: boolean;
}

export async function runFullBatchAnalysis(
  nurses: Nurse[],
  batchRuns: number,
  options?: AlgorithmOptions
): Promise<FullBatchAnalysisResponse> {
  let response: Response;
  try {
    response = await fetch(apiUrl("/api/run-algorithm"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nurses, batchAnalysis: true, batchRuns }),
      signal: options?.signal,
    });
  } catch (err) {
    const hint =
      typeof window !== "undefined" && window.location?.protocol === "file:"
        ? " Open the app at http://localhost:3000 (npm run dev)."
        : " Check that npm run dev is running.";
    throw new Error(`Could not reach the scheduling API.${hint}`, { cause: err });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text.slice(0, 200) || "Batch analysis failed");
  }

  try {
    const payload = await consumeDoneEvent<FullBatchAnalysisResponse>(response, options);
    return {
      results: payload.results || [],
      errors: payload.errors,
    };
  } catch (e) {
    if (e instanceof AlgorithmCancelledError) {
      return { results: [], cancelled: true };
    }
    throw e;
  }
}
