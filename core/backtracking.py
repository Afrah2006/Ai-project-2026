from __future__ import annotations

import random
import time
from typing import Dict, List, Optional, Set, Tuple

from core.config import (
    NUM_DAYS, WORKING_SHIFTS, NON_WORKING_SHIFTS, COVERAGE,
    FORBIDDEN_TRANSITIONS, HARD, SHIFTS,
)
from core.model import Schedule, Nurse
from core.hard_constraints import check_all_hard

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
            # 1. Forced-work nurses first (approaching max rest)
            # 2. Low work-streak preferred (avoid bunching forced-rest days)
            # 3. Fewer alternatives first (lock constrained nurses early)
            # 4. Lower hours first (balance workload)
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
# Public entry point
# ---------------------------------------------------------------------------
def run_backtracking(
    nurses: list,
    time_limit_seconds: float = 300.0,
) -> Optional[Schedule]:
    """
    Build a hard-constraint-valid schedule using day-level backtracking
    with randomised greedy assignment, dynamic shift ordering, and
    smart nurse selection heuristics.

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
                      f"time={elapsed:.2f}s solved=True")
                return schedule

    elapsed = time.time() - start
    print(f"[Backtracking] time={elapsed:.2f}s solved=False")
    return None
