from __future__ import annotations
 
from collections import deque
from typing import Dict, List, Set, Tuple
 
from core.model import Schedule
from core.hard_constraints import is_valid_assignment
from core.config import NUM_DAYS, ALL_SHIFT_CODES
 
Domains = Dict[Tuple[int, int], Set[str]]
 
 
def get_initial_domains(schedule: Schedule) -> Domains:
    domains: Domains = {}
    for nurse in schedule.nurses:
        nid = nurse.nurse_id
        for day in range(1, NUM_DAYS + 1):
            var = (nid, day)
            current = schedule.get(day, nid)
            if current != 'F':
                domains[var] = {current}
            else:
                candidates: Set[str] = set()
                for shift in ALL_SHIFT_CODES:
                    if is_valid_assignment(schedule, day, nid, shift):
                        candidates.add(shift)
                domains[var] = candidates
    return domains
 
 
def forward_check(
    schedule: Schedule,
    day: int,
    nurse_id: int,
    domains: Domains,
) -> bool:
    affected: List[Tuple[int, int]] = []
 
    for delta in (-1, +1):
        neighbour_day = day + delta
        if 1 <= neighbour_day <= NUM_DAYS:
            if schedule.get(neighbour_day, nurse_id) == 'F':
                affected.append((nurse_id, neighbour_day))
 
    for nurse in schedule.nurses:
        nid = nurse.nurse_id
        if nid != nurse_id and schedule.get(day, nid) == 'F':
            affected.append((nid, day))
 
    for var in affected:
        n_id, d = var
        valid: Set[str] = {
            shift for shift in domains.get(var, set())
            if is_valid_assignment(schedule, d, n_id, shift)
        }
        domains[var] = valid
        if not valid:
            return False
 
    return True
 
 
def revise_arc(
    var1: Tuple[int, int],
    var2: Tuple[int, int],
    domains: Domains,
    schedule: Schedule,
) -> bool:
    nurse1_id, day1 = var1
    nurse2_id, day2 = var2
    to_remove: List[str] = []
 
    for s1 in list(domains.get(var1, set())):
        temp = schedule.copy()
        temp.set(day1, nurse1_id, s1)
        has_support = any(
            is_valid_assignment(temp, day2, nurse2_id, s2)
            for s2 in domains.get(var2, set())
        )
        if not has_support:
            to_remove.append(s1)
 
    for s1 in to_remove:
        domains[var1].discard(s1)
 
    return bool(to_remove)
 
 
def ac3_propagate(schedule: Schedule, domains: Domains) -> bool:
    def _are_neighbours(v1: Tuple[int, int], v2: Tuple[int, int]) -> bool:
        n1, d1 = v1
        n2, d2 = v2
        if v1 == v2:
            return False
        if n1 == n2 and abs(d1 - d2) == 1:
            return True
        if d1 == d2 and n1 != n2:
            return True
        return False
 
    all_vars = list(domains.keys())
    queue: deque = deque(
        (v1, v2)
        for v1 in all_vars
        for v2 in all_vars
        if _are_neighbours(v1, v2)
    )
 
    while queue:
        var_i, var_j = queue.popleft()
        if revise_arc(var_i, var_j, domains, schedule):
            if not domains[var_i]:
                return False
            for var_k in all_vars:
                if var_k != var_j and _are_neighbours(var_k, var_i):
                    queue.append((var_k, var_i))
 
    return True