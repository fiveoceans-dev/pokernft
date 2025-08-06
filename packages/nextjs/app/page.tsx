"use client";
import React from "react";
import HeroSection from "../components/HeroSection";
import HowItWorksSection from "../components/HowItWorksSection";
import TrendingSection from "../components/TrendingSection";
import TournamentsTableSection from "../components/TournamentsTableSection";
import MarketplaceSection from "../components/MarketplaceSection";
import StayTunedSection from "../components/StayTunedSection";
import { Footer } from "../components/Footer";

export default function HomePage() {
  return (
    <main className="flex flex-col items-stretch">
      <HeroSection />
      <HowItWorksSection />
      <TrendingSection />
      <TournamentsTableSection />
      <MarketplaceSection />
      <StayTunedSection />
    </main>
  );
}
