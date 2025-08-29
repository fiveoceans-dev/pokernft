import React from "react";

const message =
  "Solving fraud in online poker, much like Bitcoin solved fraud in banking!";

export default function MissionStatementSection() {
  return (
    <section className="py-2 text-accent">
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
