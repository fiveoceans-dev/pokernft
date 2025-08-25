// src/hooks/useGameStore.ts
import { create } from "zustand";
import {
  cardToIndex,
  PlayerState,
  type Stage,
  type ServerEvent,
  type ClientCommand,
} from "../backend";
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

let socket: WebSocket | null = null;

interface GameStoreState {
  players: (string | null)[];
  /** wallet addresses for each seated player */
  playerIds: (string | null)[];
  playerHands: ([number, number] | null)[];
  community: (number | null)[];
  chips: number[];
  playerBets: number[];
  playerStates: PlayerState[];
  /** which seat is the dealer */
  dealerIndex: number | null;
  pot: number;
  currentTurn: number | null;
  street: number;
  loading: boolean;
  error: string | null;
  logs: string[];
  addLog: (msg: string) => void;
  smallBlind: number;
  bigBlind: number;
  startBlindTimer: () => void;
  socket: WebSocket | null;
  /** connected wallet identifier if any */
  walletId: string | null;
  /** current table ID */
  tableId: string | null;
  /** game start countdown */
  gameStartCountdown: number | null;
  /** current player turn timer */
  actionCountdown: number | null;
  
  connectWallet: (address: string) => void;
  joinTable: (tableId: string) => void;
  createTable: (name: string) => Promise<void>;
  joinSeat: (seatIdx: number, tableId?: string) => Promise<void>;
  playerAction: (action: {
    type: "fold" | "call" | "raise" | "check";
    amount?: number;
  }) => Promise<void>;
  startHand: () => Promise<void>;
  dealFlop: () => Promise<void>;
  dealTurn: () => Promise<void>;
  dealRiver: () => Promise<void>;
  rebuy: (amount: number) => Promise<void>;
}

