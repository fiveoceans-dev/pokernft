import React from "react";

const message =
  "Solving fraud in online poker, much like Bitcoin solved fraud in banking!";

export default function MissionStatementSection() {
  return (
    <section className="bg-black text-white py-4 overflow-hidden">
      <div className="whitespace-nowrap">
        <div className="animate-marquee inline-block">
          <span className="mx-8">{message}</span>
          <span className="mx-8">{message}</span>
          <span className="mx-8">{message}</span>
          <span className="mx-8">{message}</span>
        </div>
      </div>
    </section>
  );
}
