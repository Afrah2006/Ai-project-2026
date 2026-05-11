import { Activity, Github } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Activity className="text-primary" />
            <span className="font-semibold text-foreground">NurseScheduler</span>
          </div>

          <nav className="flex flex-wrap justify-center gap-6">
            <a
              href="#problem"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Problem
            </a>
            <a
              href="#constraints"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Constraints
            </a>
            <a
              href="#architecture"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Architecture
            </a>
            <a
              href="#algorithms"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Algorithms
            </a>
            <a
              href="#results"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Results
            </a>
          </nav>

          <a
            href="https://github.com/Afrah2006/Ai-project-2026"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Github className="size-4" />
            <span>View on GitHub</span>
          </a>
        </div>

        <Separator className="my-8" />

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Intelligent Hospital Nurse Scheduling System
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            AI Course Project 2025 - Built with Python, Genetic Algorithms & CSP
          </p>
        </div>
      </div>
    </footer>
  );
}
