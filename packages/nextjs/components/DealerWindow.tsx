import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../hooks/useGameStore";
import useIsMobile from "../hooks/useIsMobile";

export default function DealerWindow() {
  const logs = useGameStore((s) => s.logs);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (isMobile && !expanded) return;
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      el.scrollLeft = el.scrollWidth;
    }
  }, [logs, isMobile, expanded]);

  const displayLogs = isMobile && !expanded ? logs.slice(-1) : logs;

  const base = `fixed left-4 ${isMobile ? "bottom-0" : "bottom-20"} w-64 bg-black/50 text-white rounded text-xs z-10 sm:scale-100 scale-[0.85]`;

  const collapsed = "h-5 p-1 overflow-hidden cursor-pointer flex items-center";
  const open = "h-24 p-2 overflow-y-auto flex flex-col justify-end space-y-1";

  return (
    <div
      ref={containerRef}
      className={`${base} ${isMobile && !expanded ? collapsed : open}`}
      onClick={() => isMobile && setExpanded((e) => !e)}
    >
      {displayLogs.map((msg, i) => (
        <div key={i} className="whitespace-nowrap">
          {msg}
        </div>
      ))}
    </div>
  );
}
