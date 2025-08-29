"use client";
import React from "react";
import HeroSection from "../components/HeroSection";
import HowItWorksSection from "../components/HowItWorksSection";
import TrendingTournamentsSection from "../components/TrendingTournamentsSection";
import GamesTableSection from "../components/GamesTableSection";
import StayTunedSection from "../components/StayTunedSection";
import MissionStatementSection from "../components/MissionStatementSection";

export default function HomePage() {
  return (
    <main className="flex flex-col items-stretch space-y-24">
      <HeroSection />
      <MissionStatementSection />
      <HowItWorksSection />
      <TrendingTournamentsSection />
      <GamesTableSection />
      <StayTunedSection />
    </main>
  );
}
