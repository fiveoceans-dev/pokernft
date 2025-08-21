import { useEffect, useState } from "react";
import { useGameStore } from "./useGameStore";

// TODO: persist session tokens and auto-reconnect (Action Plan 1.3)

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

  const handStarted = playerHands.some((h) => h !== null);
  const activePlayers = players.filter(Boolean).length;

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
  };
}
