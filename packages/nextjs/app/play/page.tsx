"use client";

// Play poker interface with wallet connect

import { useEffect, useState } from "react";
import Table from "../../components/Table";
import AnimatedTitle from "../../components/AnimatedTitle";
import DealerWindow from "../../components/DealerWindow";
import { CustomConnectButton } from "../../components/scaffold-stark/CustomConnectButton";
import ActionBar from "../../components/ActionBar";
import { useGameStore } from "../../hooks/useGameStore";

export default function PlayPage() {
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

  const stageNames = ["preflop", "flop", "turn", "river", "showdown"] as const;
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

  return (
    <main
      className="relative h-screen flex flex-col text-white bg-main overflow-hidden"
      style={{
        backgroundImage: "url('/nfts/nft2.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <header className="relative w-full flex items-center mt-6 mb-4 px-4">
        <AnimatedTitle text="Poker Night on Starknet" />
        <div className="flex flex-1 items-center justify-end gap-4">
          <CustomConnectButton />
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center">
        <Table timer={timer} />
      </div>
      <DealerWindow />
      <div
        id="action-buttons"
        className="fixed bottom-0 right-0 flex justify-end p-4 z-10"
      >
        <ActionBar
          street={stageNames[street] ?? "preflop"}
          onActivate={handleActivate}
          onFlop={dealFlop}
          onTurn={dealTurn}
          onRiver={dealRiver}
          hasHandStarted={handStarted}
        />
      </div>
    </main>
  );
}
