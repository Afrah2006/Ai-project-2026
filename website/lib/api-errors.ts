import type { Nurse } from "./schedule-context";

export const REQUIRED_NURSE_COUNT = 25;

export function assertNurseCount(nurses: Nurse[]): void {
  if (nurses.length !== REQUIRED_NURSE_COUNT) {
    throw new Error(
      `Scheduling requires exactly ${REQUIRED_NURSE_COUNT} nurses (received ${nurses.length}). ` +
        "Use the default dataset or upload a CSV with 25 nurse rows."
    );
  }
}

export async function readApiErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    const base = String(payload.error || `Request failed (${response.status})`);
    const details = payload.details;
    if (details === undefined || details === null || details === "") {
      return base;
    }
    if (typeof details === "string") {
      return `${base}: ${details}`;
    }
    return `${base}: ${JSON.stringify(details)}`;
  } catch {
    return text
      ? `Request failed (${response.status}): ${text.slice(0, 500)}`
      : `Request failed (${response.status})`;
  }
}
