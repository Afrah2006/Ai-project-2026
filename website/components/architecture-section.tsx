"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  Cog,
  Brain,
  BarChart3,
  ArrowRight,
  FileJson,
  Settings,
  LineChart,
} from "lucide-react";

const modules = [
  {
    icon: FileJson,
    title: "Data Layer",
    file: "data/data_ai_project.csv",
    description: "Nurse roster: seniority and two preferred off-days per week (days 1–7)",
    color: "primary",
  },
  {
    icon: Settings,
    title: "Configuration",
    file: "core/config.py",
    description: "Horizon (28 days, 25 nurses), coverage, hard limits, soft weights",
    color: "primary",
  },
  {
    icon: Cog,
    title: "Feasible generator",
    file: "core/generator.py",
    description: "Day-wise assignment with backtracking to satisfy hard constraints",
    color: "primary",
  },
  {
    icon: Brain,
    title: "Local Search",
    file: "local_search/*.py",
    description: "Simulated annealing, tabu search, and greedy improvement heuristics",
    color: "primary",
  },
  {
    icon: BarChart3,
    title: "Soft penalty",
    file: "core/evaluation.py",
    description: "Weighted penalties for preferences, nights, and fairness variances",
    color: "primary",
  },
  {
    icon: LineChart,
    title: "Visualization",
    file: "visualization/",
    description: "Schedule display, fairness charts, and comparison plots",
    color: "primary",
  },
];

export function ArchitectureSection() {
  return (
    <section id="architecture" className="py-24 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            System Architecture
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Modular design for maintainability and extensibility
          </p>
        </motion.div>

        {/* Architecture Diagram */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <Card className="bg-card border-border p-8">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-8">
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary/50 border border-border">
                <Database className="text-primary" />
                <span className="text-sm font-medium text-foreground">Input Data</span>
              </div>
              <ArrowRight className="text-muted-foreground rotate-90 lg:rotate-0" />
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/10 border border-primary/30">
                <Cog className="text-primary" />
                <span className="text-sm font-medium text-foreground">CSP Model</span>
              </div>
              <ArrowRight className="text-muted-foreground rotate-90 lg:rotate-0" />
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/10 border border-primary/30">
                <Brain className="text-primary" />
                <span className="text-sm font-medium text-foreground">Local Search</span>
              </div>
              <ArrowRight className="text-muted-foreground rotate-90 lg:rotate-0" />
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-secondary/50 border border-border">
                <BarChart3 className="text-primary" />
                <span className="text-sm font-medium text-foreground">Optimized Schedule</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Module Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="h-full bg-card border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <module.icon className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1">
                        {module.title}
                      </h3>
                      <Badge variant="secondary" className="text-xs mb-2 font-mono">
                        {module.file}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {module.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
