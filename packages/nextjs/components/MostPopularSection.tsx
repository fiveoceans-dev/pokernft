import NFTCard from "./ui/NFTCard";
import NFTGrid from "./ui/NFTGrid";

const items = Array.from({ length: 8 }).map((_, i) => ({
  id: i,
  title: `Popular NFT ${i + 1}`,
  image: "/nft.png",
  creator: "/logo.svg",
  price: `${(i + 1) * 0.1} ETH`,
  chainIcon: "/explorer-icon.svg",
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
      <NFTGrid>
        {items.map((item) => (
          <NFTCard key={item.id} {...item} />
        ))}
      </NFTGrid>
    </section>
  );
}

