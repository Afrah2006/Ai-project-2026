"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Puzzle, Zap, RotateCcw, Flame, Target, Search, CheckCircle } from "lucide-react";

const cspTechniques = [
  {
    icon: Puzzle,
    title: "Variable Definition",
    description: "Each nurse-day pair as a variable with shift domain {D, L, N, O}",
  },
  {
    icon: Target,
    title: "Constraint Modeling",
    description: "Hard constraints encoded as CSP constraints for feasibility",
  },
  {
    icon: RotateCcw,
    title: "Backtracking",
    description: "Systematic exploration with intelligent pruning of invalid paths",
  },
  {
    icon: Zap,
    title: "Propagation",
    description: "Arc consistency and forward checking to reduce search space",
  },
  {
    icon: CheckCircle,
    title: "Solution Validation",
    description: "Verify all hard constraints are satisfied before accepting",
  },
];

const localSearchAlgorithms = [
  {
    title: "Simulated Annealing",
    icon: Flame,
    color: "from-orange-500 to-red-500",
    description: "Probabilistic technique that allows worse moves early to escape local optima, gradually cooling to converge on a good solution.",
    params: [
      { name: "Initial Temperature", value: "1000" },
      { name: "Cooling Rate", value: "0.995" },
      { name: "Min Temperature", value: "0.1" },
    ],
  },
  {
    title: "Tabu Search",
    icon: Search,
    color: "from-blue-500 to-indigo-500",
    description: "Uses memory structures to avoid revisiting recent solutions, enabling escape from local optima through intelligent exploration.",
    params: [
      { name: "Tabu Tenure", value: "10" },
      { name: "Max Iterations", value: "500" },
      { name: "Neighborhood Size", value: "50" },
    ],
  },
  {
    title: "Greedy Search",
    icon: Target,
    color: "from-green-500 to-emerald-500",
    description: "Fast heuristic that always makes the locally optimal choice, providing quick baseline solutions for comparison.",
    params: [
      { name: "Selection Strategy", value: "Best First" },
      { name: "Evaluation", value: "Immediate" },
      { name: "Backtrack", value: "None" },
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
            Hybrid approach combining Constraint Satisfaction Problem (CSP) modeling with Local Search Optimization
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
                    Constraint Satisfaction Problem
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    The scheduling problem is modeled as a CSP where each nurse-day 
                    assignment is a variable, the possible shifts are domains, and 
                    scheduling rules are constraints. This ensures all hard constraints 
                    are satisfied before optimization.
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
                        <h4 className="font-semibold text-foreground text-sm mb-1">
                          {step.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">
                    CSP Formulation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 font-mono text-sm">
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <span className="text-primary">Variables:</span>
                      <span className="text-foreground ml-2">
                        X[nurse][day] for 25 nurses × 28 days = 700 variables
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <span className="text-primary">Domains:</span>
                      <span className="text-foreground ml-2">
                        {"{"}D (Day), L (Late), N (Night), O (Off){"}"}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <span className="text-primary">Hard Constraints:</span>
                      <span className="text-foreground ml-2">
                        Staffing (8-8-6), max 5 consecutive days, 8h rest, 1 shift/day
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <span className="text-primary">Soft Constraints:</span>
                      <span className="text-foreground ml-2">
                        Day-off requests, fair night distribution, equal hours
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
                        <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${algo.color} mb-3 w-fit`}>
                          <algo.icon className="size-6 text-white" />
                        </div>
                        <CardTitle className="text-lg text-foreground">
                          {algo.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {algo.description}
                        </p>
                        <div className="space-y-2">
                          {algo.params.map((param) => (
                            <div key={param.name} className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">{param.name}</span>
                              <Badge variant="secondary" className="text-xs">{param.value}</Badge>
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
                  <CardTitle className="text-lg text-foreground">
                    Objective Function
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    All local search algorithms optimize the same multi-objective function:
                  </p>
                  <div className="p-4 rounded-lg bg-secondary/50 font-mono text-sm">
                    <p className="text-primary">score = base_score</p>
                    <p className="text-destructive pl-4">- hard_violations × 1000</p>
                    <p className="text-amber-400 pl-4">- soft_violations × 10</p>
                    <p className="text-green-400 pl-4">+ preference_bonus × 5</p>
                    <p className="text-blue-400 pl-4">+ fairness_bonus × 3</p>
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
