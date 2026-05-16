"""Vercel Python serverless handler for nurse scheduling algorithms."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from http.server import BaseHTTPRequestHandler
from typing import Any
from uuid import uuid4

WEBSITE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RUNNER_PATH = os.path.join(WEBSITE_ROOT, "runner.py")
PYTHON = sys.executable
TIMEOUT_SEC = 15 * 60


def nurses_to_csv(nurses: list[dict[str, Any]]) -> str:
    lines = [
        "ID,LastName,FirstName,DateOfBirth,Age,Gender,seniority,day_off1,day_off2"
    ]
    for index, nurse in enumerate(nurses):
        nurse_id = index + 1
        name_parts = str(nurse.get("name", "")).split()
        first_name = name_parts[0] if name_parts else "Unknown"
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else "Unknown"
        seniority = "senior" if nurse.get("isSenior") else "junior"
        day_offs = nurse.get("dayOffRequests") or []
        day_off1 = day_offs[0] if len(day_offs) > 0 else 0
        day_off2 = day_offs[1] if len(day_offs) > 1 else 0
        lines.append(
            f"{nurse_id},{last_name},{first_name},01/01/1990,30,F,{seniority},{day_off1},{day_off2}"
        )
    return "\n".join(lines) + "\n"


def parse_json_from_stdout(stdout: str) -> Any:
    for line in reversed(stdout.splitlines()):
        line = line.strip()
        if not line or line[0] not in "{[":
            continue
        try:
            return json.loads(line)
        except json.JSONDecodeError:
            continue
    raise ValueError("No valid JSON line found in stdout")


def run_runner(
    csv_path: str,
    algorithm: str,
    batch_runs: int = 0,
    seed: int | None = None,
    iterations: int | None = None,
    max_no_improve: int | None = None,
) -> dict[str, Any]:
    args = [PYTHON, RUNNER_PATH, "--algorithm", algorithm, "--data", csv_path]
    if seed is not None:
        args.extend(["--seed", str(seed)])
    if iterations is not None:
        args.extend(["--iterations", str(iterations)])
    if batch_runs > 0:
        args.extend(["--batch-runs", str(batch_runs)])
    if max_no_improve is not None:
        args.extend(["--max-no-improve", str(max_no_improve)])

    completed = subprocess.run(
        args,
        capture_output=True,
        text=True,
        timeout=TIMEOUT_SEC,
        cwd=WEBSITE_ROOT,
    )
    if completed.returncode != 0:
        detail = completed.stderr.strip() or completed.stdout.strip() or "Runner failed"
        raise RuntimeError(detail)
    return parse_json_from_stdout(completed.stdout)


def tabu_seed(seed: int | None) -> int:
    return 1 if seed is None else seed


def tabu_iterations(iterations: int | None) -> int:
    return 2000 if iterations is None else iterations


def tabu_max_no_improve(max_no_improve: int | None) -> int:
    return 80 if max_no_improve is None else max_no_improve


def handle_request(body: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    nurses = body.get("nurses")
    if not isinstance(nurses, list) or not nurses:
        return 400, {"error": "Missing nurses data"}

    seed = body.get("seed") if isinstance(body.get("seed"), int) else None
    iterations = body.get("iterations") if isinstance(body.get("iterations"), int) else None
    max_no_improve = (
        body.get("maxNoImprove") if isinstance(body.get("maxNoImprove"), int) else None
    )

    with tempfile.TemporaryDirectory() as temp_dir:
        csv_path = os.path.join(temp_dir, f"nurses_{uuid4().hex}.csv")
        with open(csv_path, "w", encoding="utf-8") as handle:
            handle.write(nurses_to_csv(nurses))

        if body.get("batchAnalysis") is True:
            batch_runs = int(body.get("batchRuns") or 0)
            if batch_runs < 2 or batch_runs > 50:
                return 400, {"error": "batchRuns must be between 2 and 50 for batch analysis"}

            order = ["greedy", "csp", "tabu", "sa"]
            results: list[Any] = []
            errors: list[dict[str, str]] = []
            for alg in order:
                try:
                    parsed = run_runner(
                        csv_path,
                        alg,
                        batch_runs=batch_runs,
                        seed=tabu_seed(seed) if alg == "tabu" else seed,
                        iterations=tabu_iterations(iterations) if alg == "tabu" else iterations,
                        max_no_improve=tabu_max_no_improve(max_no_improve)
                        if alg == "tabu"
                        else max_no_improve,
                    )
                    if isinstance(parsed, dict) and isinstance(parsed.get("runs"), list):
                        results.append(parsed)
                    else:
                        errors.append({"algorithm": alg, "message": "Invalid batch output from runner"})
                except Exception as exc:  # noqa: BLE001
                    errors.append({"algorithm": alg, "message": str(exc)})

            if len(errors) == len(order):
                return 500, {"error": "All batch runs failed", "details": errors}
            payload: dict[str, Any] = {"results": results}
            if errors:
                payload["errors"] = errors
            return 200, payload

        algorithms = body.get("algorithms")
        if isinstance(algorithms, list) and algorithms:
            allowed = {"csp", "greedy", "tabu", "sa"}
            for alg in algorithms:
                if alg not in allowed:
                    return 400, {"error": f"Invalid algorithm: {alg}"}

            results_list: list[Any] = []
            errors_list: list[dict[str, str]] = []
            for alg in algorithms:
                try:
                    parsed = run_runner(
                        csv_path,
                        str(alg),
                        seed=tabu_seed(seed) if alg == "tabu" else seed,
                        iterations=tabu_iterations(iterations) if alg == "tabu" else iterations,
                        max_no_improve=tabu_max_no_improve(max_no_improve)
                        if alg == "tabu"
                        else max_no_improve,
                    )
                    if isinstance(parsed, dict) and parsed.get("error"):
                        errors_list.append(
                            {"algorithm": str(alg), "message": str(parsed["error"])}
                        )
                    elif isinstance(parsed, dict) and isinstance(parsed.get("schedule"), list):
                        results_list.append(parsed)
                    else:
                        errors_list.append(
                            {"algorithm": str(alg), "message": "Invalid schedule output from runner"}
                        )
                except Exception as exc:  # noqa: BLE001
                    errors_list.append({"algorithm": str(alg), "message": str(exc)})

            if len(errors_list) == len(algorithms):
                return 500, {"error": "All algorithm runs failed", "details": errors_list}
            payload = {"results": results_list}
            if errors_list:
                payload["errors"] = errors_list
            return 200, payload

        algorithm = body.get("algorithm")
        if not algorithm:
            return 400, {"error": "Missing algorithm or use algorithms[] / batchAnalysis"}

        batch_runs = int(body.get("batchRuns") or 0)
        try:
            parsed = run_runner(
                csv_path,
                str(algorithm),
                batch_runs=batch_runs,
                seed=tabu_seed(seed) if algorithm == "tabu" else seed,
                iterations=tabu_iterations(iterations) if algorithm == "tabu" else iterations,
                max_no_improve=tabu_max_no_improve(max_no_improve)
                if algorithm == "tabu"
                else max_no_improve,
            )
        except Exception as exc:  # noqa: BLE001
            return 500, {"error": "Algorithm execution failed", "details": str(exc)}

        if isinstance(parsed, dict) and parsed.get("error"):
            return 500, {"error": parsed["error"]}
        return 200, parsed


class handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(length) if length > 0 else b"{}"
            body = json.loads(raw.decode("utf-8"))
            status, payload = handle_request(body)
            data = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except json.JSONDecodeError:
            self._error(400, {"error": "Invalid JSON body"})
        except Exception as exc:  # noqa: BLE001
            self._error(500, {"error": "Internal server error", "details": str(exc)})

    def _error(self, status: int, payload: dict[str, Any]) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return
