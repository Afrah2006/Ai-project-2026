"""Fast initial schedule generator with hard-constraint checks. (don't worry about soft constraints here, we'll fix those later)"""
from __future__ import annotations
import random
from typing import List, Set
from core.config import (
	NUM_DAYS, COVERAGE, FORBIDDEN_TRANSITIONS, HARD, SHIFTS,
	WORKING_SHIFTS, NON_WORKING_SHIFTS,
)
from core.model import Nurse, Schedule
from core.generator_helpers import _eligible, _consecutive_rest
MAX_BACKTRACK = 200
RANDOM_SEED = None

def _meets_min_hours(schedule: Schedule) -> bool:
	min_hours = HARD["min_monthly_hours"]
	for nurse in schedule.nurses:
		# Verify each nurse reaches the minimum monthly hours.
		total = schedule.total_hours(nurse.nurse_id)
		if total < min_hours:
			return False
	return True

#main function that generate the schedule
def generate_schedule(nurses: List[Nurse], seed: int | None = RANDOM_SEED) -> Schedule:
	if seed is not None:
		random.seed(seed)
	schedule = Schedule(nurses)
	day = 1
	backtrack_count = 0
	while day <= NUM_DAYS:
		# Try to fill a single day; backtrack if coverage fails.
		success = _fill_day(schedule, nurses, day)
		if success:
			day += 1
		else:
			backtrack_count += 1
			if backtrack_count > MAX_BACKTRACK:
				raise RuntimeError(
					"Generator failed to build a feasible schedule after "
					f"{MAX_BACKTRACK} backtracks. "
					"Try increasing MAX_BACKTRACK or check your constraints."
				)
			# here we clear the current day and the previous day to undo any bad assignments, then step back one day to retry(here we should use backtracking)
			_clear_day(schedule, nurses, day)
			if day > 1:
				_clear_day(schedule, nurses, day - 1)
				day -= 1
	# Ensure the final schedule meets the min hours requirement.
	if not _meets_min_hours(schedule):
		raise RuntimeError(
			"Generator produced a schedule that fails min monthly hours. "
			"Try increasing MAX_BACKTRACK or relaxing constraints."
		)
	return schedule

def _fill_day(schedule: Schedule, nurses: List[Nurse], day: int) -> bool:
	assigned_today: Set[int] = set()
	for shift_code in ("D", "L", "N"):
		required = COVERAGE[shift_code]["required"]
		min_senior = COVERAGE[shift_code]["min_senior"]
		eligible = _eligible(schedule, nurses, day, shift_code, assigned_today)
		# Split eligibility to guarantee at least one senior per shift.
		seniors = [n for n in eligible if n.is_senior]
		juniors = [n for n in eligible if not n.is_senior]
		_ = juniors
		if len(eligible) < required:
			return False
		if len(seniors) < min_senior:
			return False
		# Pick one senior, then fill the rest randomly from remaining eligible.
		chosen_seniors = random.sample(seniors, min_senior)
		remaining_pool = [n for n in eligible if n not in chosen_seniors]
		still_needed = required - min_senior
		if len(remaining_pool) < still_needed:
			return False
		chosen_fill = random.sample(remaining_pool, still_needed)
		chosen = chosen_seniors + chosen_fill
		for nurse in chosen:
			schedule.set(day, nurse.nurse_id, shift_code)
			assigned_today.add(nurse.nurse_id)
	for nurse in nurses:
		if nurse.nurse_id not in assigned_today:
			# Do not exceed max consecutive rest days.
			if _consecutive_rest(schedule, nurse.nurse_id, day) >= HARD["max_consecutive_rest_days"]:
				_clear_day(schedule, nurses, day)
				return False
			schedule.set(day, nurse.nurse_id, "O")
	return True

#this will be removed later, it is just a helper to clear a day when we need to backtrack 
def _clear_day(schedule: Schedule, nurses: List[Nurse], day: int) -> None:
	for nurse in nurses:
		schedule.set(day, nurse.nurse_id, "F")




