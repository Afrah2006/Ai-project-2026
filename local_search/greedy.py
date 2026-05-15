from core.model import Schedule
from core.config import (
    COVERAGE, SHIFTS, NUM_DAYS, WORKING_SHIFTS, NON_WORKING_SHIFTS,
    FORBIDDEN_TRANSITIONS, HARD
)
from core.hard_constraints import _count_streak_before




def is_valid_for_greedy(schedule: Schedule, day: int, nurse_id: int, shift: str) -> bool:
    """
    Return True only when assigning `shift` on `day` to `nurse_id` violates
    NO hard constraint.  Soft constraints are intentionally ignored here.
    """

    # 1. Forbidden shift transitions (previous day → today)
    if day > 1:
        prev_shift = schedule.get(day - 1, nurse_id)
        if prev_shift is not None and (prev_shift, shift) in FORBIDDEN_TRANSITIONS:
            return False

    # 2. Max consecutive working days
    if shift in WORKING_SHIFTS:
        streak_before = _count_streak_before(schedule, day, nurse_id, WORKING_SHIFTS)
        if streak_before + 1 > HARD['max_consecutive_work_days']:
            return False

    # 3. Max consecutive rest days
    if shift in NON_WORKING_SHIFTS:
        streak_before = _count_streak_before(schedule, day, nurse_id, NON_WORKING_SHIFTS)
        if streak_before + 1 > HARD['max_consecutive_rest_days']:
            return False

    # 4. Max consecutive night shifts
    if shift == 'N':
        streak_before = _count_streak_before(schedule, day, nurse_id, {'N'})
        if streak_before + 1 > HARD['max_consecutive_night_shifts']:
            return False

   
    new_total = schedule.total_hours(nurse_id) + SHIFTS[shift]['hours']
    if new_total > HARD['max_monthly_hours']:
        return False

    return True



def _score_nurse(schedule: Schedule, day: int, day_of_week: int,
                 nurse, shift_type: str) -> tuple:
  
    # — Force nurses out of a long rest streak (soft nudge toward work)
    forced = 0
    if day > 3:
        rest_streak = 0
        for d in range(day - 1, max(0, day - 4), -1):
            if schedule.get(d, nurse.nurse_id) in NON_WORKING_SHIFTS:
                rest_streak += 1
            else:
                break
        if rest_streak >= 3:
            forced = -1000          # strongly prefer to give them a shift

    # — Prefer nurses who did NOT request this day off
    requested_off = 1 if (nurse.day_off1 == day_of_week
                          or nurse.day_off2 == day_of_week) else 0

    # — Prefer nurses with fewer accumulated hours (load balancing)
    hours = schedule.total_hours(nurse.nurse_id)

    # — Prefer nurses with shorter current work streaks (avoid burnout)
    work_streak = 0
    for d in range(day - 1, max(0, day - 6), -1):
        if schedule.get(d, nurse.nurse_id) in WORKING_SHIFTS:
            work_streak += 1
        else:
            break

    # — For nights, prefer nurses already on a night run (continuity)
    night_continuity = 0
    if shift_type == 'N' and day > 1 and schedule.get(day - 1, nurse.nurse_id) == 'N':
        night_continuity = -1       # negative = preferred

    return (forced, requested_off, hours, work_streak, night_continuity)


def generate_greedy_schedule(schedule: Schedule) -> Schedule:
   

    for day in range(1, NUM_DAYS + 1):
        day_of_week = (day - 1) % 7 + 1
        assigned_today: set[int] = set()

   
        working_shift_types = list(COVERAGE.keys())   # e.g. ['D', 'L', 'N']

        def _scarcity(st):
            return len([
                n for n in schedule.nurses
                if n.nurse_id not in assigned_today
                and is_valid_for_greedy(schedule, day, n.nurse_id, st)
            ])

        working_shift_types.sort(key=_scarcity)       # ascending: fewest first

       
        for shift_type in working_shift_types:
            req       = COVERAGE[shift_type]['required']
            min_senior = COVERAGE[shift_type]['min_senior']

            
            candidates = [
                n for n in schedule.nurses
                if n.nurse_id not in assigned_today
                and is_valid_for_greedy(schedule, day, n.nurse_id, shift_type)
            ]

            candidates.sort(
                key=lambda n: _score_nurse(schedule, day, day_of_week, n, shift_type)
            )

            chosen: list  = []
            chosen_ids: set[int] = set()

            #Fill senior quota first
            for n in candidates:
                if len(chosen) >= min_senior:
                    break
                if n.is_senior:
                    chosen.append(n)
                    chosen_ids.add(n.nurse_id)

            #Top up to required (any seniority)
            for n in candidates:
                if len(chosen) >= req:
                    break
                if n.nurse_id not in chosen_ids:
                    chosen.append(n)
                    chosen_ids.add(n.nurse_id)

            for n in chosen:
                schedule.set(day, n.nurse_id, shift_type)
                assigned_today.add(n.nurse_id)

       
        for nurse in schedule.nurses:
            if nurse.nurse_id in assigned_today:
                continue

            requested_off = (nurse.day_off1 == day_of_week
                             or nurse.day_off2 == day_of_week)
            preferred_rest = 'O'

            if is_valid_for_greedy(schedule, day, nurse.nurse_id, preferred_rest):
               
                schedule.set(day, nurse.nurse_id, preferred_rest)

            else:
               
                fallback_assigned = False

               
                fallback_shifts = sorted(
                    working_shift_types,
                    key=lambda st: sum(
                        1 for n in schedule.nurses
                        if schedule.get(day, n.nurse_id) == st
                    )                                 
                )

                for fallback_shift in fallback_shifts:
                    if is_valid_for_greedy(schedule, day, nurse.nurse_id, fallback_shift):
                        schedule.set(day, nurse.nurse_id, fallback_shift)
                        assigned_today.add(nurse.nurse_id)
                        fallback_assigned = True
                        break

                if not fallback_assigned:
                   
                    import warnings
                    warnings.warn(
                        f"[Greedy] No hard-feasible shift found for nurse "
                        f"{nurse.nurse_id} on day {day}. "
                        f"Assigning '{preferred_rest}' as emergency fallback. "
                        f"Check your HARD constraint configuration.",
                        RuntimeWarning,
                        stacklevel=2,
                    )
                    schedule.set(day, nurse.nurse_id, preferred_rest)

            assigned_today.add(nurse.nurse_id)

    return schedule
