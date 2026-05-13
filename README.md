# Nurse Scheduling — Run the CSP generator and greedy scheduler

This repo contains a CSP-based generator and a greedy scheduler for a 28-day
nurse rostering problem.

Quick start (Windows PowerShell):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python main.py --mode generator --data data/data_ai_project.csv --seed 42
python main.py --mode greedy --data data/data_ai_project.csv
python main.py --mode tabu --data data/data_ai_project.csv --seed 1
```

Notes:
- `main.py` provides a small CLI to run the generator and/or greedy scheduler.
- `main.py` also exposes a tabu-search mode for post-processing a feasible schedule.
- Default data file: `data/data_ai_project.csv` (must exist).
- Use `--seed` for deterministic generator runs.
