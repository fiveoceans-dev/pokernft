'use client';

import Link from 'next/link';

interface TableInfo {
  id: string;
  name: string;
  stakes: string;
}

const TABLES: TableInfo[] = [
  { id: 'demo', name: 'Demo Table', stakes: 'Free' },
  { id: 'high', name: 'High Stakes', stakes: '50/100' },
];

export default function LobbyPage() {
  return (
    <main className="p-6 text-white">
      <h1 className="text-2xl mb-4">Lobby</h1>
      <ul className="space-y-3">
        {TABLES.map((t) => (
          <li key={t.id} className="flex items-center justify-between bg-black/40 rounded p-4">
            <div>
              <div className="font-semibold">{t.name}</div>
              <div className="text-sm text-gray-300">Stakes: {t.stakes}</div>
            </div>
            <Link
              href={`/play?table=${t.id}`}
              className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
            >
              Join
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

