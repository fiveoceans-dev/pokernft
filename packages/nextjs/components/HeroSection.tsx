// components/HeroSection.tsx

import appMockup from '../assets/app-mockup.png';

/**
 * HeroSection – concise, on‑point banner explaining the NFT‑tournament flow.
 */
export default function HeroSection() {
  return (
    <section id="home" className="relative flex flex-col justify-center h-[100vh] px-6 md:px-12 overflow-hidden">
      {/* decorative angle */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-blue-600/20 to-indigo-800/10 [clip-path:polygon(0_0,100%_0,100%_75%,0_100%)] pointer-events-none" />

      {/* content wrapper */}
      <div className="relative z-10 max-w-4xl w-full mx-auto">
        {/* headline */}
        <h1 className="font-extrabold text-4xl md:text-4xl leading-tight uppercase tracking-wider text-left">
          <span className="block text-yellow-400">POKER ON STARKNET</span>
          <span className="block text-white-400">SPIN UP YOUR TOURNAMENT</span>
          <span className="block text-white-400">WITH NFT SALE</span>

        </h1>

        {/* subline */}
        <p className="mt-4 text-slate-300 text-lg md:text-xl text-left">
          Mint tickets → Prize pool auto‑escrows → Smart‑contract payouts.
        </p>

        {/* how it works concise */}
        <ul className="mt-6 space-y-2 text-sm md:text-base list-disc pl-6 text-slate-300 text-left">
          <li>Anyone launches a tournament by selling ticket‑NFTs.</li>
          <li>100% of sales locked in-bank by Starknet smart‑contracts.</li>
          <li>After the final hand: 10% platform • 10% creator • 40% winner • 40% top&nbsp;15%.</li>
        </ul>

        {/* CTA */}
        <div className="mt-10 flex gap-4" >
          <a href="/#mint" className="px-6 py-3 bg-yellow-400 text-[#0c1a3a] font-semibold rounded-lg shadow hover:bg-yellow-300 transition-colors">
            BUY NFT
          </a>
          <a href="/play" className="px-6 py-3 bg-transparent border border-yellow-400 text-yellow-400 font-semibold rounded-lg hover:bg-yellow-400 hover:text-[#0c1a3a] transition-colors">
            PLAY NOW
          </a>
        </div>
      </div>

      {/* mockup */}
      <div className="absolute bottom-0 md:bottom-[-5rem] right-1/2 md:right-16 translate-x-1/2 md:translate-x-0 w-[240px] md:w-[340px] rotate-[4deg] shadow-2xl pointer-events-none">
        <img src={appMockup} alt="Poker app mockup" className="w-full h-auto object-contain" />
      </div>
    </section>
  );
}
