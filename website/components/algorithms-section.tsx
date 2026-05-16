"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Puzzle, Zap, RotateCcw, Flame, Target, Search, CheckCircle } from "lucide-react";

const cspTechniques = [
  {
    icon: Puzzle,
    title: "Variables",
    description:
      "Each nurse–day cell is a decision: which shift (D, L, N) or off (O) they work. The generator fills 28 × 25 assignments under hard rules.",
  },
  {
    icon: Target,
    title: "Hard constraints",
    description:
      "Daily coverage (7 D, 7 L, 4 N with ≥1 senior each), forbidden shift transitions, streak limits, monthly hour bounds (120–170 h), one shift per day.",
  },
  {
    icon: RotateCcw,
    title: "Backtracking search",
    description:
      "Builds the month day by day with randomized eligible picks; if a day cannot be completed, it clears and retries with backtracking (up to 2000 backtracks).",
  },
  {
    icon: Zap,
    title: "Eligibility checks",
    description:
      "Each assignment uses helper checks (transitions, consecutive work/rest, nights in a row, max hours) so only hard-feasible placements are kept.",
  },
  {
    icon: CheckCircle,
    title: "Final validation",
    description:
      "After a full grid is built, the schedule must meet minimum monthly hours for every nurse; otherwise generation fails and can retry with a new seed.",
  },
];

const localSearchAlgorithms = [
  {
    title: "Simulated Annealing",
    icon: Flame,
    color: "from-orange-500 to-red-500",
    description:
      "Metropolis acceptance on feasible neighbours: improves the soft penalty while candidates stay hard-feasible. Uses geometric cooling with optional reheats when progress stalls.",
    params: [
      { name: "Initial temperature T₀", value: "150" },
      { name: "Cooling rate α", value: "0.995" },
      { name: "Min temperature", value: "0.01" },
      { name: "Max iterations (site runner)", value: "400" },
      { name: "Candidates / iteration", value: "80" },
      { name: "Reheat", value: "on (patience 500, ×0.25, max 5)" },
    ],
  },
  {
    title: "Tabu Search",
    icon: Search,
    color: "from-blue-500 to-indigo-500",
    description:
      "Same-day swaps between two nurses (preserves per-day shift counts). Explores up to 40 random neighbours per iteration; tabu tenure avoids cycling. Requires a hard-feasible start (from the generator).",
    params: [
      { name: "Tabu tenure", value: "12 moves" },
      { name: "Iterations (site runner)", value: "2 000" },
      { name: "Neighbours / iteration", value: "40" },
      { name: "Stop if no best for", value: "80 iterations" },
    ],
  },
  {
    title: "Greedy construction",
    icon: Target,
    color: "from-green-500 to-emerald-500",
    description:
      "Constructs a schedule day by day using a multi-criteria heuristic score per nurse–shift (preferences, hours balance, streaks, nights). Only hard feasibility is enforced when choosing the next assignment.",
    params: [
      { name: "Search style", value: "Greedy per slot" },
      { name: "Feasibility", value: "Hard constraints only" },
      { name: "Soft goals", value: "Heuristic scoring (not evaluate_schedule)" },
    ],
  },
];

