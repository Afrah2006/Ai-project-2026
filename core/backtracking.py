from __future__ import annotations

import copy
import random
import time
from typing import Dict, List, Optional, Set, Tuple

from core.config import (
    NUM_DAYS, WORKING_SHIFTS, NON_WORKING_SHIFTS, COVERAGE,
    FORBIDDEN_TRANSITIONS, HARD, SHIFTS, ALL_SHIFT_CODES,
)
from core.model import Schedule, Nurse
from core.hard_constraints import check_all_hard
from core.propagation import (
    get_initial_domains,
    forward_check,
    ac3_propagate,
    Domains,
)

_ASSIGNABLE = {'D', 'L', 'N', 'O'}


# ---------------------------------------------------------------------------
# Relaxed validity check for incremental construction
# ---------------------------------------------------------------------------
def _is_valid_for_bt(schedule, day, nurse_id, shift):
    """Check if assigning shift to nurse on day is valid during construction."""
    if day > 1:
        prev = schedule.get(day - 1, nurse_id)
        if prev != 'F' and (prev, shift) in FORBIDDEN_TRANSITIONS:
            return False
    if day < NUM_DAYS:
        nxt = schedule.get(day + 1, nurse_id)
        if nxt != 'F' and (shift, nxt) in FORBIDDEN_TRANSITIONS:
            return False
    if shift in WORKING_SHIFTS:
        streak = 1
        d = day - 1
        while d >= 1 and schedule.get(d, nurse_id) in WORKING_SHIFTS:
            streak += 1; d -= 1
        if streak > HARD['max_consecutive_work_days']:
            return False
    if shift == 'O':
        streak = 1
        d = day - 1
        while d >= 1 and schedule.get(d, nurse_id) == 'O':
            streak += 1; d -= 1
        if streak > HARD['max_consecutive_rest_days']:
            return False
    if shift == 'N':
        streak = 1
        d = day - 1
        while d >= 1 and schedule.get(d, nurse_id) == 'N':
            streak += 1; d -= 1
        if streak > HARD['max_consecutive_night_shifts']:
            return False
    current = schedule.get(day, nurse_id)
    delta = SHIFTS[shift]['hours'] - SHIFTS[current]['hours']
    if schedule.total_hours(nurse_id) + delta > HARD['max_monthly_hours']:
        return False
    return True


# ---------------------------------------------------------------------------
# Fill one day — dynamic shift ordering + smart nurse selection
# ---------------------------------------------------------------------------
def _fill_day(schedule, nurses, day):
    """Assign all nurses for one day. Returns True on success."""
    assigned: Set[int] = set()
    shifts_left = list(COVERAGE.keys())  # ['D', 'L', 'N']

    # Process shifts in order of tightest constraint (fewest excess eligible)
    while shifts_left:
        best_shift = None
        best_slack = float('inf')
        best_eligible = []

        for sc in shifts_left:
            elig = [n for n in nurses
                    if n.nurse_id not in assigned
                    and _is_valid_for_bt(schedule, day, n.nurse_id, sc)]
            slack = len(elig) - COVERAGE[sc]['required']
            if slack < best_slack:
                best_slack = slack
                best_shift = sc
                best_eligible = elig

        if best_slack < 0:
            for nid in assigned:
                schedule.set(day, nid, 'F')
            return False

        sc = best_shift
        shifts_left.remove(sc)
        req = COVERAGE[sc]['required']
        min_sr = COVERAGE[sc]['min_senior']
        eligible = best_eligible

        seniors = [n for n in eligible if n.is_senior]
        juniors = [n for n in eligible if not n.is_senior]

        if len(seniors) < min_sr:
            for nid in assigned:
                schedule.set(day, nid, 'F')
            return False

        # Prefer nurses with fewer alternative shifts (save flexible ones)
        def _alt(n):
            return sum(1 for s2 in shifts_left
                       if _is_valid_for_bt(schedule, day, n.nurse_id, s2))

        def _work_streak(n):
            streak = 0
            d = day - 1
            while d >= 1 and schedule.get(d, n.nurse_id) in WORKING_SHIFTS:
                streak += 1; d -= 1
            return streak

        def _rest_streak(n):
            streak = 0
            d = day - 1
            while d >= 1 and schedule.get(d, n.nurse_id) == 'O':
                streak += 1; d -= 1
            return streak

        def _sort_key(n):
            return (-_rest_streak(n), _work_streak(n), _alt(n),
                    schedule.total_hours(n.nurse_id), random.random())

        seniors.sort(key=_sort_key)
        juniors.sort(key=_sort_key)

        chosen_sr = seniors[:min_sr]
        chosen_ids = {n.nurse_id for n in chosen_sr}
        rest_pool = [n for n in seniors[min_sr:]] + juniors
        rest_pool.sort(key=_sort_key)
        chosen_fill = rest_pool[:req - min_sr]
        chosen = chosen_sr + chosen_fill

        for n in chosen:
            schedule.set(day, n.nurse_id, sc)
            assigned.add(n.nurse_id)

    # Remaining nurses get 'O' or fallback
    for nurse in nurses:
        if nurse.nurse_id not in assigned:
            if _is_valid_for_bt(schedule, day, nurse.nurse_id, 'O'):
                schedule.set(day, nurse.nurse_id, 'O')
            else:
                placed = False
                for fb in ('D', 'L', 'N'):
                    cur = sum(1 for nid in assigned
                              if schedule.get(day, nid) == fb)
                    if (cur < COVERAGE[fb]['required']
                            and _is_valid_for_bt(schedule, day, nurse.nurse_id, fb)):
                        schedule.set(day, nurse.nurse_id, fb)
                        placed = True
                        break
                if not placed:
                    _clear_day(schedule, nurses, day)
                    return False
            assigned.add(nurse.nurse_id)
    return True


