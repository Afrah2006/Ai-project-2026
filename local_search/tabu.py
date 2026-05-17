"""Tabu search for schedule improvement.

The search assumes a near-feasible or feasible starting schedule and keeps all
hard constraints intact by only accepting day-level swaps that preserve the
daily shift counts.
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass
import math
import random
from typing import Deque, Iterable, List, Optional, Tuple

from core.evaluation import evaluate_schedule
from core.hard_constraints import check_all_hard
from core.model import Schedule
from core.config import NUM_DAYS, WORKING_SHIFTS
from core.trace import emit_progress, emit_trace


Move = Tuple[int, int, int]


@dataclass(frozen=True)
class TabuConfig:
	iterations: int = 500
	tenure: int = 12
	neighbors_per_iteration: int = 60
	seed: Optional[int] = None
	verbose: bool = True
	max_no_improve: int = 200
	start_from_feasible_only: bool = True
	stream: bool = False


def generate_tabu_schedule(schedule: Schedule, config: TabuConfig | None = None) -> Schedule:
	"""Improve a schedule with tabu search and return the best feasible result.

	The neighborhood is a same-day swap between two nurses. This preserves each
	day's coverage counts and the one-shift-per-day structure, so the search can
	focus on score improvements without constantly rebuilding feasibility.
	"""
	config = config or TabuConfig()
	rng = random.Random(config.seed)
	current = schedule.copy()
	best = current.copy()
	best_score = _score(best)
	current_score = best_score
	tabu: Deque[Move] = deque(maxlen=max(1, config.tenure))
	no_improve = 0

	# if config.start_from_feasible_only:
	# 	violations = check_all_hard(current)
	# 	if violations:
	# 		raise ValueError(
	# 			"Tabu search requires a feasible starting schedule. "
	# 			f"Found {len(violations)} hard-constraint violations."
	# 		)

	try:
		for iteration in range(1, config.iterations + 1):
			if iteration % 40 == 0:
				from core.cancel import check_cancelled
				check_cancelled()

			move, candidate, candidate_score = _best_neighbor(
				current=current,
				current_score=current_score,
				tabu=tabu,
				rng=rng,
				neighbors_per_iteration=config.neighbors_per_iteration,
			)

			if move is None or candidate is None:
				break

			current = candidate
			current_score = candidate_score
			tabu.append(move)

			if candidate_score + 1e-9 < best_score:
				best = candidate.copy()
				best_score = candidate_score
				no_improve = 0
			else:
				no_improve += 1

			if config.verbose and iteration % 25 == 0:
				print(
					f"[tabu] iter={iteration} current={current_score:.2f} "
					f"best={best_score:.2f} tabu={len(tabu)}"
				)

			if config.stream and iteration % 25 == 0:
				progress = round(iteration / max(1, config.iterations) * 100, 1)

				msg = f"Iteration {iteration}: "
				if candidate_score < best_score:
					msg += f"🔥 Found new best penalty: {best_score:.2f}!"
				else:
					msg += f"Searching... Current penalty: {current_score:.2f}"

				emit_progress({
					"algorithm": "Tabu Search",
					"iteration": iteration,
					"currentScore": current_score,
					"bestScore": best_score,
					"progressPercent": progress,
					"message": msg
				})
				emit_trace(
					current,
					algorithm="Tabu Search",
					step=iteration,
					kind="iteration",
					stream=True,
					include_grid=True,
				)

			if no_improve >= config.max_no_improve:
				if config.stream:
					emit_progress({"message": "Tabu search: No improvement for long time. Finishing.", "progressPercent": round(iteration / max(1, config.iterations) * 100, 1)})
				break
	except InterruptedError:
		pass

	if check_all_hard(best):
		repaired = _repair_to_feasible(best, rng, max(120, config.neighbors_per_iteration * 2))
		if repaired is not None:
			best = repaired
		else:
			return schedule.copy()

	if check_all_hard(best):
		return schedule.copy()

	if _score(best) > _score(schedule):
		return schedule.copy()

	return best


def _score(schedule: Schedule) -> float:
	"""Score schedules directly. Since we use is_valid_assignment, we stay feasible."""
	return evaluate_schedule(schedule)

def _best_neighbor(
		current: Schedule,
		current_score: float,
		tabu: Deque[Move],
		rng: random.Random,
		neighbors_per_iteration: int,
) -> Tuple[Optional[Move], Optional[Schedule], float]:
		"""Explore a limited set of same-day swaps and return the best admissible one."""
		all_moves = list(_candidate_moves(current))
		if not all_moves:
				return None, None, math.inf

		if len(all_moves) > neighbors_per_iteration:
				moves = rng.sample(all_moves, neighbors_per_iteration)
		else:
				moves = all_moves

		best_move: Optional[Move] = None
		best_sched: Optional[Schedule] = None
		best_score = math.inf

		for move in moves:
				candidate = _apply_swap(current, move)
				if candidate is None:
						continue

				if check_all_hard(candidate):
						continue

				score = evaluate_schedule(candidate)
				is_tabu = move in tabu

				# Aspiration criterion
				if score < best_score and (not is_tabu or score < current_score - 1e-9):
						best_score = score
						best_sched = candidate
						best_move = move

		return best_move, best_sched, best_score


def _candidate_moves(schedule: Schedule) -> Iterable[Move]:
  """Yield unique day-level swap moves (day, nurse_a, nurse_b)."""
  for day in range(1, NUM_DAYS + 1):
    for idx, nurse_a in enumerate(schedule.nurses):
      for nurse_b in schedule.nurses[idx + 1 :]:
        a = schedule.get(day, nurse_a.nurse_id)
        b = schedule.get(day, nurse_b.nurse_id)
        if a == b:
          continue
        yield (day, nurse_a.nurse_id, nurse_b.nurse_id)


def _apply_swap(schedule: Schedule, move: Move) -> Optional[Schedule]:
  """Swap the two nurses' assignments on the given day and return a copy."""
  day, nurse_id_a, nurse_id_b = move
  shift_a = schedule.get(day, nurse_id_a)
  shift_b = schedule.get(day, nurse_id_b)
  if shift_a == shift_b:
    return None

  candidate = schedule.copy()
  candidate.set(day, nurse_id_a, shift_b)
  candidate.set(day, nurse_id_b, shift_a)
  return candidate


def _repair_to_feasible(
	schedule: Schedule,
	rng: random.Random,
	neighbors_per_iteration: int,
) -> Optional[Schedule]:
	"""Find the best hard-feasible neighbor of a schedule.

	Used as a fallback when the main tabu loop lands on an infeasible snapshot.
	"""
	all_moves = list(_candidate_moves(schedule))
	if not all_moves:
		return None

	if len(all_moves) > neighbors_per_iteration:
		moves = rng.sample(all_moves, neighbors_per_iteration)
	else:
		moves = all_moves

	best_candidate: Optional[Schedule] = None
	best_score = math.inf

	for move in moves:
		candidate = _apply_swap(schedule, move)
		if candidate is None:
			continue
		if check_all_hard(candidate):
			continue

		score = evaluate_schedule(candidate)
		if score < best_score:
			best_score = score
			best_candidate = candidate

	return best_candidate