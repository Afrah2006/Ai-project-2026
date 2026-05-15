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
from local_search.greedy import generate_greedy_schedule
from local_search.tabu import TabuConfig, generate_tabu_schedule
from core.hard_constraints import check_all_hard
from core.evaluation import evaluate_schedule
from core.config import NUM_NURSES


def run_generator(nurses_file: str, limit: int, seed: Optional[int]) -> Schedule:
	nurses = load_nurses_from_csv(nurses_file, limit=limit)
	return generate_schedule(nurses, seed=seed)


def run_greedy(nurses_file: str, limit: int) -> Schedule:
	nurses = load_nurses_from_csv(nurses_file, limit=limit)
	return generate_greedy_schedule(Schedule(nurses))


def run_tabu(nurses_file: str, limit: int, seed: Optional[int], iterations: int) -> Schedule:
	nurses = load_nurses_from_csv(nurses_file, limit=limit)
	
	# Step 1: Generate initial CSP schedule.
	sched = generate_schedule(nurses, seed=seed)
	

	print("\nInitial CSP Solutionn")
	report(sched)
	
	print("\n=== Starting Tabu Search Improvement ===")
	config = TabuConfig(seed=seed, verbose=True, iterations=iterations, max_no_improve=200)
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
	print()
	print_day_off_counts(schedule)


def print_day_off_counts(schedule: Schedule) -> None:
	print("--- Day Off Counts ---")
	for nurse in schedule.nurses:
		day_offs = schedule.get_nurse_schedule(nurse.nurse_id).count("O")
		print(f"{nurse.full_name}: {day_offs} day offs")


def parse_args():
	p = argparse.ArgumentParser(description="Nurse scheduling CLI")
	p.add_argument(
		"--mode",
		choices=["generator", "greedy", "both", "tabu"],
		default="tabu",
		help="scheduler to run",
	)
	p.add_argument("--data", default=os.path.join("data", "data_ai_project.csv"))
	p.add_argument("--limit", type=int, default=NUM_NURSES, help="max nurses to load from CSV")
	p.add_argument("--seed", type=int, default=None, help="random seed (optional)")
	p.add_argument("--tabu-iterations", type=int, default=10000, help="Tabu iterations when --mode tabu")
	return p.parse_args()

def main():
	args = parse_args()
	data_path = args.data
	if not os.path.exists(data_path):
		print(f"Data file not found: {data_path}")
		sys.exit(2)

	if args.mode == "generator":
		print("Running CSP generator...")
		sched = run_generator(data_path, args.limit, args.seed)
		print("\n Final CSP Result ")
		report(sched)
	elif args.mode == "greedy":
		print("Running Greedy scheduler...")
		sched = run_greedy(data_path, args.limit)
		print("\n Final Greedy Result ")
		report(sched)
	elif args.mode == "both":
		print("Running CSP generator...")
		generator_sched = run_generator(data_path, args.limit, args.seed)
		print("\n Final CSP Result ")
		report(generator_sched)

		print("\nRunning Greedy scheduler...")
		greedy_sched = run_greedy(data_path, args.limit)
		print("\n Final Greedy Result ")
		report(greedy_sched)
	else:
		print("Running Tabu Search...")
		sched = run_tabu(data_path, args.limit, args.seed, args.tabu_iterations)
		print("\n Final Tabu Result ")
		report(sched)

if __name__ == "__main__":
	main()
