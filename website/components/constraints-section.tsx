"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Heart, Clock, Users, Ban, Calendar, Moon, Sun, AlertTriangle, UserCheck } from "lucide-react";

const hardConstraints = [
  {
    icon: Calendar,
    title: "Max 5 Consecutive Days",
    description: "No nurse can work more than 5 consecutive days in a row",
  },
  {
    icon: Users,
    title: "Shift Staffing Requirements",
    description: "8 nurses for day shift, 8 for late shift, 6 for night shift, with at least one senior per shift",
  },
  {
    icon: Clock,
    title: "Minimum 8h Rest Between Shifts",
    description: "No night → day transitions allowed (no consecutive shifts)",
  },
  {
    icon: Ban,
    title: "Max 72h Non-Working Time",
    description: "Maximum of 3 consecutive free days allowed",
  },
  {
    icon: AlertTriangle,
    title: "One Shift Per Day",
    description: "Each nurse works at most one shift per day",
  },
  {
    icon: Shield,
    title: "Monthly Hours Limit",
    description: "Minimum 80 hours and maximum 160 hours per month per nurse",
  },
  {
    icon: Moon,
    title: "Max 2 Consecutive Night Shifts",
    description: "No nurse can work more than 2 night shifts in a row",
  },
];

const softConstraints = [
  {
    icon: Heart,
    title: "Day-Off Requests",
    description: "Two requests per week (days 1-7), first has higher priority. Min 3, max 4 nurses per day. Seniors get priority, otherwise random selection.",
  },
  {
    icon: Sun,
    title: "Equal Night Shifts",
    description: "Fair and equal distribution of night shifts across all 25 nurses",
  },
  {
    icon: UserCheck,
    title: "Equal Total Hours",
    description: "Balance total hours worked equally across all nurses for fairness",
  },
];

export function ConstraintsSection() {
  return (
    <section id="constraints" className="py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Scheduling Constraints
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Balancing strict requirements with staff preferences for 25 nurses over 28 days
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Hard Constraints */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Badge variant="destructive" className="text-sm">
                Hard Constraints
              </Badge>
              <span className="text-sm text-muted-foreground">Must be satisfied</span>
            </div>
            <div className="space-y-4">
              {hardConstraints.map((constraint, index) => (
                <Card
                  key={index}
                  className="bg-card border-border hover:border-destructive/50 transition-colors"
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
                      <constraint.icon className="text-destructive" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {constraint.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {constraint.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Soft Constraints */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Badge className="text-sm bg-primary text-primary-foreground">
                Soft Constraints
              </Badge>
              <span className="text-sm text-muted-foreground">Optimized when possible</span>
            </div>
            <div className="space-y-4">
              {softConstraints.map((constraint, index) => (
                <Card
                  key={index}
                  className="bg-card border-border hover:border-primary/50 transition-colors"
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <constraint.icon className="text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">
                        {constraint.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {constraint.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
