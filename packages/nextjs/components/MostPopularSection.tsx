import { PopularNftCard, type PopularNftCardProps } from "./ui/PopularNftCard";

type PopularNftItem = PopularNftCardProps & { id: number };

const items: PopularNftItem[] = Array.from({ length: 5 }).map((_, i) => ({
  id: i,
  title: `PUNK${1000 + i}`,
  image: "/nft.png",
  buyIn: `$${20 + i}`,
  status: "Minting",
  gameType: "No-Limit Texas Hold'em",
  dateTime: `[2025.08.${12 + i} 21:00 GMT]`,
  tournamentType: "Tournament",
  registered: 9999 - i,
  maxRegistered: 10000,
  prize: "$200,000",
}));

/**
 * Grid of popular NFTs similar to Rarible's latest drops.
 */
export default function MostPopularSection() {
  return (
    <section className="py-12 px-4 sm:px-6 md:px-12">
      <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-8">
        Most Popular
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6 justify-items-center">
        {items.map((item) => (
          <PopularNftCard key={item.id} {...item} />
        ))}
      </div>
    </section>
  );
}
