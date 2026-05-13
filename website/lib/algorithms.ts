import type { ShiftType, Nurse, ScheduleResult } from "./schedule-context";

const DAYS = 28;
const NURSES_COUNT = 25;
const DAY_SHIFT_REQUIRED = 8;
const LATE_SHIFT_REQUIRED = 8;
const NIGHT_SHIFT_REQUIRED = 6;

// Generate initial schedule satisfying basic constraints
function generateInitialSchedule(nurses: Nurse[]): ShiftType[][] {
  const schedule: ShiftType[][] = [];
  
  for (let n = 0; n < nurses.length; n++) {
    const nurseSchedule: ShiftType[] = [];
    let consecutiveWork = 0;
    let consecutiveNights = 0;
    let totalHours = 0;
    
    for (let d = 0; d < DAYS; d++) {
      const seed = (n * 31 + d * 17) % 100;
      let shift: ShiftType;
      
      // Enforce max 5 consecutive days
      if (consecutiveWork >= 5) {
        shift = "O";
        consecutiveWork = 0;
        consecutiveNights = 0;
      }
      // Enforce max 2 consecutive nights
      else if (consecutiveNights >= 2) {
        shift = seed < 40 ? "D" : seed < 80 ? "L" : "O";
        consecutiveNights = 0;
        if (shift !== "O") {
          consecutiveWork++;
          totalHours += 8;
        } else {
          consecutiveWork = 0;
        }
      }
      // Check total hours limit (max 160)
      else if (totalHours >= 152) {
        shift = "O";
        consecutiveWork = 0;
        consecutiveNights = 0;
      }
      // Normal assignment
      else if (seed < 30) {
        shift = "D";
        consecutiveWork++;
        consecutiveNights = 0;
        totalHours += 8;
      } else if (seed < 55) {
        shift = "L";
        consecutiveWork++;
        consecutiveNights = 0;
        totalHours += 8;
      } else if (seed < 70 && totalHours >= 80) {
        shift = "N";
        consecutiveWork++;
        consecutiveNights++;
        totalHours += 8;
      } else if (seed < 85) {
        shift = "O";
        consecutiveWork = 0;
        consecutiveNights = 0;
      } else {
        shift = "D";
        consecutiveWork++;
        consecutiveNights = 0;
        totalHours += 8;
      }
      
      nurseSchedule.push(shift);
    }
    schedule.push(nurseSchedule);
  }
  
  return schedule;
}

// Calculate score based on constraints
function calculateScore(schedule: ShiftType[][], nurses: Nurse[]): { score: number; hardViolations: number; softViolations: number } {
  let hardViolations = 0;
  let softViolations = 0;
  
  // Check staffing per day
  for (let d = 0; d < DAYS; d++) {
    let dayCount = 0, lateCount = 0, nightCount = 0;
    let daySenior = false, lateSenior = false, nightSenior = false;
    
    for (let n = 0; n < schedule.length; n++) {
      const shift = schedule[n][d];
      const isSenior = nurses[n]?.isSenior || false;
      
      if (shift === "D") {
        dayCount++;
        if (isSenior) daySenior = true;
      } else if (shift === "L") {
        lateCount++;
        if (isSenior) lateSenior = true;
      } else if (shift === "N") {
        nightCount++;
        if (isSenior) nightSenior = true;
      }
    }
    
    if (dayCount < DAY_SHIFT_REQUIRED) hardViolations++;
    if (lateCount < LATE_SHIFT_REQUIRED) hardViolations++;
    if (nightCount < NIGHT_SHIFT_REQUIRED) hardViolations++;
    if (!daySenior || !lateSenior || !nightSenior) hardViolations++;
  }
  
  // Check per-nurse constraints
  const hoursPerNurse: number[] = [];
  const nightShiftsPerNurse: number[] = [];
  
  for (let n = 0; n < schedule.length; n++) {
    let hours = 0;
    let nights = 0;
    let consecutiveWork = 0;
    let consecutiveNights = 0;
    let consecutiveOff = 0;
    
    for (let d = 0; d < DAYS; d++) {
      const shift = schedule[n][d];
      
      if (shift === "O") {
        consecutiveOff++;
        consecutiveWork = 0;
        consecutiveNights = 0;
        if (consecutiveOff > 3) hardViolations++; // Max 72h off (3 days)
      } else {
        hours += 8;
        consecutiveOff = 0;
        consecutiveWork++;
        
        if (consecutiveWork > 5) hardViolations++;
        
        if (shift === "N") {
          nights++;
          consecutiveNights++;
          if (consecutiveNights > 2) hardViolations++;
        } else {
          consecutiveNights = 0;
        }
        
        // Check night->day transition
        if (d > 0 && schedule[n][d - 1] === "N" && shift === "D") {
          hardViolations++; // No 8h rest
        }
      }
    }
    
    hoursPerNurse.push(hours);
    nightShiftsPerNurse.push(nights);
    
    if (hours < 80 || hours > 160) hardViolations++;
  }
  
  // Soft constraint: equal distribution
  const avgNights = nightShiftsPerNurse.reduce((a, b) => a + b, 0) / nightShiftsPerNurse.length;
  const avgHours = hoursPerNurse.reduce((a, b) => a + b, 0) / hoursPerNurse.length;
  
  nightShiftsPerNurse.forEach((n) => {
    if (Math.abs(n - avgNights) > 2) softViolations++;
  });
  
  hoursPerNurse.forEach((h) => {
    if (Math.abs(h - avgHours) > 16) softViolations++;
  });
  
  const maxScore = 1000;
  const score = Math.max(0, maxScore - hardViolations * 50 - softViolations * 10);
  
  return { score, hardViolations, softViolations };
}

