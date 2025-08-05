import NFTCard from "./ui/NFTCard";
import NFTGrid from "./ui/NFTGrid";
import FiltersSidebar from "./ui/FiltersSidebar";

const items = Array.from({ length: 8 }).map((_, i) => ({
  id: i,
  title: `NFT Item ${i + 1}`,
  image: "/nft.png",
  creator: "/logo.svg",
  price: `${(i + 1) * 0.1} ETH`,
  chainIcon: "/explorer-icon.svg",
}));

export default function MarketplaceSection() {
  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto grid md:grid-cols-12 gap-6">
        <div className="md:col-span-3">
          <FiltersSidebar />
        </div>
        <div className="md:col-span-9">
          <NFTGrid>
            {items.map((item) => (
              <NFTCard key={item.id} {...item} />
            ))}
          </NFTGrid>
        </div>
      </div>
    </section>
  );
}
