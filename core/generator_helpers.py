"""Helper functions for the schedule generator."""
from __future__ import annotations
import random
from typing import List, Set
from core.config import (
    FORBIDDEN_TRANSITIONS, HARD, SHIFTS,
    WORKING_SHIFTS, NON_WORKING_SHIFTS,
)
from core.model import Nurse, Schedule
def _eligible(
    schedule: Schedule,
    nurses: List[Nurse],
    day: int,
    shift_code: str,
    already_assigned: Set[int],
) -> List[Nurse]:
    """
    Filters and returns a list of nurses who are capable of taking the requested shift
    on the current day without breaking any hard constraints.
    
    Hard constraints checked:
      - Has not already been assigned to another shift today.
      - Cell is free ("F").
      - Follows forbidden transitions (e.g. Morning after Night shift).
      - Remains within maximum consecutive working days limits.
      - Remains within maximum consecutive night shifts limit.
      - Remains within the maximum monthly hours cap.
    """
    result = []
    for nurse in nurses:
        nid = nurse.nurse_id
        if nid in already_assigned:
            continue
        if day > 0 and schedule.get(day, nid) not in ("F",):
            continue
        
        if day > 1:
            yesterday = schedule.get(day - 1, nid)
            if yesterday in WORKING_SHIFTS:
                if (yesterday, shift_code) in FORBIDDEN_TRANSITIONS:
                    continue
        if _consecutive_work(schedule, nid, day) >= HARD["max_consecutive_work_days"]:
            continue
        if shift_code == "N":
            if _consecutive_nights(schedule, nid, day) >= HARD["max_consecutive_night_shifts"]:
                continue
        hours_so_far = schedule.total_hours(nid)
        shift_hours = SHIFTS[shift_code]["hours"]
        if hours_so_far + shift_hours > HARD["max_monthly_hours"]:
            continue
            
        result.append(nurse)
    return result

def _consecutive_work(schedule: Schedule, nurse_id: int, day: int) -> int:
    """
    Counts the number of consecutive working days a nurse has had leading up to (and not including) the current day.
    """
    count = 0
    for d in range(day - 1, 0, -1):
        s = schedule.get(d, nurse_id)
        if s in WORKING_SHIFTS:
            count += 1
        else:
            break
    return count

def _consecutive_rest(schedule: Schedule, nurse_id: int, day: int) -> int:
    """
    Counts the number of consecutive rest days a nurse has had leading up to (and not including) the current day.
    """
    count = 0
    for d in range(day - 1, 0, -1):
        s = schedule.get(d, nurse_id)
        if s in NON_WORKING_SHIFTS:
            count += 1
        else:
            break
    return count

def _consecutive_nights(schedule: Schedule, nurse_id: int, day: int) -> int:
    """
    Counts the number of consecutive night shifts a nurse has had leading up to (and not including) the current day.
    """
    count = 0
    for d in range(day - 1, 0, -1):
        s = schedule.get(d, nurse_id)
        if s == "N":
            count += 1
        else:
            break
    return count