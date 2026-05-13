"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Crown,
  Code,
  Database,
  Search,
  Cpu,
  FlaskConical,
} from "lucide-react";

const teamMembers = [
  {
    name: "Afrah Zeghilet",
    role: "Team Leader",
    contributions: ["Simulated Annealing", "Hard Constraints Validation", "Website Development"],
    initials: "AZ",
    icon: Crown,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    name: "Mohamed Iskander Grabelsi",
    role: "Algorithm Developer",
    contributions: ["Evaluation Metrics", "Tabu Search Implementation"],
    initials: "MG",
    icon: FlaskConical,
    gradient: "from-purple-500 to-pink-500",
  },
  {
    name: "Anis Mangullet",
    role: "Data & CSP Engineer",
    contributions: ["Data Preparation", "CSP Generator", "Fairness Metrics", "Tabu Search"],
    initials: "AM",
    icon: Database,
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    name: "Tesnime Kahelessnane",
    role: "Algorithm Developer",
    contributions: ["Propagation Algorithms", "Generate Neighbors Method"],
    initials: "TK",
    icon: Cpu,
    gradient: "from-green-500 to-emerald-500",
  },
  {
    name: "Nedjema Touil",
    role: "Search & Configuration",
    contributions: ["Greedy Search", "Data Gathering", "Configuration"],
    initials: "NT",
    icon: Search,
    gradient: "from-rose-500 to-red-500",
  },
  {
    name: "Rania Rahmani",
    role: "CSP Developer",
    contributions: ["CSP Backtracking Method", "Model Design"],
    initials: "RR",
    icon: Code,
    gradient: "from-indigo-500 to-violet-500",
  },
];

export function TeamSection() {
  return (
    <section id="team" className="py-24 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge variant="outline" className="mb-4 border-primary/50 text-primary">
            Our Team
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            Meet the Team Behind NurseScheduler AI
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            A dedicated team of 6 working together to build an intelligent 
            nurse scheduling system using CSP and Local Search Optimization.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="bg-card border-border hover:border-primary/50 transition-colors h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${member.gradient} shadow-lg flex-shrink-0`}>
                      <member.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-foreground mb-1 truncate">
                        {member.name}
                      </h3>
                      <p className="text-sm text-primary font-medium mb-3">{member.role}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {member.contributions.map((contribution) => (
                          <Badge
                            key={contribution}
                            variant="secondary"
                            className="text-xs bg-muted/50 text-muted-foreground hover:bg-muted"
                          >
                            {contribution}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Course Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-primary/20 max-w-2xl mx-auto">
            <CardContent className="p-8">
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Academic Project
              </h3>
              <p className="text-muted-foreground mb-4">
                This project was developed as part of the Artificial Intelligence 
                course curriculum, demonstrating practical applications of AI 
                optimization techniques in healthcare scheduling.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <span>AI Course 2026</span>
                <span className="text-border">|</span>
                <span>Constraint Satisfaction</span>
                <span className="text-border">|</span>
                <span>Local Search Optimization</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
