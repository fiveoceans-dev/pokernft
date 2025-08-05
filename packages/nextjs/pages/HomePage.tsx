// HomePage.tsx

import HeroSection from "../components/HeroSection";
import NftSaleSection from "../components/NFTSaleSection";
import TournamentBoards from "../components/TournamentBoards";
import StayTunedSection from "../components/StayTunedSection";

/**
 * Home landing page – blue ✕ gold palette
 * TailwindCSS assumed (JIT / arbitrary values enabled)
 */
export default function HomePage() {
  return (
    <div className="min-h-screen text-white bg-gradient-to-b from-[#02040b] via-[#0c1a3a] to-[#102047] overflow-x-hidden">
      <HeroSection />

      <StayTunedSection />
    </div>
  );
}
