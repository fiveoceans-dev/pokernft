"use client";

import { useState } from "react";
import Image from "next/image";
import { buyNft } from "~~/services/nft";

type Tournament = {
  id: number;
  name: string;
  creator: string;
  creatorAvatar: string;
  game: string;
  buyIn: number;
  sold: number;
  prize: number;
  creatorShare: number;
  protocolFee: number;
  date: string;
  supply: number;
  nft: string;
};

const tournaments: Tournament[] = [
  {
    id: 1,
    nft: "https://placehold.co/220x320.png?text=NFT",
    name: "Saturday $200,000",
    game: "NLH",
    date: "2024-10-01",
    creatorAvatar: "https://placehold.co/320x320.png?text=NFT",
    creator: "Satoshi",
    prize: 80,
    creatorShare: 10,
    protocolFee: 10,
    sold: 450,
    supply: 1000,
    buyIn: 100,
  },
  {
    id: 2,
    nft: "https://placehold.co/220x320.png?text=NFT",
    name: "Saturday Million",
    game: "NLH",
    date: "2025-10-07",
    creatorAvatar: "https://placehold.co/320x320.png?text=NFT",
    creator: "Stark Foundation",
    prize: 80,
    creatorShare: 10,
    protocolFee: 10,
    sold: 300,
    supply: 750,
    buyIn: 250,
  },
  {
    id: 3,
    nft: "https://placehold.co/220x320.png?text=NFT",
    name: "Sunday Showdown",
    game: "NLH",
    date: "2025-10-14",
    creatorAvatar: "https://placehold.co/320x320.png?text=NFT",
    creator: "PokerNFTs",
    prize: 80,
    creatorShare: 10,
    protocolFee: 10,
    sold: 600,
    supply: 1200,
    buyIn: 50,
  },
  {
    id: 4,
    nft: "https://placehold.co/220x320.png?text=NFT",
    name: "Nightly Brawl",
    game: "NLH",
    date: "2025-10-21",
    creatorAvatar: "https://placehold.co/320x320.png?text=NFT",
    creator: "NFTMillionaires",
    prize: 80,
    creatorShare: 10,
    protocolFee: 10,
    sold: 500,
    supply: 900,
    buyIn: 75,
  },
  {
    id: 5,
    nft: "https://placehold.co/220x320.png?text=NFT",
    name: "High Roller",
    game: "Hold'em",
    date: "2025-10-28",
    creatorAvatar: "https://placehold.co/320x320.png?text=NFT",
    creator: "Cryptopunks",
    prize: 80,
    creatorShare: 10,
    protocolFee: 10,
    sold: 120,
    supply: 400,
    buyIn: 500,
  },
  {
    id: 6,
    nft: "https://placehold.co/220x320.png?text=NFT",
    name: "Daily Spin",
    game: "Hold'em",
    date: "2025-09-20",
    creatorAvatar: "https://placehold.co/320x320.png?text=NFT",
    creator: "Bored",
    prize: 80,
    creatorShare: 10,
    protocolFee: 10,
    sold: 800,
    supply: 1500,
    buyIn: 25,
  },
  {
    id: 7,
    nft: "https://placehold.co/220x320.png?text=NFT",
    name: "Weekend Warriors",
    game: "Hold'em",
    date: "2024-09-02",
    creator: "Squiggles",
    creatorAvatar: "https://placehold.co/320x320.png?text=NFT",
    prize: 80,
    creatorShare: 10,
    protocolFee: 10,
    sold: 350,
    supply: 600,
    buyIn: 150,
  },
  {
    id: 8,
    nft: "https://placehold.co/320x320.png?text=NFT",
    name: "Grand Finale",
    date: "2025-12-30",
    game: "Hold'em",
    creatorAvatar: "https://placehold.co/320x320.png?text=NFT",
    creator: "LastSurvivors",
    prize: 80,
    creatorShare: 10,
    protocolFee: 10,
    sold: 80,
    supply: 200,
    buyIn: 1000,
  },
];

type SortKey = keyof Tournament;

const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: "nft", label: "NFT" },
  { key: "name", label: "Tournament" },
  { key: "game", label: "Game" },
  { key: "date", label: "Date" },
  { key: "creator", label: "Creator" },
  { key: "prize", label: "Prizes" },
  { key: "creatorShare", label: "Prizes" },
  { key: "protocolFee", label: "Prizes" },
  { key: "sold", label: "Sold", numeric: true },
  { key: "buyIn", label: "Buy-In", numeric: true },
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
    <section
      id="tournaments"
      className="py-24 text-gray-900 dark:text-white"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12">
        <h2 className="text-3xl font-bold text-center mb-8">
          <span className="text-accent">Upcoming Tournaments</span>
        </h2>
        <div className="overflow-auto rounded-lg border border-gray-300 dark:border-gray-700">
          <table className="min-w-full text-xs sm:text-sm table-auto">
            <thead className="bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400 uppercase text-[10px] sm:text-xs">
              <tr>
                <th className="px-2 py-1">NFT</th>
                <th className="px-2 py-1">Tournament</th>
                <th className="px-2 py-1">Game</th>
                <th className="px-2 py-1">Date</th>
                <th className="px-2 py-1">Creator</th>
                <th className="px-2 py-1 text-center">Prize 80%</th>
                <th className="px-2 py-1 text-center">Creator 10%</th>
                <th className="px-2 py-1 text-center">Protocol 10%</th>
                <th className="px-2 py-1 text-center">Sold</th>
                <th className="px-2 py-1 text-center">Buy-In</th>
                <th className="px-2 py-1 text-center">Buy</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-black divide-y divide-gray-200 dark:divide-gray-800">
              {sorted.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900 transition"
                >
                  <td className="px-2 py-1">
                    <Image
                      src={t.nft}
                      alt={t.name}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-cover rounded"
                      unoptimized
                    />
                  </td>
                  <td className="px-2 py-1">{t.name}</td>
                  <td className="px-2 py-1">{t.game}</td>
                  <td className="px-2 py-1">{t.date}</td>
                  <td className="px-2 py-1 flex items-center gap-2">
                    <Image
                      src={t.creatorAvatar}
                      alt={t.creator}
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full object-cover"
                      unoptimized
                    />
                    <span>{t.creator}</span>
                  </td>
                  <td className="px-2 py-1 text-center text-accent">
                    {t.prize}%
                  </td>
                  <td className="px-2 py-1 text-center text-blue-400">
                    {t.creatorShare}%
                  </td>
                  <td className="px-2 py-1 text-center text-red-400">
                    {t.protocolFee}%
                  </td>
                  <td className="px-2 py-1 text-orange-500 text-center">
                    {t.sold}/{t.supply}
                  </td>
                  <td className="px-2 py-1 text-green-500 text-center">
                    ${t.buyIn}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      onClick={() => buyNft(t.id)}
                      className="px-2 py-1 bg-purple-600 text-white rounded text-xs sm:text-sm hover:bg-purple-700"
                    >
                      Buy
                    </button>
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
