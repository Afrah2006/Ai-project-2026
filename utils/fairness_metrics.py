import statistics
from core.model import Schedule, Nurse
from core.config import NUM_NURSES, NUM_DAYS, SHIFTS, WORKING_SHIFTS
def compute_fairness_metrics(schedule: Schedule) -> dict:
    all_hours=[]
    all_night_shifts=[]
    all_max_consec_nights = []
    for nurse in schedule.nurse_by_id.values():
        nurse_id = nurse.nurse_id
        all_hours.append(schedule.total_hours(nurse_id))
        total_nights = 0
        current_streak = 0
        max_streak = 0
        for day in range(1, NUM_DAYS + 1):
            if schedule.get(day, nurse_id) == 'N':
                current_streak += 1
                total_nights += 1
            else:
                max_streak = max(max_streak, current_streak)
                current_streak = 0
        max_streak = max(max_streak, current_streak)
        all_max_consec_nights.append(max_streak)
        all_night_shifts.append(total_nights)

    hours_variance = statistics.variance(all_hours) if len(all_hours) > 1 else 0
    night_shift_variance = statistics.variance(all_night_shifts) if len(all_night_shifts) > 1 else 0
    max_consec_nights_variance = statistics.variance(all_max_consec_nights) if len(all_max_consec_nights) > 1 else 0
    return {
        "hours_variance": hours_variance,
        "night_shift_variance": night_shift_variance,
        "consec_nights_variance": max_consec_nights_variance
    }