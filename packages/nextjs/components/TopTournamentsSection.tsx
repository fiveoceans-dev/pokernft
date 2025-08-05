/**
 * TopTournamentsSection – grid of tournament cards.
 */
export default function TopTournamentsSection() {
  const tournaments = Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    name: `Tournament ${i + 1}`,
    buyIn: 10 + i * 5,
    prizePool: 5000 + i * 1000,
    players: 100 + i * 20,
    starts: "2h 15m",
  }));

  return (
    <section
      id="tournaments"
      className="py-24 px-6 md:px-12 bg-[#081224] text-white"
    >
      <h2 className="text-3xl md:text-4xl font-extrabold text-yellow-300 text-center mb-12">
        Top Tournaments
      </h2>
      <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {tournaments.map((t) => (
          <div
            key={t.id}
            className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col"
          >
            <img
              src={`https://placehold.co/600x400.png?text=NFT+${t.id + 1}`}
              alt="NFT"
              className="w-full h-40 object-cover rounded"
            />
            <h3 className="mt-4 font-semibold">{t.name}</h3>
            <div className="mt-2 text-sm space-y-1">
              <p>Buy-in: ${t.buyIn}</p>
              <p>Total Prize Pool: ${t.prizePool.toLocaleString()}</p>
              <p>Players Joined: {t.players}</p>
              <p>Starts in {t.starts}</p>
            </div>
            <button className="mt-4 px-4 py-2 bg-yellow-400 text-[#0c1a3a] font-semibold rounded hover:bg-yellow-300">
              View Tournament
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
