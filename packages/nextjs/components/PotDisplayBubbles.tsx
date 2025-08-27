import React from "react";

interface PotDisplayBubblesProps {
  currentRoundBetting: number;
  totalPot: number;
  isMobile?: boolean;
}

export function PotDisplayBubbles({ 
  currentRoundBetting, 
  totalPot, 
  isMobile = false 
}: PotDisplayBubblesProps) {
  const previousRoundsPot = totalPot - currentRoundBetting;
  
  // Only show bubbles if there are actual amounts to display
  const showCurrentRound = currentRoundBetting > 0;
  const showPreviousRounds = previousRoundsPot > 0;

  if (!showCurrentRound && !showPreviousRounds) {
    return null;
  }

  const bubbleClass = `
    px-3 py-1 rounded-full text-sm font-bold text-white border-2 border-white/30 shadow-lg
    flex items-center justify-center min-w-20 bg-white/20 backdrop-blur-sm
  `;

  return (
    <>
      {/* Top bubble - Previous rounds pot */}
      {showPreviousRounds && (
        <div 
          className="absolute top-10 left-1/2 -translate-x-1/2 z-10"
          style={{ transform: "translateX(-50%) translateY(-100%)" }}
        >
          <div className={bubbleClass}>
            <span className="text-xs mr-1">POT</span>
            <span>${previousRoundsPot}</span>
          </div>
        </div>
      )}

      {/* Bottom bubble - Current round betting */}
      {showCurrentRound && (
        <div 
          className="absolute top-20 left-1/2 -translate-x-1/2 z-10"
          style={{ transform: "translateX(-50%) translateY(100%)" }}
        >
          <div className={bubbleClass}>
            <span className="text-xs mr-1">BET</span>
            <span>${currentRoundBetting}</span>
          </div>
        </div>
      )}
    </>
  );
}