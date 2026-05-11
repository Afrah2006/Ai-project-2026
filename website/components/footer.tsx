import type { SVGProps } from "react";
import { Activity } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
            <GitHubIcon className="size-4" />
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
