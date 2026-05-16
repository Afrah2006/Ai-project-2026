import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { randomUUID } from "crypto";
import { killProcessTree } from "@/lib/process-kill";

const PYTHON = process.platform === "win32" ? "python" : "python3";
const RUNNER_PATH = path.join(process.cwd(), "runner.py");

function nursesToCsv(nurses: Record<string, unknown>[]): string {
  let csv =
    "ID,LastName,FirstName,DateOfBirth,Age,Gender,seniority,day_off1,day_off2\n";
  nurses.forEach((nurse, index) => {
    const id = index + 1;
    const name = String(nurse.name ?? "");
    const nameParts = name.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Unknown";
    const seniority = nurse.isSenior ? "senior" : "junior";
    const reqs = (nurse.dayOffRequests as number[]) || [];
    csv += `${id},${lastName},${firstName},01/01/1990,30,F,${seniority},${reqs[0] ?? 0},${reqs[1] ?? 0}\n`;
  });
  return csv;
}

type SpawnOpts = {
  args: string[];
  signal?: AbortSignal;
  onLine?: (line: string) => void;
};

async function spawnPython({ args, signal, onLine }: SpawnOpts): Promise<{
  code: number | null;
  cancelled: boolean;
  stdout: string;
  lastJson: Record<string, unknown> | null;
}> {
  const cancelFile = path.join(os.tmpdir(), `cancel_${randomUUID()}.flag`);
  const fullArgs = [...args, "--cancel-file", cancelFile];
  let stdout = "";
  let lastJson: Record<string, unknown> | null = null;

  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON, fullArgs, { stdio: ["ignore", "pipe", "pipe"] });
    let buf = "";

    const cleanup = () => {
      try {
        if (fs.existsSync(cancelFile)) fs.unlinkSync(cancelFile);
      } catch {
        /* ignore */
      }
    };

    const requestCancel = () => {
      try {
        fs.writeFileSync(cancelFile, "1");
      } catch {
        /* ignore */
      }
      void killProcessTree(child);
    };

    if (signal?.aborted) requestCancel();
    else signal?.addEventListener("abort", requestCancel, { once: true });

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      buf += text;
      const parts = buf.split("\n");
      buf = parts.pop() || "";
      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        onLine?.(trimmed);
        if (trimmed.startsWith("{")) {
          try {
            lastJson = JSON.parse(trimmed) as Record<string, unknown>;
          } catch {
            /* ignore */
          }
        }
      }
    });

    child.stderr?.on("data", (c: Buffer) => console.error(`Python: ${c.toString()}`));

    child.on("error", (err) => {
      cleanup();
      reject(err);
    });

    child.on("close", (code) => {
      if (buf.trim()) {
        onLine?.(buf.trim());
        if (buf.trim().startsWith("{")) {
          try {
            lastJson = JSON.parse(buf.trim()) as Record<string, unknown>;
          } catch {
            /* ignore */
          }
        }
      }
      const cancelled = signal?.aborted === true;
      cleanup();
      resolve({ code, cancelled, stdout, lastJson });
    });
  });
}

