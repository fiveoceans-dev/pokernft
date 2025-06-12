"use client";
import React from "react";
import Menu from "../components/Menu";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center">
      <Menu />
      <h1 className="text-3xl font-bold mt-6">PokerBoots × Starknet</h1>
      <Link
        href="/play"
        className="mt-4 px-6 py-2 bg-blue-700 rounded hover:bg-blue-900"
      >
        Play Tournament
      </Link>
    </main>
  );
}
