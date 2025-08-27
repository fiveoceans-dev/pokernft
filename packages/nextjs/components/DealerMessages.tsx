import React from "react";

interface DealerMessagesProps {
  logs: string[];
  isMobile?: boolean;
}

export function DealerMessages({ logs, isMobile = false }: DealerMessagesProps) {
  // Show only the last few messages
  const recentLogs = logs.slice(-3);

  if (recentLogs.length === 0) {
    return null;
  }

  const containerClass = `
    absolute bottom-4 left-4 z-10
    ${isMobile ? 'max-w-48' : 'max-w-64'}
    bg-black/80 text-white text-sm rounded-lg p-3 shadow-lg
    border border-gray-600
  `;

  return (
    <div className={containerClass}>
      <div className="space-y-1">
        {recentLogs.map((log, index) => (
          <div 
            key={index}
            className="leading-tight break-words"
            style={{ 
              wordWrap: "break-word", 
              overflowWrap: "break-word",
              hyphens: "auto"
            }}
          >
            {log}
          </div>
        ))}
      </div>
    </div>
  );
}