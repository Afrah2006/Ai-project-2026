# =============================================================================
# core/hard_constraints.py — Hard constraint checkers for the Nurse Scheduling System
# =============================================================================
# All checkers operate on a Schedule object and return a list of violation
# strings (empty list = no violations for that constraint).
#
# Public API:
#   check_all_hard(schedule)         → List[str]  (all violations combined)
#   is_valid_assignment(schedule, day, nurse_id, shift) → bool
#       (used by SA / Tabu before accepting a swap)
# =============================================================================

from __future__ import annotations

from typing import List

from core.config import (
    NUM_DAYS, NUM_NURSES, SHIFTS, WORKING_SHIFTS, NON_WORKING_SHIFTS,
    FORBIDDEN_TRANSITIONS, COVERAGE, HARD, SENIORITY_SENIOR,
)
from core.model import Schedule, Nurse


# ---------------------------------------------------------------------------
# H1 — One shift per day
# ---------------------------------------------------------------------------

def check_one_shift_per_day(schedule: Schedule) -> List[str]:
    """
    Each nurse must be assigned exactly one shift code per day.
    The Schedule grid guarantees a single entry per (day, nurse_id) cell,
    so this check validates that the code is a legal shift code.
    (Belt-and-suspenders guard — model.set() already enforces this.)
    """
    violations: List[str] = []
    for nurse in schedule.nurses:
        for day in range(1, NUM_DAYS + 1):
            shift = schedule.get(day, nurse.nurse_id)
            if shift not in SHIFTS:
                violations.append(
                    f"[H1] Nurse {nurse.nurse_id} day {day}: "
                    f"invalid shift code '{shift}'"
                )
    return violations


# ---------------------------------------------------------------------------
# H2 — Forbidden shift transitions (minimum rest between shifts)
# ---------------------------------------------------------------------------

def check_forbidden_transitions(schedule: Schedule) -> List[str]:
    """
    Certain back-to-back shift pairs are forbidden because they leave fewer
    than the required 8 h rest between the end of one shift and the start of
    the next:
        D→L  (Day ends 16:00, Late starts 16:00 — 0 h gap)
        L→N  (Late ends 24:00, Night starts 00:00 — 0 h gap)
        N→D  (Night ends 08:00, Day starts 08:00 — 0 h gap)
        N→L  (Night ends 08:00, Late starts 16:00 — exactly 8 h, need > 8 h)

    Day boundaries wrap: day 28 → day 1 is NOT checked (end of period).
    """
    violations: List[str] = []
    for nurse in schedule.nurses:
        nid = nurse.nurse_id
        for day in range(1, NUM_DAYS):          # day → day+1
            today = schedule.get(day, nid)
            tomorrow = schedule.get(day + 1, nid)
            if (today, tomorrow) in FORBIDDEN_TRANSITIONS:
                violations.append(
                    f"[H2] Nurse {nid} forbidden transition "
                    f"'{today}'→'{tomorrow}' on days {day}→{day + 1}"
                )
    return violations


# ---------------------------------------------------------------------------
# H3 — Maximum 5 consecutive working days
# ---------------------------------------------------------------------------

def check_max_consecutive_work_days(schedule: Schedule) -> List[str]:
    """
    No nurse may work more than HARD['max_consecutive_work_days'] (= 5)
    working days in a row (D, L, or N).
    """
    max_consec = HARD['max_consecutive_work_days']
    violations: List[str] = []

    for nurse in schedule.nurses:
        nid = nurse.nurse_id
        streak = 0
        for day in range(1, NUM_DAYS + 1):
            if schedule.get(day, nid) in WORKING_SHIFTS:
                streak += 1
                if streak > max_consec:
                    violations.append(
                        f"[H3] Nurse {nid}: {streak} consecutive working days "
                        f"ending on day {day} (max {max_consec})"
                    )
            else:
                streak = 0
    return violations


# ---------------------------------------------------------------------------
# H4 — Maximum 3 consecutive rest days
# ---------------------------------------------------------------------------

def check_max_consecutive_rest_days(schedule: Schedule) -> List[str]:
    """
    No nurse may have more than HARD['max_consecutive_rest_days'] (= 3)
    consecutive non-working days (O or F).
    Equivalently: max 72 h of not-working time in a row.
    """
    max_consec = HARD['max_consecutive_rest_days']
    violations: List[str] = []

    for nurse in schedule.nurses:
        nid = nurse.nurse_id
        streak = 0
        for day in range(1, NUM_DAYS + 1):
            if schedule.get(day, nid) in NON_WORKING_SHIFTS:
                streak += 1
                if streak > max_consec:
                    violations.append(
                        f"[H4] Nurse {nid}: {streak} consecutive rest days "
                        f"ending on day {day} (max {max_consec})"
                    )
            else:
                streak = 0
    return violations


