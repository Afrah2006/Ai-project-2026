
from __future__ import annotations

import csv
import copy
import random
from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Dict, List, Optional, Tuple

from core.config import (
    NUM_DAYS, NUM_NURSES, SHIFTS, WORKING_SHIFTS, NON_WORKING_SHIFTS,
    ALL_SHIFT_CODES, CSV_COLUMNS, SENIORITY_SENIOR, SENIORITY_JUNIOR,
)



@dataclass
class Nurse:
   
    nurse_id:   int
    last_name:  str
    first_name: str
    dob:        date
    age:        int
    gender:     str
    seniority:  str                # 'senior' or 'junior'
    day_off1:   int                
    day_off2:   int                



    @property
    def is_senior(self) -> bool:
        """True if this nurse is classified as 'senior'."""
        return self.seniority == 'senior'

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @property
    def preferred_days_off(self) -> Tuple[int, int]:
        """Return (primary, secondary) preferred days-off as a tuple."""
        return (self.day_off1, self.day_off2)

    def __repr__(self) -> str:
        badge = "SR" if self.is_senior else "JR"
        return f"Nurse({self.nurse_id}, {self.full_name}, {badge})"



#independent function to load the data :
#this function will open the csv file read up to limit row and transform each row to a nusrse object and return at the end an array of nurses (size=limit)
def load_nurses_from_csv(filepath: str, limit: int = NUM_NURSES) -> List[Nurse]:
   
    nurses: List[Nurse] = []
    col = CSV_COLUMNS  # this dict is defined in the config 

    with open(filepath, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if i >= limit:
                break

            # Parse date of birth (format in CSV: DD/MM/YYYY)
            try:
                dob = datetime.strptime(row[col['dob']], "%d/%m/%Y").date()
            except ValueError:
                dob = date(1990, 1, 1)  

            nurse = Nurse(
                nurse_id=int(row[col['id']]),
                last_name=row[col['last_name']].strip(),
                first_name=row[col['first_name']].strip(),
                dob=dob,
                age=int(row[col['age']]),
                gender=row[col['gender']].strip(),
                seniority=row[col['seniority']].strip(),
                day_off1=int(row[col['day_off1']]),
                day_off2=int(row[col['day_off2']]),
            )
            nurses.append(nurse)

    if len(nurses) < limit:
        raise ValueError(
            f"CSV only has {len(nurses)} rows but {limit} nurses are required."
        )

    return nurses


class Schedule:
    

    def __init__(self, nurses: List[Nurse]):

        if len(nurses) != NUM_NURSES:
            raise ValueError(
                f"Schedule requires exactly {NUM_NURSES} nurses, got {len(nurses)}."
            )

        # Store nurses indexed by nurse_id for fast lookup
        self.nurses: List[Nurse] = nurses
        self.nurse_by_id: Dict[int, Nurse] = {n.nurse_id: n for n in nurses}

        # Initialize the grid: every cell is 'F' (free / not yet assigned)
        self.grid: Dict[Tuple[int, int], str] = {
            (day, nurse.nurse_id): 'F'
            for day in range(1, NUM_DAYS + 1)
            for nurse in nurses
        }

   
    #Return the shift code assigned to (day, nurse_id)
    def get(self, day: int, nurse_id: int) -> str:
        
        return self.grid[(day, nurse_id)]

    def set(self, day: int, nurse_id: int, shift: str) -> None:     #Assign a shift to (day, nurse_id).
       
        if shift not in ALL_SHIFT_CODES:
            raise ValueError(f"Invalid shift code '{shift}'. Must be one of {ALL_SHIFT_CODES}.")
        self.grid[(day, nurse_id)] = shift

    
    def get_nurse_schedule(self, nurse_id: int) -> List[str]:
    
        #Return the full 28-day schedule for one nurse as a list

    
        return [self.grid[(day, nurse_id)] for day in range(1, NUM_DAYS + 1)]

    def get_day_assignments(self, day: int) -> Dict[int, str]:
       "this will return the assignment of 1 day as  a dict[key=nurseId, value= shift_type ] "
        return {nid: self.grid[(day, nid)] for nid in self.nurse_by_id}

    def nurses_on_shift(self, day: int, shift: str) -> List[Nurse]: # Return all Nurse objects assigned to "shift" on "day"
        
        return [
            self.nurse_by_id[nid]
            for nid in self._nurse_by_id
            if self.grid[(day, nid)] == shift
        ]

    #statistics :

    def total_hours(self, nurse_id: int) -> int:
        "Return the total hours worked by nurse_id over the 28-day period"
        return sum(
            SHIFTS[self.grid[(day, nurse_id)]]['hours']
            for day in range(1, NUM_DAYS + 1)
        )

    def night_shift_count(self, nurse_id: int) -> int:
        "Return the number of night shifts ('N') assigned to nurse_id"
        return sum(
            1 for day in range(1, NUM_DAYS + 1)
            if self.grid[(day, nurse_id)] == 'N'
        )

    def working_days(self, nurse_id: int) -> List[int]:
        "Return list of days (1-28) on which nurse_id is on a working shift"
        return [
            day for day in range(1, NUM_DAYS + 1)
            if self.grid[(day, nurse_id)] in WORKING_SHIFTS
        ]

    
    def copy(self) -> "Schedule":
        "this will create a copy of the schedule "
        new_sched = Schedule(self.nurses)
        new_sched.grid = dict(self.grid)  
        return new_sched

    

    def summary(self) -> str:
        "for Debugging: this will return a summary about the scheduling , total hours , night shifts number  "
        lines = ["Day:     " + "  ".join(f"{d:2}" for d in range(1, NUM_DAYS + 1))]
        for nurse in self.nurses:
            row = self.get_nurse_schedule(nurse.nurse_id)
            badge = "SR" if nurse.is_senior else "JR"
            shifts_str = "  ".join(row)
            hours = self.total_hours(nurse.nurse_id)
            nights = self.night_shift_count(nurse.nurse_id)
            lines.append(
                f"[{badge}] {nurse.full_name:<25} {shifts_str}  | {hours}h | {nights}N"
            )
        return "\n".join(lines)

    def __repr__(self) -> str:
        return f"Schedule(nurses={NUM_NURSES}, days={NUM_DAYS})"