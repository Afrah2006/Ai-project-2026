if __name__ == "__main__":
    from core.model import load_nurses_from_csv
    from core.evaluation import evaluate_schedule
    nurses = load_nurses_from_csv("data/data.csv")
    from core.generator import generate_schedule
    schedule = generate_schedule(nurses, seed=42)
    print(f"the evaluation score of the generated schedule is: {evaluate_schedule(schedule):.4f}")
    print(schedule.summary())
    