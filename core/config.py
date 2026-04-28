# =============================================================================
# config.py — Central configuration for the Nurse Scheduling System
# =============================================================================

NUM_DAYS = 28
NUM_NURSES = 44

DAYS_OF_WEEK = list(range(1, 8))

SENIORITY_SENIOR = 'senior'
SENIORITY_JUNIOR = 'junior'

CSV_COLUMNS = {
    'id':         'ID',
    'last_name':  'LastName',
    'first_name': 'FirstName',
    'dob':        'DateOfBirth',
    'age':        'Age',
    'gender':     'Gender',
    'seniority':  'seniority',
    'day_off1':   'day_off1',
    'day_off2':   'day_off2',
}

# Five shift types: D=Day, L=Late, N=Night, O=requested Off, F=Free (unassigned)
# O and F both give 0 hours but are semantically different:
#   O = nurse's right (requested), F = scheduling artefact (not requested)
SHIFTS = {
    'D': {'name': 'Day',   'start': 8,    'end': 16,   'hours': 8},
    'L': {'name': 'Late',  'start': 16,   'end': 24,   'hours': 8},
    'N': {'name': 'Night', 'start': 0,    'end': 8,    'hours': 8},
    'O': {'name': 'Off',   'start': None, 'end': None, 'hours': 0},
    'F': {'name': 'Free',  'start': None, 'end': None, 'hours': 0},
}

WORKING_SHIFTS    = {'D', 'L', 'N'}
NON_WORKING_SHIFTS = {'O', 'F'}
ALL_SHIFT_CODES   = {'D', 'L', 'N', 'O', 'F'}

# N→L is forbidden: Night ends 08:00, Late starts 16:00 = exactly 8h (need strictly more)
FORBIDDEN_TRANSITIONS = {
    ('D', 'L'),
    ('L', 'N'),
    ('N', 'D'),
    ('N', 'L'),
}

COVERAGE = {
    'D': {'required': 8, 'min_senior': 1},
    'L': {'required': 8, 'min_senior': 1},
    'N': {'required': 6, 'min_senior': 1},
}

HARD = {
    'max_consecutive_work_days':   5,
    'max_consecutive_rest_days':   3,
    'max_monthly_hours':         160,
    'min_monthly_hours':          80,
    'max_consecutive_night_shifts': 2,
    'one_shift_per_day':          True,
}

WEIGHTS = {
    'day_off_first':  15,
    'day_off_second':  7,
    'consec_night':   10,
    'night_variance':  5,
    'hours_variance':  2,
}

DAY_OFF_PRIORITY = {
    0: 'day_off_first',
    1: 'day_off_second',
}

DAY_OFF_MIN_PER_DAY = 3
DAY_OFF_MAX_PER_DAY = 4
DAY_OFF_RANGE       = (1, 7)