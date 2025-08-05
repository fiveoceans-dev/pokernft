"use client";

import Image from "next/image";
import { useState } from "react";

type Tournament = {
  id: number;
  name: string;
  nft: string;
  bank: number;
  prize: string;
  starts: string;
};

const tournaments: Tournament[] = Array.from({ length: 6 }).map((_, i) => ({
  id: i,
  name: `Tournament ${i + 1}`,
  nft: "/nft.png",
  bank: 1000 + i * 500,
  prize: "40% / 30% / 20% / 10%",
  starts: `${i + 1}h`,
}));

/**
 * Table view of all tournaments with simple text filters.
 */
export default function TournamentsTableSection() {
  const [search, setSearch] = useState("");
  const [minBank, setMinBank] = useState("");

  const filtered = tournaments.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) &&
      (minBank ? t.bank >= parseInt(minBank, 10) : true),
  );

  return (
    <section className="py-12 px-6 md:px-12">
      <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-8">
        All Tournaments
      </h2>

      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-center">
        <input
          type="text"
          placeholder="Search tournaments"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border rounded-md w-full md:w-64 bg-white/5 text-white"
        />
        <input
          type="number"
          placeholder="Min bank"
          value={minBank}
          onChange={(e) => setMinBank(e.target.value)}
          className="px-3 py-2 border rounded-md w-full md:w-40 bg-white/5 text-white"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-4 py-2">Tournament</th>
              <th className="px-4 py-2">Bank</th>
              <th className="px-4 py-2">Prize Distribution</th>
              <th className="px-4 py-2">Starts</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-white/5">
                <td className="px-4 py-3 flex items-center gap-3">
                  <Image
                    src={t.nft}
                    alt={t.name}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-md object-cover"
                  />
                  <span>{t.name}</span>
                </td>
                <td className="px-4 py-3">{t.bank.toLocaleString()} ETH</td>
                <td className="px-4 py-3">{t.prize}</td>
                <td className="px-4 py-3">{t.starts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

