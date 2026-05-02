from core.model import Schedule
from core.config import (
    COVERAGE, SHIFTS, NUM_DAYS, WORKING_SHIFTS, NON_WORKING_SHIFTS, 
    FORBIDDEN_TRANSITIONS, HARD
)
from core.hard_constraints import _count_streak_before

def is_valid_for_greedy(schedule: Schedule, day: int, nurse_id: int, shift: str) -> bool:
    current_shift = schedule.get(day, nurse_id)

    prev_shift = schedule.get(day - 1, nurse_id) if day > 1 else None

    if prev_shift is not None and prev_shift != 'F' and (prev_shift, shift) in FORBIDDEN_TRANSITIONS:
        return False

    if shift in WORKING_SHIFTS:
        streak_before = _count_streak_before(schedule, day, nurse_id, WORKING_SHIFTS)
        if streak_before + 1 > HARD['max_consecutive_work_days']:
            return False

    if shift in NON_WORKING_SHIFTS:
        streak_before = _count_streak_before(schedule, day, nurse_id, NON_WORKING_SHIFTS)
        if streak_before + 1 > HARD['max_consecutive_rest_days']:
            return False

    if shift == 'N':
        streak_before = _count_streak_before(schedule, day, nurse_id, {'N'})
        if streak_before + 1 > HARD['max_consecutive_night_shifts']:
            return False

    delta_hours = SHIFTS[shift]['hours'] - SHIFTS[current_shift]['hours']
    new_total = schedule.total_hours(nurse_id) + delta_hours
    if new_total > HARD['max_monthly_hours']:
        return False

    return True


def generate_greedy_schedule(schedule: Schedule) -> Schedule:
    for day in range(1, NUM_DAYS + 1):
        day_of_week = (day - 1) % 7 + 1

        assigned_today = set()

        for shift_type in ['L', 'N', 'D']:
            req = COVERAGE[shift_type]['required']
            min_senior = COVERAGE[shift_type]['min_senior']

            candidates = [
                n for n in schedule.nurses
                if n.nurse_id not in assigned_today
                and is_valid_for_greedy(schedule, day, n.nurse_id, shift_type)
            ]

            def score_nurse(n, st=shift_type):
                forced = 0
                if day > 3:
                    rest_streak = 0
                    for d in range(day - 1, max(0, day - 4), -1):
                        if schedule.get(d, n.nurse_id) in NON_WORKING_SHIFTS:
                            rest_streak += 1
                        else:
                            break
                    if rest_streak >= 3:
                        forced = -1000

                requested_off = 1 if (n.day_off1 == day_of_week or n.day_off2 == day_of_week) else 0
                hours = schedule.total_hours(n.nurse_id)
                
                work_streak = 0
                for d in range(day - 1, max(0, day - 6), -1):
                    if schedule.get(d, n.nurse_id) in WORKING_SHIFTS:
                        work_streak += 1
                    else:
                        break

                nights = 0
                if st == 'N' and day > 1 and schedule.get(day - 1, n.nurse_id) == 'N':
                    nights = 1

                return (forced, requested_off, hours, work_streak, nights)

            candidates.sort(key=score_nurse)

            chosen = []
            chosen_ids = set()

            for n in candidates:
                if len(chosen) >= min_senior:
                    break
                if n.is_senior:
                    chosen.append(n)
                    chosen_ids.add(n.nurse_id)

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
            if nurse.nurse_id not in assigned_today:
                requested_off = (nurse.day_off1 == day_of_week or nurse.day_off2 == day_of_week)
                non_work_shift = 'O' if requested_off else 'F'

                if is_valid_for_greedy(schedule, day, nurse.nurse_id, non_work_shift):
                    schedule.set(day, nurse.nurse_id, non_work_shift)
                    assigned_today.add(nurse.nurse_id)
                else:
                    fallback_assigned = False
                    for fallback_shift in ['D', 'L', 'N']:
                        if is_valid_for_greedy(schedule, day, nurse.nurse_id, fallback_shift):
                            schedule.set(day, nurse.nurse_id, fallback_shift)
                            assigned_today.add(nurse.nurse_id)
                            fallback_assigned = True
                            break
                    if not fallback_assigned:
                        schedule.set(day, nurse.nurse_id, non_work_shift)
                        assigned_today.add(nurse.nurse_id)

    return schedule