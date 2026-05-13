"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type ShiftType = "D" | "L" | "N" | "O"; // Day, Late, Night, Off

export interface Nurse {
  id: string;
  name: string;
  isSenior: boolean;
  dayOffRequests: number[]; // days 1-7 (first week)
}

export interface ScheduleResult {
  algorithm: string;
  schedule: ShiftType[][];
  score: number;
  hardViolations: number;
  softViolations: number;
  executionTime: number;
  hoursPerNurse: number[];
  nightShiftsPerNurse: number[];
}

interface ScheduleContextType {
  nurses: Nurse[];
  setNurses: (nurses: Nurse[]) => void;
  results: ScheduleResult[];
  addResult: (result: ScheduleResult) => void;
  clearResults: () => void;
  selectedResult: ScheduleResult | null;
  setSelectedResult: (result: ScheduleResult | null) => void;
  updateShift: (nurseIndex: number, dayIndex: number, shift: ShiftType) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

// Generate default nurses
const defaultNurses: Nurse[] = Array.from({ length: 25 }, (_, i) => ({
  id: `nurse-${i + 1}`,
  name: `Nurse ${i + 1}`,
  isSenior: i < 5, // First 5 are seniors
  dayOffRequests: [],
}));

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const [nurses, setNurses] = useState<Nurse[]>(defaultNurses);
  const [results, setResults] = useState<ScheduleResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<ScheduleResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = useCallback((result: ScheduleResult) => {
    setResults((prev) => [...prev, result]);
    setSelectedResult(result);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setSelectedResult(null);
  }, []);

  const updateShift = useCallback((nurseIndex: number, dayIndex: number, shift: ShiftType) => {
    if (!selectedResult) return;
    
    const newSchedule = selectedResult.schedule.map((row, i) =>
      i === nurseIndex
        ? row.map((s, j) => (j === dayIndex ? shift : s))
        : [...row]
    );

    const updatedResult: ScheduleResult = {
      ...selectedResult,
      schedule: newSchedule,
      algorithm: selectedResult.algorithm + " (Modified)",
    };

    setSelectedResult(updatedResult);
    setResults((prev) =>
      prev.map((r) => (r === selectedResult ? updatedResult : r))
    );
  }, [selectedResult]);

  return (
    <ScheduleContext.Provider
      value={{
        nurses,
        setNurses,
        results,
        addResult,
        clearResults,
        selectedResult,
        setSelectedResult,
        updateShift,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error("useSchedule must be used within a ScheduleProvider");
  }
  return context;
}
