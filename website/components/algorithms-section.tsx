"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dna, Puzzle, Zap, RotateCcw, Shuffle, CheckCircle } from "lucide-react";

const gaSteps = [
  {
    icon: Shuffle,
    title: "Initialization",
    description: "Generate initial population of random schedules (chromosomes)",
  },
  {
    icon: RotateCcw,
    title: "Selection",
    description: "Tournament selection to choose fittest parents for reproduction",
  },
  {
    icon: Dna,
    title: "Crossover",
    description: "Single-point crossover to combine parent schedules",
  },
  {
    icon: Zap,
    title: "Mutation",
    description: "Random shift changes with adaptive mutation rate",
  },
  {
    icon: CheckCircle,
    title: "Evaluation",
    description: "Fitness scoring based on constraint satisfaction",
  },
];

const cspTechniques = [
  {
    title: "Arc Consistency",
    description: "Propagate constraints to reduce search space before assignment",
  },
  {
    title: "Backtracking",
    description: "Systematic exploration with intelligent pruning of invalid paths",
  },
  {
    title: "Forward Checking",
    description: "Proactive constraint checking to detect failures early",
  },
  {
    title: "Variable Ordering",
    description: "Most Constrained Variable (MCV) heuristic for efficiency",
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
            Hybrid approach combining evolutionary optimization with constraint solving
          </p>
        </motion.div>

        <Tabs defaultValue="ga" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-12">
            <TabsTrigger value="ga" className="flex items-center gap-2">
              <Dna className="size-4" />
              Genetic Algorithm
            </TabsTrigger>
            <TabsTrigger value="csp" className="flex items-center gap-2">
              <Puzzle className="size-4" />
              CSP Techniques
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ga">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Card className="bg-card border-border mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-foreground">
                    <Dna className="text-primary" />
                    Genetic Algorithm Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-6">
                    The genetic algorithm evolves a population of schedules over 
                    multiple generations. Each schedule is encoded as a chromosome 
                    where genes represent nurse-shift assignments.
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {gaSteps.map((step, index) => (
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

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground">
                      GA Parameters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Population Size</span>
                      <Badge variant="secondary">100</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Generations</span>
                      <Badge variant="secondary">500</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Mutation Rate</span>
                      <Badge variant="secondary">0.1</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Crossover Rate</span>
                      <Badge variant="secondary">0.8</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Elitism</span>
                      <Badge variant="secondary">Top 10%</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground">
                      Fitness Function
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Multi-objective fitness with weighted penalties:
                    </p>
                    <div className="p-4 rounded-lg bg-secondary/50 font-mono text-sm">
                      <p className="text-primary">fitness = base_score</p>
                      <p className="text-destructive pl-4">- hard_violations * 1000</p>
                      <p className="text-muted-foreground pl-4">- soft_violations * 10</p>
                      <p className="text-primary pl-4">+ preference_bonus</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

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
                    CSP techniques ensure schedule feasibility by modeling the problem 
                    as variables (nurse-day pairs), domains (possible shifts), and 
                    constraints (scheduling rules).
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {cspTechniques.map((technique, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg bg-secondary/50 border border-border"
                      >
                        <h4 className="font-semibold text-foreground mb-2">
                          {technique.title}
                        </h4>
                        <p className="text-sm text-muted-foreground">
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
                        X[nurse][day] for each nurse-day pair
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
                        Staffing, consecutive shifts, weekly limits
                      </span>
                    </div>
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
