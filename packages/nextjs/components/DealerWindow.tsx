import { useEffect, useRef } from "react";
import { useGameStore } from "../hooks/useGameStore";

export default function DealerWindow() {
  const logs = useGameStore((s) => s.logs);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      el.scrollLeft = el.scrollWidth;
    }
  }, [logs]);

  return (
    <div
      ref={containerRef}
      className="fixed left-4 bottom-4 w-64 bg-black/50 text-white rounded text-xs flex flex-row flex-nowrap space-x-2 overflow-x-auto overflow-y-hidden h-5 p-1 md:top-[60%] md:bottom-auto md:h-40 md:p-2 md:flex-col md:justify-end md:space-y-1 md:space-x-0 md:overflow-y-auto md:overflow-x-hidden"
    >
      {logs.map((msg, i) => (
        <div key={i} className="whitespace-nowrap">
          {msg}
        </div>
      ))}
    </div>
  );
}
