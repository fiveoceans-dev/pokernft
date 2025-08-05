import TournamentCard from "./ui/TournamentCard";

const items = Array.from({ length: 8 }).map((_, i) => ({
  id: i,
  title: `Popular NFT ${i + 1}`,
  image: "/nft.png",
  creatorAvatar: "/logo.svg",
  creatorName: `Creator ${i + 1}`,
  date: `Aug ${10 + i}, 8:00 PM`,
  price: 0.1 * (i + 1),
  registered: 20 + i * 5,
}));

/**
 * Grid of popular NFTs similar to Rarible's latest drops.
 */
export default function MostPopularSection() {
  return (
    <section className="py-12 px-6 md:px-12">
      <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-8">
        Most Popular
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 justify-items-center">
        {items.map((item) => (
          <TournamentCard key={item.id} {...item} />
        ))}
      </div>
    </section>
  );
}
