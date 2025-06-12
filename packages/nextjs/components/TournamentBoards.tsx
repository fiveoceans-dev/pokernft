import { useState } from 'react';

/**
 * TournamentBoards – shows Top Sales / Most Popular / Upcoming with live bankroll math.
 */
export default function TournamentBoards() {
  type Row = {
    Name: string;
    Game: string;
    Ticket: number; // price in USD
    Sold: number;   // how many minted
    Total: number;  // max supply
    Bank: number;   // auto‑computed prize pool (sold × ticket × 0.8)
    Date: string;
    Creator: string;
  };

  const columns: (keyof Row & string)[] = [
    'Name',
    'Game',
    'Ticket',
    'Sold',
    'Bank',
    'Date',
    'Creator'
  ];

  const makeRow = (sold: number): Row => ({
    Name: 'Sunday Night Poker',
    Game: 'Hold’em',
    Ticket: 10,
    Sold: sold,
    Total: 1000,
    Bank: sold * 10 * 0.8,
    Date: 'June 1 / 7',
    Creator: 'Five'
  });

  const rows = Array.from({ length: 10 }, (_, i) => makeRow(1000 - i * 75));

  return (
    <section id="boards" className="relative py-24 px-6 md:px-12 bg-[#081224] text-white">
      <h2 className="text-3xl md:text-4xl font-extrabold text-yellow-300 text-center mb-12">Explore</h2>
      <div className="flex flex-col gap-10 max-w-6xl mx-auto">
        <InsightBoard title="Top Sales" columns={columns} rows={rows} />
        <InsightBoard title="Most Popular" columns={columns} rows={rows} />
        <InsightBoard title="Upcoming Tournaments" columns={columns} rows={rows} />
      </div>
    </section>
  );
}

/* ────────── Generic Board ────────── */
interface BoardProps<T extends Record<string, any>> {
  title: string;
  columns: (keyof T & string)[];
  rows: T[];
}
function InsightBoard<T extends Record<string, any>>({ title, columns, rows }: BoardProps<T>) {
  const [filter, setFilter] = useState('');
  const lc = filter.toLowerCase();
  const filtered = rows.filter(r =>
    Object.values(r).some(v => String(v).toLowerCase().includes(lc))
  );

  return (
    <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <h3 className="text-xl font-semibold text-yellow-300">{title}</h3>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Filter…"
          className="md:w-64 px-3 py-2 rounded-md text-[#0c1a3a] placeholder-slate-500 text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col} className="px-2 py-1 text-left text-slate-300 capitalize whitespace-nowrap">
                  {col === 'Ticket' ? 'Ticket ($)' : col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, idx) => (
              <tr key={idx} className="odd:bg-white/5 hover:bg-white/10">
                {columns.map(col => (
                  <td key={col} className="px-2 py-1 whitespace-nowrap">
                    {col === 'Creator' ? (
                      <div className="flex items-center gap-2">
                        <img src={`https://placehold.co/75x75.png`} alt="avatar" className="w-6 h-6 rounded-full" />
                        {row.Creator}
                      </div>
                    ) : col === 'Ticket' ? (
                      `$${row.Ticket}`
                    ) : col === 'Bank' ? (
                      `$${row.Bank.toLocaleString()}`
                    ) : col === 'Sold' ? (
                      `${row.Sold}/${row.Total}`
                    ) : (
                      row[col]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
