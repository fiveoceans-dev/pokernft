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
          <span className="text-yellow-400">Solving fraud in online poker, much like Bitcoin solved fraud in banking!</span>
        </h2>
      </div>
    </section>

  );
}
