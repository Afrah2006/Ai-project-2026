import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-heading" });

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
    <html lang="en" className={`dark h-full antialiased ${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col mesh-bg font-sans" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
