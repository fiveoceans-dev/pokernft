"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const slides = [
  {
    id: 0,
    title: "Next-gen poker lives on-Starknet",
    image: "/carousel/pokernfts1.png",
  },
  {
    id: 1,
    title: "Fair play isn't optional — it's built in.",
    image: "/carousel/pokernfts2.png",
  },
  {
    id: 2,
    title: "Every Hand Verified. Every Bet on Chain.",
    image: "/carousel/pokernfts3.png",
  },
  { id: 3, title: "Permissionless wins.", image: "/carousel/pokernfts4.png" },
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
    <section id="home" className="relative w-full aspect-[3/2] overflow-hidden">
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={s.image}
            alt={s.title}
            fill
            priority={i === index}
            className="object-cover scale-105 animate-parallax"
          />
        </div>
      ))}

      <div className="absolute inset-0 hero-overlay pointer-events-none animate-dream" />
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-6 md:px-12">
        <h1 className="text-3xl md:text-5xl font-bold mb-6">
          {slides[index].title}
        </h1>
        <a
          href="#games"
          className="px-8 py-4 text-sm rounded-full font-serif-renaissance bg-[var(--color-neon-yellow)] text-[#0c1a3a] shadow-[0_0_15px_var(--color-neon-yellow)] hover:bg-gradient-nav hover:text-white hover:shadow-none"
        >
          Play
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
              i === index ? "bg-[var(--color-neon-yellow)]" : "bg-white/50"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
