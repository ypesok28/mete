"use client";

// METE — the marketing landing page (the front door, /). The working console lives at /console.
// Light, warm-neutral, single-bronze-accent — the same design system as the app, so the hop into
// the console is seamless. Sections animate in on scroll (see src/components/landing/*); the live
// 5×SCOUT ⇄ 1×STRIKE flip carries the core idea before a word is read.

import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { StatBand } from "@/components/landing/StatBand";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FlipExplained } from "@/components/landing/FlipExplained";
import { TierSpecs } from "@/components/landing/TierSpecs";
import { Features } from "@/components/landing/Features";
import { ClosingCTA } from "@/components/landing/ClosingCTA";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Nav />
      <main>
        <Hero />
        <StatBand />
        <Problem />
        <HowItWorks />
        <FlipExplained />
        <TierSpecs />
        <Features />
        <ClosingCTA />
      </main>
      <Footer />
    </div>
  );
}
