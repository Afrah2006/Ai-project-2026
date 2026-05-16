"use client";

import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Brain,
  Calendar,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden pt-24 pb-16 sm:pt-28 lg:min-h-[calc(100vh-4rem)] lg:flex lg:items-center">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.12),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,118,110,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,118,110,0.08)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_80%_52%_at_50%_0%,#000_68%,transparent_100%)] opacity-45" />
      <div className="absolute left-1/2 top-8 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:px-8">
        <div className="max-w-3xl text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center lg:justify-start"
          >
            <Badge
              variant="secondary"
              className="mb-6 gap-2 border border-primary/15 bg-card/80 px-4 py-2 text-primary shadow-sm backdrop-blur"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Course Project 2025
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08 }}
            className="font-heading text-4xl font-semibold tracking-tight text-foreground text-balance sm:text-5xl lg:text-7xl"
          >
            Smarter hospital staffing with
            <span className="block bg-linear-to-r from-primary via-emerald-500 to-sky-500 bg-clip-text text-transparent">
              nurse scheduling
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16 }}
            className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl"
          >
            An AI-powered scheduler that combines constraint satisfaction,
            simulated annealing, and tabu search to balance coverage,
            preferences, and fairness across a 28-day planning horizon.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start"
          >
            <a
              href="#schedule"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary/90"
            >
              Explore the scheduler
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#results"
              className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-muted/80"
            >
              View results
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.32 }}
            className="mt-10 flex flex-wrap justify-center gap-3 lg:justify-start"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
              <Users className="h-4 w-4 text-primary" />
              25 nurses
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
              <Calendar className="h-4 w-4 text-primary" />
              28 days
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-4 py-2 text-sm text-muted-foreground backdrop-blur">
              <Brain className="h-4 w-4 text-primary" />
              CSP + local search
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.18 }}
          className="relative"
        >
          <div className="absolute inset-0 rounded-[2rem] bg-linear-to-br from-primary/25 via-transparent to-accent/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/85 p-6 shadow-[0_24px_80px_rgba(16,33,47,0.18)] backdrop-blur-xl sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                  Live optimization lens
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  Schedule quality at a glance
                </h2>
              </div>
              <div className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Balanced output
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Coverage</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">100%</p>
                <p className="mt-1 text-sm text-muted-foreground">Hard constraints preserved</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Objective</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">240</p>
                <p className="mt-1 text-sm text-muted-foreground">Soft score in demo run</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Algorithms</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">3</p>
                <p className="mt-1 text-sm text-muted-foreground">Generator, SA, Tabu</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">Safety</p>
                <div className="mt-2 flex items-center gap-2 text-foreground">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-semibold">0</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Hard violations in final output</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-primary/15 bg-linear-to-r from-primary/10 via-transparent to-accent/10 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary/10 p-2 text-primary">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Hybrid search pipeline</p>
                  <p className="text-sm text-muted-foreground">
                    Feasible generation first, then local improvement for fairness and preference balancing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.a
        href="#problem"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.55 }}
        className="absolute bottom-6 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-primary"
      >
        <span>Explore the project</span>
        <ArrowDown className="h-4 w-4 animate-bounce" />
      </motion.a>
    </section>
  );
}