# ---------------------------------------------------------------------------
# H5 — Monthly hours: min 80 h, max 160 h
# ---------------------------------------------------------------------------

def check_monthly_hours(schedule: Schedule) -> List[str]:
    """
    Each nurse's total working hours over the 28-day period must be within
    [HARD['min_monthly_hours'], HARD['max_monthly_hours']] = [80, 160].
    """
    min_h = HARD['min_monthly_hours']
    max_h = HARD['max_monthly_hours']
    violations: List[str] = []

    for nurse in schedule.nurses:
        nid = nurse.nurse_id
        total = schedule.total_hours(nid)
        if total < min_h:
            violations.append(
                f"[H5] Nurse {nid}: only {total} h worked (min {min_h} h)"
            )
        elif total > max_h:
            violations.append(
                f"[H5] Nurse {nid}: {total} h worked (max {max_h} h)"
            )
    return violations


# ---------------------------------------------------------------------------
# H6 — Daily coverage: required headcount + at least one senior per shift
# ---------------------------------------------------------------------------

def check_daily_coverage(schedule: Schedule) -> List[str]:
    """
    For every day and every working shift type (D, L, N):
      • exactly COVERAGE[shift]['required'] nurses must be assigned
      • at least COVERAGE[shift]['min_senior'] of them must be senior

    Note: 'exactly' is used here; the coverage numbers in config are
    requirements, not upper bounds. A generator that produces fewer workers
    is just as wrong as one that produces more.
    """
    violations: List[str] = []

    for day in range(1, NUM_DAYS + 1):
        assignments = schedule.get_day_assignments(day)    # {nurse_id: shift}

        for shift_code, req in COVERAGE.items():
            required = req['required']
            min_senior = req['min_senior']

            # Nurses assigned to this shift today
            assigned_nurses = [
                schedule.nurse_by_id[nid]
                for nid, s in assignments.items()
                if s == shift_code
            ]
            count = len(assigned_nurses)
            senior_count = sum(1 for n in assigned_nurses if n.is_senior)

            if count != required:
                violations.append(
                    f"[H6] Day {day} shift '{shift_code}': "
                    f"{count} nurses assigned (required {required})"
                )
            if senior_count < min_senior:
                violations.append(
                    f"[H6] Day {day} shift '{shift_code}': "
                    f"{senior_count} senior(s) assigned (min {min_senior})"
                )
    return violations


# ---------------------------------------------------------------------------
# H7 — Max 2 consecutive night shifts
# ---------------------------------------------------------------------------

def check_max_consecutive_night_shifts(schedule: Schedule) -> List[str]:
    """
    No nurse may work more than HARD['max_consecutive_night_shifts'] (= 2)
    night shifts ('N') in a row. This is listed as a soft constraint in the
    project spec but also enforced as a hard limit by the config.
    """
    max_consec = HARD['max_consecutive_night_shifts']
    violations: List[str] = []

    for nurse in schedule.nurses:
        nid = nurse.nurse_id
        streak = 0
        for day in range(1, NUM_DAYS + 1):
            if schedule.get(day, nid) == 'N':
                streak += 1
                if streak > max_consec:
                    violations.append(
                        f"[H7] Nurse {nid}: {streak} consecutive night shifts "
                        f"ending on day {day} (max {max_consec})"
                    )
            else:
                streak = 0
    return violations


# ---------------------------------------------------------------------------
# Master checker
# ---------------------------------------------------------------------------

def check_all_hard(schedule: Schedule) -> List[str]:
    """
    Run every hard-constraint checker and return the combined list of
    violation messages.  An empty list means the schedule is feasible.
    """
    violations: List[str] = []
    violations.extend(check_one_shift_per_day(schedule))
    violations.extend(check_forbidden_transitions(schedule))
    violations.extend(check_max_consecutive_work_days(schedule))
    violations.extend(check_max_consecutive_rest_days(schedule))
    violations.extend(check_monthly_hours(schedule))
    violations.extend(check_daily_coverage(schedule))
    violations.extend(check_max_consecutive_night_shifts(schedule))
    return violations


# ---------------------------------------------------------------------------
# Single-assignment validator (used by SA / Tabu before accepting swaps)
# ---------------------------------------------------------------------------

