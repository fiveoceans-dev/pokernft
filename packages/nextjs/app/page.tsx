"use client";
import React from "react";
import HeroSection from "../components/HeroSection";
import MostPopularSection from "../components/MostPopularSection";
import TournamentsTableSection from "../components/TournamentsTableSection";
import MarketplaceSection from "../components/MarketplaceSection";
import StayTunedSection from "../components/StayTunedSection";
import { Footer } from "../components/Footer";

export default function HomePage() {
  return (
    <main className="flex flex-col items-stretch">
      <HeroSection />
      <MostPopularSection />
      <TournamentsTableSection />
      <StayTunedSection />
    </main>
  );
}
