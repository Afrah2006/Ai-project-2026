"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Heart, Clock, Users, Ban, Calendar, Moon, Sun } from "lucide-react";

const hardConstraints = [
  {
    icon: Users,
    title: "Minimum Staffing",
    description: "Each shift requires at least 4 nurses on duty",
  },
  {
    icon: Clock,
    title: "Maximum Shifts",
    description: "No nurse works more than 5 shifts per week",
  },
  {
    icon: Ban,
    title: "No Consecutive Nights",
    description: "Nurses cannot work two night shifts in a row",
  },
  {
    icon: Calendar,
    title: "One Shift Per Day",
    description: "Each nurse works at most one shift per day",
  },
];

const softConstraints = [
  {
    icon: Heart,
    title: "Shift Preferences",
    description: "Honor nurse preferences for specific shift types",
  },
  {
    icon: Moon,
    title: "Night Shift Balance",
    description: "Fair distribution of less desirable night shifts",
  },
  {
    icon: Sun,
    title: "Day Off Requests",
    description: "Accommodate personal day-off requests when possible",
  },
  {
    icon: Shield,
    title: "Skill Coverage",
    description: "Ensure proper skill mix across all shifts",
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
            Balancing strict requirements with staff preferences
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
