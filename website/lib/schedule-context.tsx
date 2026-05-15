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
  /** Append many results in one update (faster than repeated addResult). */
  addResults: (newResults: ScheduleResult[]) => void;
  clearResults: () => void;
  selectedResult: ScheduleResult | null;
  setSelectedResult: (result: ScheduleResult | null) => void;
  updateShift: (nurseIndex: number, dayIndex: number, shift: ShiftType) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

// Default project dataset (from data_ai_project.csv)
const defaultNurses: Nurse[] = [
  { id: "nurse-1", name: "IMAN BEBOUDI", isSenior: false, dayOffRequests: [2, 2] },
  { id: "nurse-2", name: "NDJATE BEDBOUDI", isSenior: false, dayOffRequests: [1, 5] },
  { id: "nurse-3", name: "KHEIREDDINE BADRAOUI", isSenior: false, dayOffRequests: [2, 3] },
  { id: "nurse-4", name: "HOUDRA BERABEZ", isSenior: true, dayOffRequests: [6, 5] },
  { id: "nurse-5", name: "ELHADI BERRAHIL", isSenior: true, dayOffRequests: [6, 7] },
  { id: "nurse-6", name: "ABDELKARIM BERRAHIL", isSenior: false, dayOffRequests: [7, 4] },
  { id: "nurse-7", name: "IMEN BRADAI", isSenior: true, dayOffRequests: [7, 1] },
  { id: "nurse-8", name: "HOUSSEM EDDINE BRANES", isSenior: false, dayOffRequests: [5, 2] },
  { id: "nurse-9", name: "SAMIRA BERBEGUE", isSenior: false, dayOffRequests: [3, 4] },
  { id: "nurse-10", name: "KHOULOUD BERBAGUE", isSenior: true, dayOffRequests: [3, 6] },
  { id: "nurse-11", name: "MAROUA BERDIOM", isSenior: true, dayOffRequests: [2, 7] },
  { id: "nurse-12", name: "CHAIMA BERHI", isSenior: false, dayOffRequests: [4, 7] },
  { id: "nurse-13", name: "MIANEL BERROGTANE", isSenior: false, dayOffRequests: [5, 4] },
  { id: "nurse-14", name: "LAILA BARKOUK", isSenior: false, dayOffRequests: [6, 2] },
  { id: "nurse-15", name: "ASIA BERKANI", isSenior: false, dayOffRequests: [7, 4] },
  { id: "nurse-16", name: "MERIEM BERKOUS", isSenior: true, dayOffRequests: [3, 5] },
  { id: "nurse-17", name: "INA BERNAMDANE", isSenior: false, dayOffRequests: [6, 3] },
  { id: "nurse-18", name: "ROUMAISSA BEROUR", isSenior: false, dayOffRequests: [2, 3] },
  { id: "nurse-19", name: "YASMINA BRISEKH", isSenior: false, dayOffRequests: [4, 5] },
  { id: "nurse-20", name: "RACHID BRIZAKH", isSenior: true, dayOffRequests: [4, 6] },
  { id: "nurse-21", name: "BADREDDINE BESSIKEUR", isSenior: false, dayOffRequests: [6, 7] },
  { id: "nurse-22", name: "NESRINE BSIKER", isSenior: false, dayOffRequests: [6, 1] },
  { id: "nurse-23", name: "NABILA IBRIR", isSenior: false, dayOffRequests: [7, 2] },
  { id: "nurse-24", name: "AMMAR ERHAILI", isSenior: false, dayOffRequests: [4, 3] },
  { id: "nurse-25", name: "KHAIER EDINE AKTOUF", isSenior: false, dayOffRequests: [7, 4] },
];

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const [nurses, setNurses] = useState<Nurse[]>(defaultNurses);
  const [results, setResults] = useState<ScheduleResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<ScheduleResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = useCallback((result: ScheduleResult) => {
    setResults((prev) => [...prev, result]);
    setSelectedResult(result);
  }, []);

  const addResults = useCallback((newResults: ScheduleResult[]) => {
    if (newResults.length === 0) return;
    setResults((prev) => [...prev, ...newResults]);
    setSelectedResult(newResults[newResults.length - 1]);
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
        addResults,
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
