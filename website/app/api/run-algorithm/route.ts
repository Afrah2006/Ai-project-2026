import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { randomUUID } from 'crypto';

const execFileAsync = promisify(execFile);

const PYTHON_ARGS = {
  maxBuffer: 1024 * 1024 * 10,
  /** Prevent hung workers from blocking the tab indefinitely (per process). */
  timeout: 15 * 60 * 1000,
} as const;

function nursesToCsv(nurses: any[]): string {
  let csvContent =
    'ID,LastName,FirstName,DateOfBirth,Age,Gender,seniority,day_off1,day_off2\n';
  nurses.forEach((nurse: any, index: number) => {
    const id = index + 1;
    const nameParts = nurse.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Unknown';
    const dob = '01/01/1990';
    const age = 30;
    const gender = 'F';
    const seniority = nurse.isSenior ? 'senior' : 'junior';
    const dayOff1 =
      nurse.dayOffRequests && nurse.dayOffRequests[0] ? nurse.dayOffRequests[0] : 0;
    const dayOff2 =
      nurse.dayOffRequests && nurse.dayOffRequests[1] ? nurse.dayOffRequests[1] : 0;
    csvContent += `${id},${lastName},${firstName},${dob},${age},${gender},${seniority},${dayOff1},${dayOff2}\n`;
  });
  return csvContent;
}

function parseJsonFromStdout(stdout: string): unknown {
  const lines = stdout.trim().split('\n');
  const jsonLine = lines[lines.length - 1];
  return JSON.parse(jsonLine);
}

async function runPythonAlgorithm(
  pythonExecutable: string,
  runnerPath: string,
  tempFilePath: string,
  algorithm: string,
  batchRuns: number
): Promise<{ stdout: string; stderr: string }> {
  const args = [runnerPath, '--algorithm', algorithm, '--data', tempFilePath];
  if (batchRuns > 0) {
    args.push('--batch-runs', batchRuns.toString());
  }
  return execFileAsync(pythonExecutable, args, PYTHON_ARGS);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nurses } = body;

    if (!nurses || !Array.isArray(nurses)) {
      return NextResponse.json({ error: 'Missing nurses data' }, { status: 400 });
    }

    const tempDir = os.tmpdir();
    const runnerPath = path.join(process.cwd(), 'runner.py');
    const pythonExecutable = process.platform === 'win32' ? 'python' : 'python3';

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
              batchRuns
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
        const settled = await Promise.allSettled(
          multiAlgorithms.map((alg) =>
            runPythonAlgorithm(pythonExecutable, runnerPath, tempFilePath, alg, 0)
          )
        );
        const results: unknown[] = [];
        const errors: { algorithm: string; message: string }[] = [];
        settled.forEach((out, i) => {
          const alg = multiAlgorithms[i];
          if (out.status === 'fulfilled') {
            try {
              const parsed = parseJsonFromStdout(out.value.stdout) as Record<string, unknown>;
              if (parsed.error) {
                errors.push({
                  algorithm: alg,
                  message: String(parsed.error),
                });
              } else if (
                parsed.schedule &&
                Array.isArray(parsed.schedule) &&
                typeof parsed.algorithm === 'string'
              ) {
                results.push(parsed);
              } else {
                errors.push({ algorithm: alg, message: 'Invalid schedule output from runner' });
              }
            } catch {
              errors.push({ algorithm: alg, message: 'Failed to parse algorithm output' });
            }
          } else {
            const reason = out.reason as Error & { code?: string };
            const msg =
              reason?.code === 'ETIMEDOUT'
                ? 'Algorithm run timed out'
                : reason?.message || 'Execution failed';
            errors.push({ algorithm: alg, message: msg });
          }
        });
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
      const { stdout, stderr } = await runPythonAlgorithm(
        pythonExecutable,
        runnerPath,
        tempFilePath,
        algorithm,
        batchRuns
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
