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
  LineChart,
  Line,
  Radar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CustomGradients = () => (
  <svg width="0" height="0">
    <defs>
      <linearGradient id="colorHours" x1="0" y1="0" x2="1" y2="0">
        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#15803d" stopOpacity={0.8}/>
      </linearGradient>
      <linearGradient id="colorNights" x1="0" y1="1" x2="0" y2="0">
        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#6d28d9" stopOpacity={0.8}/>
      </linearGradient>
      <linearGradient id="colorTime" x1="0" y1="0" x2="1" y2="0">
        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#b45309" stopOpacity={0.8}/>
      </linearGradient>
      <linearGradient id="colorScore" x1="0" y1="1" x2="0" y2="0">
        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
        <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.8}/>
      </linearGradient>
    </defs>
  </svg>
);

export function ResultsSection() {
  const { nurses, results, selectedResult, setSelectedResult } = useSchedule();

  const average = (values: number[]) =>
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  const variance = (values: number[]) => {
    if (values.length === 0) return 0;
    const mean = average(values);
    return values.reduce((acc, value) => acc + Math.pow(value - mean, 2), 0) / values.length;
  };

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

  const shiftDistribution = selectedResult
    ? (() => {
        const counts = { D: 0, L: 0, N: 0, O: 0 };
        selectedResult.schedule.forEach(row => {
          row.forEach(s => {
            if (s === 'D') counts.D++;
            else if (s === 'L') counts.L++;
            else if (s === 'N') counts.N++;
            else counts.O++;
          });
        });
        return [
          { name: "Day", value: counts.D, color: "#facc15" },
          { name: "Late", value: counts.L, color: "#fb923c" },
          { name: "Night", value: counts.N, color: "#818cf8" },
          { name: "Off", value: counts.O, color: "#94a3b8" },
        ];
      })()
    : [];

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
      <CustomGradients />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold font-heading text-foreground mb-4 tracking-tight">
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
          {results.map((result) => (
            <Card
              key={result.algorithm}
              className={`glass-panel border-2 cursor-pointer transition-all hover:scale-[1.02] ${
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
                    <span className="text-sm text-muted-foreground">Evaluation Score</span>
                    <span className="text-lg font-bold text-foreground">{result.score}</span>
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
                  <div className="h-[300px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
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
                  <div className="h-[300px] w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
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
                        {results.map((result) => (
                          <Radar
                            key={result.algorithm}
                            name={result.algorithm}
                            dataKey={result.algorithm}
                            stroke={algorithmColors[result.algorithm.replace(" (Modified)", "")] || "#666"}
                            fill={algorithmColors[result.algorithm.replace(" (Modified)", "")] || "#666"}
                            fillOpacity={0.2}
                          />
                        ))}
                        <Legend
                          wrapperStyle={{ color: "var(--foreground)" }}
                          formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
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
                Detailed Analysis - {selectedResult.algorithm}
              </h3>
              <p className="text-muted-foreground">
                Convergence history and workload distribution across all {selectedResult.schedule.length} nurses
              </p>
            </motion.div>

            {/* Convergence Chart */}
            {selectedResult.convergenceData && selectedResult.convergenceData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="mb-8"
              >
                <Card className="bg-card border-border h-full">
                  <CardHeader>
                    <CardTitle className="text-foreground">Optimization Convergence</CardTitle>
                    <CardDescription>Algorithm score progression over iterations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedResult.convergenceData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis
                            dataKey="iteration"
                            stroke="var(--foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            label={{ value: 'Iterations', position: 'insideBottomRight', offset: -10, fill: "var(--muted-foreground)" }}
                          />
                          <YAxis
                            stroke="var(--foreground)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            domain={['auto', 'auto']}
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
                          <Line type="monotone" dataKey="score" stroke="url(#colorScore)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} name="Score" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

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
                    <div className="h-[350px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
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
                          <Bar dataKey="hours" fill="url(#colorHours)" radius={[0, 4, 4, 0]} name="Total Hours" />
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
                    <div className="h-[350px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
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
                          <Bar dataKey="nights" fill="url(#colorNights)" radius={[4, 4, 0, 0]} name="Night Shifts" />
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

            {/* Shift Distribution & Fairness Summary */}
            <div className="grid lg:grid-cols-3 gap-8 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="lg:col-span-1"
              >
                <Card className="bg-card border-border h-full">
                  <CardHeader>
                    <CardTitle className="text-foreground">Shift Distribution</CardTitle>
                    <CardDescription>Total allocation across all days</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={shiftDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {shiftDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                            itemStyle={{ color: "var(--foreground)" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2">
                      {shiftDistribution.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-2">
                          <div className={`size-3 rounded-full ${entry.color === "#facc15" ? "bg-amber-400" : entry.color === "#fb923c" ? "bg-orange-400" : entry.color === "#818cf8" ? "bg-indigo-400" : "bg-slate-400"}`} />
                          <span className="text-sm text-muted-foreground">{entry.name}: <strong className="text-foreground">{entry.value}</strong></span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="lg:col-span-2"
              >
                <Card className="bg-card border-border h-full">
                  <CardHeader>
                    <CardTitle className="text-foreground">Fairness & Balance</CardTitle>
                    <CardDescription>Advanced statistical balance indicators</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const workingAssignments = selectedResult.schedule.reduce(
                        (total, row) => total + row.filter((shift) => shift !== "O").length,
                        0
                      );
                      const seniorAssignments = selectedResult.schedule.reduce((total, row, nurseIndex) => {
                        const nurse = nurses[nurseIndex];
                        if (!nurse?.isSenior) return total;
                        return total + row.filter((shift) => shift !== "O").length;
                      }, 0);
                      const hoursVariance = variance(selectedResult.hoursPerNurse);
                      const nightVariance = variance(selectedResult.nightShiftsPerNurse);
                      const seniorShare = workingAssignments > 0 ? (seniorAssignments / workingAssignments) * 100 : 0;
                      const coverage =
                        (workingAssignments / (selectedResult.schedule.length * (selectedResult.schedule[0]?.length || 1))) *
                        100;

                      const stats = [
                        { label: "Hours Variance", value: hoursVariance.toFixed(1), icon: "Σ" },
                        { label: "Night Variance", value: nightVariance.toFixed(1), icon: "⚖" },
                        { label: "Senior Assignment Share", value: `${seniorShare.toFixed(1)}%`, icon: "🏆" },
                        { label: "Workload Coverage", value: `${coverage.toFixed(1)}%`, icon: "✓" },
                      ];

                      return (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
                            {stats.map((stat) => (
                              <div key={stat.label} className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                                <div className="text-lg mb-2">{stat.icon}</div>
                                <div className="text-xs text-muted-foreground">{stat.label}</div>
                                <div className="text-lg font-semibold text-foreground">{stat.value}</div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                            <h4 className="text-sm font-semibold text-primary mb-1">Optimization Insight</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {selectedResult.hardViolations === 0
                                ? `The schedule is hard-feasible with a soft penalty of ${selectedResult.softViolations}. `
                                : `The schedule still has ${selectedResult.hardViolations} hard violations and a soft penalty of ${selectedResult.softViolations}. `}
                              Hours variance is {hoursVariance.toFixed(1)}, night variance is {nightVariance.toFixed(1)}, and senior coverage is {seniorShare.toFixed(1)}% of all working assignments.
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
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
                    <div className="h-[200px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
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
                          <Bar dataKey="time" fill="url(#colorTime)" radius={[0, 4, 4, 0]} name="Time (ms)" />
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
