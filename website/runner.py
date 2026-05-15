import argparse
import sys
import os
import json
import time

# Add parent directory to sys.path so we can import from core and local_search
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Statistical / batch mode (--batch-runs > 0): fewer local-search iterations per run so
# many repeats stay responsive. Single-run mode below is unchanged.
BATCH_TABU_ITERATIONS = 600
BATCH_TABU_MAX_NO_IMPROVE = 80
BATCH_SA_MAX_ITERATIONS = 3200

from core.model import load_nurses_from_csv, Schedule
from core.generator import generate_schedule
from local_search.greedy import generate_greedy_schedule
from local_search.tabu import TabuConfig, generate_tabu_schedule
from local_search.simulated_annealing import run_sa
from core.evaluation import evaluate_schedule
from core.hard_constraints import check_all_hard
from core.config import NUM_DAYS, WORKING_SHIFTS

def format_result(algorithm_name, schedule, execution_time):
    # Calculate hard violations
    hard_violations = len(check_all_hard(schedule))
    
    # Penalty from evaluate_schedule
    penalty = evaluate_schedule(schedule)
    
    # We will use penalty as soft violations for the UI, and map it to a score out of 1000
    soft_violations = int(penalty / 10)
    score = int(max(0, 1000 - hard_violations * 50 - soft_violations * 5))

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

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--algorithm", choices=["csp", "greedy", "tabu", "sa"], required=True)
    parser.add_argument("--data", required=True)
    parser.add_argument("--iterations", type=int, default=None)
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
    args = parser.parse_args()

    nurses = load_nurses_from_csv(args.data)
    
    if args.batch_runs > 0:
        batch_tabu_iters = args.batch_tabu_iters if args.batch_tabu_iters is not None else BATCH_TABU_ITERATIONS
        batch_tabu_stop = BATCH_TABU_MAX_NO_IMPROVE
        batch_sa_iters = args.batch_sa_iters if args.batch_sa_iters is not None else BATCH_SA_MAX_ITERATIONS

        batch_results = []
        for run_idx in range(args.batch_runs):
            run_start = time.perf_counter()
            current_seed = (42 + run_idx * 997) if args.algorithm in ["csp", "sa", "tabu"] else None
            
            base_sched = None
            if args.algorithm in ["csp", "sa", "tabu"]:
                for attempt in range(5):
                    try:
                        base_sched = generate_schedule(nurses, seed=current_seed + attempt)
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
                    verbose=False,
                    iterations=batch_tabu_iters,
                    max_no_improve=batch_tabu_stop,
                )
                final_sched = generate_tabu_schedule(base_sched, config=config)
                algorithm_name = "Tabu Search"
            elif args.algorithm == "sa":
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
        seed_to_use = 42
        for attempt in range(5):
            try:
                base_sched = generate_schedule(nurses, seed=seed_to_use)
                break
            except RuntimeError:
                seed_to_use = int(time.time() * 1000) % 10000
                
        if base_sched is None:
            print(json.dumps({"error": "Failed to generate feasible base schedule"}))
            sys.exit(1)
            
        if args.algorithm == "csp":
            final_sched = base_sched
            algorithm_name = "CSP"
        elif args.algorithm == "tabu":
            iters = args.iterations or 2000
            config = TabuConfig(seed=seed_to_use, verbose=False, iterations=iters, max_no_improve=300)
            final_sched = generate_tabu_schedule(base_sched, config=config)
            algorithm_name = "Tabu Search"
        elif args.algorithm == "sa":
            iters = args.iterations or 10_000
            final_sched, _ = run_sa(base_sched, max_iterations=iters, seed=seed_to_use, verbose=False)
            algorithm_name = "Simulated Annealing"
    elif args.algorithm == "greedy":
        sched = Schedule(nurses)
        final_sched = generate_greedy_schedule(sched)
        algorithm_name = "Greedy"

    exec_time = time.perf_counter() - start_time
    
    result = format_result(algorithm_name, final_sched, exec_time)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
