import { NextResponse } from 'next/server';
import { execFile, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { randomUUID } from 'crypto';
import type { AlgorithmRunBody } from '@/lib/schedule-types';
import {
  forwardToVercelPython,
  nursesToCsv,
  parseJsonFromStdout,
} from '@/lib/run-algorithm-backend';
import { WEB_RUNNER_CONFIG } from '@/lib/runner-config';

const TABU_WEB = WEB_RUNNER_CONFIG.tabu;
const SA_WEB = WEB_RUNNER_CONFIG.sa;

function tabuSeed(seed: number | undefined): number {
  return seed ?? TABU_WEB.seed;
}

function tabuIterations(iterations: number | undefined): number {
  return iterations ?? TABU_WEB.iterations;
}

function tabuMaxNoImprove(maxNoImprove: number | undefined): number {
  return maxNoImprove ?? TABU_WEB.maxNoImprove;
}

function saIterations(iterations: number | undefined): number | undefined {
  return iterations ?? SA_WEB.iterations;
}

/** Long Tabu/SA runs can exceed 15+ minutes; allow up to 1h on Node/Docker (Vercel caps lower). */
export const maxDuration = 3600;
export const dynamic = 'force-dynamic';

const PYTHON_ARGS = {
  maxBuffer: 1024 * 1024 * 50,
  timeout: 60 * 60 * 1000,
} as const;

async function runPythonAlgorithm(
  pythonExecutable: string,
  runnerPath: string,
  tempFilePath: string,
  algorithm: string,
  batchRuns: number,
  seed: number | undefined,
  iterations: number | undefined,
  maxNoImprove: number | undefined,
  checkpointPath?: string,
  signal?: AbortSignal
): Promise<{ stdout: string; stderr: string }> {
  const args = [runnerPath, '--algorithm', algorithm, '--data', tempFilePath];
  if (typeof seed === 'number') {
    args.push('--seed', seed.toString());
  }
  if (typeof iterations === 'number') {
    args.push('--iterations', iterations.toString());
  }
  if (batchRuns > 0) {
    args.push('--batch-runs', batchRuns.toString());
  }
  if (typeof maxNoImprove === 'number') {
    args.push('--max-no-improve', maxNoImprove.toString());
  }
  if (checkpointPath) {
    args.push('--checkpoint', checkpointPath);
  }

  return new Promise((resolve, reject) => {
    const child = execFile(pythonExecutable, args, PYTHON_ARGS, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve({ stdout, stderr });
    });

    const onAbort = () => {
      try {
        child.kill();
      } catch {
        // ignore
      }
      reject(new Error('Request aborted'));
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener('abort', onAbort, { once: true });
      }
    }
  });
}

