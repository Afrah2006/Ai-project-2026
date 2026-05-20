import type { AlgorithmRunBody } from "./schedule-types";
import type { Nurse } from "./schedule-context";

export function nursesToCsv(nurses: Nurse[]): string {
  let csvContent =
    "ID,LastName,FirstName,DateOfBirth,Age,Gender,seniority,day_off1,day_off2\n";
  nurses.forEach((nurse, index) => {
    const id = index + 1;
    const nameParts = nurse.name.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Unknown";
    const seniority = nurse.isSenior ? "senior" : "junior";
    const dayOff1 = nurse.dayOffRequests[0] ?? 0;
    const dayOff2 = nurse.dayOffRequests[1] ?? 0;
    csvContent += `${id},${lastName},${firstName},01/01/1990,30,F,${seniority},${dayOff1},${dayOff2}\n`;
  });
  return csvContent;
}

export function parseJsonFromStdout(stdout: string): unknown {
  const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (!line) continue;
    const first = line[0];
    if (first !== "{" && first !== "[") continue;
    try {
      return JSON.parse(line);
    } catch {
      // try earlier lines
    }
  }
  throw new Error("No valid JSON line found in stdout");
}

function vercelPythonUrl(host: string | null): string {
  if (host) {
    const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
    return `${protocol}://${host}/api/py/run-algorithm`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/py/run-algorithm`;
  }
  return "http://127.0.0.1:3000/api/py/run-algorithm";
}

/** On Vercel, algorithms run in the Python serverless function. */
export async function forwardToVercelPython(
  body: AlgorithmRunBody,
  host: string | null,
  signal?: AbortSignal
): Promise<Response> {
  const response = await fetch(vercelPythonUrl(host), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const payload = await response.json();
  return Response.json(payload, { status: response.status });
}
