import React from "react";

const steps = [
  "Connect your wallet",
  "Join a table",
  "Get your cards",
  "Play the rounds",
  "Win the pot",
];

export default function HowItWorksSection() {
  return (
    <section className="bg-black text-white py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          Create Your Own <span className="text-yellow-400">POKER</span>{" "}
          Tournament
        </h2>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg transition-transform hover:scale-105 hover:shadow-lg">
            <h3 className="text-xl font-semibold mb-2">🎨 Create an NFT</h3>
            <p>
              Upload your own artwork. This NFT will represent your tournament
              entry ticket.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg transition-transform hover:scale-105 hover:shadow-lg">
            <h3 className="text-xl font-semibold mb-2">
              💰 Set Price, Supply & Date
            </h3>
            <p>
              Choose your buy-in price, total supply, and tournament start date.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg transition-transform hover:scale-105 hover:shadow-lg">
            <h3 className="text-xl font-semibold mb-2">
              🛒 Bring Your Followers
            </h3>
            <p>
              Share and sell your NFT to your community. Each buyer gets a seat
              at the table!
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg transition-transform hover:scale-105 hover:shadow-lg">
            <h3 className="text-xl font-semibold mb-2">
              ♠️ Protocol Spins Up a Table
            </h3>
            <p>
              Once funded, the protocol automatically launches a secure onchain
              poker game.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg transition-transform hover:scale-105 hover:shadow-lg">
            <h3 className="text-xl font-semibold mb-2">📈 Fund Distribution</h3>
            <p>
              Funds split: <span className="text-yellow-400">80%</span> prizes,{" "}
              <span className="text-blue-400">10%</span> creator,{" "}
              <span className="text-pink-400">10%</span> protocol.
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg transition-transform hover:scale-105 hover:shadow-lg">
            <h3 className="text-xl font-semibold mb-2">
              🏆 Win Prizes & $POKER Airdrop
            </h3>
            <p>
              Top 15% win prize money and get a bonus airdrop of $POKER tokens.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
