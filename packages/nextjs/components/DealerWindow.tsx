import { useGameStore } from "../hooks/useGameStore";

export default function DealerWindow() {
  const logs = useGameStore((s) => s.logs);
  return (
    <div className="fixed bottom-4 left-4 w-64 h-40 bg-black/50 text-white p-2 rounded overflow-y-auto text-xs space-y-1">
      {logs.map((msg, i) => (
        <div key={i}>{msg}</div>
      ))}
    </div>
  );
}
