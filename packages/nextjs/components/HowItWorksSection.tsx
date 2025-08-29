import React from "react";
import {
  FaImage,
  FaTags,
  FaUsers,
  FaTable,
  FaCoins,
  FaGift,
} from "react-icons/fa";

const steps = [
  {
    title: "Create an NFT",
    description:
      "Upload your own artwork. This NFT will represent your tournament entry ticket.",
    icon: FaImage,
  },
  {
    title: "Set Price, Supply & Date",
    description:
      "Choose your buy-in price, total supply, and tournament start date.",
    icon: FaTags,
  },
  {
    title: "Bring Your Followers",
    description:
      "Share and sell your NFT to your community. Each buyer gets a seat at the table!",
    icon: FaUsers,
  },
  {
    title: "Protocol Spins Up a Tournament",
    description:
      "Once funded, the protocol automatically launches a secure onchain poker tournament.",
    icon: FaTable,
  },
  {
    title: "Fair Prize Distribution",
    description: "Bank split: 80% prizes, 10% creator, 10% protocol.",
    icon: FaCoins,
  },
  {
    title: "Get $POKER Airdrops",
    description:
      "Top 50% win prize money and get a bonus airdrop of $POKER tokens. The winner takes 25%",
    icon: FaGift,
  },
];

export default function HowItWorksSection() {
  return (
    <section id="how" className="py-8 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
          Create Your Own <span className="text-accent">POKER</span> Tournament
        </h2>
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map(({ title, description, icon: Icon }, index) => (
            <div
              key={index}
              className="relative p-6 rounded-xl bg-white/70 border border-gray-200 shadow-center transition-transform hover:-translate-y-1 hover:shadow-neon dark:bg-gray-900/60 dark:border-gray-800"
            >
              <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-accent/20 text-accent text-xl">
                <Icon />
              </div>
              <h3 className="text-xl font-semibold mb-2">{title}</h3>
              <p className="text-gray-700 text-sm dark:text-gray-300">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
