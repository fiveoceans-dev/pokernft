/**
 * StayTunedSection – social‑follow banner with neon glow + diagonal separator.
 * TailwindCSS utilities and react‑icons assumed.
 */
export default function StayTunedSection() {
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
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="w-full aspect-square overflow-hidden rounded-lg bg-black/30 border border-white/10">
              <img
                src="/debug-image.png"
                alt={`Community highlight ${i + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* No social links; gallery uses placeholder images */
