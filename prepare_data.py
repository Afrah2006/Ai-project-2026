from __future__ import annotations
import csv
import random
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Optional

from core.config import (
    NUM_NURSES, NUM_DAYS, COVERAGE,
    HARD, DAY_OFF_RANGE, CSV_COLUMNS,
    SENIORITY_SENIOR, SENIORITY_JUNIOR,
)

DEFAULT_RAW_PATH      = Path("data/raw_nurses.csv")
DEFAULT_PREPARED_PATH = Path("data/nurses_prepared.csv")


def derive_age(dob: date, reference: Optional[date] = None) -> int:
    ref = reference or date.today()
    age = ref.year - dob.year
    if (ref.month, ref.day) < (dob.month, dob.day):
        age -= 1
    return age


def _random_day() -> int:
    lo, hi = DAY_OFF_RANGE
    return random.randint(lo, hi)


def _random_day_excluding(excluded: int) -> int:
    lo, hi = DAY_OFF_RANGE
    choices = [d for d in range(lo, hi + 1) if d != excluded]
    return random.choice(choices)


def validate_day_off(value: str, field_name: str, nurse_id: int) -> Optional[int]:
    lo, hi = DAY_OFF_RANGE

    if value is None or str(value).strip() == '':
        print(f"  [WARN] Nurse {nurse_id}: {field_name} is missing → will be assigned randomly.")
        return None

    try:
        v = int(str(value).strip())
    except ValueError:
        print(f"  [WARN] Nurse {nurse_id}: {field_name}='{value}' is not an integer → will be assigned randomly.")
        return None

    if not (lo <= v <= hi):
        clamped = max(lo, min(hi, v))
        print(f"  [WARN] Nurse {nurse_id}: {field_name}={v} is outside [{lo},{hi}] → clamped to {clamped}.")
        return clamped

    return v


def process_row(row: Dict[str, str], col: Dict[str, str]) -> Dict[str, str]:
    nurse_id = int(row[col['id']])

    raw_dob = row[col['dob']].strip()
    dob = None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%m/%d/%Y"):
        try:
            dob = datetime.strptime(raw_dob, fmt).date()
            break
        except ValueError:
            continue

    if dob is None:
        print(f"  [WARN] Nurse {nurse_id}: cannot parse DOB '{raw_dob}' → defaulting to 1990-01-01.")
        dob = date(1990, 1, 1)

    age = derive_age(dob)

    raw_d1   = row.get(col['day_off1'], '')
    day_off1 = validate_day_off(raw_d1, 'day_off1', nurse_id)

    if day_off1 is None:
        day_off1 = _random_day()
        print(f"  [INFO] Nurse {nurse_id}: day_off1 randomly assigned → {day_off1}.")

    raw_d2   = row.get(col['day_off2'], '')
    day_off2 = validate_day_off(raw_d2, 'day_off2', nurse_id)

    if day_off2 is None:
        day_off2 = _random_day_excluding(day_off1)
        print(f"  [INFO] Nurse {nurse_id}: day_off2 randomly assigned → {day_off2}.")

    elif day_off2 == day_off1:
        old      = day_off2
        day_off2 = _random_day_excluding(day_off1)
        print(f"  [WARN] Nurse {nurse_id}: day_off2={old} == day_off1={day_off1} → reassigned to {day_off2}.")

    prepared = dict(row)
    prepared[col['age']]      = str(age)
    prepared[col['day_off1']] = str(day_off1)
    prepared[col['day_off2']] = str(day_off2)

    return prepared


def feasibility_check(nurses_data: List[Dict[str, str]], col: Dict[str, str]) -> bool:
    print("\n=== Feasibility Check ===")

    n = len(nurses_data)
    if n < NUM_NURSES:
        _fail(f"Only {n} nurses in CSV but {NUM_NURSES} are required.")

    seniors = sum(
        1 for r in nurses_data
        if r[col['seniority']].strip().lower() == SENIORITY_SENIOR
    )
    print(f"  Nurses total : {n}")
    print(f"  Seniors      : {seniors}")

    shifts_per_day = len(COVERAGE)
    if seniors < shifts_per_day:
        _fail(f"Only {seniors} senior nurse(s) but {shifts_per_day} are needed.")

    slots_per_day = sum(v['required'] for v in COVERAGE.values())
    if slots_per_day > n:
        _fail(f"Coverage needs {slots_per_day} nurse-slots/day but only {n} nurses exist.")

    off_per_day    = n - slots_per_day
    hours_per_slot = 8
    total_needed   = slots_per_day * hours_per_slot * NUM_DAYS
    max_available  = n * HARD['max_monthly_hours']
    min_available  = n * HARD['min_monthly_hours']

    print(f"  Slots/day             : {slots_per_day}  (off: {off_per_day})")
    print(f"  Hours needed (total)  : {total_needed}")
    print(f"  Hours available range : {min_available} – {max_available}")

    if total_needed > max_available:
        _fail(f"Total hours needed ({total_needed}h) exceeds max available ({max_available}h).")
    if total_needed < min_available:
        _fail(f"Total hours needed ({total_needed}h) is below minimum required ({min_available}h).")

    avg_h = total_needed / n
    print(f"  Avg hours/nurse       : {avg_h:.1f}h")
    print("  ✓  Feasibility check PASSED.\n")
    return True


def _fail(msg: str) -> None:
    print(f"\n  [ERROR] Feasibility FAILED: {msg}")
    sys.exit(1)


def prepare(
    raw_path: Path = DEFAULT_RAW_PATH,
    out_path: Path = DEFAULT_PREPARED_PATH,
    run_feasibility: bool = True,
) -> Path:
    col      = CSV_COLUMNS
    raw_path = Path(raw_path)
    out_path = Path(out_path)

    print(f"[prepare_data] Reading   : {raw_path}")

    if not raw_path.exists():
        print(f"[ERROR] Input file not found: {raw_path}")
        sys.exit(1)

    with open(raw_path, newline='', encoding='utf-8') as f:
        reader     = csv.DictReader(f)
        fieldnames = list(reader.fieldnames or [])
        raw_rows   = list(reader)

    print(f"[prepare_data] Rows found: {len(raw_rows)}")

    age_col = col['age']
    dob_col = col['dob']
    if age_col not in fieldnames:
        insert_at = (fieldnames.index(dob_col) + 1) if dob_col in fieldnames else len(fieldnames)
        fieldnames.insert(insert_at, age_col)

    prepared_rows: List[Dict[str, str]] = []
    for row in raw_rows[:NUM_NURSES]:
        prepared_rows.append(process_row(row, col))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(prepared_rows)

    print(f"[prepare_data] Written   : {out_path}  ({len(prepared_rows)} nurses)")

    if run_feasibility:
        feasibility_check(prepared_rows, col)

    return out_path

if __name__ == "__main__":
    raw = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_RAW_PATH
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_PREPARED_PATH
    prepare(raw, out)