// Simulated Annealing
export function runSimulatedAnnealing(nurses: Nurse[]): ScheduleResult {
  const startTime = performance.now();
  let schedule = generateInitialSchedule(nurses);
  let { score, hardViolations, softViolations } = calculateScore(schedule, nurses);
  
  let temperature = 100;
  const coolingRate = 0.995;
  const iterations = 1000;
  
  for (let i = 0; i < iterations; i++) {
    // Random swap
    const n = Math.floor(Math.random() * nurses.length);
    const d = Math.floor(Math.random() * DAYS);
    const shifts: ShiftType[] = ["D", "L", "N", "O"];
    const oldShift = schedule[n][d];
    const newShift = shifts[Math.floor(Math.random() * shifts.length)];
    
    schedule[n][d] = newShift;
    const newResult = calculateScore(schedule, nurses);
    
    const delta = newResult.score - score;
    
    if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
      score = newResult.score;
      hardViolations = newResult.hardViolations;
      softViolations = newResult.softViolations;
    } else {
      schedule[n][d] = oldShift;
    }
    
    temperature *= coolingRate;
  }
  
  const executionTime = performance.now() - startTime;
  
  const hoursPerNurse = schedule.map((row) =>
    row.filter((s) => s !== "O").length * 8
  );
  const nightShiftsPerNurse = schedule.map((row) =>
    row.filter((s) => s === "N").length
  );
  
  return {
    algorithm: "Simulated Annealing",
    schedule,
    score,
    hardViolations,
    softViolations,
    executionTime,
    hoursPerNurse,
    nightShiftsPerNurse,
  };
}

// Tabu Search
export function runTabuSearch(nurses: Nurse[]): ScheduleResult {
  const startTime = performance.now();
  let schedule = generateInitialSchedule(nurses);
  let { score, hardViolations, softViolations } = calculateScore(schedule, nurses);
  
  const tabuList: string[] = [];
  const tabuSize = 50;
  const iterations = 800;
  
  let bestSchedule = schedule.map((row) => [...row]);
  let bestScore = score;
  
  for (let i = 0; i < iterations; i++) {
    let bestNeighbor = null;
    let bestNeighborScore = -Infinity;
    let bestMove = "";
    
    // Explore neighbors
    for (let attempt = 0; attempt < 20; attempt++) {
      const n = Math.floor(Math.random() * nurses.length);
      const d = Math.floor(Math.random() * DAYS);
      const shifts: ShiftType[] = ["D", "L", "N", "O"];
      const oldShift = schedule[n][d];
      const newShift = shifts[Math.floor(Math.random() * shifts.length)];
      
      const move = `${n}-${d}-${newShift}`;
      
      if (!tabuList.includes(move)) {
        schedule[n][d] = newShift;
        const result = calculateScore(schedule, nurses);
        
        if (result.score > bestNeighborScore) {
          bestNeighbor = schedule.map((row) => [...row]);
          bestNeighborScore = result.score;
          bestMove = `${n}-${d}-${oldShift}`;
        }
        
        schedule[n][d] = oldShift;
      }
    }
    
    if (bestNeighbor) {
      schedule = bestNeighbor;
      score = bestNeighborScore;
      
      tabuList.push(bestMove);
      if (tabuList.length > tabuSize) tabuList.shift();
      
      if (score > bestScore) {
        bestSchedule = schedule.map((row) => [...row]);
        bestScore = score;
      }
    }
  }
  
  const result = calculateScore(bestSchedule, nurses);
  const executionTime = performance.now() - startTime;
  
  const hoursPerNurse = bestSchedule.map((row) =>
    row.filter((s) => s !== "O").length * 8
  );
  const nightShiftsPerNurse = bestSchedule.map((row) =>
    row.filter((s) => s === "N").length
  );
  
  return {
    algorithm: "Tabu Search",
    schedule: bestSchedule,
    score: result.score,
    hardViolations: result.hardViolations,
    softViolations: result.softViolations,
    executionTime,
    hoursPerNurse,
    nightShiftsPerNurse,
  };
}

