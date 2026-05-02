from core.model import load_nurses_from_csv, Schedule
from local_search.greedy import generate_greedy_schedule
from core.hard_constraints import check_all_hard
from core.evaluation import evaluate_schedule
import os

print(os.getcwd())
nurses = load_nurses_from_csv('data/data_ai_project.csv')
print(f"Loaded {len(nurses)} nurses.")

schedule = Schedule(nurses)
print("Generating greedy schedule...")
schedule = generate_greedy_schedule(schedule)

print("Checking hard constraints...")
violations = check_all_hard(schedule)
if not violations:
    print("SUCCESS: 0 hard constraint violations!")
else:
    print(f"Found {len(violations)} violations.")
    for v in violations[:10]:
        print("  " + v)

print("Evaluating score...")
score = evaluate_schedule(schedule)
print(f"Schedule Score: {score}")

print("\n--- Schedule Summary ---")
print(schedule.summary())

num_seniors = sum(1 for n in nurses if n.is_senior)
print(f"\nTotal Seniors: {num_seniors}")
