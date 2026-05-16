/**
 * Web runner defaults — keep in sync with WEB_* in website/runner.py
 * and tabu_* helpers in website/api/py/run-algorithm.py
 */
export const WEB_RUNNER_CONFIG = {
  tabu: {
    iterations: 10_000,
    maxNoImprove: 200,
    neighborsPerIteration: 60,
    seed: 1,
  },
  sa: {
    iterations: 1200,
  },
} as const;

/** Locale-style thousands for UI labels (e.g. 10 000). */
export function formatRunnerCount(n: number): string {
  return n.toLocaleString("en-US").replace(/,/g, " ");
}
