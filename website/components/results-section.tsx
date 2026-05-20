"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSchedule } from "@/lib/schedule-context";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

export function ResultsSection() {
  const { results, selectedResult, setSelectedResult } = useSchedule();

  // Prepare comparison data
  const comparisonData = results.map((r) => ({
    name: r.algorithm.replace(" (Modified)", ""),
    score: r.score,
    hardViolations: r.hardViolations,
    softViolations: r.softViolations,
    time: Math.round(r.executionTime),
  }));

  // Radar chart data for algorithm comparison
  const radarData = results.length > 0
    ? [
        {
          metric: "Score",
          ...Object.fromEntries(results.map((r) => [r.algorithm, r.score / 10])),
        },
        {
          metric: "Speed",
          ...Object.fromEntries(results.map((r) => [r.algorithm, Math.max(0, 100 - r.executionTime / 10)])),
        },
        {
          metric: "Hard Constraints",
          ...Object.fromEntries(results.map((r) => [r.algorithm, Math.max(0, 100 - r.hardViolations * 10)])),
        },
        {
          metric: "Soft Constraints",
          ...Object.fromEntries(results.map((r) => [r.algorithm, Math.max(0, 100 - r.softViolations * 5)])),
        },
        {
          metric: "Fairness",
          ...Object.fromEntries(results.map((r) => {
            const avg = r.hoursPerNurse.reduce((a, b) => a + b, 0) / r.hoursPerNurse.length;
            const variance = r.hoursPerNurse.reduce((acc, h) => acc + Math.pow(h - avg, 2), 0) / r.hoursPerNurse.length;
            return [r.algorithm, Math.max(0, 100 - variance / 10)];
          })),
        },
      ]
    : [];

  // Hours distribution for selected result
  const hoursData = selectedResult
    ? selectedResult.hoursPerNurse.map((hours, i) => ({
        nurse: `N${i + 1}`,
        hours,
        nights: selectedResult.nightShiftsPerNurse[i] * 8,
      }))
    : [];

  // Night shifts fairness data
  const nightsData = selectedResult
    ? selectedResult.nightShiftsPerNurse.map((nights, i) => ({
        nurse: `N${i + 1}`,
        nights,
      }))
    : [];

  const algorithmColors: Record<string, string> = {
    "Simulated Annealing": "#22c55e",
    "Tabu Search": "#3b82f6",
    "Greedy": "#f59e0b",
    "CSP": "#8b5cf6",
  };

  if (results.length === 0) {
    return (
      <section id="results" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Results & Comparison
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Run algorithms in the Schedule Generator section above to see results and comparisons
            </p>
          </motion.div>

          <Card className="bg-card border-border border-dashed">
            <CardContent className="py-16 text-center">
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-primary/10 mb-4">
                <svg className="size-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No Results Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Generate schedules using the algorithms above to see performance comparisons and fairness charts.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section id="results" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Results & Algorithm Comparison
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Analyzing performance metrics and fairness across all algorithms
          </p>
        </motion.div>

        {/* Algorithm Result Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {results.map((result, idx) => (
            <Card
              key={`${result.algorithm}-${idx}`}
              className={`bg-card border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                selectedResult?.algorithm === result.algorithm
                  ? "border-primary shadow-lg shadow-primary/20"
                  : "border-border"
              }`}
              onClick={() => setSelectedResult(result)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge
                    style={{ backgroundColor: algorithmColors[result.algorithm.replace(" (Modified)", "")] || "#666" }}
                    className="text-white"
                  >
                    {result.algorithm}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Score</span>
                    <span className="text-lg font-bold text-primary">{result.score}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Hard Violations</span>
                    <span className="text-sm font-medium text-destructive">{result.hardViolations}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Soft Violations</span>
                    <span className="text-sm font-medium text-amber-400">{result.softViolations}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Time</span>
                    <span className="text-sm font-medium text-foreground">{result.executionTime.toFixed(1)}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Comparison Charts */}
        {results.length > 1 && (
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            {/* Score Comparison Bar Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-card border-border h-full">
                <CardHeader>
                  <CardTitle className="text-foreground">Score Comparison</CardTitle>
                  <CardDescription>Higher scores indicate better optimization</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                          dataKey="name"
                          stroke="var(--foreground)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="var(--foreground)"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            color: "var(--foreground)",
                          }}
                          labelStyle={{ color: "var(--foreground)" }}
                        />
                        <Bar dataKey="score" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Score" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Radar Chart for Multi-dimensional Comparison */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-card border-border h-full">
                <CardHeader>
                  <CardTitle className="text-foreground">Algorithm Performance Radar</CardTitle>
                  <CardDescription>Multi-dimensional comparison across metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="var(--border)" />
                        <PolarAngleAxis
                          dataKey="metric"
                          tick={{ fill: "var(--foreground)", fontSize: 11 }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 100]}
                          tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                        />
                        {results.map((result, idx) => (
                          <Radar
                            key={`${result.algorithm}-${idx}`}
                            name={result.algorithm}
                            dataKey={result.algorithm}
                            stroke={algorithmColors[result.algorithm.replace(" (Modified)", "")] || "#666"}
                            fill={algorithmColors[result.algorithm.replace(" (Modified)", "")] || "#666"}
                            fillOpacity={0.2}
                          />
                        ))}
                        <Legend
                          wrapperStyle={{ color: "var(--foreground)" }}
                          formatter={(value) => <span style={{ color: "var(--foreground)" }}>{value}</span>}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            color: "var(--foreground)",
                          }}
                          labelStyle={{ color: "var(--foreground)" }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Fairness Charts for Selected Result */}
        {selectedResult && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Fairness Charts - {selectedResult.algorithm}
              </h3>
              <p className="text-muted-foreground">
                Visualizing workload distribution across all 25 nurses
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Hours Worked Per Nurse */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Card className="bg-card border-border h-full">
                  <CardHeader>
                    <CardTitle className="text-foreground">Hours Worked Per Nurse</CardTitle>
                    <CardDescription>Target: 120–170 hours over the 28-day horizon (from config), balanced where possible</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={350}>
                        <BarChart data={hoursData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis
                            type="number"
                            stroke="var(--foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 180]}
                          />
                          <YAxis
                            dataKey="nurse"
                            type="category"
                            stroke="var(--foreground)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            width={35}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "var(--card)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              color: "var(--foreground)",
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            }}
                            itemStyle={{ color: "var(--foreground)", fontWeight: "500" }}
                            labelStyle={{ color: "var(--foreground)", fontWeight: "bold", paddingBottom: "4px", borderBottom: "1px solid var(--border)", marginBottom: "4px" }}
                          />
                          <Bar dataKey="hours" fill="#22c55e" radius={[0, 4, 4, 0]} name="Total Hours" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="size-3 rounded bg-green-500" />
                        <span className="text-foreground">Hours Worked</span>
                      </div>
                      <div className="text-muted-foreground">
                        Avg: {Math.round(hoursData.reduce((a, b) => a + b.hours, 0) / hoursData.length)}h
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Night Shifts Distribution */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Card className="bg-card border-border h-full">
                  <CardHeader>
                    <CardTitle className="text-foreground">Night Shifts Per Nurse</CardTitle>
                    <CardDescription>Equal distribution of night shifts for fairness</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
                        <BarChart data={nightsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis
                            dataKey="nurse"
                            stroke="var(--foreground)"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="var(--foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "var(--card)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              color: "var(--foreground)",
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            }}
                            itemStyle={{ color: "var(--foreground)", fontWeight: "500" }}
                            labelStyle={{ color: "var(--foreground)", fontWeight: "bold", paddingBottom: "4px", borderBottom: "1px solid var(--border)", marginBottom: "4px" }}
                          />
                          <Bar dataKey="nights" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Night Shifts" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="size-3 rounded bg-violet-500" />
                        <span className="text-foreground">Night Shifts</span>
                      </div>
                      <div className="text-muted-foreground">
                        Avg: {(nightsData.reduce((a, b) => a + b.nights, 0) / nightsData.length).toFixed(1)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Execution Time Comparison */}
            {results.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Execution Time Comparison</CardTitle>
                    <CardDescription>Time taken by each algorithm to generate a schedule (in milliseconds)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                        <BarChart data={comparisonData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis
                            type="number"
                            stroke="var(--foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            dataKey="name"
                            type="category"
                            stroke="var(--foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            width={130}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "var(--card)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              color: "var(--foreground)",
                              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                            }}
                            itemStyle={{ color: "var(--foreground)", fontWeight: "500" }}
                            labelStyle={{ color: "var(--foreground)", fontWeight: "bold", paddingBottom: "4px", borderBottom: "1px solid var(--border)", marginBottom: "4px" }}
                            formatter={(value) => [`${value}ms`, "Execution Time"]}
                          />
                          <Bar dataKey="time" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Time (ms)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
