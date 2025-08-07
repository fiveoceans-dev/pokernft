import React from "react";

const message =
  "Solving fraud in online poker, much like Bitcoin solved fraud in banking!";

export default function MissionStatementSection() {
  return (
    <section className="bg-gradient-to-r from-secondary/20 via-black to-secondary/20 text-white py-6 overflow-hidden">
      <div className="whitespace-nowrap">
        <div className="animate-marquee inline-block text-lg tracking-wide">
          <span className="mx-8">{message}</span>
          <span className="mx-8">{message}</span>
          <span className="mx-8">{message}</span>
          <span className="mx-8">{message}</span>
        </div>
      </div>
    </section>
  );
}
