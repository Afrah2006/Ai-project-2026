import { Navigation } from "@/components/navigation";
import { Hero } from "@/components/hero";
import { ProblemSection } from "@/components/problem-section";
import { ConstraintsSection } from "@/components/constraints-section";
import { ArchitectureSection } from "@/components/architecture-section";
import { AlgorithmsSection } from "@/components/algorithms-section";
import { ScheduleSection } from "@/components/schedule-section";
import { ResultsSection } from "@/components/results-section";
import { TeamSection } from "@/components/team-section";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <Hero />
      <ProblemSection />
      <ConstraintsSection />
      <ArchitectureSection />
      <AlgorithmsSection />
      <ScheduleSection />
      <ResultsSection />
      <TeamSection />
      <Footer />
    </main>
  );
}
