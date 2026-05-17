"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, Sunset, Minus, Upload, Play, RotateCcw, Download, Edit3, Check } from "lucide-react";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useSchedule, type ShiftType, type Nurse } from "@/lib/schedule-context";
import type { ScheduleHistoryEntry } from "@/lib/schedule-types";
import { runSimulatedAnnealing, runTabuSearch, runGreedy, runCSP, runAllSchedulers } from "@/lib/algorithms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const shiftConfig: Record<ShiftType, { label: string; icon: typeof Sun; color: string; bgColor: string }> = {
  D: { label: "Day", icon: Sun, color: "text-amber-300", bgColor: "bg-amber-500/30 border-amber-500/50" },
  L: { label: "Late", icon: Sunset, color: "text-orange-300", bgColor: "bg-orange-500/30 border-orange-500/50" },
  N: { label: "Night", icon: Moon, color: "text-indigo-300", bgColor: "bg-indigo-500/30 border-indigo-500/50" },
  O: { label: "Off", icon: Minus, color: "text-gray-400", bgColor: "bg-gray-500/20 border-gray-500/30" },
};

const algorithms = [
  { id: "sa", name: "Simulated Annealing", run: runSimulatedAnnealing },
  { id: "tabu", name: "Tabu Search", run: runTabuSearch },
  { id: "greedy", name: "Greedy", run: runGreedy },
  { id: "csp", name: "CSP", run: runCSP },
];

