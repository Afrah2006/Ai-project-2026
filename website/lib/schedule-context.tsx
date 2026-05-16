"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export type ShiftType = "D" | "L" | "N" | "O";

export type RunStatus = "idle" | "running" | "stopping" | "cancelled" | "completed" | "error";

export interface Nurse {
  id: string;
  name: string;
  isSenior: boolean;
  dayOffRequests: number[];
}

export interface TraceSnapshot {
  type: "trace";
  algorithm: string;
  step: number;
  kind: string;
  day?: number;
  score: number;
  hardViolations: number;
  penalty?: number;
  currentScore?: number;
  bestScore?: number;
  acceptedMoves?: number;
  rejectedMoves?: number;
  skippedMoves?: number;
  temperature?: number;
  progressPercent?: number;
  dailyCoverage?: { day: number; D: number; L: number; N: number; required: number }[];
  schedule?: ShiftType[][];
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
  convergenceData?: { iteration: number; score: number }[];
  cancelled?: boolean;
}

interface ScheduleContextType {
  nurses: Nurse[];
  setNurses: (nurses: Nurse[]) => void;
  results: ScheduleResult[];
  addResult: (result: ScheduleResult) => void;
  addResults: (newResults: ScheduleResult[]) => void;
  clearResults: () => void;
  selectedResult: ScheduleResult | null;
  setSelectedResult: (result: ScheduleResult | null) => void;
  updateShift: (nurseIndex: number, dayIndex: number, shift: ShiftType) => void;
  runStatus: RunStatus;
  setRunStatus: (s: RunStatus) => void;
  runMessage: string | null;
  setRunMessage: (m: string | null) => void;
  abortController: AbortController | null;
  setAbortController: (ctrl: AbortController | null) => void;
  stopAlgorithm: () => void;
  currentIteration: number | null;
  setCurrentIteration: (iter: number | null) => void;
  currentScore: number | null;
  setCurrentScore: (score: number | null) => void;
  currentPhase: string | null;
  setCurrentPhase: (p: string | null) => void;
  currentMessage: string | null;
  setCurrentMessage: (m: string | null) => void;
  logEntries: string[];
  appendLog: (msg: string) => void;
  traceSnapshots: TraceSnapshot[];
  setTraceSnapshots: React.Dispatch<React.SetStateAction<TraceSnapshot[]>>;
  appendTrace: (t: TraceSnapshot) => void;
  clearTraces: () => void;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

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
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [currentIteration, setCurrentIteration] = useState<number | null>(null);
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<string[]>([]);
  const [traceSnapshots, setTraceSnapshots] = useState<TraceSnapshot[]>([]);
  const stoppingRef = useRef(false);

  const appendLog = useCallback((msg: string) => {
    setLogEntries((prev) => [msg, ...prev].slice(0, 100));
  }, []);

  const stopAlgorithm = useCallback(() => {
    if (abortController && runStatus === "running") {
      stoppingRef.current = true;
      setRunStatus("stopping");
      setRunMessage("Stopping solver and cleaning up…");
      abortController.abort();
    }
  }, [abortController, runStatus]);

  const appendTrace = useCallback((t: TraceSnapshot) => {
    setTraceSnapshots((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.algorithm === t.algorithm && last.step === t.step && last.kind === t.kind) {
        return [...prev.slice(0, -1), { ...last, ...t }];
      }

      const next = [...prev, t];
      return next.length > 80 ? next.slice(-80) : next;
    });
  }, []);

  const clearTraces = useCallback(() => setTraceSnapshots([]), []);

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
    setCurrentIteration(null);
    setCurrentScore(null);
    clearTraces();
    setRunStatus("idle");
    setRunMessage(null);
  }, [clearTraces]);

  const updateShift = useCallback(
    (nurseIndex: number, dayIndex: number, shift: ShiftType) => {
      if (!selectedResult) return;
      const newSchedule = selectedResult.schedule.map((row, i) =>
        i === nurseIndex ? row.map((s, j) => (j === dayIndex ? shift : s)) : [...row]
      );
      const updatedResult: ScheduleResult = {
        ...selectedResult,
        schedule: newSchedule,
        algorithm: selectedResult.algorithm + " (Modified)",
      };
      setSelectedResult(updatedResult);
      setResults((prev) => prev.map((r) => (r === selectedResult ? updatedResult : r)));
    },
    [selectedResult]
  );

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
        runStatus,
        setRunStatus,
        runMessage,
        setRunMessage,
        abortController,
        setAbortController,
        stopAlgorithm,
        currentIteration,
        setCurrentIteration,
        currentScore,
        setCurrentScore,
        currentPhase,
        setCurrentPhase,
        currentMessage,
        setCurrentMessage,
        logEntries,
        appendLog,
        traceSnapshots,
        setTraceSnapshots,
        appendTrace,
        clearTraces,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) throw new Error("useSchedule must be used within ScheduleProvider");
  return context;
}
