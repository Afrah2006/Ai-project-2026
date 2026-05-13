#!/usr/bin/env python3
"""Run the CSP generator and the greedy scheduler.

Usage examples:
  python main.py --mode generator --data data/data_ai_project.csv --seed 42
  python main.py --mode greedy --data data/data_ai_project.csv
	python main.py --mode both --data data/data_ai_project.csv --seed 42
	python main.py --mode tabu --data data/data_ai_project.csv --seed 1
"""
from __future__ import annotations

import argparse
import os
import sys
import random
from typing import Optional

from core.model import load_nurses_from_csv, Schedule
from core.generator import generate_schedule
from local_search.tabu import TabuConfig, generate_tabu_schedule
from core.hard_constraints import check_all_hard
from core.evaluation import evaluate_schedule
from core.config import NUM_NURSES


def run_tabu(nurses_file: str, limit: int, seed: Optional[int]) -> Schedule:
	nurses = load_nurses_from_csv(nurses_file, limit=limit)
	
	# Step 1: Generate initial CSP schedule.
	sched = generate_schedule(nurses, seed=seed)
	

	print("\nInitial CSP Solutionn")
	report(sched)
	
	print("\n=== Starting Tabu Search Improvement ===")
	config = TabuConfig(seed=seed, verbose=True, iterations=10000, max_no_improve=200)
	return generate_tabu_schedule(sched, config=config)


def report(schedule: Schedule) -> None:
	violations = check_all_hard(schedule)
	score = evaluate_schedule(schedule)
	print(f"Hard constraint violations: {len(violations)}")
	if violations:
		for v in violations[:10]:
			print("  ", v)
	print(f"Score: {score}")
	print()
	print(schedule.summary())


def parse_args():
	p = argparse.ArgumentParser(description="Nurse scheduling: Tabu Search only")
	p.add_argument("--data", default=os.path.join("data", "data_ai_project.csv"))
	p.add_argument("--limit", type=int, default=NUM_NURSES, help="max nurses to load from CSV")
	p.add_argument("--seed", type=int, default=None, help="random seed (optional)")
	return p.parse_args()
