"use client";
import React from "react";
import { Header } from "../components/Header";
import HeroSection from "../components/HeroSection";
import ProvenanceSection from "../components/ProvenanceSection";
import TopTournamentsSection from "../components/TopTournamentsSection";
import MarketplaceSection from "../components/MarketplaceSection";
import StayTunedSection from "../components/StayTunedSection";
import { Footer } from "../components/Footer";

export default function HomePage() {
  return (
    <main className="flex flex-col items-stretch">
      <Header />
      <HeroSection />
      <ProvenanceSection />
      <TopTournamentsSection />
      <MarketplaceSection />
      <StayTunedSection />
      <Footer />
    </main>
  );
}
