import { PopularNftCard, type PopularNftCardProps } from "./ui/PopularNftCard";

type PopularNftItem = PopularNftCardProps & { id: number };

const items: PopularNftItem[] = Array.from({ length: 7 }).map((_, i) => ({
  id: i,
  title: `FIVE`,
  image: `/nfts/nft${i}.png`,
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
 * Horizontally scrollable grid of trending NFTs.
 */
export default function TrendingSection() {
  return (
    <section
      id="trending"
      className="py-12 px-4 sm:px-6 md:px-12 bg-white text-gray-900 dark:bg-gray-900 dark:text-white"
    >
      <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-8">
        Trending
      </h2>
      <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-7 gap-4 md:gap-6 w-max">
          {items.map((item) => (
            <PopularNftCard key={item.id} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}
