import React from "react";

interface SparkleEffectProps {
  isActive: boolean;
  children: React.ReactNode;
}

export function SparkleEffect({ isActive, children }: SparkleEffectProps) {
  if (!isActive) {
    return <>{children}</>;
  }

  // Generate sparkle positions around the element
  const sparkles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 45) * (Math.PI / 180); // Convert to radians
    const radius = 25 + Math.random() * 10; // Slight randomization
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const delay = Math.random() * 2; // Random animation delay
    
    return {
      id: i,
      x,
      y,
      delay,
      scale: 0.8 + Math.random() * 0.4, // Random size variation
    };
  });

  return (
    <div className="relative">
      {/* Original content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Sparkles */}
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute w-2 h-2 pointer-events-none z-20"
          style={{
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) translate(${sparkle.x}px, ${sparkle.y}px) scale(${sparkle.scale})`,
            animationDelay: `${sparkle.delay}s`,
          }}
        >
          <div className="w-full h-full bg-yellow-300 rounded-full animate-ping shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 to-yellow-400 rounded-full animate-pulse" />
          </div>
        </div>
      ))}
      
      {/* Additional glow effect */}
      <div className="absolute inset-0 rounded-full animate-pulse bg-yellow-300/20 blur-sm pointer-events-none" />
    </div>
  );
}