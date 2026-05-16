from core.model import Schedule
from core.config import HARD, SHIFTS, WEIGHTS, WORKING_SHIFTS
from utils.fairness_metrics import compute_fairness_metrics

def calculate_display_score(schedule: Schedule, penalty: float | None = None) -> float:
    """Return raw penalty directly as requested."""
    if penalty is None:
        penalty = evaluate_schedule(schedule)
    return penalty

def evaluate_schedule(schedule: Schedule) -> float:
    from core.hard_constraints import check_all_hard
    violations = check_all_hard(schedule)
    score = len(violations) * 500.0 # Heavy penalty for each hard violation


    requested_day_off_1={x: [] for x in range(1,8)}
    requested_day_off_2={x: [] for x in range(1,8)}
    for nurse in schedule.nurse_by_id.values():
        if nurse.day_off1:
            requested_day_off_1[nurse.day_off1].append(nurse.nurse_id)
        if nurse.day_off2:
            requested_day_off_2[nurse.day_off2].append(nurse.nurse_id)
    priority_day_off_1 = {}
    priority_day_off_2 = {}
    for day in range(1, 8):
        sorted_nurses_1 = sorted(requested_day_off_1[day], key=lambda nid: schedule.nurse_by_id[nid].seniority == 'senior', reverse=True)
        priority_day_off_1[day] = set(sorted_nurses_1)

        sorted_nurses_2 = sorted(requested_day_off_2[day], key=lambda nid: schedule.nurse_by_id[nid].seniority == 'senior', reverse=True)
        priority_day_off_2[day] = set(sorted_nurses_2)

    fairness = compute_fairness_metrics(schedule)
    for nurse in schedule.nurse_by_id.values():
        nurse_id = nurse.nurse_id
        """had l part drt fih checking 3la l prefered dasy w drt the signiority as a prority"""
        prefered_dayoff1= nurse.day_off1
        prefered_dayoff2= nurse.day_off2
        conse_nights=0
        if nurse.seniority == 'senior':
            senyority_weight = 1.5
        else:
            senyority_weight = 1.0
        for start in [1,8,15,22]:
            if prefered_dayoff1 and nurse_id in priority_day_off_1[prefered_dayoff1]:
                the_day1to_verify_each_week = start + prefered_dayoff1 - 1
                if schedule.get(the_day1to_verify_each_week, nurse_id) in WORKING_SHIFTS:
                    score += senyority_weight*WEIGHTS['day_off_first']
                else:
                    score -= senyority_weight*WEIGHTS['reward_day_off_first']
            
            if prefered_dayoff2 and nurse_id in priority_day_off_2[prefered_dayoff2]:
                the_day2to_verify_each_week = start + prefered_dayoff2 - 1
                if schedule.get(the_day2to_verify_each_week, nurse_id) in WORKING_SHIFTS:
                    score += senyority_weight*WEIGHTS['day_off_second']
                else:
                    score -= senyority_weight*WEIGHTS['reward_day_off_second']
        """drka the consecutive nights"""
        for day in range(1, 29):
            if schedule.get(day, nurse_id) == 'N':
                conse_nights+=1
                if conse_nights > HARD['max_consecutive_night_shifts']:
                 score += (conse_nights-HARD['max_consecutive_night_shifts'])*WEIGHTS['consec_night']
            else:
                conse_nights=0

        """drka the variance of hours and night shifts""" 
       
    score += fairness['night_shift_variance']*WEIGHTS['night_variance']
    score += fairness['hours_variance']*WEIGHTS['hours_variance']
    score += (fairness['consec_nights_variance'] * WEIGHTS['consec_night'])
    return score    