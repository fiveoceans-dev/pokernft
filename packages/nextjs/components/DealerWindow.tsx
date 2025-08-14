import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "../hooks/useGameStore";

export default function DealerWindow() {
  const logs = useGameStore((s) => s.logs);
  const containerRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);

  const updatePosition = useCallback(() => {
    const el = containerRef.current;
    const actions = document.getElementById("action-buttons");
    if (el && actions) {
      const actionTop = actions.getBoundingClientRect().top;
      setTop(Math.max(actionTop - el.offsetHeight - 8, 0));
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      el.scrollLeft = el.scrollWidth;
    }
    updatePosition();
  }, [logs, updatePosition]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [updatePosition]);

  return (
    <div
      ref={containerRef}
      style={{ top }}
      className="fixed left-4 w-64 bg-black/50 text-white rounded text-xs flex flex-row flex-nowrap space-x-2 overflow-x-auto overflow-y-hidden h-5 p-1 md:h-40 md:p-2 md:flex-col md:justify-end md:space-y-1 md:space-x-0 md:overflow-y-auto md:overflow-x-hidden"
    >
      {logs.map((msg, i) => (
        <div key={i} className="whitespace-nowrap">
          {msg}
        </div>
      ))}
    </div>
  );
}
