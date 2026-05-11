import sys, os, time
sys.path.insert(0, '.')
from core.model import load_nurses_from_csv, Schedule
from core.backtracking import _fill_day, _clear_day
from core.hard_constraints import check_all_hard

nurses = load_nurses_from_csv('data/prepared_nurses.csv')

for attempt in range(10):
    sched = Schedule(nurses)
    failed_day = None
    bt = 0
    day = 1
    while day <= 28:
        if _fill_day(sched, nurses, day):
            day += 1
        else:
            bt += 1
            if bt > 200:
                failed_day = day
                break
            _clear_day(sched, nurses, day)
            back = min(3, day-1) if bt % 5 == 0 else min(1, day-1)
            for _ in range(back):
                if day > 1:
                    _clear_day(sched, nurses, day-1)
                    day -= 1

    if failed_day:
        print(f"Attempt {attempt}: stuck at day {failed_day} after {bt} bt")
    else:
        violations = check_all_hard(sched)
        hours = [sched.total_hours(n.nurse_id) for n in nurses]
        print(f"Attempt {attempt}: COMPLETE bt={bt} violations={len(violations)} "
              f"hours={min(hours)}-{max(hours)}")
        for v in violations[:5]:
            print(f"  {v}")
        if not violations:
            print("  *** PERFECT ***")
            break
