import os, sys
sys.path.insert(0, os.getcwd())
from core.model import load_nurses_from_csv
from core.generator import generate_schedule
from local_search.tabu import TabuConfig, generate_tabu_schedule
from core.evaluation import evaluate_schedule

if __name__ == '__main__':
    nurses = load_nurses_from_csv('data/data_ai_project.csv')
    sched = generate_schedule(nurses, seed=1)
    print('Initial score:', evaluate_schedule(sched))

    config = TabuConfig(iterations=1700, seed=1, verbose=True, neighbors_per_iteration=20)
    best = generate_tabu_schedule(sched, config)
    print('Final score:', evaluate_schedule(best))
