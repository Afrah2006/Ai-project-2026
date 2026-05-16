"""Progress trace events for the web UI (stdout JSON lines)."""
from __future__ import annotations

import json
import sys
from typing import Any, Dict, List, Optional

from core.config import COVERAGE, NUM_DAYS
from core.evaluation import calculate_display_score, evaluate_schedule
from core.hard_constraints import check_all_hard
from core.model import Schedule


def _daily_coverage(schedule: Schedule) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    for day in range(1, NUM_DAYS + 1):
        counts = {code: 0 for code in COVERAGE}
        for nurse in schedule.nurses:
            shift = schedule.get(day, nurse.nurse_id)
            if shift in counts:
                counts[shift] += 1
        rows.append(
            {
                "day": day,
                "D": counts.get("D", 0),
                "L": counts.get("L", 0),
                "N": counts.get("N", 0),
                "required": COVERAGE["D"]["required"],
            }
        )
    return rows


def _compact_schedule(schedule: Schedule) -> List[List[str]]:
    grid: List[List[str]] = []
    for nurse in schedule.nurses:
        row: List[str] = []
        for day in range(1, NUM_DAYS + 1):
            shift = schedule.get(day, nurse.nurse_id)
            row.append("O" if shift == "F" else (shift or "O"))
        grid.append(row)
    return grid


def emit_trace(
    schedule: Schedule,
    *,
    algorithm: str,
    step: int,
    kind: str,
    stream: bool,
    day: Optional[int] = None,
    include_grid: bool = False,
    **metadata: Any,
) -> None:
    if not stream:
        return
    hard_v = len(check_all_hard(schedule))
    penalty = evaluate_schedule(schedule)
    score = calculate_display_score(schedule, penalty)
    payload: Dict[str, Any] = {
        "type": "trace",
        "algorithm": algorithm,
        "step": step,
        "kind": kind,
        "day": day,
        "score": score,
        "hardViolations": hard_v,
        "penalty": penalty,
        "dailyCoverage": _daily_coverage(schedule),
    }
    payload.update({k: v for k, v in metadata.items() if v is not None})
    if include_grid:
        payload["schedule"] = _compact_schedule(schedule)
    print(json.dumps(payload), flush=True)


def emit_progress(data: Dict[str, Any]) -> None:
    data.setdefault("type", "progress")
    print(json.dumps(data), flush=True)
