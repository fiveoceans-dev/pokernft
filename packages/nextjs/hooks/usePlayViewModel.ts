import { useEffect, useState } from "react";
import { useGameStore } from "./useGameStore";

/**
 * Persist a session token from the backend websocket and attempt to reattach on reload.
 */
const stageNames = ["preflop", "flop", "turn", "river", "showdown"] as const;

export function usePlayViewModel() {
  const {
    street,
    startHand,
    dealFlop,
    dealTurn,
    dealRiver,
    playerHands,
    players,
    startBlindTimer,
  } = useGameStore();
  const [timer, setTimer] = useState<number | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handStarted = playerHands.some((h) => h !== null);
  const activePlayers = players.filter(Boolean).length;

  // establish websocket connection and persist session token
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("sessionId") : null;
    const ws = new WebSocket("ws://localhost:8080");
    ws.onopen = () => {
      if (stored) {
        ws.send(
          JSON.stringify({
            cmdId: crypto.randomUUID(),
            type: "ATTACH",
            sessionId: stored,
          }),
        );
      }
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string);
        if (msg.type === "SESSION" && msg.userId) {
          setSessionId(msg.userId);
          localStorage.setItem("sessionId", msg.userId);
        }
      } catch {
        /* ignore malformed */
      }
    };
    setSocket(ws);
    return () => ws.close();
  }, []);

  useEffect(() => {
    const originalBody = document.body.style.overflow;
    const originalHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalBody;
      document.documentElement.style.overflow = originalHtml;
    };
  }, []);

  useEffect(() => {
    startBlindTimer();
  }, [startBlindTimer]);

  useEffect(() => {
    if (activePlayers >= 2 && !handStarted && timer === null) {
      setTimer(10);
    }
  }, [activePlayers, handStarted, timer]);

  useEffect(() => {
    if (timer === null || handStarted) return;
    if (timer === 0) {
      startHand();
      setTimer(null);
      return;
    }
    const id = setTimeout(() => setTimer((t) => (t as number) - 1), 1000);
    return () => clearTimeout(id);
  }, [timer, handStarted, startHand]);

  const handleActivate = async () => {
    setTimer(null);
    await startHand();
  };

  return {
    street,
    dealFlop,
    dealTurn,
    dealRiver,
    timer,
    stageNames,
    handStarted,
    handleActivate,
    socket,
    sessionId,
  };
}
