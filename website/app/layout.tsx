import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intelligent Hospital Nurse Scheduling | AI-Powered Optimization",
  description:
    "An AI-powered system using Genetic Algorithms and Constraint Satisfaction to optimize hospital nurse scheduling while balancing staff preferences with operational requirements.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased bg-background">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
