# =============================================================================
# local_search/test_sa.py — Test & benchmark Simulated Annealing
# =============================================================================
# Run from the project root:
#
#   python -m local_search.test_sa
#   python -m local_search.test_sa --runs 5 --iterations 20000 --seed 42 --verbose
#   python -m local_search.test_sa --help
#
# What this script does
# ---------------------
#   1. Load nurse data from CSV.
#   2. Build a feasible initial schedule using the primary CSP generator
#      (core/generator.py). This is the PRIMARY and CORRECT source for SA.
#   3. Run SA one or more times (different seeds) and collect SAResult objects.
#   4. Print a per-run summary and a final comparison table.
# =============================================================================

from __future__ import annotations

import argparse
import sys
import time


# ---------------------------------------------------------------------------
# CLI argument parsing
# ---------------------------------------------------------------------------

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Test Simulated Annealing for nurse scheduling."
    )
    p.add_argument(
        "--runs", type=int, default=3,
        help="Number of independent SA runs (default: 3)"
    )
    p.add_argument(
        "--iterations", type=int, default=15_000,
        help="Max SA iterations per run (default: 15 000)"
    )
    p.add_argument(
        "--temp", type=float, default=50.0,
        help="Initial SA temperature (default: 50.0)"
    )
    p.add_argument(
        "--cooling", type=float, default=0.99,
        help="SA cooling rate in (0,1) (default: 0.99)"
    )
    p.add_argument(
        "--data", type=str, default="data/data_ai_project.csv",
        help="Path to nurse CSV (default: data/data_ai_project.csv)"
    )
    p.add_argument(
        "--seed", type=int, default=None,
        help="Base random seed. Run i uses seed+i. None = non-deterministic."
    )
    p.add_argument(
        "--verbose", action="store_true",
        help="Print SA progress every log_every iterations"
    )
    p.add_argument(
        "--no-reheat", action="store_true",
        help="Disable the SA reheat strategy"
    )
    p.add_argument(
        "--mode", type=str, default="weighted",
        choices=["weighted", "uniform", "swap_only"],
        help="Neighbour generation mode (default: weighted)"
    )
    p.add_argument(
        "--candidates", type=int, default=80,
        help="Candidate neighbours sampled per SA iteration (default: 80)"
    )
    return p.parse_args()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    args = _parse_args()

    # Deferred imports so --help is instant
    from core.model import load_nurses_from_csv
    from core.generator import generate_schedule
    from core.hard_constraints import check_all_hard
    from core.evaluation import evaluate_schedule
    from local_search.simulated_annealing import simulated_annealing, SAResult

    print("=" * 65)
    print("  Nurse Scheduling — Simulated Annealing Test")
    print("=" * 65)

    # ------------------------------------------------------------------ #
    # 1. Load nurses                                                       #
    # ------------------------------------------------------------------ #
    print(f"\n[1] Loading nurses from '{args.data}' …")
    nurses = load_nurses_from_csv(args.data)
    print(f"    Loaded {len(nurses)} nurses.")

    # ------------------------------------------------------------------ #
    # 2. Build the initial feasible schedule via the CSP generator         #
    # ------------------------------------------------------------------ #
    print(f"\n[2] Building initial schedule with CSP generator ...")
    print("    (primary generator: hard constraints first, no soft optimisation yet)")

    source_label = "core.generator.generate_schedule"

    t0 = time.perf_counter()
    try:
        initial_schedule = generate_schedule(nurses, seed=args.seed)
        gen_time = time.perf_counter() - t0
        print(f"    generator succeeded in {gen_time:.2f}s.")

    except RuntimeError as exc:
        gen_time = time.perf_counter() - t0
        print(f"\n    [!] generator failed after {gen_time:.1f}s: {exc}")
        print("    [!] SA test stopped because it requires a hard-feasible generator schedule.")
        print("    [!] Try changing --seed or increasing core.generator.MAX_BACKTRACK.")
        sys.exit(1)

    # ------------------------------------------------------------------ #
    # 3. Validate the initial schedule                                     #
    # ------------------------------------------------------------------ #
    violations = check_all_hard(initial_schedule)
    initial_score = evaluate_schedule(initial_schedule)

    print(f"\n    Source            : {source_label}")
    if violations:
        print(f"    Hard violations   : {len(violations)}")
        print("    First violations:")
        for v in violations[:5]:
            print(f"      {v}")
        print("\n    [!] core.generator.generate_schedule produced an infeasible schedule, so SA will not run.")
        sys.exit(1)
    else:
        print("    Hard violations   : 0  OK")
    print(f"    Initial score     : {initial_score:.2f}")

    # ------------------------------------------------------------------ #
    # 4. Run SA multiple times                                             #
    # ------------------------------------------------------------------ #
    print(f"\n[3] Running SA — {args.runs} run(s), max_iter={args.iterations}")
    print("-" * 65)

    results: list[SAResult] = []
    best_overall: SAResult | None = None

    for i in range(args.runs):
        run_seed = (args.seed + i) if args.seed is not None else None
        print(f"\n  Run {i + 1}/{args.runs}  (seed={run_seed}) …")

        result = simulated_annealing(
            initial_schedule=initial_schedule,
            initial_temperature=args.temp,
            cooling_rate=args.cooling,
            max_iterations=args.iterations,
            reheat_enabled=not args.no_reheat,
            neighbour_mode=args.mode,
            candidates_per_iteration=args.candidates,
            seed=run_seed,
            log_every=1_000,
            verbose=args.verbose,
            require_initial_feasible=True,
            enforce_candidate_feasible=True,
        )
        results.append(result)
        print(result.summary())

        # Verify the output is still hard-feasible
        final_violations = check_all_hard(result.best_schedule)
        if final_violations:
            print(f"  [!] Best schedule has {len(final_violations)} hard violations!")
            for v in final_violations[:3]:
                print(f"      {v}")
        else:
            print("  [OK] Best schedule is hard-feasible.")

        if best_overall is None or result.best_score < best_overall.best_score:
            best_overall = result

    # ------------------------------------------------------------------ #
    # 5. Summary table                                                     #
    # ------------------------------------------------------------------ #
    print("\n" + "=" * 65)
    print("  Summary — all runs")
    print("=" * 65)
    header = (
        f"  {'Run':>3}  {'Initial':>10}  {'Best':>10}"
        f"  {'Improvement':>12}  {'BestIter':>9}  {'Reheats':>7}  {'Time':>7}"
    )
    print(header)
    print("  " + "-" * 62)
    for i, r in enumerate(results):
        improvement = r.initial_score - r.best_score
        # Count reheats from history
        reheats = r.history[-1]["reheats"] if r.history else "—"
        print(
            f"  {i + 1:>3}  {r.initial_score:>10.2f}  {r.best_score:>10.2f}"
            f"  {improvement:>12.2f}  {r.best_iteration:>9}"
            f"  {str(reheats):>7}  {r.elapsed_seconds:>6.1f}s"
        )

    if best_overall is not None:
        print(f"\n  Best overall score : {best_overall.best_score:.2f}")
        print(f"  Total improvement  : {best_overall.initial_score - best_overall.best_score:.2f}")
        print(f"\n  Best schedule grid:")
        for line in best_overall.best_schedule.summary().splitlines():
            print("    " + line)

    print("\n[Done]")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    main()
