"use client";

import { useEffect, useState } from "react";

const slides = [
  { id: 0, title: "Featured NFT 1", image: "/nft.png" },
  { id: 1, title: "Featured NFT 2", image: "/nft-art.png" },
  { id: 2, title: "Featured NFT 3", image: "/poker.png" },
];

/**
 * HeroSection – simple carousel inspired by Rarible's hero.
 */
export default function HeroSection() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      5000,
    );
    return () => clearInterval(id);
  }, []);

  const next = () => setIndex((index + 1) % slides.length);
  const prev = () => setIndex((index - 1 + slides.length) % slides.length);

  return (
    <section className="relative h-[60vh] md:h-[70vh] overflow-hidden">
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={s.image}
            alt={s.title}
            className="w-full h-full object-cover"
          />

        </div>
      ))}

      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 h-full flex flex-col justify-center items-start px-6 md:px-12 text-white">
        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          {slides[index].title}
        </h1>
        <a
          href="/#mint"
          className="px-6 py-3 bg-yellow-400 text-[#0c1a3a] font-semibold rounded-lg shadow hover:bg-yellow-300 transition-colors"
        >
          Buy NFT
        </a>
      </div>

      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 rounded-full p-2 text-white hover:bg-black/60"
        aria-label="Previous slide"
      >
        ‹
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/40 rounded-full p-2 text-white hover:bg-black/60"
        aria-label="Next slide"
      >
        ›
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-3 h-3 rounded-full ${
              i === index ? "bg-yellow-400" : "bg-white/50"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

