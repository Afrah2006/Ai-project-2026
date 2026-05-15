"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Target, Lightbulb } from "lucide-react";

export function ProblemSection() {
  return (
    <section id="problem" className="py-24 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            The Problem
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Understanding the complexity of hospital nurse scheduling
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="h-full bg-card border-border hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="p-3 rounded-lg bg-destructive/10 w-fit mb-4">
                  <AlertTriangle className="text-destructive" />
                </div>
                <CardTitle className="text-foreground">The Challenge</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Hospital nurse scheduling is a complex combinatorial optimization 
                  problem that directly impacts healthcare quality and staff 
                  well-being. Traditional manual scheduling is time-consuming, 
                  error-prone, and often fails to balance operational needs with 
                  nurse preferences.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="h-full bg-card border-border hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
                  <Target className="text-primary" />
                </div>
                <CardTitle className="text-foreground">Our Goal</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Develop an intelligent scheduling system that automatically 
                  generates optimal nurse schedules by satisfying hard constraints 
                  (legal requirements, minimum staffing) while maximizing soft 
                  constraints (nurse preferences, fair distribution of shifts).
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="h-full bg-card border-border hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="p-3 rounded-lg bg-accent/10 w-fit mb-4">
                  <Lightbulb className="text-accent" />
                </div>
                <CardTitle className="text-foreground">Our Solution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  A hybrid pipeline: a constraint-driven generator in{" "}
                  <code className="text-xs bg-secondary px-1 rounded">core/generator.py</code> produces a hard-feasible
                  month, then local search in <code className="text-xs bg-secondary px-1 rounded">local_search/</code>{" "}
                  improves the soft penalty from <code className="text-xs bg-secondary px-1 rounded">core/evaluation.py</code>{" "}
                  (Tabu and SA; greedy uses its own construction heuristic).
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
