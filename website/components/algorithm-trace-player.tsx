"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, SkipBack, SkipForward, Activity, Gauge, Thermometer } from "lucide-react";
import type { TraceSnapshot, ShiftType } from "@/lib/schedule-context";

const shiftColors: Record<ShiftType, string> = {
  D: "bg-amber-400/90",
  L: "bg-orange-500/90",
  N: "bg-indigo-500/90",
  O: "bg-zinc-600/50",
};

interface Props {
  traces: TraceSnapshot[];
  nursesCount?: number;
}

export function AlgorithmTracePlayer({ traces, nursesCount = 25 }: Props) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const sorted = useMemo(
    () => [...traces].sort((a, b) => a.step - b.step),
    [traces]
  );

  const safeIndex = Math.min(index, Math.max(0, sorted.length - 1));

  useEffect(() => {
    if (!playing || sorted.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i >= sorted.length - 1 ? 0 : i + 1));
    }, 900);
    return () => clearInterval(id);
  }, [playing, sorted.length]);

  if (sorted.length === 0) return null;

  const current = sorted[safeIndex] ?? sorted[sorted.length - 1];
  const grid = current.schedule;
  const label =
    current.kind === "day"
      ? `Day ${current.day ?? current.step}`
      : `Iteration ${current.step}`;

  return (
    <Card className="glass-panel border-primary/20 overflow-hidden">
      <CardHeader className="pb-3">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <motion.div layout>
            <CardTitle className="flex items-center gap-2 text-lg font-heading">
              <Activity className="size-5 text-primary" />
              Solver playback
            </CardTitle>
            <CardDescription>
              Watch coverage and roster evolve — {sorted.length} snapshots
            </CardDescription>
          </motion.div>
          <Badge variant="outline" className="border-primary/40 text-primary">
            {current.algorithm}
          </Badge>
        </motion.div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIndex(0)} disabled={index === 0}>
            <SkipBack className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => setPlaying((p) => !p)}
            className="gap-1"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
            {playing ? "Pause" : "Play"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIndex((i) => Math.min(sorted.length - 1, i + 1))}
            disabled={index >= sorted.length - 1}
          >
            <SkipForward className="size-4" />
          </Button>
          <input
            type="range"
            min={0}
            max={Math.max(0, sorted.length - 1)}
            value={safeIndex}
            onChange={(e) => {
              setPlaying(false);
              setIndex(Number(e.target.value));
            }}
            className="flex-1 min-w-30 accent-primary h-2"
            aria-label="Trace timeline"
          />
          <span className="text-sm font-medium tabular-nums text-muted-foreground">{label}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="grid sm:grid-cols-3 gap-4"
          >
            <motion.div layout className="rounded-xl bg-secondary/40 p-4 border border-border/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Score</p>
              <p className="text-2xl font-bold text-primary tabular-nums">{current.score}</p>
            </motion.div>
            <motion.div layout className="rounded-xl bg-secondary/40 p-4 border border-border/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                Hard violations
              </p>
              <p
                className={`text-2xl font-bold tabular-nums ${
                  current.hardViolations === 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {current.hardViolations}
              </p>
            </motion.div>
            <motion.div layout className="rounded-xl bg-secondary/40 p-4 border border-border/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Step</p>
              <p className="text-2xl font-bold tabular-nums">{current.step}</p>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-card/70 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
              <Gauge className="size-3.5" />
              Progress
            </div>
            <div className="text-lg font-semibold text-foreground tabular-nums">
              {current.progressPercent !== undefined ? `${Math.round(current.progressPercent)}%` : "Live"}
            </div>
            <div className="text-xs text-muted-foreground">
              {current.currentScore !== undefined ? `Current score ${current.currentScore}` : "Streamed trace snapshot"}
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/70 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-1">
              <Thermometer className="size-3.5" />
              Temperature
            </div>
            <div className="text-lg font-semibold text-foreground tabular-nums">
              {current.temperature !== undefined ? current.temperature.toFixed(2) : "N/A"}
            </div>
            <div className="text-xs text-muted-foreground">
              {current.bestScore !== undefined ? `Best score ${current.bestScore}` : "Only set for SA"}
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Move counts</p>
            <div className="text-lg font-semibold text-foreground tabular-nums">
              A {current.acceptedMoves ?? 0} / R {current.rejectedMoves ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">
              {current.skippedMoves !== undefined ? `Skipped ${current.skippedMoves}` : "Moves accepted vs rejected"}
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/70 p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Penalty</p>
            <div className="text-lg font-semibold text-foreground tabular-nums">
              {current.penalty !== undefined ? current.penalty.toFixed(2) : current.score.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Aligned with the final displayed score</div>
          </div>
        </div>

        {current.dailyCoverage && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Daily shift coverage (D / L / N)
            </p>
            <motion.div className="flex gap-0.5 overflow-x-auto pb-2">
              {current.dailyCoverage.map((d) => {
                const ok =
                  d.D >= d.required && d.L >= d.required && d.N >= d.required;
                return (
                  <motion.div
                    key={d.day}
                    title={`Day ${d.day}: D${d.D} L${d.L} N${d.N}`}
                    className={`shrink-0 w-3 h-10 rounded-sm ${
                      ok ? "bg-emerald-500/70" : "bg-amber-500/50"
                    } ${d.day === current.day ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                    layout
                  />
                );
              })}
            </motion.div>
          </div>
        )}

        {grid && grid.length > 0 && (
          <motion.div layout className="overflow-x-auto rounded-lg border border-border/60">
            <p className="text-xs font-medium text-muted-foreground p-2 border-b border-border/40">
              Roster preview (first {Math.min(8, nursesCount)} nurses)
            </p>
            <table className="w-full min-w-150 text-[10px]">
              <thead>
                <tr>
                  <th className="p-1 text-left sticky left-0 bg-card/95">#</th>
                  {Array.from({ length: 28 }, (_, i) => (
                    <th key={i} className="p-0.5 text-center font-normal text-muted-foreground">
                      {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.slice(0, 8).map((row, ni) => (
                  <tr key={ni}>
                    <td className="p-1 sticky left-0 bg-card/95 font-medium">N{ni + 1}</td>
                    {row.map((s, di) => (
                      <td key={di} className="p-0">
                        <div
                          className={`size-3 mx-auto rounded-sm ${shiftColors[s as ShiftType] || shiftColors.O}`}
                          title={s}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
