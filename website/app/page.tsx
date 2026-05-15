import { Navigation } from "@/components/navigation";
import { Hero } from "@/components/hero";
import { ProblemSection } from "@/components/problem-section";
import { ConstraintsSection } from "@/components/constraints-section";
import { ArchitectureSection } from "@/components/architecture-section";
import { AlgorithmsSection } from "@/components/algorithms-section";
import { MainDashboard } from "@/components/main-dashboard";
import { TeamSection } from "@/components/team-section";
import { Footer } from "@/components/footer";
import { ScheduleProvider } from "@/lib/schedule-context";

export default function Home() {
  return (
    <ScheduleProvider>
      <main className="min-h-screen">
        <Navigation />
        <Hero />
        <ProblemSection />
        <ConstraintsSection />
        <ArchitectureSection />
        <AlgorithmsSection />
        <MainDashboard />
        <TeamSection />
        <Footer />
      </main>
    </ScheduleProvider>
  );
}
