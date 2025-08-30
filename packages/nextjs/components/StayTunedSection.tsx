import { getRecentHighlights } from "../data/highlights";

/**
 * StayTunedSection – social‑follow banner with neon glow + diagonal separator.
 * TailwindCSS utilities and react‑icons assumed.
 */
export default function StayTunedSection() {
  const recentHighlights = getRecentHighlights(9);

  return (
    <section
      id="community"
      className="relative py-8 overflow-hidden text-white"
    >
      {/* subtle radial glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-800/10 via-indigo-600/10 to-purple-700/10 rounded-[40%] blur-[180px] -z-10" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-wide text-accent">
          Highlights & Community
        </h2>
        <p className="max-w-xl mx-auto mt-4 text-slate-300">
          Highlight reels, testimonials and more. Join our community to keep the
          action going.
        </p>

        {/* 3x3 photo gallery */}
        <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {recentHighlights.map((highlight) => (
            <div 
              key={highlight.id} 
              className="w-full aspect-square overflow-hidden rounded-lg bg-black/30 border border-white/10 group cursor-pointer hover:border-accent/50 transition-all duration-300 relative"
              title={highlight.description}
            >
              <img
                src={highlight.image}
                alt={highlight.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                <div className="text-left">
                  <h3 className="text-sm font-semibold text-white mb-1">{highlight.title}</h3>
                  <p className="text-xs text-gray-300 capitalize">{highlight.type}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* No social links; gallery uses placeholder images */
