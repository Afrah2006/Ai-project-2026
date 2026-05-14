

from __future__ import annotations

import math
import random
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from core.evaluation import evaluate_schedule
from core.generate_neighbours import generate_neighbours
from core.hard_constraints import check_all_hard
from core.model import Schedule
from core.config import NUM_DAYS


# ---------------------------------------------------------------------------
# Result container
# ---------------------------------------------------------------------------

@dataclass
class SAResult:
    """Everything you might want to inspect after a SA run."""
    best_schedule:     Schedule
    best_score:        float
    initial_score:     float
    final_score:       float
    iterations:        int
    accepted_moves:    int
    rejected_moves:    int
    skipped_moves:     int
    best_iteration:    int
    final_temperature: float
    elapsed_seconds:   float
    history:           List[Dict[str, Any]] = field(default_factory=list)

    def summary(self) -> str:
        lines = [
            "=== Simulated Annealing Result ===",
            f"  Initial score      : {self.initial_score:.2f}",
            f"  Final score        : {self.final_score:.2f}",
            f"  Best score         : {self.best_score:.2f}",
            f"  Best found at iter : {self.best_iteration}",
            f"  Total iterations   : {self.iterations}",
            f"  Accepted moves     : {self.accepted_moves}",
            f"  Rejected moves     : {self.rejected_moves}",
            f"  Skipped (invalid)  : {self.skipped_moves}",
            f"  Final temperature  : {self.final_temperature:.6f}",
            f"  Elapsed time       : {self.elapsed_seconds:.2f}s",
            f"  Improvement        : {self.initial_score - self.best_score:.2f}",
        ]
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Acceptance criterion
# ---------------------------------------------------------------------------

def _accept_worse_move(delta: float, temperature: float) -> bool:
    """
    Metropolis acceptance criterion.

    Accepts a worse move (delta > 0 = higher penalty = worse) with
    probability exp(−delta / temperature).

    At high T  → probability ≈ 1  → explore freely.
    At low T   → probability ≈ 0  → converge on local optimum.

    The exponent is clamped at 700 to avoid math.exp overflow on very
    large deltas combined with a still-warm temperature.
    """
    if temperature <= 0.0:
        return False
    exponent = min(delta / temperature, 700.0)
    return random.random() < math.exp(-exponent)


def _random_same_day_swap(schedule: Schedule) -> Optional[Tuple[Schedule, Dict[str, Any]]]:
    """Return a hard-feasible swap between two nurses on the same day."""
    day = random.randint(1, NUM_DAYS)
    nurses = list(schedule.nurses)
    random.shuffle(nurses)

    for idx, nurse_a in enumerate(nurses):
        for nurse_b in nurses[idx + 1:]:
            shift_a = schedule.get(day, nurse_a.nurse_id)
            shift_b = schedule.get(day, nurse_b.nurse_id)
            if shift_a == shift_b:
                continue

            candidate = schedule.copy()
            candidate.set(day, nurse_a.nurse_id, shift_b)
            candidate.set(day, nurse_b.nurse_id, shift_a)
            if check_all_hard(candidate):
                continue

            return candidate, {
                "type": "same_day_swap",
                "day": day,
                "nurse_a": nurse_a.nurse_id,
                "shift_a": shift_a,
                "nurse_b": nurse_b.nurse_id,
                "shift_b": shift_b,
            }

    return None


def _sample_best_candidate(
    current_schedule: Schedule,
    current_score: float,
    samples: int,
    neighbour_mode: str,
    enforce_candidate_feasible: bool,
) -> Optional[Tuple[Schedule, float, Dict[str, Any]]]:
    """
    Sample several feasible moves and return the best scored candidate.

    The shared neighbour generator provides a small diverse batch. SA then
    fills the rest with direct same-day swaps, because those preserve coverage
    and tend to change the soft score more often.
    """
    best: Optional[Tuple[Schedule, float, Dict[str, Any]]] = None
    useful_count = 0

    generated_samples = 1
    neighbours = generate_neighbours(
        current_schedule,
        n_samples=generated_samples,
        mode=neighbour_mode,
    )

    for _ in range(max(0, samples - len(neighbours))):
        neighbour = _random_same_day_swap(current_schedule)
        if neighbour is not None:
            neighbours.append(neighbour)

    for candidate_schedule, move in neighbours:
        if enforce_candidate_feasible and check_all_hard(candidate_schedule):
            continue

        candidate_score = evaluate_schedule(candidate_schedule)
        if abs(candidate_score - current_score) <= 1e-9:
            continue

        useful_count += 1
        if best is None or candidate_score < best[1]:
            best = (candidate_schedule, candidate_score, move)

    for _ in range(max(0, 3 - useful_count)):
        neighbour = _random_same_day_swap(current_schedule)
        if neighbour is None:
            continue

        candidate_schedule, move = neighbour
        if enforce_candidate_feasible and check_all_hard(candidate_schedule):
            continue

        candidate_score = evaluate_schedule(candidate_schedule)
        if abs(candidate_score - current_score) <= 1e-9:
            continue

        if best is None or candidate_score < best[1]:
            best = (candidate_schedule, candidate_score, move)

    return best


