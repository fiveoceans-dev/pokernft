// src/hooks/useGameStore.ts
import { create } from "zustand";
import {
  cardToIndex,
  PlayerState,
  type Stage,
  type ServerEvent,
  type ClientCommand,
} from "../game-engine";
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
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectTimeout: NodeJS.Timeout | null = null;

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
  /** current connected wallet address - single source of truth */
  currentWalletId: string | null;
  /** map of tableId to seatIndex for multi-table support */
  tableSeats: Map<string, number>;
  /** current table ID */
  tableId: string | null;
  /** unified countdown timer from server */
  timer: number | null;
  /** WebSocket connection state */
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  /** Connection error message */
  connectionError: string | null;
  
  connectWallet: (address: string) => void;
  handleDisconnect: () => Promise<void>;
  joinTable: (tableId: string) => void;
  createTable: (name: string) => Promise<void>;
  joinSeat: (seatIdx: number, tableId?: string) => Promise<void>;
  leaveSeat: (tableId?: string) => Promise<void>;
  leaveAllTables: () => Promise<void>;
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
    console.log("📸 Applying TABLE_SNAPSHOT:", {
      playersCount: room.players?.length || 0,
      players: room.players?.map((p: any) => ({ seat: p.seat, id: p.id?.slice(0, 10) + "..." })) || [],
      stage: room.stage
    });

    const seats = Array(9).fill(null) as (string | null)[];
    const ids = Array(9).fill(null) as (string | null)[];
    const hands = Array(9).fill(null) as ([number, number] | null)[];
    const chips = Array(9).fill(0) as number[];
    const bets = Array(9).fill(0) as number[];
    const states = Array(9).fill(PlayerState.EMPTY) as PlayerState[];

    room.players?.forEach((p: any) => {
      // Use wallet address as player name for consistency
      seats[p.seat] = p.id;
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
      
      console.log(`👤 Player ${p.seat}: ${p.id?.slice(0, 10)}... (${chips[p.seat]} chips, state: ${state})`);
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

  const connectWebSocket = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log("🔗 WebSocket already connected");
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
    console.log(`🔗 Connecting to WebSocket: ${wsUrl} (attempt ${reconnectAttempts + 1})`);
    
    set({ connectionState: 'connecting', connectionError: null });
    
    try {
      socket = new WebSocket(wsUrl);
      
      const connectionTimeout = setTimeout(() => {
        if (socket && socket.readyState !== WebSocket.OPEN) {
          console.error("🚫 WebSocket connection timeout");
          socket.close();
          set({ connectionState: 'disconnected', connectionError: 'Connection timeout' });
          scheduleReconnect();
        }
      }, 10000);

      socket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log("✅ WebSocket connected successfully");
        reconnectAttempts = 0;
        set({ connectionState: 'connected', connectionError: null });
        
        // Use single consistent wallet address source - prioritize walletAddress over sessionId
        const walletAddress = localStorage.getItem("walletAddress");
        const sessionAddress = localStorage.getItem("sessionId");
        const address = walletAddress || sessionAddress;
        
        console.log("🔍 Checking for stored addresses:", { walletAddress, sessionAddress, finalAddress: address });
        
        if (address) {
          try {
            const cmd: ClientCommand = {
              cmdId: crypto.randomUUID(),
              type: "ATTACH",
              userId: address,
            } as any;
            socket!.send(JSON.stringify(cmd));
            console.log("📤 Sent ATTACH command with userId:", address);
            set({ currentWalletId: address });
          } catch (error) {
            console.error("🚫 Failed to attach wallet:", error);
            set({ connectionError: 'Failed to attach wallet' });
          }
        } else {
          console.log("ℹ️ No wallet address found, continuing without attachment");
        }

        const pendingTable = get().tableId;
        if (pendingTable) {
          try {
            const joinCmd: ClientCommand = {
              cmdId: crypto.randomUUID(),
              type: "JOIN_TABLE",
              tableId: pendingTable,
            } as any;
            socket!.send(JSON.stringify(joinCmd));
            console.log("📥 Joined table on connect:", pendingTable);
          } catch (error) {
            console.error("🚫 Failed to join table:", error);
          }
        }
      };

      socket.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log(`🔌 WebSocket closed: Code ${event.code}, Reason: ${event.reason}`);
        set({ connectionState: 'disconnected', connectionError: event.reason || `Connection closed (${event.code})` });
        
        // Don't auto-reconnect for normal closures or if explicitly disconnected
        if (event.code !== 1000 && event.code !== 1001) {
          scheduleReconnect();
        }
      };

      socket.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error("🚫 WebSocket error:", error);
        set({ connectionState: 'disconnected', connectionError: 'Connection error' });
      };

    } catch (error) {
      console.error("🚫 Failed to create WebSocket:", error);
      set({ connectionState: 'disconnected', connectionError: 'Failed to create connection' });
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("🚫 Max reconnection attempts reached");
      set({ connectionState: 'disconnected', connectionError: 'Max reconnection attempts reached' });
      return;
    }

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    console.log(`🔄 Scheduling reconnect in ${delay}ms`);
    
    set({ connectionState: 'reconnecting' });
    reconnectAttempts++;
    
    reconnectTimeout = setTimeout(() => {
      connectWebSocket();
    }, delay);
  };

  if (typeof window !== "undefined" && !socket) {
    connectWebSocket();
  }
  // Move message handler setup outside of connectWebSocket to avoid duplication
  const setupMessageHandler = () => {
    if (!socket) return;
    
    socket.onmessage = (ev) => {
      try {
        const msg: ServerEvent = JSON.parse(ev.data as string);
        switch (msg.type) {
          case "SESSION":
            console.log("📨 Received SESSION message:", msg);
            if (msg.userId) {
              // Store in walletAddress as primary key
              localStorage.setItem("walletAddress", msg.userId);
              set({ currentWalletId: msg.userId });
              console.log("💾 Stored wallet address:", msg.userId);
            }
            break;
          case "TABLE_CREATED":
            // Automatically join the table that was just created
            set({ tableId: msg.table.id });
            get().addLog(`Created table: ${msg.table.name}`);
            break;
          case "TABLE_SNAPSHOT":
            console.log("📨 Received TABLE_SNAPSHOT message");
            applySnapshot(msg.table as any);
            // Don't auto-seat - let the user choose their seat manually
            break;
          case "PLAYER_JOINED":
            set((s) => {
              const arr = [...s.players];
              const ids = [...s.playerIds];
              // Use full wallet address as player name for consistency
              arr[msg.seat] = msg.playerId;
              ids[msg.seat] = msg.playerId;
              
              // If this is our wallet joining, update table seats tracking
              if (msg.playerId === s.currentWalletId) {
                const newTableSeats = new Map(s.tableSeats);
                newTableSeats.set(msg.tableId || s.tableId || "", msg.seat);
                return { players: arr, playerIds: ids, tableSeats: newTableSeats };
              }
              
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
              
              // If this is our wallet leaving, update table seats tracking
              if (msg.playerId === s.currentWalletId) {
                const newTableSeats = new Map(s.tableSeats);
                newTableSeats.delete(msg.tableId || s.tableId || "");
                return { players: arr, playerIds: ids, playerStates: states, tableSeats: newTableSeats };
              }
              
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
                names[msg.seat] = msg.playerId;
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
          case "TIMER":
            set({ timer: msg.countdown });
            if (msg.countdown === 0) {
              set({ timer: null });
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
    setupMessageHandler();
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
    currentWalletId:
      typeof window !== "undefined"
        ? localStorage.getItem("walletAddress") || localStorage.getItem("sessionId")
        : null,
    tableSeats: new Map<string, number>(),
    tableId: null,
    timer: null,
    connectionState: 'disconnected',
    connectionError: null,

    connectWallet: (address: string) => {
      const previousWallet = get().currentWalletId;
      
      if (!address || typeof address !== 'string') {
        console.error("🚫 Invalid wallet address provided");
        set({ connectionError: 'Invalid wallet address' });
        return;
      }
      
      // If switching wallets, disconnect from previous wallet's sessions
      if (previousWallet && previousWallet !== address) {
        console.log("🔄 Switching from", previousWallet.slice(0, 10) + "..." , "to", address.slice(0, 10) + "...");
        get().handleDisconnect().then(() => {
          // After cleanup, connect with new wallet
          set({ currentWalletId: address, tableSeats: new Map(), connectionError: null });
          if (typeof window !== "undefined") {
            localStorage.setItem("walletAddress", address);
            localStorage.removeItem("sessionId");
          }
          // Ensure WebSocket is connected before attaching
          if (socket && socket.readyState === WebSocket.OPEN) {
            try {
              const cmd: ClientCommand = {
                cmdId: crypto.randomUUID(),
                type: "ATTACH",
                userId: address,
              } as any;
              socket.send(JSON.stringify(cmd));
              console.log("📤 Sent ATTACH command with new wallet:", address.slice(0, 10) + "...");
            } catch (error) {
              console.error("🚫 Failed to attach new wallet:", error);
              set({ connectionError: 'Failed to attach wallet' });
            }
          } else if (!socket || socket.readyState !== WebSocket.OPEN) {
            console.log("🔗 WebSocket not connected, attempting connection...");
            connectWebSocket();
          }
        }).catch(error => {
          console.error("🚫 Failed to disconnect previous wallet:", error);
          set({ connectionError: 'Failed to switch wallets' });
        });
      } else {
        // First time connecting or same wallet
        set({ currentWalletId: address, connectionError: null });
        if (typeof window !== "undefined") {
          localStorage.setItem("walletAddress", address);
          localStorage.removeItem("sessionId");
        }
        // Ensure WebSocket is connected before attaching
        if (socket && socket.readyState === WebSocket.OPEN) {
          try {
            const cmd: ClientCommand = {
              cmdId: crypto.randomUUID(),
              type: "ATTACH",
              userId: address,
            } as any;
            socket.send(JSON.stringify(cmd));
            console.log("📤 Sent ATTACH command with wallet address:", address.slice(0, 10) + "...");
          } catch (error) {
            console.error("🚫 Failed to attach wallet:", error);
            set({ connectionError: 'Failed to attach wallet' });
          }
        } else if (!socket || socket.readyState !== WebSocket.OPEN) {
          console.log("🔗 WebSocket not connected, attempting connection...");
          connectWebSocket();
        }
      }
    },

    handleDisconnect: async () => {
      console.log("🔌 Handling wallet disconnect...");
      const { currentWalletId, tableSeats } = get();
      
      if (!currentWalletId) return;

      // Auto-fold and leave all tables where this wallet is seated
      const promises: Promise<void>[] = [];
      tableSeats.forEach((seatIndex, tableId) => {
        promises.push(
          (async () => {
            try {
              // Try to fold first if it's this player's turn
              await get().playerAction({ type: "fold" });
            } catch (error) {
              // Ignore fold errors - player might not be on turn
              console.log("Failed to auto-fold (expected if not on turn):", error);
            }
            
            // Leave the table
            try {
              await get().leaveSeat(tableId);
            } catch (error) {
              console.error("Failed to leave table", tableId, error);
            }
          })()
        );
      });
      
      await Promise.all(promises);
      
      // Clear all wallet-related state and storage
      if (typeof window !== "undefined") {
        localStorage.removeItem("walletAddress");
        localStorage.removeItem("sessionId");
      }
      
      set({ 
        currentWalletId: null, 
        tableSeats: new Map(),
        tableId: null,
        // Reset game state for safety
        players: Array(9).fill(null),
        playerIds: Array(9).fill(null),
        playerHands: Array(9).fill(null),
        chips: Array(9).fill(0),
        playerBets: Array(9).fill(0),
        playerStates: Array(9).fill(PlayerState.EMPTY),
        currentTurn: null,
        pot: 0
      });
      
      console.log("✅ Wallet disconnect handled successfully");
    },

    joinTable: (tableId: string) => {
      set({ tableId });
      // Send JOIN_TABLE command to server to get table snapshot
      if (socket && socket.readyState === WebSocket.OPEN) {
        const cmd: ClientCommand = {
          cmdId: crypto.randomUUID(),
          type: "JOIN_TABLE",
          tableId,
        } as any;
        socket.send(JSON.stringify(cmd));
        console.log(`🎯 Joining table: ${tableId}`);
      }
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
      console.log(`🪑 Attempting to join seat ${seatIdx} at table ${currentTableId}`);
      
      if (!currentTableId) {
        console.error("🚫 No table selected");
        set({ error: "No table selected" });
        return;
      }
      
      const { currentWalletId, tableSeats } = get();
      if (!currentWalletId) {
        console.error("🚫 No wallet connected");
        set({ error: "No wallet connected" });
        return;
      }
      
      console.log(`👤 Wallet: ${currentWalletId.slice(0, 10)}... attempting to join seat ${seatIdx}`);
      
      // Check if already seated at this table
      if (tableSeats.has(currentTableId)) {
        console.error(`🚫 Already seated at table ${currentTableId}:`, tableSeats.get(currentTableId));
        set({ error: "Already seated at this table" });
        return;
      }
      
      if (socket && socket.readyState === WebSocket.OPEN) {
        const cmd: ClientCommand = {
          cmdId: crypto.randomUUID(),
          type: "SIT",
          tableId: currentTableId,
          seat: seatIdx,
          buyIn: 10000, // Always $10k per seat
        } as ClientCommand;
        console.log("📤 Sending SIT command:", { tableId: currentTableId, seat: seatIdx, buyIn: 10000 });
        socket.send(JSON.stringify(cmd));
        
        // Optimistically update local state
        const newTableSeats = new Map(tableSeats);
        newTableSeats.set(currentTableId, seatIdx);
        set({ tableSeats: newTableSeats });
        console.log(`✅ Optimistically updated tableSeats:`, newTableSeats);
        get().addLog(`Joining seat ${seatIdx}`);
      } else {
        console.error("🚫 WebSocket not connected, cannot join seat");
        set({ error: "Not connected to server" });
      }
    },

    leaveSeat: async (tableId?: string) => {
      const currentTableId = tableId || get().tableId;
      if (!currentTableId) return;
      
      const { currentWalletId, tableSeats } = get();
      if (!currentWalletId || !tableSeats.has(currentTableId)) return;
      
      if (socket && socket.readyState === WebSocket.OPEN) {
        const cmd: ClientCommand = {
          cmdId: crypto.randomUUID(),
          type: "LEAVE",
          tableId: currentTableId,
        } as ClientCommand;
        socket.send(JSON.stringify(cmd));
      }
      
      // Update local state
      const newTableSeats = new Map(tableSeats);
      newTableSeats.delete(currentTableId);
      set({ tableSeats: newTableSeats });
      
      // If leaving current table, clear player state
      if (currentTableId === get().tableId) {
        set((s) => {
          const idx = s.playerIds.findIndex((id) => id === s.currentWalletId);
          if (idx === -1) return {};
          const players = [...s.players];
          const ids = [...s.playerIds];
          const states = [...s.playerStates];
          players[idx] = null;
          ids[idx] = null;
          states[idx] = PlayerState.EMPTY;
          return { players, playerIds: ids, playerStates: states };
        });
      }
    },

    leaveAllTables: async () => {
      const { tableSeats } = get();
      const promises: Promise<void>[] = [];
      
      tableSeats.forEach((seatIndex, tableId) => {
        promises.push(get().leaveSeat(tableId));
      });
      
      await Promise.all(promises);
    },

    startHand: async () => {},
    dealFlop: async () => {},
    dealTurn: async () => {},
    dealRiver: async () => {},

    playerAction: async (action) => {
      if (!action || !action.type) {
        console.error("🚫 Invalid action provided");
        throw new Error('Invalid action');
      }

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error("🚫 WebSocket not connected for player action");
        set({ connectionError: 'Not connected to game server' });
        throw new Error('WebSocket not connected');
      }

      try {
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
        console.log("🎯 Sent player action:", { type: action.type, amount: action.amount });
      } catch (error) {
        console.error("🚫 Failed to send player action:", error);
        set({ connectionError: 'Failed to send action' });
        throw error;
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
