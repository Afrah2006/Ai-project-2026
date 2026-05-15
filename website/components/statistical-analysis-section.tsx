"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchedule } from "@/lib/schedule-context";
import { runFullBatchAnalysis, BatchRunResult } from "@/lib/algorithms";
import { Play, BarChart2, Activity, Clock, Target, AlertCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function StatisticalAnalysisSection() {
  const { nurses } = useSchedule();
  const [runs, setRuns] = useState<number>(10);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<BatchRunResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    if (runs < 2 || runs > 50) {
      setError("Please select a number of runs between 2 and 50.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResults(null);

    try {
      const { results: batch, errors } = await runFullBatchAnalysis(nurses, runs);
      if (batch.length === 0) {
        throw new Error("No algorithm produced batch results.");
      }
      setResults(batch);
      if (errors?.length) {
        setError(
          `Partial results: ${errors.map((e) => `${e.algorithm} (${e.message})`).join("; ")}`
        );
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during batch analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Process data for Average Comparison Chart
  const averagesData = results?.map((res) => {
    const validRuns = res.runs.filter((r) => r.hard_violations === 0);
    const avgScore =
      validRuns.length > 0
        ? validRuns.reduce((sum, r) => sum + r.score, 0) / validRuns.length
        : 0;
    const avgTime =
      res.runs.reduce((sum, r) => sum + r.execution_time, 0) / res.runs.length;
    const successRate = (validRuns.length / res.runs.length) * 100;

    return {
      name: res.algorithm,
      avgScore: Math.round(avgScore),
      avgTime: Math.round(avgTime),
      successRate: Math.round(successRate),
      validRuns: validRuns.length,
    };
  });

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-6"
          >
            <BarChart2 className="size-4" />
            <span className="text-sm font-medium tracking-wide uppercase">Batch Analytics</span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-foreground mb-6"
          >
            Statistical Performance Analysis
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground"
          >
            Run multiple iterations of each algorithm to analyze stability, average execution time, and success rates.
          </motion.p>
        </div>

        <Card className="max-w-4xl mx-auto mb-12 shadow-md">
          <CardHeader>
            <CardTitle>Configure Batch Run</CardTitle>
            <CardDescription>
              Select the number of iterations to run for each algorithm. Higher numbers provide better statistical significance but take longer to compute.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="grid gap-2 flex-1">
                <label htmlFor="runs" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Iterations per Algorithm
                </label>
                <input
                  id="runs"
                  type="number"
                  min={2}
                  max={50}
                  value={runs}
                  onChange={(e) => setRuns(parseInt(e.target.value) || 10)}
                  disabled={isAnalyzing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <Button
                size="lg"
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="w-full sm:w-auto"
              >
                {isAnalyzing ? (
                  <>
                    <div className="size-4 mr-2 border-2 border-white rounded-full border-t-transparent animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Play className="size-4 mr-2" />
                    Start Batch Analysis
                  </>
                )}
              </Button>
            </div>
            
            {error && (
              <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 flex items-center gap-2">
                <AlertCircle className="size-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {isAnalyzing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12"
          >
            <div className="relative size-16 mb-6">
              <div className="absolute inset-0 border-4 border-muted rounded-full"></div>
              <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
            </div>
            <h3 className="text-xl font-bold text-foreground animate-pulse">Running Batch Execution...</h3>
            <p className="text-muted-foreground mt-2 text-center max-w-md">
              Running greedy, CSP, tabu, and simulated annealing on the server ({runs} iterations each,{" "}
              {runs * 4} schedules total). This can take several minutes — keep this tab open.
            </p>
          </motion.div>
        )}

        {!isAnalyzing && averagesData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 max-w-6xl mx-auto"
          >
            <div className="grid md:grid-cols-2 gap-8">
              {/* Average Score Chart */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="size-5 text-primary" />
                    Average Feasible Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={averagesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" stroke="var(--foreground)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--foreground)" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            color: "var(--foreground)",
                          }}
                        />
                        <Bar dataKey="avgScore" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Avg Score" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Execution Time Chart */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="size-5 text-amber-500" />
                    Average Execution Time (ms)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={averagesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" stroke="var(--foreground)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--foreground)" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            color: "var(--foreground)",
                          }}
                        />
                        <Bar dataKey="avgTime" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Time (ms)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Table */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="size-5 text-indigo-500" />
                  Statistical Summary Table
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-secondary/50">
                      <tr>
                        <th className="px-6 py-4 rounded-tl-lg">Algorithm</th>
                        <th className="px-6 py-4">Success Rate</th>
                        <th className="px-6 py-4">Mean Score</th>
                        <th className="px-6 py-4">Mean Runtime (ms)</th>
                        <th className="px-6 py-4 rounded-tr-lg">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {averagesData.map((data, idx) => (
                        <tr key={data.name} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                          <td className="px-6 py-4 font-semibold text-foreground">{data.name}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${data.successRate === 100 ? 'bg-green-500/20 text-green-600' : 'bg-amber-500/20 text-amber-600'}`}>
                              {data.successRate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 font-medium">{data.avgScore}</td>
                          <td className="px-6 py-4 font-medium">{data.avgTime} ms</td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {data.name === 'Greedy' ? 'Extremely fast, lower optimality.' : 
                             data.name === 'CSP' ? 'Baseline feasibility generator.' :
                             data.name === 'Tabu Search' ? 'Fast local search improvement.' :
                             'High optimality, slower convergence.'}
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
      </div>
    </section>
  );
}