def _clear_day(schedule, nurses, day):
    for nurse in nurses:
        schedule.set(day, nurse.nurse_id, 'F')


# ---------------------------------------------------------------------------
# Propagation-guided repair phase
# ---------------------------------------------------------------------------
def _find_violating_nurses(schedule, violations):
    """Parse violation strings to extract (nurse_id, day) pairs to repair."""
    import re
    targets: Set[Tuple[int, int]] = set()
    for v in violations:
        # Match nurse-based violations: [Hx] Nurse <id> ...day <d>...
        m_nurse = re.search(r'Nurse\s+(\d+)', v)
        m_day = re.search(r'day\s+(\d+)', v)
        m_days = re.search(r'days\s+(\d+)', v)
        if m_nurse and (m_day or m_days):
            nid = int(m_nurse.group(1))
            d = int((m_day or m_days).group(1))
            targets.add((nid, d))
        # Match coverage violations: [H6] Day <d> shift ...
        m_cov = re.search(r'Day\s+(\d+)\s+shift', v)
        if m_cov:
            d = int(m_cov.group(1))
            for nurse in schedule.nurses:
                targets.add((nurse.nurse_id, d))
    return targets


def _propagation_repair(schedule, nurses, time_limit, start_time):
    """
    Use propagation (forward_check + ac3_propagate) to repair constraint
    violations in a completed schedule.

    Strategy:
    1. Identify cells involved in violations.
    2. Reset them to 'F' (free).
    3. Compute domains via get_initial_domains (uses is_valid_assignment).
    4. Re-assign using domain values, applying forward_check after each
       assignment for early dead-end detection.
    5. Optionally run ac3_propagate for deeper arc-consistency pruning.

    Returns True if all violations are repaired, False otherwise.
    """
    MAX_REPAIR_ROUNDS = 10

    for repair_round in range(MAX_REPAIR_ROUNDS):
        if time.time() - start_time > time_limit:
            return False

        violations = check_all_hard(schedule)
        if not violations:
            return True

        # Identify violating variables
        targets = _find_violating_nurses(schedule, violations)
        if not targets:
            return False

        # Pick a subset to repair (limit scope to avoid cascading failures)
        repair_vars = list(targets)
        random.shuffle(repair_vars)
        repair_vars = repair_vars[:min(len(repair_vars), 15)]

        # Save the state before repair attempt
        saved_grid = dict(schedule.grid)

        # Clear the targeted cells
        for nid, d in repair_vars:
            if 1 <= d <= NUM_DAYS and nid in schedule.nurse_by_id:
                schedule.set(d, nid, 'F')

        # Get domains using propagation module
        domains = get_initial_domains(schedule)

        # Run AC-3 to achieve arc consistency and prune domains
        consistent = ac3_propagate(schedule, domains)
        if not consistent:
            # AC-3 found inconsistency; restore and try different subset
            schedule.grid = saved_grid
            continue

        # Sort repair variables: most constrained first (smallest domain)
        repair_vars.sort(key=lambda v: len(domains.get(v, set())))

        success = True
        assigned_during_repair: List[Tuple[int, int]] = []

        for var in repair_vars:
            nid, d = var
            if schedule.get(d, nid) != 'F':
                continue  # already assigned by another repair

            domain = domains.get(var, set())
            if not domain:
                # No valid assignment from propagation; fall back to
                # relaxed check for options
                domain = {s for s in ALL_SHIFT_CODES
                          if _is_valid_for_bt(schedule, d, nid, s)}

            if not domain:
                success = False
                break

            # Try values in a smart order: prefer the shift that was
            # originally assigned (if in domain), then others
            orig_shift = saved_grid.get((d, nid), 'F')
            ordered = sorted(domain,
                             key=lambda s: (s != orig_shift, random.random()))

            placed = False
            for shift in ordered:
                schedule.set(d, nid, shift)
                assigned_during_repair.append(var)

                # Use forward_check from propagation to prune domains
                # of neighboring variables
                fc_ok = forward_check(schedule, d, nid, domains)
                if fc_ok:
                    placed = True
                    break
                else:
                    # Forward check detected dead end; undo and try next
                    schedule.set(d, nid, 'F')
                    assigned_during_repair.pop()
                    # Restore domains for affected neighbors
                    domains = get_initial_domains(schedule)

            if not placed:
                # Try relaxed assignment as fallback
                for shift in ALL_SHIFT_CODES:
                    if _is_valid_for_bt(schedule, d, nid, shift):
                        schedule.set(d, nid, shift)
                        assigned_during_repair.append(var)
                        placed = True
                        break

            if not placed:
                success = False
                break

        if not success:
            # Restore and retry with different random subset
            schedule.grid = saved_grid
            continue

        # Verify the full schedule after repairs
        new_violations = check_all_hard(schedule)
        if not new_violations:
            return True

        # If violations got worse, restore
        if len(new_violations) > len(violations):
            schedule.grid = saved_grid

    return False


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def run_backtracking(
    nurses: list,
    time_limit_seconds: float = 300.0,
) -> Optional[Schedule]:
    """
    Build a hard-constraint-valid schedule using day-level backtracking
    with randomised greedy assignment, dynamic shift ordering, smart
    nurse selection heuristics, and propagation-based repair.

    The algorithm has two phases:
      Phase 1 — Greedy day-level construction with backtracking.
      Phase 2 — Propagation-guided repair using forward_check and
                ac3_propagate from propagation.py to fix any remaining
                hard-constraint violations.

    Parameters
    ----------
    nurses : list of Nurse
    time_limit_seconds : float

    Returns
    -------
    Schedule or None
    """
    MAX_RESTARTS = 50
    MAX_BT = 300
    start = time.time()

    for restart in range(MAX_RESTARTS):
        if time.time() - start > time_limit_seconds:
            break

        schedule = Schedule(nurses)
        day = 1
        bt = 0

        # === Phase 1: Greedy day-level construction with backtracking ===
        while day <= NUM_DAYS:
            if time.time() - start > time_limit_seconds:
                break
            if _fill_day(schedule, nurses, day):
                day += 1
            else:
                bt += 1
                if bt > MAX_BT:
                    break
                _clear_day(schedule, nurses, day)
                back = min(3, day - 1) if bt % 5 == 0 else min(1, day - 1)
                for _ in range(back):
                    if day > 1:
                        _clear_day(schedule, nurses, day - 1)
                        day -= 1

        if day > NUM_DAYS:
            violations = check_all_hard(schedule)
            if not violations:
                elapsed = time.time() - start
                print(f"[Backtracking] restart={restart} bt={bt} "
                      f"time={elapsed:.2f}s solved=True (phase 1)")
                return schedule

            # === Phase 2: Propagation-guided repair ===
            print(f"[Backtracking] restart={restart} bt={bt} "
                  f"violations={len(violations)}, attempting propagation repair...")

            if _propagation_repair(schedule, nurses,
                                   time_limit_seconds, start):
                elapsed = time.time() - start
                print(f"[Backtracking] restart={restart} "
                      f"time={elapsed:.2f}s solved=True (propagation repair)")
                return schedule

    elapsed = time.time() - start
    print(f"[Backtracking] time={elapsed:.2f}s solved=False")
    return None
