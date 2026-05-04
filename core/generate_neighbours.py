#for simulated annealing and greedy
from __future__ import annotations
import random
from typing import List, Tuple, Optional, Dict, Any

from core.model import Schedule
from core.config import (
    NUM_DAYS, NUM_NURSES,
    WORKING_SHIFTS, NON_WORKING_SHIFTS, ALL_SHIFT_CODES,
)
from core.hard_constraints import is_valid_assignment



Move = Dict[str, Any]  
Neighbour = Tuple[Schedule, Move]


def _try_shift_reassignment(schedule: Schedule) -> Optional[Neighbour]:
    """
    Pick a random (nurse, day) cell and try replacing its shift with a
    different valid shift code.

    Returns (new_schedule, move) if a valid reassignment is found,
    else None.
    """
    nurses = schedule.nurses
    days   = list(range(1, NUM_DAYS + 1))
    shifts = list(ALL_SHIFT_CODES)

    # Shuffle to avoid always biasing toward nurse 1 / day 1
    random.shuffle(nurses)
    random.shuffle(days)

    for nurse in nurses:
        nid = nurse.nurse_id
        for day in days:
            current = schedule.get(day, nid)
            candidates = [s for s in shifts if s != current]
            random.shuffle(candidates)

            for new_shift in candidates:
                if is_valid_assignment(schedule, day, nid, new_shift):
                    new_schedule = schedule.copy()
                    new_schedule.set(day, nid, new_shift)
                    move = {
                        'type':      'shift_reassignment',
                        'nurse_id':  nid,
                        'day':       day,
                        'old_shift': current,
                        'new_shift': new_shift,
                    }
                    return new_schedule, move

    return None



def _try_nurse_swap(schedule: Schedule) -> Optional[Neighbour]:
    """
    Pick a random day, then pick two nurses assigned to different shifts
    and swap them.

    This move preserves total coverage counts perfectly — whatever nurse A
    had, nurse B takes, and vice versa — making it the safest move type.

    Returns (new_schedule, move) if a valid swap is found, else None.
    """
    days = list(range(1, NUM_DAYS + 1))
    random.shuffle(days)

    for day in days:
        assignments = schedule.get_day_assignments(day)  # {nid: shift}
        nurse_ids   = list(assignments.keys())
        random.shuffle(nurse_ids)

        # Try all pairs
        for i in range(len(nurse_ids)):
            for j in range(i + 1, len(nurse_ids)):
                nid_a = nurse_ids[i]
                nid_b = nurse_ids[j]
                shift_a = assignments[nid_a]
                shift_b = assignments[nid_b]

                # No point swapping identical shifts
                if shift_a == shift_b:
                    continue

                # Check both directions are valid
                # Note: we must check A getting B's shift AND B getting A's shift.
                # is_valid_assignment checks the *full* schedule including coverage,
                # so we simulate the first change then check the second on a temp copy.
                temp = schedule.copy()
                temp.set(day, nid_a, shift_b)

                if (is_valid_assignment(schedule, day, nid_a, shift_b) and
                        is_valid_assignment(temp, day, nid_b, shift_a)):

                    new_schedule = temp.copy()
                    new_schedule.set(day, nid_b, shift_a)

                    move = {
                        'type':     'nurse_swap',
                        'day':      day,
                        'nurse_a':  nid_a,
                        'shift_a':  shift_a,
                        'nurse_b':  nid_b,
                        'shift_b':  shift_b,
                    }
                    return new_schedule, move

    return None



