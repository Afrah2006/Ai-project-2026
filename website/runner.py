import argparse
import sys
import os
import json
import time
from contextlib import redirect_stdout
from io import StringIO
from datetime import datetime

# Add parent directory to sys.path so we can import from core and local_search
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Statistical / batch mode (--batch-runs > 0): fewer local-search iterations per run so
# many repeats stay responsive. Single-run mode below is unchanged.
BATCH_TABU_ITERATIONS = 600
BATCH_TABU_MAX_NO_IMPROVE = 80
BATCH_SA_MAX_ITERATIONS = 3200

# Web UI defaults — mirror website/lib/runner-config.ts
WEB_TABU_ITERATIONS = 10000
WEB_TABU_NEIGHBORS_PER_ITERATION = 60
WEB_TABU_MAX_NO_IMPROVE = 200
WEB_TABU_LOG_EVERY = 25
WEB_SA_ITERATIONS = 1200
WEB_GENERATOR_MAX_BACKTRACK = 2000
WEB_LOG_DIR = os.path.join(os.path.dirname(__file__), "run-logs")

from core.model import load_nurses_from_csv, Schedule
from core.generator import generate_schedule
from local_search.greedy import generate_greedy_schedule
from local_search.tabu import TabuConfig, generate_tabu_schedule
from local_search.simulated_annealing import run_sa, simulated_annealing
from core.evaluation import evaluate_schedule
from core.hard_constraints import check_all_hard
from core.config import NUM_DAYS, WORKING_SHIFTS

def format_result(algorithm_name, schedule, execution_time):
    # Calculate hard violations
    hard_violations = len(check_all_hard(schedule))
    
    # Penalty from evaluate_schedule
    penalty = evaluate_schedule(schedule)
    
    # Surface the raw objective so the UI shows the optimizer's actual result.
    soft_violations = int(penalty / 10)
    score = int(round(penalty))

    # Calculate hours and night shifts per nurse
    hours_per_nurse = []
    night_shifts_per_nurse = []
    
    formatted_schedule = []
    # Make sure we iterate through nurses in the order they were loaded
    for nurse in schedule.nurses:
        nurse_id = nurse.nurse_id
        nurse_row = []
        nights = 0
        hours = 0
        for day in range(1, NUM_DAYS + 1):
            shift = schedule.get(day, nurse_id)
            if shift == 'F':
                shift = 'O' # Fallback format
            nurse_row.append(shift)
            if shift == 'N':
                nights += 1
            if shift in WORKING_SHIFTS:
                hours += 8
        formatted_schedule.append(nurse_row)
        hours_per_nurse.append(hours)
        night_shifts_per_nurse.append(nights)

    return {
        "algorithm": algorithm_name,
        "schedule": formatted_schedule,
        "score": score,
        "hardViolations": hard_violations,
        "softViolations": soft_violations,
        "executionTime": execution_time * 1000, # convert to ms
        "hoursPerNurse": hours_per_nurse,
        "nightShiftsPerNurse": night_shifts_per_nurse
    }


def ensure_log_dir() -> None:
    os.makedirs(WEB_LOG_DIR, exist_ok=True)


def create_run_log_file(algorithm: str) -> str:
    ensure_log_dir()
    ts = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    return os.path.join(WEB_LOG_DIR, f"{algorithm}-{ts}.log")


def write_progress_log(log_path: str, lines: list[str]) -> None:
    with open(log_path, "w", encoding="utf-8") as handle:
        for line in lines:
            handle.write(line.rstrip() + "\n")