function sseStream(
  run: (enqueue: (obj: unknown) => void, signal?: AbortSignal) => Promise<void>,
  request: Request
): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      async start(controller) {
        const enqueue = (obj: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        try {
          await run(enqueue, request.signal);
        } catch (err) {
          if (request.signal.aborted) {
            enqueue({ type: "cancelled", message: "Run cancelled" });
          } else {
            enqueue({
              error: err instanceof Error ? err.message : "Execution failed",
            });
          }
        } finally {
          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const nurses = body.nurses;
    if (!nurses?.length) {
      return NextResponse.json({ error: "Missing nurses data" }, { status: 400 });
    }

    const tempCsv = path.join(os.tmpdir(), `nurses_${randomUUID()}.csv`);
    fs.writeFileSync(tempCsv, nursesToCsv(nurses));
    const cleanupCsv = () => {
      if (fs.existsSync(tempCsv)) fs.unlinkSync(tempCsv);
    };
    request.signal.addEventListener("abort", cleanupCsv, { once: true });

    if (body.batchAnalysis === true) {
      const batchRuns = Number(body.batchRuns) || 0;
      if (batchRuns < 2 || batchRuns > 50) {
        cleanupCsv();
        return NextResponse.json(
          { error: "batchRuns must be between 2 and 50" },
          { status: 400 }
        );
      }

      return sseStream(async (enqueue, signal) => {
        const order = ["greedy", "csp", "tabu", "sa"] as const;
        const results: unknown[] = [];
        const errors: { algorithm: string; message: string }[] = [];

        for (const alg of order) {
          if (signal?.aborted) break;
          enqueue({ type: "phase", phase: "algorithm_start", algorithm: alg });

          const { cancelled, lastJson, code } = await spawnPython({
            args: [
              RUNNER_PATH,
              "--algorithm",
              alg,
              "--data",
              tempCsv,
              "--batch-runs",
              String(batchRuns),
              "--stream",
            ],
            signal,
            onLine: (line) => {
              try {
                enqueue(JSON.parse(line));
              } catch {
                /* ignore */
              }
            },
          });

          if (cancelled) {
            enqueue({ type: "cancelled", partialResults: results });
            break;
          }

          if (lastJson?.runs) {
            results.push(lastJson);
          } else {
            errors.push({
              algorithm: alg,
              message: code === 130 ? "Cancelled" : "Invalid batch output",
            });
          }
        }

        cleanupCsv();
        if (!signal?.aborted) {
          enqueue({ type: "done", results, errors: errors.length ? errors : undefined });
        }
      }, request);
    }

    const multiAlgorithms = body.algorithms as string[] | undefined;
    if (multiAlgorithms?.length) {
      const allowed = new Set(["csp", "greedy", "tabu", "sa"]);
      for (const a of multiAlgorithms) {
        if (!allowed.has(a)) {
          cleanupCsv();
          return NextResponse.json({ error: `Invalid algorithm: ${a}` }, { status: 400 });
        }
      }

      return sseStream(async (enqueue, signal) => {
        const results: unknown[] = [];
        const errors: { algorithm: string; message: string }[] = [];

        for (const alg of multiAlgorithms) {
          if (signal?.aborted) break;
          enqueue({ type: "phase", phase: "algorithm_start", algorithm: alg });

          const { cancelled, lastJson, code } = await spawnPython({
            args: [RUNNER_PATH, "--algorithm", alg, "--data", tempCsv, "--stream"],
            signal,
            onLine: (line) => {
              try {
                enqueue(JSON.parse(line));
              } catch {
                /* ignore */
              }
            },
          });

          if (cancelled) {
            if (lastJson?.schedule) results.push(lastJson);
            enqueue({ type: "cancelled", partialResults: results });
            break;
          }

          if (lastJson?.schedule) {
            results.push(lastJson);
          } else if (lastJson?.error) {
            errors.push({ algorithm: alg, message: String(lastJson.error) });
          } else {
            errors.push({ algorithm: alg, message: `Exit code ${code}` });
          }
        }

        cleanupCsv();
        if (!signal?.aborted) {
          enqueue({ type: "done", results, errors: errors.length ? errors : undefined });
        }
      }, request);
    }

    const { algorithm } = body;
    if (!algorithm) {
      cleanupCsv();
      return NextResponse.json({ error: "Missing algorithm" }, { status: 400 });
    }

    return sseStream(async (enqueue, signal) => {
      const { cancelled, lastJson } = await spawnPython({
        args: [RUNNER_PATH, "--algorithm", algorithm, "--data", tempCsv, "--stream"],
        signal,
        onLine: (line) => {
          try {
            enqueue(JSON.parse(line));
          } catch {
            /* ignore */
          }
        },
      });

      cleanupCsv();

      if (cancelled && !lastJson?.schedule) {
        enqueue({ type: "cancelled", message: "Run cancelled before a schedule was produced" });
      } else if (cancelled && lastJson) {
        enqueue({ ...lastJson, cancelled: true });
      } else if (!lastJson?.schedule) {
        enqueue({ error: "Algorithm finished without returning a schedule" });
      }
    }, request);
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { error: "Internal server error", details: err.message },
      { status: 500 }
    );
  }
}