export function ScheduleSection() {
  const { nurses, setNurses, results, selectedResult, setSelectedResult, addResult, addResults, clearResults, updateShift, isLoading, setIsLoading } = useSchedule();
  const [selectedAlgorithm, setSelectedAlgorithm] = useState("sa");
  const [editMode, setEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState<{ nurse: number; day: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [datasets, setDatasets] = useState<{ name: string; data: Nurse[] }[]>([]);
  const [selectedDatasetIndex, setSelectedDatasetIndex] = useState<string>("0");
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null);
  const [runStatus, setRunStatus] = useState<string>("Idle");
  const [runElapsedMs, setRunElapsedMs] = useState(0);

  const datasetOptions = useMemo(
    () =>
      datasets.length > 0
        ? datasets
        : [{ name: "Project Default Dataset", data: nurses }],
    [datasets, nurses]
  );

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      setRunElapsedMs(Math.round(performance.now() - startedAt));
    }, 250);

    return () => window.clearInterval(interval);
  }, [isLoading]);

  const handleDatasetChange = (val: string) => {
    setSelectedDatasetIndex(val);
    const dataset = datasetOptions[parseInt(val)];
    if (dataset) {
      setNurses(dataset.data);
      clearResults();
    }
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      
      // Skip header row
      const dataLines = lines.slice(1);
      const parsedNurses = dataLines.map((line, index) => {
        const parts = line.split(",").map((p) => p.trim());
        
        // Check if it's the project's specific dataset format:
        // ID,LastName,FirstName,DateOfBirth,Age,Gender,seniority,day_off1,day_off2
        if (parts.length >= 7 && (parts[6].toLowerCase() === 'senior' || parts[6].toLowerCase() === 'junior')) {
            return {
              id: `nurse-${index + 1}`,
              name: `${parts[2]} ${parts[1]}`, // FirstName LastName
              isSenior: parts[6].toLowerCase() === 'senior',
              dayOffRequests: [parseInt(parts[7]), parseInt(parts[8])].filter(n => !isNaN(n) && n > 0),
            };
        }
        
        // Fallback to the generic format
        return {
          id: `nurse-${index + 1}`,
          name: parts[0] || `Nurse ${index + 1}`,
          isSenior: parts[1]?.toLowerCase() === "true" || parts[1] === "1",
          dayOffRequests: parts[2] ? parts[2].split(";").map(Number).filter((n) => !isNaN(n)) : [],
        };
      });

      if (parsedNurses.length > 0) {
        if (parsedNurses.length !== 25) {
          alert(
            `This file has ${parsedNurses.length} nurses; the scheduler requires exactly 25. Tabu and SA will fail until you use a full dataset.`
          );
        }
        const newDataset = { name: file.name, data: parsedNurses };
        setDatasets((prev) => {
          const newDatasets = [...prev, newDataset];
          setSelectedDatasetIndex(String(newDatasets.length - 1));
          return newDatasets;
        });
        setNurses(parsedNurses);
        clearResults();
      }
    };
    reader.readAsText(file);
    if (event.target) event.target.value = '';
  }, [setNurses, clearResults]);

  const runAlgorithm = useCallback(async () => {
    setIsLoading(true);
    const controller = new AbortController();
    setAbortCtrl(controller);
    const algorithmLabel = algorithms.find((a) => a.id === selectedAlgorithm)?.name || selectedAlgorithm;
    setRunStatus(`Running ${algorithmLabel}...`);
    setRunElapsedMs(0);
    const startedAt = performance.now();
    try {
      const algorithm = algorithms.find((a) => a.id === selectedAlgorithm);
      if (algorithm) {
        const result = await algorithm.run(nurses, controller.signal);
        addResult(result);
        setRunStatus(`Completed ${algorithmLabel}`);
      }
    } catch (error) {
      if (
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.message === "Request aborted")
      ) {
        setRunStatus(`Cancelled ${algorithmLabel}`);
        return;
      } else {
        console.error(error);
        setRunStatus(`Failed ${algorithmLabel}`);
        alert(
          error instanceof Error
            ? error.message
            : "Failed to run algorithm. Please check the console."
        );
      }
    } finally {
      setIsLoading(false);
      setAbortCtrl(null);
      setRunElapsedMs(Math.round(performance.now() - startedAt));
    }
  }, [selectedAlgorithm, nurses, addResult, setIsLoading]);

  const runAllAlgorithms = useCallback(async () => {
    setIsLoading(true);
    const controller = new AbortController();
    setAbortCtrl(controller);
    clearResults();
    setRunStatus("Running compare mode...");
    setRunElapsedMs(0);
    const startedAt = performance.now();
    try {
      const order = algorithms.map((a) => a.id);
      const { results: batch, errors } = await runAllSchedulers(nurses, order, controller.signal);
      if (batch.length > 0) {
        addResults(batch);
      }
      if (errors?.length) {
        console.warn("Some schedulers failed:", errors);
      }
      if (batch.length === 0) {
        alert("All algorithms failed to run. Check the server console and Python setup.");
      }
      setRunStatus("Compare run completed");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setRunStatus("Compare run cancelled");
        return;
      } else {
        console.error(error);
        setRunStatus("Compare run failed");
        alert(
          error instanceof Error
            ? error.message
            : "Failed to run algorithms. Please check the console."
        );
      }
    } finally {
      setIsLoading(false);
      setAbortCtrl(null);
      setRunElapsedMs(Math.round(performance.now() - startedAt));
    }
  }, [nurses, addResults, clearResults, setIsLoading]);

  const handleCellClick = (nurseIndex: number, dayIndex: number) => {
    if (editMode && selectedResult) {
      setEditingCell({ nurse: nurseIndex, day: dayIndex });
    }
  };

  const handleShiftChange = (shift: ShiftType) => {
    if (editingCell) {
      updateShift(editingCell.nurse, editingCell.day, shift);
      setEditingCell(null);
    }
  };

  const downloadSchedule = () => {
    if (!selectedResult) return;
    
    let csv = "Nurse,";
    for (let d = 1; d <= 28; d++) {
      csv += `Day ${d},`;
    }
    csv += "Total Hours,Night Shifts\n";
    
    nurses.forEach((nurse, i) => {
      csv += `${nurse.name},`;
      selectedResult.schedule[i].forEach((shift) => {
        csv += `${shift},`;
      });
      csv += `${selectedResult.hoursPerNurse[i]},${selectedResult.nightShiftsPerNurse[i]}\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schedule-${selectedResult.algorithm.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayDays = 28;
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const progressLog = selectedResult?.progressLog ?? [];

  const resultHistory = useMemo<ScheduleHistoryEntry[]>(
    () => selectedResult?.history ?? [],
    [selectedResult?.history]
  );

  const displayedSchedule = (() => {
    if (!selectedResult) return [] as string[][];
    if (
      historyIndex !== null &&
      resultHistory[historyIndex]?.schedule
    ) {
      return resultHistory[historyIndex].schedule;
    }
    return selectedResult.schedule;
  })();

  // playback loop
  useEffect(() => {
    if (!playing) return;
    if (!selectedResult || resultHistory.length === 0) return;
    const hist = resultHistory;
    let idx = historyIndex ?? 0;
    const interval = setInterval(() => {
      idx = Math.min(idx + 1, hist.length - 1);
      setHistoryIndex(idx);
      if (idx === hist.length - 1) setPlaying(false);
    }, 400);
    return () => clearInterval(interval);
  }, [playing, selectedResult, historyIndex, resultHistory]);

  return (
    <section id="schedule" className="py-24 bg-card/30">
      <div className="max-w-[95vw] xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Interactive Schedule Generator
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload nurse data, select an algorithm, and generate optimized schedules for 25 nurses over 28 days
          </p>
        </motion.div>

        {/* Controls Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Algorithm Controls</CardTitle>
              <CardDescription>Upload nurse data (CSV) and run scheduling algorithms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                {/* File Upload */}
                <label htmlFor="nurse-csv-upload" className="sr-only">
                  Upload nurse schedule CSV
                </label>
                <input
                  id="nurse-csv-upload"
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                  aria-label="Upload nurse schedule CSV"
                >
                  <Upload className="size-4" />
                  Upload CSV
                </Button>

                {/* Dataset Selection */}
                {datasetOptions.length > 0 && (
                  <Select value={selectedDatasetIndex} onValueChange={handleDatasetChange}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasetOptions.map((ds, idx) => (
                        <SelectItem key={idx} value={String(idx)}>
                          {ds.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Algorithm Selection */}
                <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select algorithm" />
                  </SelectTrigger>
                  <SelectContent>
                    {algorithms.map((algo) => (
                      <SelectItem key={algo.id} value={algo.id}>
                        {algo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Run Button */}
                <Button onClick={runAlgorithm} disabled={isLoading} className="gap-2">
                  <Play className="size-4" />
                  Run Algorithm
                </Button>

                {isLoading && (
                  <Button variant="destructive" onClick={() => abortCtrl?.abort()} className="gap-2">
                    <RotateCcw className="size-4" />
                    Stop
                  </Button>
                )}

                {/* Run All Button */}
                <Button onClick={runAllAlgorithms} disabled={isLoading} variant="secondary" className="gap-2">
                  <Play className="size-4" />
                  Run All & Compare
                </Button>

                {/* Reset Button */}
                <Button variant="ghost" onClick={clearResults} className="gap-2">
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>

              <div className="mt-4 p-3 bg-secondary/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>CSV Format:</strong> Name, IsSenior (true/false), DayOffRequests (semicolon-separated days 1-7)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Example: John Doe, true, 1;3;5
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                <div className="flex items-center gap-3">
                  {isLoading && <span className="inline-flex size-2.5 animate-pulse rounded-full bg-primary" />}
                  <span className="font-medium text-foreground">{runStatus}</span>
                </div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  Elapsed {runElapsedMs} ms
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex flex-wrap justify-center gap-6 mb-8"
        >
          {(Object.keys(shiftConfig) as ShiftType[]).map((shift) => {
            const config = shiftConfig[shift];
            const Icon = config.icon;
            return (
              <div key={shift} className="flex items-center gap-2">
                <div className={`p-2 rounded border ${config.bgColor}`}>
                  <Icon className={`size-4 ${config.color}`} />
                </div>
                <span className="text-sm text-foreground font-medium">{config.label}</span>
              </div>
            );
          })}
        </motion.div>

        {/* Loading Widget */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 mb-8 bg-card rounded-xl border border-border shadow-sm"
          >
            <div className="relative size-16 mb-6">
              <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-foreground animate-pulse">Running Optimization Algorithms...</h3>
            <p className="text-muted-foreground mt-2 text-center max-w-sm">
              Please wait while the scheduling engine searches the solution space for the optimal nurse schedule.
            </p>
            <div className="mt-4 inline-flex items-center gap-3 rounded-full border border-border bg-muted/40 px-4 py-2 text-sm text-foreground">
              <span className="inline-flex size-2.5 animate-pulse rounded-full bg-primary" />
              <span>{runStatus}</span>
              <span className="text-muted-foreground">•</span>
              <span className="tabular-nums text-muted-foreground">{runElapsedMs} ms elapsed</span>
            </div>
          </motion.div>
        )}

        {/* Results Info */}
        {!isLoading && selectedResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <Badge variant="secondary" className="text-base px-3 py-1">
                      {selectedResult.algorithm}
                    </Badge>
                    <div className="flex items-center gap-6 text-sm">
                      <span className="text-foreground">
                        <strong className="text-primary">{selectedResult.score}</strong> Score
                      </span>
                      <span className="text-foreground">
                        <strong className="text-destructive">{selectedResult.hardViolations}</strong> Hard Violations
                      </span>
                      <span className="text-foreground">
                        <strong className="text-amber-400">{selectedResult.softViolations}</strong> Soft Violations
                      </span>
                      <span className="text-foreground">
                        <strong className="text-muted-foreground">{selectedResult.executionTime.toFixed(2)}ms</strong> Time
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={editMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEditMode(!editMode)}
                      className="gap-2"
                    >
                      {editMode ? <Check className="size-4" /> : <Edit3 className="size-4" />}
                      {editMode ? "Done Editing" : "Edit Schedule"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadSchedule} className="gap-2">
                      <Download className="size-4" />
                      Download CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!isLoading && selectedResult && progressLog.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Run Progress Log</CardTitle>
                <CardDescription>
                  Iteration updates captured from the optimizer while it ran.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-56 overflow-auto rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs text-muted-foreground">
                  {progressLog.map((line, index) => (
                    <div key={`${index}-${line}`} className="whitespace-pre-wrap leading-5">
                      {line}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!isLoading && selectedResult?.logFile && (
          <div className="mb-8 text-xs text-muted-foreground">
            Iteration log file: {selectedResult.logFile}
          </div>
        )}

        {/* Schedule Grid */}
        {!isLoading && selectedResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {results.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {results.map((result, idx) => (
                  <Button
                    key={`${result.algorithm}-${idx}`}
                    variant={selectedResult?.algorithm === result.algorithm ? "default" : "outline"}
                    onClick={() => setSelectedResult(result)}
                    className="text-sm font-medium"
                  >
                    {result.algorithm}
                  </Button>
                ))}
              </div>
            )}
            <Card className="bg-card border-border overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-foreground flex items-center gap-2">
                  28-Day Schedule
                  {editMode && (
                    <Badge variant="outline" className="text-primary border-primary">
                      Click cells to edit
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {resultHistory.length > 0 && (
                  <div className="p-3 border-b border-border flex items-center gap-4">
                    <button
                      onClick={() => setPlaying((p) => !p)}
                      className="px-3 py-1 rounded bg-primary text-primary-foreground"
                    >
                      {playing ? 'Pause' : 'Play'}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={resultHistory.length - 1}
                      value={historyIndex ?? 0}
                      onChange={(e) => { setHistoryIndex(Number(e.target.value)); setPlaying(false); }}
                      className="flex-1"
                      aria-label="Schedule optimization iteration"
                    />
                    <div className="text-sm text-muted-foreground">Iteration: {historyIndex ?? 0}</div>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1400px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-2 text-left text-xs font-semibold text-foreground bg-secondary sticky left-0 z-20 min-w-[120px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          Nurse
                        </th>
                        {Array.from({ length: displayDays }, (_, i) => (
                          <th
                            key={i}
                            className="p-1 text-center text-xs font-semibold text-foreground bg-secondary/50 min-w-[40px]"
                          >
                            <div>{i + 1}</div>
                            <div className="text-[10px] font-normal text-muted-foreground">
                              {["M", "T", "W", "T", "F", "S", "S"][i % 7]}
                            </div>
                          </th>
                        ))}
                        <th className="p-2 text-center text-xs font-semibold text-foreground bg-secondary/50 min-w-[50px]">
                          Hours
                        </th>
                        <th className="p-2 text-center text-xs font-semibold text-foreground bg-secondary/50 min-w-[50px]">
                          Nights
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {nurses.slice(0, 25).map((nurse, nurseIndex) => (
                        <tr key={nurse.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                          <td className="p-2 text-xs font-medium text-foreground bg-card sticky left-0 z-20 border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            <div className="flex items-center gap-1">
                              {nurse.name}
                              {nurse.isSenior && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  Sr
                                </Badge>
                              )}
                            </div>
                          </td>
                          {(displayedSchedule[nurseIndex] || []).map((shift, dayIndex) => {
                            const shiftKey = (shift in shiftConfig ? shift : "O") as ShiftType;
                            const config = shiftConfig[shiftKey];
                            const Icon = config.icon;
                            const isEditing = editingCell?.nurse === nurseIndex && editingCell?.day === dayIndex;
                            
                            return (
                              <td
                                key={dayIndex}
                                className={`p-0.5 text-center ${editMode ? "cursor-pointer hover:bg-primary/20" : ""}`}
                                onClick={() => handleCellClick(nurseIndex, dayIndex)}
                              >
                                {isEditing ? (
                                  <div className="flex gap-0.5 justify-center">
                                    {(Object.keys(shiftConfig) as ShiftType[]).map((s) => {
                                      const c = shiftConfig[s];
                                      const I = c.icon;
                                      return (
                                        <button
                                          key={s}
                                          type="button"
                                          aria-label={`Set shift to ${c.label}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleShiftChange(s);
                                          }}
                                          className={`p-1 rounded border ${c.bgColor} hover:scale-110 transition-transform`}
                                        >
                                          <I className={`size-3 ${c.color}`} />
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div
                                    className={`inline-flex items-center justify-center size-7 rounded border ${config.bgColor}`}
                                  >
                                    <Icon className={`size-3.5 ${config.color}`} />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-2 text-center text-xs font-medium text-foreground">
                            {(() => {
                              const row = displayedSchedule[nurseIndex] || [];
                              let hours = 0;
                              row.forEach((s) => {
                                if (["D", "L", "N"].includes(s)) hours += 8;
                              });
                              return `${hours}h`;
                            })()}
                          </td>
                          <td className="p-2 text-center text-xs font-medium text-foreground">
                            {(() => {
                              const row = displayedSchedule[nurseIndex] || [];
                              let nights = 0;
                              row.forEach((s) => { if (s === 'N') nights += 1; });
                              return nights;
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && !selectedResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-card border-border border-dashed">
              <CardContent className="py-16 text-center">
                <div className="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4">
                  <Play className="size-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No Schedule Generated</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Select an algorithm and click &quot;Run Algorithm&quot; to generate an optimized schedule, 
                  or click &quot;Run All & Compare&quot; to compare all algorithms.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </section>
  );
}
