import { useState } from "react";
import {
  ArrowLongRightIcon,
  ArrowLongDownIcon,
} from "@heroicons/react/24/outline";

/**
 * ProvenanceSection – two-column explainer with payout calculator.
 */
export default function ProvenanceSection() {
  const [buyIn, setBuyIn] = useState(10);
  const [players, setPlayers] = useState(100);
  const [showTable, setShowTable] = useState(false);

  const prizePool = buyIn * players;
  const payout = {
    winner: prizePool * 0.3,
    finalTable: prizePool * 0.1,
    top: prizePool * 0.4,
    creator: prizePool * 0.1,
    platform: prizePool * 0.1,
  };

  const buildDistribution = () => {
    const rows: { position: number; pct: number; prize: number }[] = [];
    // winner
    rows.push({ position: 1, pct: 0.3, prize: payout.winner });

    const finalTableSize = Math.min(9, players);
    const ftSpots = finalTableSize - 1; // excluding winner
    const ftWeightSum = (ftSpots * (ftSpots + 1)) / 2;
    for (let i = 2; i <= finalTableSize; i++) {
      const weight = finalTableSize - i + 1;
      const pct = (weight / ftWeightSum) * 0.1;
      rows.push({ position: i, pct, prize: pct * prizePool });
    }

    const topCount = Math.ceil(players * 0.15);
    const remSpots = Math.max(topCount - finalTableSize, 0);
    const topWeightSum = (remSpots * (remSpots + 1)) / 2;
    for (let i = finalTableSize + 1; i <= topCount; i++) {
      const weight = topCount - i + 1;
      const pct = (weight / topWeightSum) * 0.4;
      rows.push({ position: i, pct, prize: pct * prizePool });
    }

    return rows;
  };

  const distribution = buildDistribution();

  const steps = [
    "Buy NFT Ticket",
    "Join Tournament",
    "Finish in Top 15%",
    "Get Paid",
  ];

  return (
    <section id="how" className="py-24 px-6 md:px-12 bg-[#0a1a38] text-white">
      <h2 className="text-3xl md:text-4xl font-extrabold text-yellow-300 text-center mb-12">
        How It Works
      </h2>
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        {/* left illustration */}
        <div className="flex justify-center">
          <div className="w-64 h-64 bg-white/10 rounded-xl" />
        </div>

        {/* right content */}
        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className="px-4 py-3 bg-white/5 rounded-lg border border-white/10 text-sm text-center">
                  {s}
                </div>
                {i < steps.length - 1 && (
                  <>
                    <ArrowLongRightIcon className="hidden md:block w-6 h-6 mx-2 text-yellow-300" />
                    <ArrowLongDownIcon className="md:hidden w-6 h-6 mx-2 text-yellow-300" />
                  </>
                )}
              </div>
            ))}
          </div>

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

            <div className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-white/10 rounded">
                Total Prize Pool: ${prizePool.toLocaleString()}
              </div>
              <div className="p-3 bg-white/10 rounded">
                Winner (30%): ${payout.winner.toLocaleString()}
              </div>
              <div className="p-3 bg-white/10 rounded">
                Final Table (10%): ${payout.finalTable.toLocaleString()}
              </div>
              <div className="p-3 bg-white/10 rounded">
                Top 15% (40%): ${payout.top.toLocaleString()}
              </div>
              <div className="p-3 bg-white/10 rounded">
                Creator (10%): ${payout.creator.toLocaleString()}
              </div>
              <div className="p-3 bg-white/10 rounded">
                Platform (10%): ${payout.platform.toLocaleString()}
              </div>
            </div>

            <button
              className="mt-6 px-4 py-2 bg-yellow-400 text-[#0c1a3a] font-semibold rounded hover:bg-yellow-300"
              onClick={() => setShowTable((v) => !v)}
            >
              {showTable ? "Hide" : "Show"} Prize Table
            </button>

            {showTable && (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-1">Position</th>
                    <th className="py-1">% of Pool</th>
                    <th className="py-1">Prize ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {distribution.map((d) => (
                    <tr key={d.position} className="odd:bg-white/5">
                      <td className="py-1 px-2">{d.position}</td>
                      <td className="py-1 px-2">{(d.pct * 100).toFixed(2)}%</td>
                      <td className="py-1 px-2">{d.prize.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
