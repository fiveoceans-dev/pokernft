// src/hooks/useGameStore.ts
import { create } from "zustand";
import {
  createRoom,
  addPlayer,
  startHand as startHandGame,
  progressStage,
} from "../game/room";
import { cardToIndex } from "../game/utils";
import type { Stage } from "../game/types";

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

interface GameState {
  /** player nicknames occupying each of the 9 seats */
  players: (string | null)[];
  /** optional hole cards for each seat represented as numeric codes */
  playerHands: ([number, number] | null)[];
  /** community card codes (0..51) */
  community: (number | null)[];
  /** preflop=0, flop=1, turn=2, river=3, showdown=4 */
  street: number;
  loading: boolean;
  error: string | null;

  // Actions --------------------------------------------------------------
  reloadTableState: () => Promise<void>;
  joinSeat: (seatIdx: number) => Promise<void>;
  startHand: () => Promise<void>;
  dealFlop: () => Promise<void>;
  dealTurn: () => Promise<void>;
  dealRiver: () => Promise<void>;
}

export const useGameStore = create<GameState>((set, get) => ({
  players: Array(9).fill(null),
  playerHands: Array(9).fill(null),
  community: Array(5).fill(null),
  street: 0,
  loading: false,
  error: null,

  /** Sync Zustand state from the current room object */
  reloadTableState: async () => {
    const seats = Array(9).fill(null) as (string | null)[];
    const hands = Array(9).fill(null) as ([number, number] | null)[];
    room.players.forEach((p) => {
      seats[p.seat] = p.nickname;
      if (p.hand.length === 2) {
        hands[p.seat] = [cardToIndex(p.hand[0]), cardToIndex(p.hand[1])];
      }
    });

    const comm = Array(5).fill(null) as (number | null)[];
    room.communityCards.forEach((c, i) => {
      comm[i] = cardToIndex(c);
    });

    set({
      players: seats,
      playerHands: hands,
      community: comm,
      street: stageToStreet[room.stage],
      loading: false,
      error: null,
    });
  },

  /** Seat a demo player at the given index and auto-start if enough players */
  joinSeat: async (seatIdx: number) => {
    // prevent double seating
    if (room.players.some((p) => p.seat === seatIdx)) return;
    addPlayer(room, {
      id: `p${seatIdx}`,
      nickname: `Player ${seatIdx + 1}`,
      seat: seatIdx,
      chips: 1000,
    });
    await get().reloadTableState();
    if (room.players.length >= 2 && room.stage === "waiting") {
      startHandGame(room);
      await get().reloadTableState();
    }
  },

  /** Deal new hole cards to all players */
  startHand: async () => {
    startHandGame(room);
    await get().reloadTableState();
  },

  /** Reveal the flop */
  dealFlop: async () => {
    if (room.stage === "preflop") {
      progressStage(room);
      await get().reloadTableState();
    }
  },

  /** Reveal the turn */
  dealTurn: async () => {
    if (room.stage === "flop") {
      progressStage(room);
      await get().reloadTableState();
    }
  },

  /** Reveal the river */
  dealRiver: async () => {
    if (room.stage === "turn") {
      progressStage(room);
      await get().reloadTableState();
    }
  },
}));