def build_base_schedule(nurses, seed_to_use: int):
    """Generate the hard-feasible base schedule without polluting stdout."""
    silent_buffer = StringIO()
    with redirect_stdout(silent_buffer):
        return generate_schedule(nurses, seed=seed_to_use)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--algorithm", choices=["csp", "greedy", "tabu", "sa"], required=True)
    parser.add_argument("--data", required=True)
    parser.add_argument("--iterations", type=int, default=None)
    parser.add_argument("--seed", type=int, default=None, help="Optional deterministic seed for generator and local search")
    parser.add_argument(
        "--max-no-improve",
        type=int,
        default=None,
        help="Optional Tabu stagnation limit before stopping early",
    )
    parser.add_argument("--batch-runs", type=int, default=0)
    parser.add_argument(
        "--batch-tabu-iters",
        type=int,
        default=None,
        help="Override Tabu iterations when --batch-runs > 0 (default: runner BATCH_TABU_ITERATIONS)",
    )
    parser.add_argument(
        "--batch-sa-iters",
        type=int,
        default=None,
        help="Override SA max_iterations when --batch-runs > 0 (default: runner BATCH_SA_MAX_ITERATIONS)",
    )
    parser.add_argument("--checkpoint", default=None, help="Optional path to write periodic JSON checkpoints")
    args = parser.parse_args()

    nurses = load_nurses_from_csv(args.data)
    requested_seed = args.seed
    
    if args.batch_runs > 0:
        batch_tabu_iters = args.batch_tabu_iters if args.batch_tabu_iters is not None else BATCH_TABU_ITERATIONS
        batch_tabu_stop = BATCH_TABU_MAX_NO_IMPROVE
        batch_sa_iters = args.batch_sa_iters if args.batch_sa_iters is not None else BATCH_SA_MAX_ITERATIONS

        batch_results = []
        for run_idx in range(args.batch_runs):
            run_start = time.perf_counter()
            current_seed = (
                requested_seed + run_idx * 997
                if requested_seed is not None and args.algorithm in ["csp", "sa", "tabu"]
                else (42 + run_idx * 997 if args.algorithm in ["csp", "sa", "tabu"] else None)
            )
            
            base_sched = None
            if args.algorithm in ["csp", "sa", "tabu"]:
                for attempt in range(5):
                    try:
                        base_sched = build_base_schedule(
                            nurses,
                            current_seed + attempt,
                        )
                        break
                    except RuntimeError:
                        continue
                if base_sched is None:
                    continue # Skip failed generations in batch mode
            
            final_sched = None
            if args.algorithm == "greedy":
                sched = Schedule(nurses)
                final_sched = generate_greedy_schedule(sched)
                algorithm_name = "Greedy"
            elif args.algorithm == "csp":
                final_sched = base_sched
                algorithm_name = "CSP"
            elif args.algorithm == "tabu":
                config = TabuConfig(
                    seed=current_seed,
                    verbose=True,
                    iterations=batch_tabu_iters,
                    max_no_improve=batch_tabu_stop,
                    neighbors_per_iteration=WEB_TABU_NEIGHBORS_PER_ITERATION,
                    stream=False,
                )
                final_sched = generate_tabu_schedule(base_sched, config=config)
                algorithm_name = "Tabu Search"
            elif args.algorithm == "sa":
                # For batch mode we keep the lightweight wrapper
                final_sched, _ = run_sa(
                    base_sched,
                    max_iterations=batch_sa_iters,
                    seed=current_seed,
                    verbose=False,
                )
                algorithm_name = "Simulated Annealing"
                
            run_end = time.perf_counter()
            
            if final_sched:
                hard_v = len(check_all_hard(final_sched))
                penalty = evaluate_schedule(final_sched)
                score = int(max(0, 1000 - hard_v * 50 - int(penalty / 10)))
                batch_results.append({
                    "score": score,
                    "execution_time": round((run_end - run_start) * 1000, 2),
                    "hard_violations": hard_v
                })
        
        print(json.dumps({
            "algorithm": algorithm_name if 'algorithm_name' in locals() else args.algorithm,
            "runs": batch_results
        }))
        sys.exit(0)

    # --- Single Run Mode ---
    start_time = time.perf_counter()
    
    base_sched = None
    if args.algorithm in ["csp", "sa", "tabu"]:
        run_log_path = create_run_log_file(args.algorithm)
        run_progress_lines: list[str] = []
        seed_to_use = requested_seed if requested_seed is not None else 42
        attempt_count = 1 if requested_seed is not None else 5
        for attempt in range(attempt_count):
            try:
                base_sched = build_base_schedule(nurses, seed_to_use)
                break
            except RuntimeError:
                if requested_seed is None:
                    seed_to_use = int(time.time() * 1000) % 10000
                else:
                    break
                
        if base_sched is None:
            print(json.dumps({"error": "Failed to generate feasible base schedule"}))
            sys.exit(1)
            
        if args.algorithm == "csp":
            final_sched = base_sched
            algorithm_name = "CSP"
        elif args.algorithm == "tabu":
            iters = args.iterations or WEB_TABU_ITERATIONS
            max_no_improve = (
                args.max_no_improve
                if args.max_no_improve is not None
                else WEB_TABU_MAX_NO_IMPROVE
            )
            config = TabuConfig(
                seed=seed_to_use,
                verbose=True,
                iterations=iters,
                max_no_improve=max_no_improve,
                neighbors_per_iteration=WEB_TABU_NEIGHBORS_PER_ITERATION,
                stream=False,
            )
            run_progress_lines.append(
                f"[tabu] starting iterations={iters} max_no_improve={max_no_improve} "
                f"neighbors={WEB_TABU_NEIGHBORS_PER_ITERATION} seed={seed_to_use}"
            )
            stdout_buffer = StringIO()
            with redirect_stdout(stdout_buffer):
                final_sched = generate_tabu_schedule(base_sched, config=config)
            progress_log = [line for line in stdout_buffer.getvalue().splitlines() if line.strip()]
            run_progress_lines.extend(progress_log)
            algorithm_name = "Tabu Search"
        elif args.algorithm == "sa":
            iters = args.iterations or WEB_SA_ITERATIONS
            # Call the rich SA function directly so we can capture history and
            # let the algorithm write periodic checkpoints.
            run_progress_lines.append(f"[sa] starting iterations={iters}")
            stdout_buffer = StringIO()
            with redirect_stdout(stdout_buffer):
                sa_result = simulated_annealing(
                    base_sched,
                    max_iterations=iters,
                    seed=seed_to_use,
                    verbose=True,
                    log_every=100,
                    stream=False,
                )
            progress_log = [line for line in stdout_buffer.getvalue().splitlines() if line.strip()]
            run_progress_lines.extend(progress_log)
            final_sched = sa_result.best_schedule
            algorithm_name = "Simulated Annealing"
    elif args.algorithm == "greedy":
        sched = Schedule(nurses)
        final_sched = generate_greedy_schedule(sched)
        algorithm_name = "Greedy"

    exec_time = time.perf_counter() - start_time
    
    result = format_result(algorithm_name, final_sched, exec_time)
    # Attach SA history when available
    try:
        if 'sa_result' in locals() and sa_result is not None:
            result['history'] = sa_result.history
            result['iterations'] = sa_result.iterations
    except Exception:
        pass
    try:
        if 'progress_log' in locals() and progress_log:
            result['progressLog'] = progress_log[-120:]
    except Exception:
        pass
    try:
        write_progress_log(run_log_path, run_progress_lines)
        result['logFile'] = run_log_path
    except Exception:
        pass
    print(json.dumps(result))

if __name__ == "__main__":
    main()
