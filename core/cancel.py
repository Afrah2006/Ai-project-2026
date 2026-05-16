"""Cooperative cancellation for long-running schedulers (web runner)."""
from __future__ import annotations

import os
from typing import Optional

_CANCEL_FILE: Optional[str] = None


def set_cancel_file(path: Optional[str]) -> None:
    global _CANCEL_FILE
    _CANCEL_FILE = path


def is_cancelled() -> bool:
    if not _CANCEL_FILE:
        return False
    try:
        return os.path.exists(_CANCEL_FILE)
    except OSError:
        return False


def check_cancelled() -> None:
    if is_cancelled():
        raise InterruptedError("Run cancelled by user")
