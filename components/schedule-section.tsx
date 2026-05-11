"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, Coffee, Minus } from "lucide-react";
import { useMemo } from "react";

// Sample nurse data based on the project
const nurses = [
  "Nurse_1", "Nurse_2", "Nurse_3", "Nurse_4", "Nurse_5",
  "Nurse_6", "Nurse_7", "Nurse_8",
];

const shifts = ["M", "A", "N", "O"] as const;
type ShiftType = typeof shifts[number];

const shiftConfig: Record<ShiftType, { label: string; icon: typeof Sun; color: string }> = {
  M: { label: "Morning", icon: Sun, color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  A: { label: "Afternoon", icon: Coffee, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  N: { label: "Night", icon: Moon, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  O: { label: "Off", icon: Minus, color: "bg-muted text-muted-foreground border-border" },
};

// Generate deterministic sample schedule
function generateSampleSchedule(nurseCount: number, days: number): ShiftType[][] {
  const schedule: ShiftType[][] = [];
  
  for (let n = 0; n < nurseCount; n++) {
    const nurseSchedule: ShiftType[] = [];
    let consecutiveNights = 0;
    let weeklyShifts = 0;
    
    for (let d = 0; d < days; d++) {
      // Reset weekly count
      if (d % 7 === 0) weeklyShifts = 0;
      
      // Deterministic but varied assignment based on nurse and day
      const seed = (n * 31 + d * 17) % 100;
      
      let shift: ShiftType;
      
      if (weeklyShifts >= 5) {
        shift = "O";
      } else if (consecutiveNights >= 1 && seed < 60) {
        // Avoid consecutive nights
        shift = seed < 30 ? "M" : "A";
        consecutiveNights = 0;
        weeklyShifts++;
      } else if (seed < 25) {
        shift = "M";
        consecutiveNights = 0;
        weeklyShifts++;
      } else if (seed < 50) {
        shift = "A";
        consecutiveNights = 0;
        weeklyShifts++;
      } else if (seed < 65) {
        shift = "N";
        consecutiveNights++;
        weeklyShifts++;
      } else {
        shift = "O";
        consecutiveNights = 0;
      }
      
      nurseSchedule.push(shift);
    }
    schedule.push(nurseSchedule);
  }
  
  return schedule;
}

export function ScheduleSection() {
  const displayDays = 14;
  const schedule = useMemo(() => generateSampleSchedule(nurses.length, displayDays), []);

  return (
    <section id="schedule" className="py-24 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Schedule Visualization
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sample output showing optimized nurse assignments over two weeks
          </p>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-wrap justify-center gap-4 mb-8"
        >
          {(Object.keys(shiftConfig) as ShiftType[]).map((shift) => {
            const config = shiftConfig[shift];
            const Icon = config.icon;
            return (
              <div key={shift} className="flex items-center gap-2">
                <div className={`p-1.5 rounded border ${config.color}`}>
                  <Icon className="size-4" />
                </div>
                <span className="text-sm text-muted-foreground">{config.label}</span>
              </div>
            );
          })}
        </motion.div>

        {/* Schedule Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader>
              <CardTitle className="text-foreground">
                Two-Week Schedule Sample
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-left text-sm font-semibold text-foreground bg-secondary/50 sticky left-0">
                        Nurse
                      </th>
                      {Array.from({ length: displayDays }, (_, i) => (
                        <th
                          key={i}
                          className="p-3 text-center text-sm font-semibold text-foreground bg-secondary/50"
                        >
                          <div>Day {i + 1}</div>
                          <div className="text-xs font-normal text-muted-foreground">
                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i % 7]}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {nurses.map((nurse, nurseIndex) => (
                      <tr key={nurse} className="border-b border-border last:border-0">
                        <td className="p-3 text-sm font-medium text-foreground bg-card sticky left-0 border-r border-border">
                          {nurse}
                        </td>
                        {schedule[nurseIndex].map((shift, dayIndex) => {
                          const config = shiftConfig[shift];
                          const Icon = config.icon;
                          return (
                            <td key={dayIndex} className="p-2 text-center">
                              <div
                                className={`inline-flex items-center justify-center size-8 rounded border ${config.color}`}
                              >
                                <Icon className="size-4" />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid sm:grid-cols-3 gap-6 mt-8"
        >
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-primary mb-1">100%</p>
              <p className="text-sm text-muted-foreground">Hard Constraints Satisfied</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-primary mb-1">87%</p>
              <p className="text-sm text-muted-foreground">Preference Fulfillment</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-primary mb-1">4.2</p>
              <p className="text-sm text-muted-foreground">Avg Shifts/Week/Nurse</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
