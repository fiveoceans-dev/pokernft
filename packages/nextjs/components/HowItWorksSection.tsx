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
    <section
      id="how"
      className="py-12 px-4 sm:px-6 md:px-12 bg-white text-gray-900 dark:bg-gray-900 dark:text-white flex flex-col md:flex-row items-center gap-8"
    >
      <div className="w-full md:w-1/2">
        <video
          controls
          className="w-full rounded-lg shadow-lg"
          src="https://www.w3schools.com/html/mov_bbb.mp4"
        />
      </div>
      <div className="w-full md:w-1/2">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">How It Works</h2>
        <div className="relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-300 dark:bg-gray-700" />
          <div className="flex justify-between relative">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center text-center w-1/5"
              >
                <div className="w-8 h-8 rounded-full bg-[#8a45fc] text-white flex items-center justify-center z-10">
                  {idx + 1}
                </div>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
