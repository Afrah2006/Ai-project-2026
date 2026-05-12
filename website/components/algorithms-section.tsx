"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Puzzle, Zap, Search, Target, Thermometer, ListTodo, TrendingUp } from "lucide-react";

const cspTechniques = [
  {
    icon: Puzzle,
    title: "Constraint Modeling",
    description: "Define variables (nurse-day pairs), domains (shifts), and constraints (rules)",
  },
  {
    icon: Search,
    title: "Backtracking Search",
    description: "Systematic exploration with intelligent pruning of invalid assignments",
  },
  {
    icon: TrendingUp,
    title: "Propagation Algorithms",
    description: "Arc consistency and forward checking to reduce search space",
  },
  {
    icon: Target,
    title: "Variable Ordering",
    description: "Most Constrained Variable (MCV) heuristic for efficiency",
  },
];

const localSearchAlgorithms = [
  {
    title: "Simulated Annealing",
    icon: Thermometer,
    description: "Probabilistic technique that allows occasional uphill moves to escape local optima",
    features: ["Temperature cooling schedule", "Probabilistic acceptance", "Global optimization"],
  },
  {
    title: "Tabu Search",
    icon: ListTodo,
    description: "Uses memory structures to avoid revisiting recent solutions and cycles",
    features: ["Tabu list management", "Aspiration criteria", "Intensification/diversification"],
  },
  {
    title: "Greedy Search",
    icon: Zap,
    description: "Fast heuristic that always moves to the best neighboring solution",
    features: ["Quick convergence", "Local optimization", "Simple implementation"],
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
            Hybrid approach combining constraint satisfaction with local search optimization
          </p>
        </motion.div>

        <Tabs defaultValue="csp" className="w-full">
          <TabsList className="grid w-full max-w-lg mx-auto grid-cols-2 mb-12">
            <TabsTrigger value="csp" className="flex items-center gap-2">
              <Puzzle className="size-4" />
              CSP Techniques
            </TabsTrigger>
            <TabsTrigger value="local-search" className="flex items-center gap-2">
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
                    Constraint Satisfaction Problem (CSP)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    CSP models the scheduling problem by defining variables (nurse-day pairs), 
                    domains (possible shifts: Morning, Afternoon, Night, Off), and constraints 
                    (scheduling rules that must be satisfied). The CSP solver uses backtracking 
                    with propagation to find feasible solutions.
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {cspTechniques.map((technique, index) => (
                      <div
                        key={index}
                        className="flex flex-col items-center text-center p-4 rounded-lg bg-secondary/50 border border-border"
                      >
                        <div className="p-2 rounded-full bg-primary/10 mb-3">
                          <technique.icon className="text-primary size-5" />
                        </div>
                        <h4 className="font-semibold text-foreground text-sm mb-1">
                          {technique.title}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {technique.description}
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
                        X[nurse][day] for 25 nurses x 28 days
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <span className="text-primary">Domains:</span>
                      <span className="text-foreground ml-2">
                        {"{"}Morning, Afternoon, Night, Off{"}"}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <span className="text-primary">Constraints:</span>
                      <span className="text-foreground ml-2">
                        Hard (must satisfy) + Soft (optimize)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="local-search">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="bg-card border-border mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-foreground">
                    <Search className="text-primary" />
                    Local Search Optimization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    Local search algorithms improve an initial solution by exploring neighboring 
                    states. Starting from a CSP-generated feasible schedule, these algorithms 
                    optimize soft constraints and improve overall schedule quality through 
                    iterative refinement.
                  </p>
                  <div className="grid md:grid-cols-3 gap-6">
                    {localSearchAlgorithms.map((algorithm, index) => (
                      <div
                        key={index}
                        className="p-5 rounded-lg bg-secondary/50 border border-border"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <algorithm.icon className="text-primary size-5" />
                          </div>
                          <h4 className="font-semibold text-foreground">
                            {algorithm.title}
                          </h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          {algorithm.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {algorithm.features.map((feature, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <Thermometer className="text-primary size-5" />
                      Simulated Annealing Parameters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Initial Temperature</span>
                      <Badge variant="secondary">1000</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Cooling Rate</span>
                      <Badge variant="secondary">0.995</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Min Temperature</span>
                      <Badge variant="secondary">0.01</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Iterations per Temp</span>
                      <Badge variant="secondary">100</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <ListTodo className="text-primary size-5" />
                      Tabu Search Parameters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Tabu List Size</span>
                      <Badge variant="secondary">50</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Max Iterations</span>
                      <Badge variant="secondary">1000</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Neighborhood Size</span>
                      <Badge variant="secondary">Variable</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Aspiration Criteria</span>
                      <Badge variant="secondary">Best Score</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
