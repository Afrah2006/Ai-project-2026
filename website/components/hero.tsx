"use client";

import { motion } from "framer-motion";
import { ArrowDown, Brain, Calendar, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a2e_1px,transparent_1px),linear-gradient(to_bottom,#1a1a2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Badge variant="secondary" className="mb-6">
            AI Course Project 2025
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-7xl font-bold text-foreground mb-6 text-balance"
        >
          Intelligent Hospital
          <br />
          <span className="text-primary">Nurse Scheduling</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-12 text-pretty"
        >
          An AI-powered system using Constraint Satisfaction Problem (CSP) and Local Search 
          Optimization algorithms (Simulated Annealing, Tabu Search, Greedy) to optimize 
          hospital nurse scheduling while balancing staff preferences with operational requirements.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-8 mb-16"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Users className="text-primary" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-foreground">25</p>
              <p className="text-sm text-muted-foreground">Nurses</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Calendar className="text-primary" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-foreground">28</p>
              <p className="text-sm text-muted-foreground">Days</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Brain className="text-primary" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-foreground">CSP + Local Search</p>
              <p className="text-sm text-muted-foreground">Hybrid AI</p>
            </div>
          </div>
        </motion.div>

        <motion.a
          href="#problem"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
        >
          <span>Explore the Project</span>
          <ArrowDown className="animate-bounce" />
        </motion.a>
      </div>
    </section>
  );
}