// Greedy Algorithm
export function runGreedy(nurses: Nurse[]): ScheduleResult {
  const startTime = performance.now();
  const schedule: ShiftType[][] = Array.from({ length: nurses.length }, () =>
    Array(DAYS).fill("O")
  );
  
  // Track constraints per nurse
  const nurseStats = nurses.map(() => ({
    totalHours: 0,
    consecutiveWork: 0,
    consecutiveNights: 0,
    consecutiveOff: 0,
    lastShift: "O" as ShiftType,
  }));
  
  // Assign shifts day by day
  for (let d = 0; d < DAYS; d++) {
    const dayNeeded = DAY_SHIFT_REQUIRED;
    const lateNeeded = LATE_SHIFT_REQUIRED;
    const nightNeeded = NIGHT_SHIFT_REQUIRED;
    
    let dayAssigned = 0, lateAssigned = 0, nightAssigned = 0;
    
    // Shuffle nurses for fairness
    const shuffledIndices = [...Array(nurses.length).keys()].sort(() => Math.random() - 0.5);
    
    for (const n of shuffledIndices) {
      const stats = nurseStats[n];
      
      // Skip if max consecutive work or hours
      if (stats.consecutiveWork >= 5 || stats.totalHours >= 160) {
        stats.consecutiveOff++;
        stats.consecutiveWork = 0;
        stats.consecutiveNights = 0;
        stats.lastShift = "O";
        continue;
      }
      
      // Try to assign needed shifts
      if (dayAssigned < dayNeeded && stats.lastShift !== "N") {
        schedule[n][d] = "D";
        stats.totalHours += 8;
        stats.consecutiveWork++;
        stats.consecutiveNights = 0;
        stats.consecutiveOff = 0;
        stats.lastShift = "D";
        dayAssigned++;
      } else if (lateAssigned < lateNeeded) {
        schedule[n][d] = "L";
        stats.totalHours += 8;
        stats.consecutiveWork++;
        stats.consecutiveNights = 0;
        stats.consecutiveOff = 0;
        stats.lastShift = "L";
        lateAssigned++;
      } else if (nightAssigned < nightNeeded && stats.consecutiveNights < 2) {
        schedule[n][d] = "N";
        stats.totalHours += 8;
        stats.consecutiveWork++;
        stats.consecutiveNights++;
        stats.consecutiveOff = 0;
        stats.lastShift = "N";
        nightAssigned++;
      } else {
        stats.consecutiveOff++;
        stats.consecutiveWork = 0;
        stats.consecutiveNights = 0;
        stats.lastShift = "O";
      }
    }
  }
  
  const { score, hardViolations, softViolations } = calculateScore(schedule, nurses);
  const executionTime = performance.now() - startTime;
  
  const hoursPerNurse = schedule.map((row) =>
    row.filter((s) => s !== "O").length * 8
  );
  const nightShiftsPerNurse = schedule.map((row) =>
    row.filter((s) => s === "N").length
  );
  
  return {
    algorithm: "Greedy",
    schedule,
    score,
    hardViolations,
    softViolations,
    executionTime,
    hoursPerNurse,
    nightShiftsPerNurse,
  };
}

// CSP with Backtracking
export function runCSP(nurses: Nurse[]): ScheduleResult {
  const startTime = performance.now();
  let schedule = generateInitialSchedule(nurses);
  
  // Apply constraint propagation to fix violations
  for (let iteration = 0; iteration < 500; iteration++) {
    let changed = false;
    
    for (let d = 0; d < DAYS; d++) {
      let dayCount = 0, lateCount = 0, nightCount = 0;
      
      for (let n = 0; n < nurses.length; n++) {
        if (schedule[n][d] === "D") dayCount++;
        else if (schedule[n][d] === "L") lateCount++;
        else if (schedule[n][d] === "N") nightCount++;
      }
      
      // Fix understaffing
      for (let n = 0; n < nurses.length && dayCount < DAY_SHIFT_REQUIRED; n++) {
        if (schedule[n][d] === "O") {
          const canWork = d === 0 || schedule[n][d - 1] !== "N";
          if (canWork) {
            schedule[n][d] = "D";
            dayCount++;
            changed = true;
          }
        }
      }
      
      for (let n = 0; n < nurses.length && lateCount < LATE_SHIFT_REQUIRED; n++) {
        if (schedule[n][d] === "O") {
          schedule[n][d] = "L";
          lateCount++;
          changed = true;
        }
      }
      
      for (let n = 0; n < nurses.length && nightCount < NIGHT_SHIFT_REQUIRED; n++) {
        if (schedule[n][d] === "O") {
          const consNights = d > 0 && schedule[n][d - 1] === "N" ? 1 : 0;
          if (consNights < 2) {
            schedule[n][d] = "N";
            nightCount++;
            changed = true;
          }
        }
      }
    }
    
    if (!changed) break;
  }
  
  const { score, hardViolations, softViolations } = calculateScore(schedule, nurses);
  const executionTime = performance.now() - startTime;
  
  const hoursPerNurse = schedule.map((row) =>
    row.filter((s) => s !== "O").length * 8
  );
  const nightShiftsPerNurse = schedule.map((row) =>
    row.filter((s) => s === "N").length
  );
  
  return {
    algorithm: "CSP",
    schedule,
    score,
    hardViolations,
    softViolations,
    executionTime,
    hoursPerNurse,
    nightShiftsPerNurse,
  };
}