# ---------------------------------------------------------------------------
# Main SA function
# ---------------------------------------------------------------------------

def simulated_annealing(
    initial_schedule: Schedule,
    # --- Temperature schedule ---
    initial_temperature: float = 150.0,
    cooling_rate:        float = 0.995,
    min_temperature:     float = 0.01,
    # --- Iteration budget ---
    max_iterations: int = 15_000,
    # --- Reheat (escape local optima) ---
    reheat_enabled:  bool  = True,
    reheat_patience: int   = 500,
    reheat_factor:   float = 0.25,
    max_reheats:     int   = 5,
    # --- Neighbour generation ---
    neighbour_mode: str = "weighted",
    candidates_per_iteration: int = 80,
    # --- Reproducibility ---
    seed: Optional[int] = None,
    # --- Logging ---
    log_every: int  = 200,
    verbose:   bool = False,
    # --- Safety guards ---
    require_initial_feasible:   bool = True,
    enforce_candidate_feasible: bool = True,
) -> SAResult:
    """
    Improve a hard-feasible schedule using Simulated Annealing.

    The schedule MUST come from a feasibility-guaranteed source —
    specifically core.generator.generate_csp_schedule().  SA does not
    repair infeasible schedules; it only optimises the soft-constraint score
    while keeping all hard constraints satisfied.

    Parameters
    ----------
    initial_schedule : Schedule
        A feasible starting point from the CSP generator (core/generator.py).

    initial_temperature : float
        Starting temperature T₀.  Higher = more exploration early on.
        Typical range for this problem: 50–300.

    cooling_rate : float in (0, 1)
        Geometric cooling: T ← T × rate each iteration.
        Typical: 0.990–0.999.  Smaller = faster cooling = less exploration.

    min_temperature : float
        SA halts once T falls below this value.

    max_iterations : int
        Hard cap regardless of temperature.

    reheat_enabled : bool
        When True, partially restore T whenever there is no improvement for
        `reheat_patience` consecutive iterations (up to `max_reheats` times).
        This is the primary mechanism for escaping deep local optima that
        the original Codex version lacked.

    reheat_patience : int
        Iterations without a new best before triggering a reheat.

    reheat_factor : float
        After a reheat: T ← initial_T × reheat_factor.

    max_reheats : int
        Maximum reheats per run.

    neighbour_mode : str
        Passed to generate_neighbours().
        'weighted' (default) | 'uniform' | 'swap_only'.

    candidates_per_iteration : int
        Number of feasible candidate moves sampled before each SA acceptance
        decision. Higher values improve move quality but cost more time.

    seed : int or None
        Fix for reproducibility.

    log_every : int
        Append a snapshot to result.history every N iterations. 0 = off.

    verbose : bool
        Print live progress to stdout.

    require_initial_feasible : bool
        Raise ValueError if the initial schedule has hard violations.

    enforce_candidate_feasible : bool
        Skip any candidate that fails check_all_hard() (belt-and-suspenders
        on top of the neighbour generator's own constraint checks).

    Returns
    -------
    SAResult with best_schedule, best_score, move counts, history, etc.

    Algorithm
    ---------
    ::

        T ← initial_temperature
        current, best ← csp_schedule   # feasible input from generator.py

        repeat until T < min_T or iter >= max_iter:
            candidate ← random_neighbour(current)
            if not feasible: skip
            delta ← score(candidate) − score(current)   # lower is better
            if delta ≤ 0 or random() < exp(−delta/T):
                current ← candidate
                if score(current) < score(best): best ← current
            T ← T × cooling_rate
            if stuck for reheat_patience iters:
                T ← initial_T × reheat_factor   # partial reheat

        return best
    """
    if seed is not None:
        random.seed(seed)

    if not (0 < cooling_rate < 1):
        raise ValueError("cooling_rate must be strictly between 0 and 1.")
    if initial_temperature <= 0:
        raise ValueError("initial_temperature must be positive.")
    if min_temperature < 0:
        raise ValueError("min_temperature cannot be negative.")
    if max_iterations <= 0:
        raise ValueError("max_iterations must be positive.")
    if candidates_per_iteration <= 0:
        raise ValueError("candidates_per_iteration must be positive.")

    # --- Feasibility guard on input ---
    initial_violations = check_all_hard(initial_schedule)
    if require_initial_feasible and initial_violations:
        raise ValueError(
            "The schedule passed to simulated_annealing() has hard-constraint "
            "violations. Ensure core.generator.generate_csp_schedule() produced "
            "a fully feasible schedule before calling SA.\n"
            f"First violations: {initial_violations[:5]}"
        )

    start_time = time.perf_counter()

    # --- State ---
    current_schedule = initial_schedule.copy()
    current_score    = evaluate_schedule(current_schedule)

    best_schedule  = current_schedule.copy()
    best_score     = current_score
    initial_score  = current_score
    best_iteration = 0

    temperature    = initial_temperature
    accepted_moves = 0
    rejected_moves = 0
    skipped_moves  = 0
    reheats_done   = 0
    no_improve_ctr = 0
    history: List[Dict[str, Any]] = []

    # --- Main loop ---
    iteration = 0
    while iteration < max_iterations and temperature > min_temperature:
        iteration += 1

        # 1. Sample feasible neighbours and keep the best scored candidate
        candidate = _sample_best_candidate(
            current_schedule=current_schedule,
            current_score=current_score,
            samples=candidates_per_iteration,
            neighbour_mode=neighbour_mode,
            enforce_candidate_feasible=enforce_candidate_feasible,
        )
        if candidate is None:
            skipped_moves  += 1
            no_improve_ctr += 1
            temperature *= cooling_rate
            continue

        candidate_schedule, candidate_score, _ = candidate
        delta = candidate_score - current_score   # negative = improvement

        if delta <= 0 or _accept_worse_move(delta, temperature):
            current_schedule = candidate_schedule
            current_score    = candidate_score
            accepted_moves  += 1

            if current_score < best_score:
                best_schedule  = current_schedule.copy()
                best_score     = current_score
                best_iteration = iteration
                no_improve_ctr = 0
            else:
                no_improve_ctr += 1
        else:
            rejected_moves += 1
            no_improve_ctr += 1

        # 4. Geometric cooling
        temperature *= cooling_rate

        # 5. Reheat if stuck
        if (reheat_enabled
                and no_improve_ctr >= reheat_patience
                and reheats_done < max_reheats
                and temperature > min_temperature):
            temperature    = initial_temperature * reheat_factor
            no_improve_ctr = 0
            reheats_done  += 1
            if verbose:
                print(
                    f"  [SA] Reheat #{reheats_done} at iter {iteration} "
                    f"→ T={temperature:.4f}"
                )

        # 6. Log snapshot
        if log_every > 0 and iteration % log_every == 0:
            history.append({
                "iteration":     iteration,
                "temperature":   round(temperature, 6),
                "current_score": round(current_score, 4),
                "best_score":    round(best_score, 4),
                "reheats":       reheats_done,
            })
            if verbose:
                print(
                    f"  [SA] iter={iteration:>6}  T={temperature:8.4f}  "
                    f"cur={current_score:10.2f}  best={best_score:10.2f}"
                )

    elapsed = time.perf_counter() - start_time

    return SAResult(
        best_schedule=best_schedule,
        best_score=best_score,
        initial_score=initial_score,
        final_score=current_score,
        iterations=iteration,
        accepted_moves=accepted_moves,
        rejected_moves=rejected_moves,
        skipped_moves=skipped_moves,
        best_iteration=best_iteration,
        final_temperature=temperature,
        elapsed_seconds=elapsed,
        history=history,
    )


# ---------------------------------------------------------------------------
# Convenience wrapper
# ---------------------------------------------------------------------------

def run_sa(
    initial_schedule: Schedule,
    **kwargs: Any,
) -> Tuple[Schedule, float]:
    """
    Lightweight wrapper returning only (best_schedule, best_score).

    All keyword arguments are forwarded to simulated_annealing().

    Example
    -------
    >>> from core.generator import generate_csp_schedule
    >>> from core.model import load_nurses_from_csv
    >>> nurses   = load_nurses_from_csv('data/data_ai_project.csv')
    >>> schedule = generate_csp_schedule(nurses, seed=0)
    >>> best, score = run_sa(schedule, max_iterations=10_000, seed=0)
    """
    result = simulated_annealing(initial_schedule, **kwargs)
    return result.best_schedule, result.best_score