def is_valid_assignment(schedule: Schedule, day: int, nurse_id: int, shift: str) -> bool:
    """
    Check whether tentatively assigning `shift` to `nurse_id` on `day` would
    violate any hard constraint, WITHOUT modifying the schedule.

    This is called by the local-search algorithms before committing a swap, so
    it must be fast and must not mutate the schedule.

    Checks performed (in short-circuit order):
      1. Forbidden transition with the previous day's shift.
      2. Forbidden transition with the next day's shift.
      3. Consecutive working-day streak (5-day cap).
      4. Consecutive rest-day streak (3-day cap) — only if shift is non-working.
      5. Consecutive night-shift streak (2-night cap).
      6. Monthly hours bounds after the proposed change.
      7. Daily coverage feasibility (headcount + senior requirement).

    Returns True iff all checks pass.
    """
    current_shift = schedule.get(day, nurse_id)

    # --- Transition checks ---
    prev_shift = schedule.get(day - 1, nurse_id) if day > 1 else None
    next_shift = schedule.get(day + 1, nurse_id) if day < NUM_DAYS else None

    if prev_shift is not None and (prev_shift, shift) in FORBIDDEN_TRANSITIONS:
        return False
    if next_shift is not None and (shift, next_shift) in FORBIDDEN_TRANSITIONS:
        return False

    # --- Consecutive working days ---
    if shift in WORKING_SHIFTS:
        streak_before = _count_streak_before(schedule, day, nurse_id, WORKING_SHIFTS)
        streak_after = _count_streak_after(schedule, day, nurse_id, WORKING_SHIFTS)
        if streak_before + 1 + streak_after > HARD['max_consecutive_work_days']:
            return False

    # --- Consecutive rest days ---
    if shift in NON_WORKING_SHIFTS:
        streak_before = _count_streak_before(schedule, day, nurse_id, NON_WORKING_SHIFTS)
        streak_after = _count_streak_after(schedule, day, nurse_id, NON_WORKING_SHIFTS)
        if streak_before + 1 + streak_after > HARD['max_consecutive_rest_days']:
            return False

    # --- Consecutive night shifts ---
    if shift == 'N':
        streak_before = _count_streak_before(schedule, day, nurse_id, {'N'})
        streak_after = _count_streak_after(schedule, day, nurse_id, {'N'})
        if streak_before + 1 + streak_after > HARD['max_consecutive_night_shifts']:
            return False

    # --- Monthly hours ---
    delta_hours = SHIFTS[shift]['hours'] - SHIFTS[current_shift]['hours']
    new_total = schedule.total_hours(nurse_id) + delta_hours
    if not (HARD['min_monthly_hours'] <= new_total <= HARD['max_monthly_hours']):
        return False

    # --- Daily coverage (check the affected day only) ---
    if not _coverage_ok_after_change(schedule, day, nurse_id, current_shift, shift):
        return False

    return True


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _count_streak_before(
    schedule: Schedule,
    day: int,
    nurse_id: int,
    shift_set: set,
) -> int:
    """Count how many consecutive days immediately before `day` have a shift in `shift_set`."""
    count = 0
    d = day - 1
    while d >= 1 and schedule.get(d, nurse_id) in shift_set:
        count += 1
        d -= 1
    return count


def _count_streak_after(
    schedule: Schedule,
    day: int,
    nurse_id: int,
    shift_set: set,
) -> int:
    """Count how many consecutive days immediately after `day` have a shift in `shift_set`."""
    count = 0
    d = day + 1
    while d <= NUM_DAYS and schedule.get(d, nurse_id) in shift_set:
        count += 1
        d += 1
    return count


def _coverage_ok_after_change(
    schedule: Schedule,
    day: int,
    nurse_id: int,
    old_shift: str,
    new_shift: str,
) -> bool:
    """
    Simulate replacing `old_shift` with `new_shift` for `nurse_id` on `day`
    and verify that coverage constraints are still met.

    For working shifts we require exactly the required number of nurses AND
    at least one senior — so we verify both directions (the shift being
    vacated and the shift being taken).
    """
    nurse = schedule.nurse_by_id[nurse_id]
    assignments = schedule.get_day_assignments(day)

    for shift_code, req in COVERAGE.items():
        required = req['required']
        min_senior = req['min_senior']

        # Compute current count for this shift code on that day
        current_count = sum(1 for s in assignments.values() if s == shift_code)
        current_seniors = sum(
            1 for nid, s in assignments.items()
            if s == shift_code and schedule.nurse_by_id[nid].is_senior
        )

        # Adjust for the proposed change
        new_count = current_count
        new_seniors = current_seniors

        if old_shift == shift_code:
            new_count -= 1
            if nurse.is_senior:
                new_seniors -= 1

        if new_shift == shift_code:
            new_count += 1
            if nurse.is_senior:
                new_seniors += 1

        # Validate only working shifts (O / F have no coverage requirement)
        if shift_code in WORKING_SHIFTS:
            if new_count != required:
                return False
            if new_seniors < min_senior:
                return False

    return True