export const useGameStore = create<GameStoreState>((set, get) => {
  function applySnapshot(room: any) {
    const seats = Array(9).fill(null) as (string | null)[];
    const ids = Array(9).fill(null) as (string | null)[];
    const hands = Array(9).fill(null) as ([number, number] | null)[];
    const chips = Array(9).fill(0) as number[];
    const bets = Array(9).fill(0) as number[];
    const states = Array(9).fill(PlayerState.EMPTY) as PlayerState[];

    room.players?.forEach((p: any) => {
      seats[p.seat] = p.nickname ?? shortAddress(p.id);
      ids[p.seat] = p.id;
      if (p.hand?.length === 2) {
        hands[p.seat] = [cardToIndex(p.hand[0]), cardToIndex(p.hand[1])];
      }
      chips[p.seat] = p.chips ?? p.stack ?? 0;
      bets[p.seat] = p.currentBet ?? p.betThisRound ?? 0;
      let state = PlayerState.ACTIVE;
      if (p.hasFolded) state = PlayerState.FOLDED;
      else if ((p.chips ?? p.stack ?? 0) === 0) state = PlayerState.ALL_IN;
      states[p.seat] = p.state ?? state;
    });

    const comm = Array(5).fill(null) as (number | null)[];
    (room.communityCards ?? room.board ?? []).forEach((c: any, i: number) => {
      comm[i] = cardToIndex(c);
    });

    const pot =
      room.pot ??
      room.pots?.reduce((sum: number, pt: any) => sum + pt.amount, 0) ??
      0;

    set({
      players: seats,
      playerIds: ids,
      playerHands: hands,
      community: comm,
      chips,
      playerBets: bets,
      playerStates: states,
      dealerIndex: room.dealerIndex ?? null,
      pot,
      currentTurn:
        room.players?.length && room.players[room.currentTurnIndex]?.isTurn
          ? room.players[room.currentTurnIndex].seat
          : (room.actingIndex ?? null),
      street: stageToStreet[room.stage as Stage] ?? 0,
      loading: false,
      error: null,
      smallBlind: room.smallBlindAmount ?? get().smallBlind,
      bigBlind: room.bigBlindAmount ?? get().bigBlind,
    });
  }

  if (typeof window !== "undefined" && !socket) {
    socket = new WebSocket("ws://localhost:8080");
    socket.onopen = () => {
      // Check for Starknet wallet address from localStorage (set by CustomConnectButton)
      const starknetAddress = localStorage.getItem("sessionId");
      const walletAddress = localStorage.getItem("walletAddress");
      const address = starknetAddress || walletAddress;
      
      if (address) {
        const cmd: ClientCommand = {
          cmdId: crypto.randomUUID(),
          type: "ATTACH",
          userId: address,
        } as any;
        socket!.send(JSON.stringify(cmd));
        set({ walletId: address });
      }
    };
    socket.onmessage = (ev) => {
      try {
        const msg: ServerEvent = JSON.parse(ev.data as string);
        switch (msg.type) {
          case "SESSION":
            if (msg.userId) {
              localStorage.setItem("walletAddress", msg.userId);
              set({ walletId: msg.userId });
            }
            break;
          case "TABLE_CREATED":
            // Automatically join the table that was just created
            set({ tableId: msg.table.id });
            get().addLog(`Created table: ${msg.table.name}`);
            break;
          case "TABLE_SNAPSHOT":
            applySnapshot(msg.table as any);
            // Don't auto-seat - let the user choose their seat manually
            break;
          case "PLAYER_JOINED":
            set((s) => {
              const arr = [...s.players];
              const ids = [...s.playerIds];
              arr[msg.seat] = shortAddress(msg.playerId);
              ids[msg.seat] = msg.playerId;
              return { players: arr, playerIds: ids };
            });
            get().addLog(`${shortAddress(msg.playerId)} joined`);
            break;
          case "PLAYER_LEFT":
            set((s) => {
              const arr = [...s.players];
              const ids = [...s.playerIds];
              arr[msg.seat] = null;
              ids[msg.seat] = null;
              const states = [...s.playerStates];
              states[msg.seat] = PlayerState.EMPTY;
              return { players: arr, playerIds: ids, playerStates: states };
            });
            get().addLog(`${shortAddress(msg.playerId)} left`);
            break;
          case "PLAYER_DISCONNECTED":
            set((s) => {
              const arr = [...s.playerStates];
              arr[msg.seat] = PlayerState.DISCONNECTED;
              return { playerStates: arr };
            });
            get().addLog(`${shortAddress(msg.playerId)} disconnected`);
            break;
          case "PLAYER_REJOINED":
            set((s) => {
              const states = [...s.playerStates];
              states[msg.seat] = PlayerState.ACTIVE;
              const names = [...s.players];
              const ids = [...s.playerIds];
              if (!names[msg.seat])
                names[msg.seat] = shortAddress(msg.playerId);
              ids[msg.seat] = msg.playerId;
              return { playerStates: states, players: names, playerIds: ids };
            });
            get().addLog(`${shortAddress(msg.playerId)} rejoined`);
            break;
          case "ACTION_PROMPT":
            set({ currentTurn: msg.actingIndex });
            break;
          case "PLAYER_ACTION_APPLIED": {
            const name = shortAddress(msg.playerId);
            let text = ``;
            switch (msg.action) {
              case "FOLD":
                text = `${name} folds`;
                break;
              case "CHECK":
                text = `${name} checks`;
                break;
              case "CALL":
                text = `${name} calls ${msg.amount ?? ""}`.trim();
                break;
              case "BET":
              case "RAISE":
              case "ALL_IN":
                text = `${name} ${msg.action.toLowerCase()} ${
                  msg.amount ?? ""
                }`.trim();
                break;
            }
            if (text) get().addLog(text);
            break;
          }
          case "DEAL_FLOP":
            set((s) => {
              const comm = [...s.community];
              msg.cards.forEach((c, i) => (comm[i] = cardToIndex(c)));
              return { community: comm };
            });
            break;
          case "DEAL_TURN":
            set((s) => {
              const comm = [...s.community];
              comm[3] = cardToIndex(msg.card);
              return { community: comm };
            });
            break;
          case "DEAL_RIVER":
            set((s) => {
              const comm = [...s.community];
              comm[4] = cardToIndex(msg.card);
              return { community: comm };
            });
            break;
          case "HAND_START":
            get().addLog("Dealer: Hand started");
            break;
          case "HAND_END":
            get().addLog("Dealer: Hand complete");
            break;
          case "ROUND_END":
            break;
          case "GAME_START_COUNTDOWN":
            set({ gameStartCountdown: msg.countdown });
            if (msg.countdown === 0) {
              set({ gameStartCountdown: null });
            }
            break;
          case "ACTION_TIMEOUT":
            set({ actionCountdown: msg.countdown });
            if (msg.countdown === 0) {
              set({ actionCountdown: null });
            }
            break;
          case "ERROR":
            set({ error: msg.msg });
            break;
        }
      } catch {
        /* ignore malformed */
      }
    };
    set({ socket });
  }

  return {
    players: Array(9).fill(null),
    playerIds: Array(9).fill(null),
    playerHands: Array(9).fill(null),
    community: Array(5).fill(null),
    chips: Array(9).fill(0),
    playerBets: Array(9).fill(0),
    playerStates: Array(9).fill(PlayerState.EMPTY),
    dealerIndex: null,
    pot: 0,
    currentTurn: null,
    street: 0,
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
      setTimeout(
        function tick() {
          increase();
          setTimeout(tick, 10 * 60 * 1000);
        },
        10 * 60 * 1000,
      );
    },
    socket,
    walletId:
      typeof window !== "undefined"
        ? localStorage.getItem("sessionId") || localStorage.getItem("walletAddress")
        : null,
    tableId: null,
    gameStartCountdown: null,
    actionCountdown: null,

    connectWallet: (address: string) => {
      set({ walletId: address });
      // Attach to WebSocket if connected
      if (socket && socket.readyState === WebSocket.OPEN) {
        const cmd: ClientCommand = {
          cmdId: crypto.randomUUID(),
          type: "ATTACH",
          userId: address,
        } as any;
        socket.send(JSON.stringify(cmd));
      }
    },

    joinTable: (tableId: string) => {
      set({ tableId });
    },

    createTable: async (name: string) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const cmd: ClientCommand = {
          cmdId: crypto.randomUUID(),
          type: "CREATE_TABLE",
          name,
        } as ClientCommand;
        socket.send(JSON.stringify(cmd));
      }
    },

    joinSeat: async (seatIdx: number, tableId?: string) => {
      const currentTableId = tableId || get().tableId;
      if (!currentTableId) {
        set({ error: "No table selected" });
        return;
      }
      if (socket && socket.readyState === WebSocket.OPEN) {
        const cmd: ClientCommand = {
          cmdId: crypto.randomUUID(),
          type: "SIT",
          tableId: currentTableId,
          seat: seatIdx,
          buyIn: 10000,
        } as ClientCommand;
        socket.send(JSON.stringify(cmd));
      }
    },

    startHand: async () => {},
    dealFlop: async () => {},
    dealTurn: async () => {},
    dealRiver: async () => {},

    playerAction: async (action) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const map: Record<string, string> = {
          fold: "FOLD",
          call: "CALL",
          raise: "RAISE",
          check: "CHECK",
        };
        const cmd: ClientCommand = {
          cmdId: crypto.randomUUID(),
          type: "ACTION",
          action: map[action.type] as any,
          amount: action.amount,
        };
        socket.send(JSON.stringify(cmd));
      }
    },

    rebuy: async (amount: number) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const cmd: ClientCommand = {
          cmdId: crypto.randomUUID(),
          type: "REBUY",
          amount,
        };
        socket.send(JSON.stringify(cmd));
      }
    },
  };
});
