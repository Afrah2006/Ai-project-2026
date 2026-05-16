import type { ChildProcess } from "child_process";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/** Terminate a Python child and its descendants (Windows-safe). */
export async function killProcessTree(child: ChildProcess): Promise<void> {
  if (!child.pid) {
    child.kill();
    return;
  }
  if (process.platform === "win32") {
    try {
      await execAsync(`taskkill /PID ${child.pid} /T /F`);
    } catch {
      try {
        child.kill();
      } catch {
        /* already exited */
      }
    }
  } else {
    try {
      child.kill("SIGTERM");
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 400));
    if (!child.killed && child.pid) {
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }
  }
}
