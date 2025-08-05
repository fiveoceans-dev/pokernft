import { useState } from "react";

/**
 * ProvenanceSection – two-column explainer with payout calculator.
 */
export default function ProvenanceSection() {
  const [buyIn, setBuyIn] = useState(10);
  const [players, setPlayers] = useState(100);

  const prizePool = buyIn * players;
  const payout = {
    winner: prizePool * 0.4,
    top: prizePool * 0.4,
    creator: prizePool * 0.1,
    platform: prizePool * 0.1,
  };

  return (
    <section id="how" className="py-24 px-6 md:px-12 bg-[#0a1a38] text-white">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        {/* left illustration */}
        <div className="flex justify-center">
          <div className="w-64 h-64 bg-white/10 rounded-xl" />
        </div>

        {/* right content */}
        <div>
          <ol className="space-y-4 text-lg list-decimal list-inside">
            <li>Buy NFT Ticket</li>
            <li>Join Tournament</li>
            <li>Win in Top 10%</li>
            <li>Get Paid</li>
          </ol>

          {/* calculator */}
          <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10">
            <div className="flex flex-col md:flex-row gap-4">
              <label className="flex-1 text-sm">
                <span className="block mb-1 text-yellow-300">Buy-in ($)</span>
                <select
                  value={buyIn}
                  onChange={(e) => setBuyIn(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-md text-[#0c1a3a]"
                >
                  {[10, 20, 50, 100].map((v) => (
                    <option key={v} value={v}>
                      ${v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex-1 text-sm">
                <span className="block mb-1 text-yellow-300">Players</span>
                <input
                  type="range"
                  min={10}
                  max={500}
                  value={players}
                  onChange={(e) => setPlayers(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-sm text-right mt-1">{players}</div>
              </label>
            </div>

            <ul className="mt-4 text-sm space-y-1">
              <li>Total Prize Pool: ${prizePool.toLocaleString()}</li>
              <li>Winner (40%): ${payout.winner.toLocaleString()}</li>
              <li>Top 10% (40%): ${payout.top.toLocaleString()}</li>
              <li>Creator (10%): ${payout.creator.toLocaleString()}</li>
              <li>Platform (10%): ${payout.platform.toLocaleString()}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
