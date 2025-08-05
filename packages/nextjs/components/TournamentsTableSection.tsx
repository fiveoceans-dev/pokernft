"use client";

import { useState } from "react";

type Tournament = {
  id: number;
  name: string;
  creator: string;
  creatorAvatar: string;
  game: string;
  buyIn: number;
  sold: number;
  prizes: string;
  date: string;
  supply: number;
  nft: string;
};

const tournaments: Tournament[] = [
  {
    id: 1,
    name: "Saturday $200,000",
    creator: "BAYC",
    creatorAvatar: "https://placehold.co/320x320.png?text=NFT",
    game: "Hold'em",
    buyIn: 100,
    sold: 450,
    prizes: "40% / 30% / 20% / 10%",
    date: "2024-06-01",
    supply: 1000,
    nft: "https://placehold.co/220x320.png?text=NFT",
  },
  {
    id: 2,
    name: "Saturday Million",
    creator: "Cool Cats",
    creatorAvatar: "https://placehold.co/320x320.png?text=NFT",
    game: "Omaha",
    buyIn: 250,
    sold: 300,
    prizes: "50% / 30% / 20%",
    date: "2024-06-15",
    supply: 750,
    nft: "https://placehold.co/220x320.png?text=NFT",
  },
  {
    id: 3,
    name: "Sunday Showdown",
    creator: "Doodles",
    creatorAvatar: "https://placehold.co/320x320.png?text=NFT",
    game: "Hold'em",
    buyIn: 50,
    sold: 600,
    prizes: "30% / 20% / 10%",
    date: "2024-07-04",
    supply: 1200,
    nft: "https://placehold.co/220x320.png?text=NFT",
  },
];

type SortKey = keyof Tournament;

const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "name", label: "Tournament" },
  { key: "creator", label: "Creator" },
  { key: "game", label: "Game" },
  { key: "buyIn", label: "Buy-In", numeric: true },
  { key: "sold", label: "Sold", numeric: true },
  { key: "prizes", label: "Prizes" },
  { key: "date", label: "Date" },
  { key: "supply", label: "Supply", numeric: true },
  { key: "nft", label: "NFT" },
];

export default function TournamentsTableSection() {
  const [openColumn, setOpenColumn] = useState<SortKey | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: "asc" | "desc";
  } | null>(null);

  const sorted = [...tournaments].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const aVal = a[key];
    const bVal = b[key];
    let comparison = 0;
    if (typeof aVal === "number" && typeof bVal === "number") {
      comparison = aVal - bVal;
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }
    return direction === "asc" ? comparison : -comparison;
  });

  const toggleColumn = (key: SortKey) => {
    setOpenColumn((prev) => (prev === key ? null : key));
  };

  const applySort = (key: SortKey, direction: "asc" | "desc") => {
    setSortConfig({ key, direction });
    setOpenColumn(null);
  };

  return (
    <section className="text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">
          Trending <span className="text-yellow-400">Top</span>
        </h2>

        <div className="overflow-auto rounded-lg border border-gray-700">
          <table className="min-w-full text-sm table-auto">
            <thead className="bg-gray-900 text-gray-400 uppercase text-xs">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left relative">
                    <button
                      className="flex items-center gap-1"
                      onClick={() => toggleColumn(col.key)}
                    >
                      {col.label}
                    </button>
                    {openColumn === col.key && (
                      <div className="absolute left-0 mt-1 w-32 bg-gray-800 rounded shadow-lg z-10">
                        <button
                          className="block w-full text-left px-3 py-1 hover:bg-gray-700"
                          onClick={() => applySort(col.key, "asc")}
                        >
                          {col.numeric ? "Low → High" : "A → Z"}
                        </button>
                        <button
                          className="block w-full text-left px-3 py-1 hover:bg-gray-700"
                          onClick={() => applySort(col.key, "desc")}
                        >
                          {col.numeric ? "High → Low" : "Z → A"}
                        </button>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-gray-800">
              {sorted.map((t) => (
                <tr key={t.id} className="hover:bg-gray-900 transition">
                  <td className="px-4 py-3 flex items-center gap-3">
                    {t.name}
                  </td>
                  <td className="px-4 py-3 flex items-center gap-3">
                    <img
                      src={t.creatorAvatar}
                      alt={t.creator}
                      className="w-8 h-8 rounded-full"
                    />
                    <span>{t.creator}</span>
                  </td>
                  <td className="px-4 py-3">{t.game}</td>
                  <td className="px-4 py-3 text-green-400">{t.buyIn}</td>
                  <td className="px-4 py-3 text-orange-400">{t.sold}</td>
                  <td className="px-4 py-3">{t.prizes}</td>
                  <td className="px-4 py-3">{t.date}</td>
                  <td className="px-4 py-3">{t.supply}</td>
                  <td className="px-4 py-3">
                    <img src={t.nft} alt={t.name} className="w-8 h-8" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
