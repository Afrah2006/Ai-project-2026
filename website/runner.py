import argparse
import sys
import os
import json
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Web-tuned defaults (single run) — balance quality vs responsiveness
WEB_TABU_ITERATIONS = 2000
WEB_TABU_MAX_NO_IMPROVE = 200
WEB_SA_MAX_ITERATIONS = 600
WEB_SA_LOG_EVERY = 25

BATCH_TABU_ITERATIONS = 600
BATCH_TABU_MAX_NO_IMPROVE = 200
BATCH_SA_MAX_ITERATIONS = 3200

from core.model import load_nurses_from_csv, Schedule
from core.generator import generate_schedule
from core.cancel import set_cancel_file, check_cancelled, is_cancelled
from local_search.greedy import generate_greedy_schedule
from local_search.tabu import TabuConfig, generate_tabu_schedule
from local_search.simulated_annealing import run_sa
from core.evaluation import evaluate_schedule, calculate_display_score
from core.hard_constraints import check_all_hard
from core.config import NUM_DAYS, WORKING_SHIFTS


def format_result(algorithm_name, schedule, execution_time, cancelled=False):
    hard_violations = len(check_all_hard(schedule))
    penalty = evaluate_schedule(schedule)
    score = calculate_display_score(schedule, penalty)
    soft_violations = int(penalty) # Just show the raw penalty as soft violation count

    hours_per_nurse = []
    night_shifts_per_nurse = []
    formatted_schedule = []

    for nurse in schedule.nurses:
        nurse_id = nurse.nurse_id
        nurse_row = []
        nights = 0
        hours = 0
        for day in range(1, NUM_DAYS + 1):
            shift = schedule.get(day, nurse_id)
            if shift == 'F':
                shift = 'O'
            nurse_row.append(shift)
            if shift == 'N':
                nights += 1
            if shift in WORKING_SHIFTS:
                hours += 8
        formatted_schedule.append(nurse_row)
        hours_per_nurse.append(hours)
        night_shifts_per_nurse.append(nights)

    out = {
        "algorithm": algorithm_name,
        "schedule": formatted_schedule,
        "score": score,
        "hardViolations": hard_violations,
        "softViolations": soft_violations,
        "executionTime": execution_time * 1000,
        "hoursPerNurse": hours_per_nurse,
        "nightShiftsPerNurse": night_shifts_per_nurse,
    }
    if cancelled:
        out["cancelled"] = True
    return out


def _generate_base(nurses, seed, stream):
    seed_to_use = seed
    for attempt in range(5):
        check_cancelled()
        try:
            return generate_schedule(nurses, seed=seed_to_use + attempt, stream=stream)
        except RuntimeError:
            seed_to_use = int(time.time() * 1000) % 10000
    return None


