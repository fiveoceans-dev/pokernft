// src/hooks/useGameStore.ts
import { create } from "zustand";
import {
  createRoom,
  addPlayer,
  startHand as startHandGame,
  progressStage,
  handleAction,
  determineWinners,
  payout,
  isRoundComplete,
  cardToIndex,
  PokerStateMachine,
  GameState as EnginePhase,
} from "@ss-2/backend";
import type { Stage } from "@ss-2/backend";

/** Map Stage strings to numeric street indices used by the UI */
const stageToStreet: Record<Stage, number> = {
  waiting: 0,
  preflop: 0,
  flop: 1,
  turn: 2,
  river: 3,
  showdown: 4,
};

// Single in-memory room used for local demo / frontend state
const room = createRoom("local");
const machine = new PokerStateMachine();

interface GameStoreState {
  /** player nicknames occupying each of the 9 seats */
  players: (string | null)[];
  /** optional hole cards for each seat represented as numeric codes */
  playerHands: ([number, number] | null)[];
  /** community card codes (0..51) */
  community: (number | null)[];
  /** chips for each seat */
  chips: number[];
  /** current bet for each seat */
  playerBets: number[];
  /** total chips in the pot */
  pot: number;
  /** seat index whose turn it is, or null */
  currentTurn: number | null;
  /** preflop=0, flop=1, turn=2, river=3, showdown=4 */
  street: number;
  /** high-level engine phase */
  phase: EnginePhase;
  loading: boolean;
  error: string | null;
  /** dealer / action log */
  logs: string[];
  addLog: (msg: string) => void;

  /** small and big blind amounts */
  smallBlind: number;
  bigBlind: number;
  startBlindTimer: () => void;

  // Actions --------------------------------------------------------------
  reloadTableState: () => Promise<void>;
  joinSeat: (seatIdx: number) => Promise<void>;
  startHand: () => Promise<void>;
  dealFlop: () => Promise<void>;
  dealTurn: () => Promise<void>;
  dealRiver: () => Promise<void>;
  playerAction: (action: {
    type: "fold" | "call" | "raise" | "check";
    amount?: number;
  }) => Promise<void>;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  players: Array(9).fill(null),
  playerHands: Array(9).fill(null),
  community: Array(5).fill(null),
  chips: Array(9).fill(0),
  playerBets: Array(9).fill(0),
  pot: 0,
  currentTurn: null,
  street: 0,
  phase: machine.state,
  loading: false,
  error: null,
  logs: [],
  addLog: (msg) => set((s) => ({ logs: [...s.logs, msg] })),
  smallBlind: 25,
  bigBlind: 50,
  startBlindTimer: () => {
    const increase = () =>
      set((s) => ({
        smallBlind: s.smallBlind * 2,
        bigBlind: s.bigBlind * 2,
      }));
    setTimeout(function tick() {
      increase();
      setTimeout(tick, 10 * 60 * 1000);
    }, 10 * 60 * 1000);
  },

  /** Sync Zustand state from the current room object */
  reloadTableState: async () => {
    const seats = Array(9).fill(null) as (string | null)[];
    const hands = Array(9).fill(null) as ([number, number] | null)[];
    const chips = Array(9).fill(0) as number[];
    const bets = Array(9).fill(0) as number[];
    room.players.forEach((p) => {
      seats[p.seat] = p.nickname;
      if (p.hand.length === 2) {
        hands[p.seat] = [cardToIndex(p.hand[0]), cardToIndex(p.hand[1])];
      }
      chips[p.seat] = p.chips;
      bets[p.seat] = p.currentBet;
    });

    const comm = Array(5).fill(null) as (number | null)[];
    room.communityCards.forEach((c, i) => {
      comm[i] = cardToIndex(c);
    });

    set({
      players: seats,
      playerHands: hands,
      community: comm,
      chips,
      playerBets: bets,
      pot: room.pot,
      currentTurn: room.players.length ? room.players[room.currentTurnIndex].seat : null,
      street: stageToStreet[room.stage],
      phase: machine.state,
      loading: false,
      error: null,
    });
  },

  /** Seat a demo player at the given index */
  joinSeat: async (seatIdx: number) => {
    // prevent double seating
    if (room.players.some((p) => p.seat === seatIdx)) return;
    addPlayer(room, {
      id: `p${seatIdx}`,
      nickname: `Player ${seatIdx + 1}`,
      seat: seatIdx,
      chips: 10000,
    });
    await get().reloadTableState();
    get().addLog(`Player ${seatIdx + 1} joined`);
  },

  /** Deal new hole cards to all players */
  startHand: async () => {
    const live = room.players.filter((p) => !p.hasFolded).length;
    if (machine.state !== EnginePhase.WaitingForPlayers) {
      machine.dispatch({ type: "BETTING_COMPLETE", remainingPlayers: live });
      machine.dispatch({ type: "SHOWDOWN_COMPLETE" });
      machine.dispatch({ type: "PAYOUT_COMPLETE" });
    }
    machine.dispatch({ type: "PLAYERS_READY" });
    machine.dispatch({ type: "SHUFFLE_COMPLETE" });
    startHandGame(room);
    machine.dispatch({ type: "DEAL_COMPLETE" });
    await get().reloadTableState();
    get().addLog("Hand started");
  },

  /** Reveal the flop */
  dealFlop: async () => {
    if (room.stage === "preflop") {
      machine.dispatch({
        type: "BETTING_COMPLETE",
        remainingPlayers: room.players.filter((p) => !p.hasFolded).length,
      });
      progressStage(room);
      machine.dispatch({ type: "DEAL_COMPLETE" });
      await get().reloadTableState();
      get().addLog("Flop dealt");
    }
  },

  /** Reveal the turn */
  dealTurn: async () => {
    if (room.stage === "flop") {
      machine.dispatch({
        type: "BETTING_COMPLETE",
        remainingPlayers: room.players.filter((p) => !p.hasFolded).length,
      });
      progressStage(room);
      machine.dispatch({ type: "DEAL_COMPLETE" });
      await get().reloadTableState();
      get().addLog("Turn dealt");
    }
  },

  /** Reveal the river */
  dealRiver: async () => {
    if (room.stage === "turn") {
      machine.dispatch({
        type: "BETTING_COMPLETE",
        remainingPlayers: room.players.filter((p) => !p.hasFolded).length,
      });
      progressStage(room);
      machine.dispatch({ type: "DEAL_COMPLETE" });
      await get().reloadTableState();
      get().addLog("River dealt");
    }
  },

  /** Apply a betting action for the current turn player */
  playerAction: async (action) => {
    const current = room.players[room.currentTurnIndex];
    handleAction(room, current.id, action);
    await get().reloadTableState();
    get().addLog(`${current.nickname} ${action.type}`);
    if (isRoundComplete(room)) {
      const remaining = room.players.filter((p) => !p.hasFolded).length;
      machine.dispatch({ type: "BETTING_COMPLETE", remainingPlayers: remaining });
      if (remaining <= 1) {
        const winners = room.players.filter((p) => !p.hasFolded);
        payout(room, winners);
        machine.dispatch({ type: "PAYOUT_COMPLETE" });
        room.stage = "waiting";
      } else if (room.stage === "river") {
        progressStage(room); // move to showdown
        const winners = determineWinners(room);
        machine.dispatch({ type: "SHOWDOWN_COMPLETE" });
        payout(room, winners);
        machine.dispatch({ type: "PAYOUT_COMPLETE" });
        room.stage = "waiting";
      } else {
        progressStage(room);
        machine.dispatch({ type: "DEAL_COMPLETE" });
      }
      await get().reloadTableState();
    }
  },
}));