def _try_day_swap(schedule: Schedule) -> Optional[Neighbour]:
    """
    Pick a random nurse, then pick two days with different shifts and swap
    those shifts.

    Great for breaking consecutive-work or consecutive-rest streaks:
    e.g. if nurse works days 1-6 in a row, swapping day 3 (work) with
    day 10 (rest) breaks the streak.

    Returns (new_schedule, move) if a valid swap is found, else None.
    """
    nurses = list(schedule.nurses)
    random.shuffle(nurses)

    days = list(range(1, NUM_DAYS + 1))

    for nurse in nurses:
        nid = nurse.nurse_id
        random.shuffle(days)

        for i in range(len(days)):
            for j in range(i + 1, len(days)):
                day_a = days[i]
                day_b = days[j]
                shift_a = schedule.get(day_a, nid)
                shift_b = schedule.get(day_b, nid)

                if shift_a == shift_b:
                    continue

                # Simulate day_a getting shift_b, then day_b getting shift_a
                temp = schedule.copy()
                temp.set(day_a, nid, shift_b)

                if (is_valid_assignment(schedule, day_a, nid, shift_b) and
                        is_valid_assignment(temp, day_b, nid, shift_a)):

                    new_schedule = temp.copy()
                    new_schedule.set(day_b, nid, shift_a)

                    move = {
                        'type':     'day_swap',
                        'nurse_id': nid,
                        'day_a':    day_a,
                        'shift_a':  shift_a,
                        'day_b':    day_b,
                        'shift_b':  shift_b,
                    }
                    return new_schedule, move

    return None




_MOVE_FUNCTIONS = [
    _try_shift_reassignment,
    _try_nurse_swap,
    _try_day_swap,
]

_MOVE_WEIGHTS = [1, 3, 2]   # nurse_swap is most reliable, so higher weight


def get_random_neighbour(
    schedule: Schedule,
    mode: str = 'weighted',
) -> Optional[Neighbour]:
    """
    Return a single random valid neighbour and its move descriptor.

    Parameters
    ----------
    schedule : Schedule
        The current schedule to perturb.
    mode : str
        'weighted'  — pick move type by _MOVE_WEIGHTS (default, best for SA)
        'uniform'   — pick move type uniformly at random
        'swap_only' — only use nurse_swap (safest, good for fine-tuning)

    Returns
    -------
    (new_schedule, move) or None if no valid neighbour was found.
    """
    if mode == 'swap_only':
        return _try_nurse_swap(schedule)

    if mode == 'uniform':
        fns = list(_MOVE_FUNCTIONS)
        random.shuffle(fns)
        for fn in fns:
            result = fn(schedule)
            if result is not None:
                return result
        return None

    # weighted — default
    fn = random.choices(_MOVE_FUNCTIONS, weights=_MOVE_WEIGHTS, k=1)[0]
    result = fn(schedule)
    if result is not None:
        return result

    # Fallback: try remaining move types
    for fn in _MOVE_FUNCTIONS:
        result = fn(schedule)
        if result is not None:
            return result

    return None


def generate_neighbours(
    schedule: Schedule,
    n_samples: int = 20,
    mode: str = 'weighted',
) -> List[Neighbour]:
    """
    Return up to `n_samples` distinct valid neighbours.

    Used by Tabu Search which evaluates a batch of neighbours per iteration
    and picks the best one (even if it's slightly worse than current).

    Parameters
    ----------
    schedule  : current schedule
    n_samples : how many neighbours to generate (default 20)
    mode      : same as get_random_neighbour

    Returns
    -------
    List of (new_schedule, move) pairs. May be shorter than n_samples
    if the search space is very constrained.
    """
    neighbours: List[Neighbour] = []
    seen_moves = set()   # deduplicate by move signature

    max_attempts = n_samples * 10   # avoid infinite loop in tight spaces
    attempts = 0

    while len(neighbours) < n_samples and attempts < max_attempts:
        attempts += 1
        result = get_random_neighbour(schedule, mode=mode)
        if result is None:
            continue

        _, move = result
        sig = _move_signature(move)
        if sig in seen_moves:
            continue

        seen_moves.add(sig)
        neighbours.append(result)

    return neighbours



def _move_signature(move: Move) -> tuple:
    """
    Produce a hashable key that uniquely identifies a move.
    Used to deduplicate neighbour lists.
    """
    t = move['type']
    if t == 'shift_reassignment':
        return (t, move['nurse_id'], move['day'], move['new_shift'])
    elif t == 'nurse_swap':
        a, b = sorted([move['nurse_a'], move['nurse_b']])
        return (t, move['day'], a, b)
    elif t == 'day_swap':
        da, db = sorted([move['day_a'], move['day_b']])
        return (t, move['nurse_id'], da, db)
    return tuple(move.items())

