/**
 * MarketplaceSection – simplified marketplace view.
 */
export default function MarketplaceSection() {
  const entries = Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    name: `NFT Tournament ${i + 1}`,
    creator: `Creator ${i + 1}`,
    buyIn: 5 + i * 5,
    date: "Jun 10",
    sold: `${20 + i * 3}/${100 + i * 10}`,
    prize: 1000 + i * 500,
  }));

  return (
    <section
      id="marketplace"
      className="py-24 px-6 md:px-12 bg-[#0a1a38] text-white"
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-extrabold text-yellow-300 text-center mb-8">
          NFT Marketplace
        </h2>

        {/* filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex gap-2">
            {["Upcoming", "Active", "Finished"].map((f) => (
              <button
                key={f}
                className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-sm"
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search"
            className="px-3 py-2 rounded-md text-[#0c1a3a]"
          />
          <div className="font-semibold">🏆 Total Prize Money: $213,400</div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {entries.map((e) => (
            <div
              key={e.id}
              className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col"
            >
              <img
                src={`https://placehold.co/600x400.png?text=NFT+${e.id + 1}`}
                alt="NFT"
                className="w-full h-40 object-cover rounded"
              />
              <h3 className="mt-4 font-semibold">{e.name}</h3>
              <p className="text-sm text-slate-300">{e.creator}</p>
              <div className="mt-2 text-sm space-y-1">
                <p>Buy-in Price: ${e.buyIn}</p>
                <p>Tournament Date: {e.date}</p>
                <p>Amount Sold / Refunded: {e.sold}</p>
                <p>Finisher Prize: ${e.prize.toLocaleString()}</p>
              </div>
              <button className="mt-4 px-4 py-2 bg-yellow-400 text-[#0c1a3a] font-semibold rounded hover:bg-yellow-300">
                See Prize Breakdown
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
