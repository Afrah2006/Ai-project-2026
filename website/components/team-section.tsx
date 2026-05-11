"use client";

import type { SVGProps } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Mail } from "lucide-react";

function GitHubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.52 2.87 8.35 6.84 9.7.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.86.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.33 9.33 0 0 1 12 6.98c.85 0 1.7.12 2.5.35 1.9-1.33 2.74-1.05 2.74-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.8 0 .27.18.59.69.49A10.13 10.13 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M6.94 8.98H3.73v10.29h3.21V8.98ZM5.34 4a1.86 1.86 0 1 0 0 3.72 1.86 1.86 0 0 0 0-3.72Zm13.42 9.76c0-3.09-1.65-4.52-3.85-4.52a3.32 3.32 0 0 0-3 1.65h-.04V8.98H8.8v10.29H12v-5.09c0-1.34.25-2.64 1.91-2.64 1.64 0 1.66 1.53 1.66 2.73v5h3.2v-5.51Z" />
    </svg>
  );
}

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
                      <GitHubIcon className="size-4" />
                    </a>
                    <a
                      href="#"
                      className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      aria-label="LinkedIn"
                    >
                      <LinkedInIcon className="size-4" />
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
