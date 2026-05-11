"""Smoke-test for backtracking.py"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.model import load_nurses_from_csv, Schedule
from core.backtracking import run_backtracking, _is_valid_for_bt, _ASSIGNABLE
from core.hard_constraints import check_all_hard

CSV = "data/prepared_nurses.csv"

print("=" * 60)
print("TEST 1: Import and load nurses")
print("=" * 60)
nurses = load_nurses_from_csv(CSV)
print(f"  Loaded {len(nurses)} nurses")
print(f"  Seniors: {sum(1 for n in nurses if n.is_senior)}")

print("\n" + "=" * 60)
print("TEST 2: Relaxed validity on blank schedule")
print("=" * 60)
sched = Schedule(nurses)
valid_counts = {s: 0 for s in _ASSIGNABLE}
for nurse in nurses:
    for s in _ASSIGNABLE:
        if _is_valid_for_bt(sched, 1, nurse.nurse_id, s):
            valid_counts[s] += 1
print(f"  Valid assignments on day 1 (blank): {valid_counts}")
assert all(v > 0 for v in valid_counts.values()), "FAIL"
print("  PASSED")

print("\n" + "=" * 60)
print("TEST 3: Run backtracking (120s limit)")
print("=" * 60)
result = run_backtracking(nurses, time_limit_seconds=120.0)
if result is None:
    print("  No solution found within time limit")
else:
    print("  Solution found!")
    violations = check_all_hard(result)
    if violations:
        print(f"  {len(violations)} violations:")
        for v in violations[:15]:
            print(f"    {v}")
    else:
        print("  Zero hard-constraint violations — PERFECT")
    hours = [result.total_hours(n.nurse_id) for n in nurses]
    print(f"  Hours range: {min(hours)}-{max(hours)}")
    print(f"  Avg hours: {sum(hours)/len(hours):.1f}")

print("\nDONE")
