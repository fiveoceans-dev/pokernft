// src/hooks/useGameStore.ts
import { create } from "zustand";
import {
  GameEngine,
  cardToIndex,
  GameState as EnginePhase,
  PlayerState,
} from "../backend";
import type { Stage } from "../backend";
import { shortAddress } from "../utils/address";

/** Map Stage strings to numeric street indices used by the UI */
const stageToStreet: Record<Stage, number> = {
  waiting: 0,
  preflop: 0,
  flop: 1,
  turn: 2,
  river: 3,
  showdown: 4,
};

// Single in-memory engine used for local demo / frontend state
const engine = new GameEngine("local");

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
  /** state for each seat */
  playerStates: PlayerState[];
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

export const useGameStore = create<GameStoreState>((set, get) => {
  engine.on('phaseChanged', (phase: EnginePhase) => set({ phase }));
  engine.on('stateChanged', () => get().reloadTableState());
  engine.on('handStarted', () => get().addLog('Dealer: Hand started'));
  engine.on('stageChanged', (stage: Stage) => {
    const msg =
      stage === 'flop'
        ? 'Dealer: Flop dealt'
        : stage === 'turn'
        ? 'Dealer: Turn dealt'
        : stage === 'river'
        ? 'Dealer: River dealt'
        : '';
    if (msg) get().addLog(msg);
  });
  engine.on('handEnded', () => get().addLog('Dealer: Hand complete'));
  return {
  players: Array(9).fill(null),
  playerHands: Array(9).fill(null),
  community: Array(5).fill(null),
  chips: Array(9).fill(0),
  playerBets: Array(9).fill(0),
  playerStates: Array(9).fill(PlayerState.EMPTY),
  pot: 0,
  currentTurn: null,
  street: 0,
  phase: engine.getPhase(),
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
    const room = engine.getState();
    const seats = Array(9).fill(null) as (string | null)[];
    const hands = Array(9).fill(null) as ([number, number] | null)[];
    const chips = Array(9).fill(0) as number[];
    const bets = Array(9).fill(0) as number[];
    const states = Array(9).fill(PlayerState.EMPTY) as PlayerState[];
    room.players.forEach((p) => {
      seats[p.seat] = p.nickname;
      if (p.hand.length === 2) {
        hands[p.seat] = [cardToIndex(p.hand[0]), cardToIndex(p.hand[1])];
      }
      chips[p.seat] = p.chips;
      bets[p.seat] = p.currentBet;
      let state = PlayerState.ACTIVE;
      if (p.hasFolded) state = PlayerState.FOLDED;
      else if (p.chips === 0) state = PlayerState.ALL_IN;
      states[p.seat] = state;
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
      playerStates: states,
      pot: room.pot,
      currentTurn:
        room.players.length && room.players[room.currentTurnIndex]?.isTurn
          ? room.players[room.currentTurnIndex].seat
          : null,
      street: stageToStreet[room.stage],
      phase: engine.getPhase(),
      loading: false,
      error: null,
    });
  },

  /** Seat a player using the stored session address */
  joinSeat: async (seatIdx: number) => {
    const room = engine.getState();
    // prevent double seating
    if (room.players.some((p) => p.seat === seatIdx)) return;
    const id =
      typeof window !== "undefined" ? localStorage.getItem("sessionId") : null;
    const nickname = id ? shortAddress(id) : `Player ${seatIdx + 1}`;
    engine.addPlayer({
      id: id || `p${seatIdx}`,
      nickname,
      seat: seatIdx,
      chips: 10000,
    });
    await get().reloadTableState();
    get().addLog(`${nickname} joined`);
  },

  /** Deal new hole cards to all players */
  startHand: async () => {
    engine.startHand();
    await get().reloadTableState();
  },

  /** Reveal the flop (dev control) */
  dealFlop: async () => {
    if (engine.getState().stage === 'preflop') {
      engine.progressStage();
    }
  },

  /** Reveal the turn (dev control) */
  dealTurn: async () => {
    if (engine.getState().stage === 'flop') {
      engine.progressStage();
    }
  },

  /** Reveal the river (dev control) */
  dealRiver: async () => {
    if (engine.getState().stage === 'turn') {
      engine.progressStage();
    }
  },

  /** Apply a betting action for the current turn player */
  playerAction: async (action) => {
    const room = engine.getState();
    const current = room.players[room.currentTurnIndex];
    engine.handleAction(current.id, action);
    const acted = engine.getState().players.find((p) => p.id === current.id)!;
    let msg = '';
    switch (action.type) {
      case 'fold':
        msg = `${acted.nickname} folds`;
        break;
      case 'check':
        msg = `${acted.nickname} checks`;
        break;
      case 'call':
        msg = `${acted.nickname} calls ${acted.currentBet}`;
        break;
      case 'raise':
        msg = `${acted.nickname} bets ${action.amount ?? acted.currentBet}`;
        break;
    }
    get().addLog(msg);
  },
  };
});