def _run_single(algorithm, nurses, stream, tabu_iters, sa_iters):
    start_time = time.perf_counter()
    final_sched = None
    algorithm_name = algorithm

    if algorithm in ("csp", "sa", "tabu"):
        if stream:
            from core.trace import emit_progress
            emit_progress({"phase": "algorithm_start", "algorithm": "CSP Generator", "message": "Phase 1: Generating a feasible base schedule...", "progressPercent": 0})
        
        base_sched = _generate_base(nurses, 42, stream)
        if base_sched is None:
            print(json.dumps({"error": "Failed to generate feasible base schedule"}))
            sys.exit(1)

        if algorithm == "csp":
            final_sched = base_sched
            algorithm_name = "CSP"
        elif algorithm == "tabu":
            if stream:
                emit_progress({"phase": "algorithm_start", "algorithm": "Tabu Search", "message": f"Phase 2: Improving with Tabu Search ({tabu_iters} iterations)...", "progressPercent": 0})
            config = TabuConfig(
                seed=42,
                verbose=False,
                iterations=tabu_iters,
                max_no_improve=WEB_TABU_MAX_NO_IMPROVE,
                stream=stream,
            )
            final_sched = generate_tabu_schedule(base_sched, config=config)
            algorithm_name = "Tabu Search"
        elif algorithm == "sa":
            if stream:
                # Estimate: 1800 iterations * 10 candidates * ~0.5ms = ~15s
                # Plus CSP time (~10s) = ~40s
                est_min = round((sa_iters * 10 * 0.001) / 60, 1)
                emit_progress({"phase": "algorithm_start", "algorithm": "Simulated Annealing", "message": f"Phase 2: Optimizing with Simulated Annealing ({sa_iters} iterations). Est. time: {est_min} - 1.0 minutes.", "progressPercent": 0})
            final_sched, _ = run_sa(
                base_sched,
                max_iterations=sa_iters,
                seed=42,
                verbose=False,
                stream=stream,
                log_every=WEB_SA_LOG_EVERY,
                candidates_per_iteration=6,
                initial_temperature=120.0,
                cooling_rate=0.997,
                reheat_patience=200,
                max_reheats=3,
                enforce_candidate_feasible=False,
            )
            algorithm_name = "Simulated Annealing"
    elif algorithm == "greedy":
        if stream:
            from core.trace import emit_progress
            emit_progress({"phase": "algorithm_start", "algorithm": "Greedy", "message": "Optimizing with Greedy algorithm...", "progressPercent": 0})
        sched = Schedule(nurses)
        final_sched = generate_greedy_schedule(sched, stream=stream)
        algorithm_name = "Greedy"

    exec_time = time.perf_counter() - start_time
    return format_result(algorithm_name, final_sched, exec_time), final_sched


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--algorithm", choices=["csp", "greedy", "tabu", "sa"], required=True)
    parser.add_argument("--data", required=True)
    parser.add_argument("--iterations", type=int, default=None)
    parser.add_argument("--batch-runs", type=int, default=0)
    parser.add_argument("--batch-tabu-iters", type=int, default=None)
    parser.add_argument("--batch-sa-iters", type=int, default=None)
    parser.add_argument("--stream", action="store_true")
    parser.add_argument("--cancel-file", type=str, default=None)
    args = parser.parse_args()

    if args.cancel_file:
        set_cancel_file(args.cancel_file)

    nurses = load_nurses_from_csv(args.data)
    tabu_iters = args.iterations or WEB_TABU_ITERATIONS
    sa_iters = args.iterations or WEB_SA_MAX_ITERATIONS

    if args.batch_runs > 0:
        batch_tabu_iters = args.batch_tabu_iters or BATCH_TABU_ITERATIONS
        batch_sa_iters = args.batch_sa_iters or BATCH_SA_MAX_ITERATIONS
        batch_results = []
        algorithm_name = args.algorithm

        for run_idx in range(args.batch_runs):
            check_cancelled()
            run_start = time.perf_counter()
            current_seed = (42 + run_idx * 997) if args.algorithm in ["csp", "sa", "tabu"] else None
            base_sched = None
            if args.algorithm in ["csp", "sa", "tabu"]:
                for attempt in range(5):
                    check_cancelled()
                    try:
                        base_sched = generate_schedule(nurses, seed=current_seed + attempt, stream=False)
                        break
                    except RuntimeError:
                        continue
                if base_sched is None:
                    continue

            final_sched = None
            if args.algorithm == "greedy":
                sched = Schedule(nurses)
                final_sched = generate_greedy_schedule(sched, stream=False)
                algorithm_name = "Greedy"
            elif args.algorithm == "csp":
                final_sched = base_sched
                algorithm_name = "CSP"
            elif args.algorithm == "tabu":
                config = TabuConfig(
                    seed=current_seed,
                    verbose=False,
                    iterations=batch_tabu_iters,
                    max_no_improve=BATCH_TABU_MAX_NO_IMPROVE,
                    stream=False,
                )
                final_sched = generate_tabu_schedule(base_sched, config=config)
                algorithm_name = "Tabu Search"
            elif args.algorithm == "sa":
                final_sched, _ = run_sa(
                    base_sched,
                    max_iterations=batch_sa_iters,
                    seed=current_seed,
                    verbose=False,
                    stream=False,
                )
                algorithm_name = "Simulated Annealing"

            run_end = time.perf_counter()
            if final_sched:
                hard_v = len(check_all_hard(final_sched))
                penalty = evaluate_schedule(final_sched)
                score = calculate_display_score(final_sched, penalty)
                batch_results.append({
                    "score": score,
                    "execution_time": round((run_end - run_start) * 1000, 2),
                    "hard_violations": hard_v,
                })

            if args.stream:
                print(json.dumps({
                    "type": "batch_progress",
                    "algorithm": algorithm_name,
                    "runIndex": run_idx + 1,
                    "totalRuns": args.batch_runs,
                    "completed": len(batch_results),
                }), flush=True)

        print(json.dumps({"algorithm": algorithm_name, "runs": batch_results}))
        sys.exit(0)

    result, _ = _run_single(args.algorithm, nurses, args.stream, tabu_iters, sa_iters)
    if is_cancelled():
        result["cancelled"] = True
    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        import traceback
        # Print to stderr for debugging
        traceback.print_exc(file=sys.stderr)
        # Print JSON to stdout so the website can see it
        print(json.dumps({
            "type": "error",
            "error": str(e),
            "message": f"Python Error: {str(e)}"
        }), flush=True)
        sys.exit(1)