function streamPythonAlgorithm(
  pythonExecutable: string,
  runnerPath: string,
  tempFilePath: string,
  algorithm: string,
  batchRuns: number,
  seed: number | undefined,
  iterations: number | undefined,
  maxNoImprove: number | undefined,
  checkpointPath: string | undefined,
  signal?: AbortSignal
): Response {
  const encoder = new TextEncoder();
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const args = [runnerPath, '--algorithm', algorithm, '--data', tempFilePath];
      if (typeof seed === 'number') {
        args.push('--seed', seed.toString());
      }
      if (typeof iterations === 'number') {
        args.push('--iterations', iterations.toString());
      }
      if (batchRuns > 0) {
        args.push('--batch-runs', batchRuns.toString());
      }
      if (typeof maxNoImprove === 'number') {
        args.push('--max-no-improve', maxNoImprove.toString());
      }
      if (checkpointPath) {
        args.push('--checkpoint', checkpointPath);
      }

      const child = spawn(pythonExecutable, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdoutBuffer = '';
      let stderrBuffer = '';

      const writeLine = (line: string) => {
        controller.enqueue(encoder.encode(`${line}\n`));
      };

      const flushStdout = () => {
        let newlineIndex = stdoutBuffer.indexOf('\n');
        while (newlineIndex !== -1) {
          const line = stdoutBuffer.slice(0, newlineIndex).replace(/\r$/, '');
          stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
          if (line.trim()) {
            writeLine(line);
          }
          newlineIndex = stdoutBuffer.indexOf('\n');
        }
      };

      const fail = (details: string) => {
        controller.enqueue(
          encoder.encode(JSON.stringify({ error: 'Algorithm execution failed', details }) + '\n')
        );
        cleanup();
        controller.close();
      };

      child.stdout.on('data', (chunk) => {
        stdoutBuffer += chunk.toString();
        flushStdout();
      });

      child.stdout.on('end', () => {
        if (stdoutBuffer.trim()) {
          writeLine(stdoutBuffer.trimEnd());
        }
        stdoutBuffer = '';
      });

      child.stderr.on('data', (chunk) => {
        stderrBuffer += chunk.toString();
      });

      child.on('error', (error) => {
        fail(error.message);
      });

      child.on('close', (code) => {
        if (code === 0) {
          cleanup();
          controller.close();
          return;
        }

        fail(stderrBuffer.trim().slice(0, 500) || `Process exited with code ${code}`);
      });

      const onAbort = () => {
        try {
          child.kill();
        } catch {
          // ignore kill errors during cancellation
        }
        cleanup();
        controller.error(new Error('Request aborted'));
      };

      if (signal) {
        if (signal.aborted) {
          onAbort();
        } else {
          signal.addEventListener('abort', onAbort, { once: true });
        }
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AlgorithmRunBody;
    const { nurses } = body;

    if (!nurses || !Array.isArray(nurses)) {
      return NextResponse.json({ error: 'Missing nurses data' }, { status: 400 });
    }
    if (nurses.length !== 25) {
      return NextResponse.json(
        {
          error: `Scheduling requires exactly 25 nurses (received ${nurses.length}).`,
        },
        { status: 400 }
      );
    }

    if (process.env.VERCEL) {
      return forwardToVercelPython(body, request.signal);
    }

    const tempDir = os.tmpdir();
    const runnerPath =
      process.env.RUNNER_PATH || path.join(process.cwd(), 'runner.py');
    const pythonExecutable =
      process.env.PYTHON_EXECUTABLE ||
      (process.platform === 'win32' ? 'python' : 'python3');
    const seed = typeof body.seed === 'number' ? body.seed : undefined;
    const iterations = typeof body.iterations === 'number' ? body.iterations : undefined;
    const maxNoImprove = typeof body.maxNoImprove === 'number' ? body.maxNoImprove : undefined;

    /**
     * Full batch statistical analysis: one request, one CSV.
     * Runs each algorithm sequentially (one Python process at a time). Parallel batch
     * workers often crash or drop the connection on Windows when CPU/RAM is saturated.
     */
    if (body.batchAnalysis === true) {
      const batchRuns = Number(body.batchRuns) || 0;
      if (batchRuns < 2 || batchRuns > 50) {
        return NextResponse.json(
          { error: 'batchRuns must be between 2 and 50 for batch analysis' },
          { status: 400 }
        );
      }
      const tempFilePath = path.join(tempDir, `nurses_${randomUUID()}.csv`);
      fs.writeFileSync(tempFilePath, nursesToCsv(nurses));
      const order = ['greedy', 'csp', 'tabu', 'sa'] as const;
      const results: unknown[] = [];
      const errors: { algorithm: string; message: string }[] = [];
      try {
        for (const alg of order) {
          try {
            const { stdout } = await runPythonAlgorithm(
              pythonExecutable,
              runnerPath,
              tempFilePath,
              alg,
              batchRuns,
              alg === 'tabu' ? tabuSeed(seed) : seed,
              alg === 'tabu' ? tabuIterations(iterations) : alg === 'sa' ? saIterations(iterations) : iterations,
              alg === 'tabu' ? tabuMaxNoImprove(maxNoImprove) : maxNoImprove,
              undefined,
              request.signal
            );
            const parsed = parseJsonFromStdout(stdout) as Record<string, unknown>;
            if (
              parsed &&
              typeof parsed.algorithm === 'string' &&
              Array.isArray(parsed.runs)
            ) {
              results.push(parsed);
            } else {
              errors.push({
                algorithm: alg,
                message: 'Invalid batch output from runner',
              });
            }
          } catch (runErr: unknown) {
            const reason = runErr as Error & { code?: string };
            const msg =
              reason?.code === 'ETIMEDOUT'
                ? 'Algorithm run timed out'
                : reason?.message || 'Execution failed';
            errors.push({ algorithm: alg, message: msg });
          }
        }
        if (errors.length === order.length) {
          return NextResponse.json(
            { error: 'All batch runs failed', details: errors },
            { status: 500 }
          );
        }
        return NextResponse.json({ results, errors: errors.length ? errors : undefined });
      } finally {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    }

    /** Compare mode: one request, one CSV, parallel single runs. */
    const multiAlgorithms = body.algorithms as string[] | undefined;
    if (Array.isArray(multiAlgorithms) && multiAlgorithms.length > 0) {
      const allowed = new Set(['csp', 'greedy', 'tabu', 'sa']);
      for (const a of multiAlgorithms) {
        if (!allowed.has(a)) {
          return NextResponse.json({ error: `Invalid algorithm: ${a}` }, { status: 400 });
        }
      }
      const tempFilePath = path.join(tempDir, `nurses_${randomUUID()}.csv`);
      fs.writeFileSync(tempFilePath, nursesToCsv(nurses));
      try {
        const results: unknown[] = [];
        const errors: { algorithm: string; message: string }[] = [];
        for (const alg of multiAlgorithms) {
          try {
            const { stdout } = await runPythonAlgorithm(
              pythonExecutable,
              runnerPath,
              tempFilePath,
              alg,
              0,
              alg === 'tabu' ? tabuSeed(seed) : seed,
              alg === 'tabu' ? tabuIterations(iterations) : alg === 'sa' ? saIterations(iterations) : iterations,
              alg === 'tabu' ? tabuMaxNoImprove(maxNoImprove) : maxNoImprove,
              undefined,
              request.signal
            );
            const parsed = parseJsonFromStdout(stdout) as Record<string, unknown>;
            if (parsed.error) {
              errors.push({ algorithm: alg, message: String(parsed.error) });
            } else if (
              parsed.schedule &&
              Array.isArray(parsed.schedule) &&
              typeof parsed.algorithm === 'string'
            ) {
              results.push(parsed);
            } else {
              errors.push({ algorithm: alg, message: 'Invalid schedule output from runner' });
            }
          } catch (runErr: unknown) {
            const reason = runErr as Error & { code?: string };
            const msg =
              reason?.code === 'ETIMEDOUT'
                ? 'Algorithm run timed out (server limit). Try again or reduce iterations.'
                : reason?.message || 'Execution failed';
            errors.push({ algorithm: alg, message: msg });
          }
        }
        if (errors.length === multiAlgorithms.length) {
          return NextResponse.json(
            { error: 'All algorithm runs failed', details: errors },
            { status: 500 }
          );
        }
        return NextResponse.json({ results, errors: errors.length ? errors : undefined });
      } finally {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      }
    }

    const { algorithm } = body;
    if (!algorithm) {
      return NextResponse.json(
        { error: 'Missing algorithm or use algorithms[] / batchAnalysis' },
        { status: 400 }
      );
    }

    const csvContent = nursesToCsv(nurses);
    const tempFilePath = path.join(tempDir, `nurses_${randomUUID()}.csv`);
    fs.writeFileSync(tempFilePath, csvContent);
    const batchRuns = Number(body.batchRuns) || 0;

    try {
      const wantsProgressStream = algorithm === 'tabu' && batchRuns === 0 && body.progressStream === true;

      if (wantsProgressStream) {
        return streamPythonAlgorithm(
          pythonExecutable,
          runnerPath,
          tempFilePath,
          algorithm,
          batchRuns,
          algorithm === 'tabu' ? tabuSeed(seed) : seed,
          algorithm === 'tabu'
            ? tabuIterations(iterations)
            : algorithm === 'sa'
              ? saIterations(iterations)
              : iterations,
          algorithm === 'tabu' ? tabuMaxNoImprove(maxNoImprove) : maxNoImprove,
          undefined,
          request.signal
        );
      }

      const { stdout, stderr } = await runPythonAlgorithm(
        pythonExecutable,
        runnerPath,
        tempFilePath,
        algorithm,
        batchRuns,
        algorithm === 'tabu' ? tabuSeed(seed) : seed,
        algorithm === 'tabu'
          ? tabuIterations(iterations)
          : algorithm === 'sa'
            ? saIterations(iterations)
            : iterations,
        algorithm === 'tabu' ? tabuMaxNoImprove(maxNoImprove) : maxNoImprove,
        undefined,
        request.signal
      );

      fs.unlinkSync(tempFilePath);

      let result: Record<string, unknown>;
      try {
        result = parseJsonFromStdout(stdout) as Record<string, unknown>;
      } catch {
        console.error('Failed to parse JSON from python stdout:', stdout);
        console.error('Stderr:', stderr);
        return NextResponse.json(
          { error: 'Failed to parse algorithm output', details: stdout },
          { status: 500 }
        );
      }

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json(result);
    } catch (execError: unknown) {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      const err = execError as Error & { code?: string };
      if (err?.message === 'Request aborted' || request.signal.aborted) {
        return NextResponse.json({ error: 'Request aborted' }, { status: 499 });
      }
      console.error('Python execution error:', execError);
      const message =
        err?.code === 'ETIMEDOUT' ? 'Algorithm run timed out' : err?.message || 'Unknown error';
      return NextResponse.json({ error: 'Algorithm execution failed', details: message }, { status: 500 });
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}
