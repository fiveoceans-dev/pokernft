"use client";
import React from "react";
import HeroSection from "../components/HeroSection";
import HowItWorksSection from "../components/HowItWorksSection";
import TrendingTournamentsSection from "../components/TrendingTournamentsSection";
import GamesTableSection from "../components/GamesTableSection";
import StayTunedSection from "../components/StayTunedSection";
import MissionStatementSection from "../components/MissionStatementSection";
import { useScrollRestoration } from "../hooks/useScrollRestoration";

export default function HomePage() {
  // Restore scroll position on page refresh
  useScrollRestoration('homepage-scroll');
  
  return (
    <main className="flex flex-col items-stretch space-y-8">
      <HeroSection />
      <MissionStatementSection />
      <HowItWorksSection />
      <TrendingTournamentsSection />
      <GamesTableSection />
      <StayTunedSection />
    </main>
  );
}
