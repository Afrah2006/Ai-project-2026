import type { Nurse, ShiftType } from "./schedule-context";

export interface ScheduleHistoryEntry {
  iteration?: number;
  schedule: ShiftType[][];
}

export interface AlgorithmRunBody {
  nurses: Nurse[];
  algorithm?: string;
  algorithms?: string[];
  batchAnalysis?: boolean;
  batchRuns?: number;
  seed?: number;
  iterations?: number;
  maxNoImprove?: number;
  progressStream?: boolean;
}
