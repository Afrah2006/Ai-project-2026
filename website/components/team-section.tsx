"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Github, Linkedin, Mail } from "lucide-react";

const teamMembers = [
  {
    name: "Afrah Nasser",
    role: "Project Lead",
    contributions: ["System Architecture", "GA Implementation", "Documentation"],
    initials: "AN",
  },
  {
    name: "Team Member 2",
    role: "Developer",
    contributions: ["CSP Module", "Constraint Handling", "Testing"],
    initials: "TM",
  },
  {
    name: "Team Member 3",
    role: "Developer",
    contributions: ["Data Processing", "Visualization", "Analysis"],
    initials: "TM",
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
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Our Team
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The minds behind the Intelligent Nurse Scheduling System
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {teamMembers.map((member, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="bg-card border-border hover:border-primary/50 transition-colors h-full">
                <CardContent className="p-6 text-center">
                  <Avatar className="size-20 mx-auto mb-4 bg-primary/10 border-2 border-primary/30">
                    <AvatarFallback className="text-xl font-semibold text-primary bg-transparent">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {member.name}
                  </h3>
                  <p className="text-sm text-primary mb-4">{member.role}</p>
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {member.contributions.map((contribution, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs"
                      >
                        {contribution}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex justify-center gap-3">
                    <a
                      href="#"
                      className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      aria-label="GitHub"
                    >
                      <Github className="size-4" />
                    </a>
                    <a
                      href="#"
                      className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="size-4" />
                    </a>
                    <a
                      href="#"
                      className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      aria-label="Email"
                    >
                      <Mail className="size-4" />
                    </a>
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
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <Card className="bg-card border-border max-w-2xl mx-auto">
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
                <span>AI Course 2025</span>
                <span className="text-border">|</span>
                <span>Constraint Satisfaction</span>
                <span className="text-border">|</span>
                <span>Genetic Algorithms</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
}