export function AlgorithmsSection() {
  return (
    <section id="algorithms" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            AI Algorithms
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Feasible schedules from <code className="text-xs bg-secondary px-1 rounded">core/generator.py</code>, then
            local search minimizes the same soft penalty from <code className="text-xs bg-secondary px-1 rounded">core/evaluation.py</code> (except greedy, which uses its own heuristic).
          </p>
        </motion.div>

        <Tabs defaultValue="csp" className="w-full">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-2 mb-12">
            <TabsTrigger value="csp" className="flex items-center gap-2">
              <Puzzle className="size-4" />
              CSP Model
            </TabsTrigger>
            <TabsTrigger value="local" className="flex items-center gap-2">
              <Search className="size-4" />
              Local Search
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csp">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="bg-card border-border mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-foreground">
                    <Puzzle className="text-primary" />
                    Constraint-based initial schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    The project does not use a separate generic CSP solver library. Instead,{" "}
                    <code className="text-xs bg-secondary px-1 rounded">generate_schedule</code> builds a hard-feasible
                    month by assigning coverage shift by shift with backtracking. That schedule is the &quot;CSP&quot;
                    baseline; Tabu and SA start from it and keep hard constraints satisfied.
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {cspTechniques.map((step, index) => (
                      <div
                        key={index}
                        className="flex flex-col items-center text-center p-4 rounded-lg bg-secondary/50 border border-border"
                      >
                        <div className="p-2 rounded-full bg-primary/10 mb-3">
                          <step.icon className="text-primary size-5" />
                        </div>
                        <h4 className="font-semibold text-foreground text-sm mb-1">{step.title}</h4>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Problem shape (config)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 font-mono text-sm">
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <span className="text-primary">Variables:</span>
                      <span className="text-foreground ml-2">shift per (nurse, day) — 25 × 28 cells</span>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <span className="text-primary">Working shift domain:</span>
                      <span className="text-foreground ml-2">{"{D, L, N}"} plus O off when not on a counted shift</span>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <span className="text-primary">Daily coverage (hard):</span>
                      <span className="text-foreground ml-2">
                        7 day, 7 late, 4 night; ≥1 senior on each of those shifts
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <span className="text-primary">Other hard rules:</span>
                      <span className="text-foreground ml-2">
                        max 5 consecutive work days; max 3 consecutive rest days; max 2 consecutive nights; forbidden
                        transitions (D→L, L→N, N→D, N→L); 120–170 h/month; one shift/day
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <span className="text-primary">Soft goals (evaluation only):</span>
                      <span className="text-foreground ml-2">
                        preferred days off (weighted, seniority 1.5×), extra consecutive-night penalty beyond the hard
                        cap, fairness variance on hours and nights across nurses
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="local">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {localSearchAlgorithms.map((algo, index) => (
                  <motion.div
                    key={algo.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    <Card className="h-full bg-card border-border hover:border-primary/50 transition-colors">
                      <CardHeader>
                        <div
                          className={`inline-flex w-fit rounded-xl bg-linear-to-br p-3 ${algo.color} mb-3`}
                        >
                          <algo.icon className="size-6 text-white" />
                        </div>
                        <CardTitle className="text-lg text-foreground">{algo.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{algo.description}</p>
                        <div className="space-y-2">
                          {algo.params.map((param) => (
                            <div key={param.name} className="flex justify-between items-center gap-2">
                              <span className="text-xs text-muted-foreground">{param.name}</span>
                              <Badge variant="secondary" className="text-xs shrink-0 max-w-[55%] text-right">
                                {param.value}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Objective (soft penalty)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    Tabu and SA minimize{" "}
                    <code className="text-xs bg-secondary px-1 rounded text-foreground">evaluate_schedule</code> from{" "}
                    <code className="text-xs bg-secondary px-1 rounded text-foreground">core/evaluation.py</code>: a
                    single scalar penalty (lower is better). It combines:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      <span className="text-foreground">Preferred days off</span> (weeks starting days 1, 8, 15, 22):
                      penalties if the nurse works on a requested off day; seniors use weight 1.5× juniors. Constants
                      from <code className="text-xs">WEIGHTS</code>: first request 15 / reward −10, second 7 / reward
                      −4.
                    </li>
                    <li>
                      <span className="text-foreground">Consecutive nights (soft)</span>: beyond the hard cap of 2,
                      each extra consecutive night adds 10 per excess step.
                    </li>
                    <li>
                      <span className="text-foreground">Fairness</span> from{" "}
                      <code className="text-xs bg-secondary px-1 rounded text-foreground">utils/fairness_metrics.py</code>
                      : variance of total hours (×2), of night-shift counts (×5), and of each nurse&apos;s max
                      consecutive-night streak (×10).
                    </li>
                  </ul>
                  <p>
                    Infeasible neighbours are rejected (SA) or heavily penalized in Tabu&apos;s internal scoring
                    (+10 000 × number of hard violations) so the search stays on feasible schedules.
                  </p>
                  <div className="p-4 rounded-lg bg-secondary/50 font-mono text-xs space-y-2 text-foreground">
                    <p className="text-primary">Local search: minimize penalty = evaluate_schedule(schedule)</p>
                    <p className="text-muted-foreground">
                      Dashboard &quot;Score&quot; is a display mapping from the runner: hard violations and scaled
                      penalty → 0–1000 (higher is better on the site); optimization still minimizes the raw penalty.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
