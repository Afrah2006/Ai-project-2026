"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ScheduleSection } from "./schedule-section";
import { ResultsSection } from "./results-section";
import { motion } from "framer-motion";

const StatisticalAnalysisSection = dynamic(
  () =>
    import("./statistical-analysis-section").then((m) => ({
      default: m.StatisticalAnalysisSection,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="py-24 text-center text-muted-foreground text-sm">
        Loading statistical tools…
      </div>
    ),
  }
);

export function MainDashboard() {
  const [activeTab, setActiveTab] = useState<"planner" | "analysis">("planner");

  return (
    <div className="w-full">
      <div className="container mx-auto px-4 mb-8">
        <div className="flex justify-center">
          <div className="bg-secondary/50 p-1.5 rounded-xl inline-flex gap-2 relative">
            <button
              onClick={() => setActiveTab("planner")}
              className={`relative px-6 py-2.5 text-sm font-semibold rounded-lg transition-all z-10 ${
                activeTab === "planner" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {activeTab === "planner" && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-background rounded-lg shadow-sm"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-20">Schedule Planner</span>
            </button>
            <button
              onClick={() => setActiveTab("analysis")}
              className={`relative px-6 py-2.5 text-sm font-semibold rounded-lg transition-all z-10 ${
                activeTab === "analysis" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {activeTab === "analysis" && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-background rounded-lg shadow-sm"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-20">Statistical Analysis</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {activeTab === "planner" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ScheduleSection />
            <ResultsSection />
          </motion.div>
        )}
        
        {activeTab === "analysis" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StatisticalAnalysisSection />
          </motion.div>
        )}
      </div>
    </div>
  );
}
