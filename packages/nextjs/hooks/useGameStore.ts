// src/hooks/useGameStore.ts
import { create } from "zustand";
import {
  type SeatUIState,
  type Phase,
  type ServerEvent,
  type ClientCommand,
} from "../game-engine";
import { shortAddress } from "../utils/address";

/** Map Phase strings to numeric street indices used by the UI */
const phaseToStreet: Record<string, number> = {
  waiting: -1, // Not in active play
  deal: -1, // Cards being dealt, no street yet
  preflop: 0, // Preflop betting round
  flop: 1, // Flop betting round
  turn: 2, // Turn betting round
  river: 3, // River betting round
  showdown: 4, // Showdown phase
  payout: 4, // Payout phase (maintain showdown display)
  handEnd: -1, // Hand complete, back to waiting
};

let socket: WebSocket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectTimeout: NodeJS.Timeout | null = null;

const DEFAULT_SMALL_BLIND = 25;
const DEFAULT_BIG_BLIND = DEFAULT_SMALL_BLIND * 2;

interface GameStoreState {
  players: (string | null)[];
  /** wallet addresses for each seated player */
  playerIds: (string | null)[];
  playerHands: ([number, number] | null)[];
  community: (number | null)[];
  chips: number[];
  playerBets: number[];
  playerStates: SeatUIState[];
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
  /** minimum raise amount required to reopen betting */
  minRaise: number;
  startBlindTimer: () => void;
  socket: WebSocket | null;
  /** current connected wallet address - single source of truth */
  currentWalletId: string | null;
  /** map of tableId to seatIndex for multi-table support */
  tableSeats: Map<string, number>;
  /** current table ID */
  tableId: string | null;
  /** unified countdown timer from server (legacy) */
  timer: number | null;
  /** client-driven countdown data by type */
  countdowns: Map<
    string,
    { startTime: number; duration: number; metadata?: any }
  >;
  /** track which players have revealed their cards at showdown */
  cardsRevealed: boolean[];
  /** user preference: reveal own cards automatically at showdown */
  autoRevealAtShowdown: boolean;
  setAutoRevealAtShowdown: (v: boolean) => void;
  /** track recent winners for sparkle effects */
  recentWinners: Set<number>;
  /** last action label per seat (UI-ready, event-driven) */
  lastActionLabels: (string | null)[];
  /** WebSocket connection state */
  connectionState: "disconnected" | "connecting" | "connected" | "reconnecting";
  /** Connection error message */
  connectionError: string | null;
  /** Action history for the current hand */
  actionHistory: Array<{ playerId: string; action: string; amount?: number }>;

  connectWallet: (address: string) => void;
  handleDisconnect: () => Promise<void>;
  joinTable: (tableId: string) => void;
  createTable: (name: string) => Promise<void>;
  joinSeat: (seatIdx: number, tableId?: string) => Promise<void>;
  leaveSeat: (tableId?: string) => Promise<void>;
  leaveAllTables: () => Promise<void>;
  sitOut: (tableId?: string) => Promise<void>;
  sitIn: (tableId?: string) => Promise<void>;
  playerAction: (action: {
    type: "FOLD" | "CALL" | "RAISE" | "CHECK" | "BET" | "ALLIN";
    amount?: number;
  }) => Promise<void>;
  startHand: () => Promise<void>;
  dealFlop: () => Promise<void>;
  dealTurn: () => Promise<void>;
  dealRiver: () => Promise<void>;
  rebuy: (amount: number) => Promise<void>;
  revealCards: (seatIndex: number) => void;
  resetCardReveals: () => void;
  markWinner: (seatIndex: number) => void;
  clearWinners: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => {
  function applySnapshot(room: any) {
    console.log("📸 Applying TABLE_SNAPSHOT:", {
      seatsCount: room.seats?.length || 0,
      phase: room.phase,
    });

    // Start with completely fresh arrays to ensure proper cleanup
    const seats = Array(9).fill(null) as (string | null)[];
    const ids = Array(9).fill(null) as (string | null)[];
    const hands = Array(9).fill(null) as ([number, number] | null)[];
    const chips = Array(9).fill(0) as number[];
    const bets = Array(9).fill(0) as number[];
    const states = Array(9).fill("empty") as SeatUIState[];
    const labels = Array(9).fill(null) as (string | null)[];

    // Populate only seats that have active players
    // Handle both new EventEngine format (seats array) and legacy format (players array)
    if (room.seats && Array.isArray(room.seats)) {
      // New EventEngine format
      room.seats.forEach((seat: any, index: number) => {
        if (seat.pid) {
          seats[index] = seat.nickname || seat.pid;
          ids[index] = seat.pid;

          if (seat.holeCards?.length === 2) {
            hands[index] = [seat.holeCards[0], seat.holeCards[1]];
          }

          chips[index] = seat.chips ?? 0;
          bets[index] = seat.streetCommitted ?? 0;

          // Use action field for sitting out or last action label
          const state =
            seat.action === "SITTING_OUT"
              ? "sittingOut"
              : seat.status || "empty";
          states[index] = state as any;

          if (seat.action && seat.action !== "SITTING_OUT") {
            switch (seat.action) {
              case "FOLD":
                labels[index] = "Fold";
                break;
              case "CHECK":
                labels[index] = "Check";
                break;
              case "CALL":
                labels[index] = "Call";
                break;
              case "BET":
                labels[index] = "Bet";
                break;
              case "RAISE":
                labels[index] = "Raise";
                break;
              case "ALLIN":
                labels[index] = "All In";
                break;
            }
          }

          console.log(
            `👤 Seat ${index}: ${seat.pid?.slice(0, 10)}... (${chips[index]} chips, ${seat.streetCommitted} streetCommitted, state: ${seat.status})`,
          );
        }
      });
    } else {
      // No valid format found - initialize with empty state
      console.warn("⚠️ No valid room format found, using empty state");
    }

    const comm = Array(5).fill(null) as (number | null)[];
    const newCards = room.communityCards ?? room.board ?? [];

    // Preserve existing community cards during betting if the snapshot sends none,
    // but continue updating players and other fields to avoid stale UI state.
    if (newCards.length === 0) {
      const existingCards = get().community || [];
      const hasExistingCards = existingCards.some((c) => c !== null);
      if (
        hasExistingCards &&
        room.phase &&
        !["waiting", "deal"].includes(room.phase)
      ) {
        for (let i = 0; i < Math.min(existingCards.length, comm.length); i++) {
          comm[i] = existingCards[i];
        }
      }
    } else {
      // Update community cards with new data
      newCards.forEach((c: any, i: number) => {
        // Cards are now always in hash format (numeric IDs)
        comm[i] = c as number;
      });
    }

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
      lastActionLabels: labels,
      dealerIndex: room.dealerIndex ?? null,
      pot,
      currentTurn: (() => {
        // Debug logging for currentTurn calculation
        console.log(`🔍 [useGameStore] Calculating currentTurn:`, {
          hasActor: "actor" in room,
          actor: (room as any).actor,
          currentTurnIndex: room.currentTurnIndex,
          playersLength: room.players?.length,
          playerWithTurn: room.players?.find((p) => p.isTurn)?.seat,
          actingIndex: (room as any).actingIndex,
        });

        // New EventEngine format: use actor directly
        if ("actor" in room && (room as any).actor !== undefined) {
          console.log(`   → Using EventEngine actor: ${(room as any).actor}`);
          return (room as any).actor;
        }

        // No legacy format support in pure FSM

        console.log(`   → No current turn found, returning null`);
        return null;
      })(),
      street: phaseToStreet[room.phase] ?? 0,
      loading: false,
      error: null,
      smallBlind: room.smallBlind ?? get().smallBlind,
      bigBlind: room.bigBlind ?? get().bigBlind,
      // default to big blind if minRaise not provided (e.g. pre-action snapshot)
      minRaise: room.minRaise ?? room.bigBlind ?? get().minRaise,
    });
  }

  const connectWebSocket = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log("🔗 WebSocket already connected");
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
    console.log(
      `🔗 Connecting to WebSocket: ${wsUrl} (attempt ${reconnectAttempts + 1})`,
    );

    set({ connectionState: "connecting", connectionError: null });

    try {
      socket = new WebSocket(wsUrl);

      // Set up message handler immediately after creating socket
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
                // Use nickname if available, otherwise use playerId for display
                arr[msg.seat] = (msg as any).nickname || msg.playerId;
                ids[msg.seat] = msg.playerId;

                // If this is our wallet joining, update table seats tracking
                if (msg.playerId === s.currentWalletId) {
                  const newTableSeats = new Map(s.tableSeats);
                  newTableSeats.set(msg.tableId || s.tableId || "", msg.seat);
                  return {
                    players: arr,
                    playerIds: ids,
                    tableSeats: newTableSeats,
                  };
                }

                return { players: arr, playerIds: ids };
              });
              get().addLog(`${shortAddress(msg.playerId)} joined`);
              break;
            case "PLAYER_LEFT":
              set((s) => {
                const arr = [...s.players];
                const ids = [...s.playerIds];
                const states = [...s.playerStates];
                const chips = [...s.chips];
                const bets = [...s.playerBets];
                const hands = [...s.playerHands];

                // Clear all data for the leaving player's seat
                arr[msg.seat] = null;
                ids[msg.seat] = null;
                states[msg.seat] = "empty";
                chips[msg.seat] = 0;
                bets[msg.seat] = 0;
                hands[msg.seat] = null;

                console.log(
                  `🚪 Player left seat ${msg.seat}, cleared all seat data`,
                );

                // If this is our wallet leaving, update table seats tracking
                if (msg.playerId === s.currentWalletId) {
                  const newTableSeats = new Map(s.tableSeats);
                  newTableSeats.delete(msg.tableId || s.tableId || "");
                  return {
                    players: arr,
                    playerIds: ids,
                    playerStates: states,
                    chips,
                    playerBets: bets,
                    playerHands: hands,
                    tableSeats: newTableSeats,
                  };
                }

                return {
                  players: arr,
                  playerIds: ids,
                  playerStates: states,
                  chips,
                  playerBets: bets,
                  playerHands: hands,
                };
              });
              get().addLog(`${shortAddress(msg.playerId)} left`);
              break;
            case "PLAYER_SIT_OUT":
              // Snapshot is authoritative — request fresh snapshot instead of mutating local state
              try {
                const tableId = get().tableId;
                if (tableId && socket && socket.readyState === WebSocket.OPEN) {
                  const cmd: ClientCommand = {
                    cmdId: crypto.randomUUID(),
                    type: "JOIN_TABLE",
                    tableId,
                  } as any;
                  socket.send(JSON.stringify(cmd));
                  console.log(
                    `🔄 [useGameStore] Requested TABLE_SNAPSHOT after PLAYER_SIT_OUT`,
                  );
                }
              } catch {}
              get().addLog(`${shortAddress(msg.playerId)} sat out`);
              break;
            case "PLAYER_SIT_IN":
              // Snapshot is authoritative — request fresh snapshot instead of mutating local state
              try {
                const tableId = get().tableId;
                if (tableId && socket && socket.readyState === WebSocket.OPEN) {
                  const cmd: ClientCommand = {
                    cmdId: crypto.randomUUID(),
                    type: "JOIN_TABLE",
                    tableId,
                  } as any;
                  socket.send(JSON.stringify(cmd));
                  console.log(
                    `🔄 [useGameStore] Requested TABLE_SNAPSHOT after PLAYER_SIT_IN`,
                  );
                }
              } catch {}
              get().addLog(`${shortAddress(msg.playerId)} sat in`);
              break;
            case "PLAYER_DISCONNECTED":
              set((s) => {
                const arr = [...s.playerStates];
                arr[msg.seat] = "empty";
                return { playerStates: arr };
              });
              get().addLog(`${shortAddress(msg.playerId)} disconnected`);
              break;
            case "PLAYER_SAT_OUT":
            case "PLAYER_SAT_IN":
              // Legacy events — prefer snapshot for truth
              try {
                const tableId = get().tableId;
                if (tableId && socket && socket.readyState === WebSocket.OPEN) {
                  const cmd: ClientCommand = {
                    cmdId: crypto.randomUUID(),
                    type: "JOIN_TABLE",
                    tableId,
                  } as any;
                  socket.send(JSON.stringify(cmd));
                }
              } catch {}
              break;
            case "PLAYER_REJOINED":
              set((s) => {
                const states = [...s.playerStates];
                states[msg.seat] = "active";
                const names = [...s.players];
                const ids = [...s.playerIds];
                if (!names[msg.seat]) names[msg.seat] = msg.playerId;
                ids[msg.seat] = msg.playerId;
                return { playerStates: states, players: names, playerIds: ids };
              });
              get().addLog(`${shortAddress(msg.playerId)} rejoined`);
              break;
            case "ACTION_PROMPT":
              set({ currentTurn: msg.actingIndex, minRaise: msg.minRaise });
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
                case "ALLIN":
                  text = `${name} ${msg.action.toLowerCase()} ${
                    msg.amount ?? ""
                  }`.trim();
                  break;
              }
              if (text) get().addLog(text);
              // Record action in history and update lastActionLabels/playerStates for that seat
              set((s) => {
                const actionHistory = [
                  ...s.actionHistory,
                  {
                    playerId: msg.playerId,
                    action: msg.action,
                    amount: (msg as any).amount,
                  },
                ];
                const labels = [...s.lastActionLabels];
                const states = [...s.playerStates];
                const seatIdx = s.playerIds.findIndex(
                  (id) =>
                    id &&
                    id.toLowerCase() === (msg.playerId || "").toLowerCase(),
                );
                if (seatIdx >= 0) {
                  let label = "";
                  switch (msg.action) {
                    case "FOLD":
                      label = "Fold";
                      states[seatIdx] = "folded";
                      break;
                    case "CHECK":
                      label = "Check";
                      states[seatIdx] = "active";
                      break;
                    case "CALL":
                      label = "Call";
                      states[seatIdx] = "active";
                      break;
                    case "BET":
                      label = "Bet";
                      states[seatIdx] = "active";
                      break;
                    case "RAISE":
                      label = "Raise";
                      states[seatIdx] = "active";
                      break;
                    case "ALLIN":
                      label = "All In";
                      states[seatIdx] = "allin";
                      break;
                    default:
                      label = msg.action;
                  }
                  labels[seatIdx] = label;
                }
                return {
                  actionHistory,
                  lastActionLabels: labels,
                  playerStates: states,
                };
              });
              break;
            }
            case "DEAL_FLOP":
              set((s) => {
                const comm = [...s.community];
                msg.cards.forEach((c, i) => (comm[i] = c as number));
                return {
                  community: comm,
                  lastActionLabels: Array(9).fill(null), // Clear action labels on new street
                  playerBets: Array(9).fill(0), // Clear street bets
                };
              });
              break;
            case "DEAL_TURN":
              set((s) => {
                const comm = [...s.community];
                comm[3] = msg.card as number;
                return {
                  community: comm,
                  lastActionLabels: Array(9).fill(null), // Clear action labels on new street
                  playerBets: Array(9).fill(0),
                };
              });
              break;
            case "DEAL_RIVER":
              set((s) => {
                const comm = [...s.community];
                comm[4] = msg.card as number;
                return {
                  community: comm,
                  lastActionLabels: Array(9).fill(null), // Clear action labels on new street
                  playerBets: Array(9).fill(0),
                };
              });
              break;
            case "HAND_START":
              get().addLog("Dealer: Hand started");
              get().resetCardReveals(); // Reset card reveals for new hand
              get().clearWinners(); // Clear previous winners for new hand
              // Reset action history at the beginning of each hand
              set({
                actionHistory: [],
                lastActionLabels: Array(9).fill(null),
                playerBets: Array(9).fill(0),
              });
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
            case "COUNTDOWN_START":
              // Handle new client-driven countdown system
              set((state) => {
                const countdowns = new Map(state.countdowns);
                countdowns.set(msg.countdownType, {
                  startTime: msg.startTime,
                  duration: msg.duration,
                  metadata: msg.metadata,
                });

                console.log(
                  `⏱️ [useGameStore] Started ${msg.countdownType} countdown: ${msg.duration}ms`,
                  msg.metadata,
                );

                return { countdowns };
              });
              break;
            case "GAME_START_COUNTDOWN":
              // Legacy support - convert to new format
              set((state) => {
                const countdowns = new Map(state.countdowns);
                countdowns.set("game_start", {
                  startTime: Date.now(),
                  duration: msg.countdown * 1000,
                  metadata: {
                    activePlayerCount: msg.activePlayerCount,
                    totalPlayerCount: msg.totalPlayerCount,
                  },
                });
                // Also set legacy timer for backward compatibility
                return { countdowns, timer: msg.countdown };
              });
              console.log(
                `🚀 Game starting in ${msg.countdown} seconds with ${msg.activePlayerCount || 0} players`,
              );
              break;
            case "TABLE_RESET":
              // Handle table reset due to idle timeout
              console.log("🔄 Table was reset due to inactivity");
              get().addLog("Table was reset due to 5 minutes of inactivity");
              // Force a fresh table state
              set({
                players: Array(9).fill(null),
                playerIds: Array(9).fill(null),
                playerHands: Array(9).fill(null),
                community: Array(5).fill(null),
                chips: Array(9).fill(0),
                playerBets: Array(9).fill(0),
                playerStates: Array(9).fill("empty") as SeatUIState[],
                dealerIndex: null,
                pot: 0,
                currentTurn: null,
                street: 0,
                cardsRevealed: Array(9).fill(false),
                lastActionLabels: Array(9).fill(null),
              });
              break;
            case "SHOWDOWN":
              console.log("🃏 Showdown started");
              get().addLog(`🃏 Showdown!`);
              // Do not auto-reveal everyone; let winners and user preference handle visibility
              break;
            case "DEALER_MESSAGE":
              console.log("📢 Dealer message:", msg.message);
              get().addLog(`🎯 Dealer: ${msg.message}`);
              break;
            case "WINNER_ANNOUNCEMENT":
              console.log(
                "🏆 Winner announcement:",
                msg.winners,
                "pot:",
                msg.potAmount,
              );
              // Trigger sparkle effects for all winners
              msg.winners.forEach((winner) => {
                if (winner.seat >= 0) {
                  console.log("✨ Triggering sparkle for seat:", winner.seat);
                  get().markWinner(winner.seat);
                  // Reveal winners' cards automatically per rules
                  set((s) => {
                    const revealed = [...s.cardsRevealed];
                    revealed[winner.seat] = true;
                    return { cardsRevealed: revealed };
                  });

                  // Clear winner effect after 5 seconds
                  setTimeout(() => {
                    set((s) => {
                      const newWinners = new Set(s.recentWinners);
                      newWinners.delete(winner.seat);
                      return { recentWinners: newWinners };
                    });
                  }, 5000);
                }
              });
              break;
            case "PLAYER_WAITING":
              // Handle player waiting to join next hand
              set((s) => {
                const arr = [...s.players];
                const ids = [...s.playerIds];
                const states = [...s.playerStates];

                // Use nickname if available, otherwise use playerId for display
                const nickname =
                  (msg as any).nickname || shortAddress(msg.playerId);
                arr[msg.seat] = nickname;
                ids[msg.seat] = msg.playerId;
                states[msg.seat] = "active"; // Show as sitting out until next hand

                // If this is our wallet, update table seats tracking
                if (msg.playerId === s.currentWalletId) {
                  const newTableSeats = new Map(s.tableSeats);
                  newTableSeats.set(msg.tableId || s.tableId || "", msg.seat);
                  console.log(
                    `🪑 [GameStore] Updated our seat tracking: table ${msg.tableId} -> seat ${msg.seat}`,
                  );
                  return {
                    players: arr,
                    playerIds: ids,
                    playerStates: states,
                    tableSeats: newTableSeats,
                  };
                }

                return { players: arr, playerIds: ids, playerStates: states };
              });
              get().addLog(
                `${shortAddress(msg.playerId)} waiting for next hand`,
              );
              break;
            case "WAITING_FOR_NEXT_HAND":
              // Handle personal message about waiting for next hand
              console.log(
                `⏳ [GameStore] Waiting for next hand at seat ${msg.seat}:`,
                msg.msg,
              );
              get().addLog(`⏳ ${msg.msg}`);
              // This is sent directly to the requesting player, so no state updates needed
              break;
            case "ERROR":
              // Record error and request a fresh snapshot to resync UI
              set({ error: msg.msg });
              try {
                const tableId = get().tableId;
                if (tableId && socket && socket.readyState === WebSocket.OPEN) {
                  const cmd: ClientCommand = {
                    cmdId: crypto.randomUUID(),
                    type: "JOIN_TABLE",
                    tableId,
                  } as any;
                  socket.send(JSON.stringify(cmd));
                  console.log(
                    "🔄 [useGameStore] Requested fresh TABLE_SNAPSHOT after error",
                  );
                }
              } catch (e) {
                console.error(
                  "❌ Failed to request TABLE_SNAPSHOT after error:",
                  e,
                );
              }
              break;
          }
        } catch {
          /* ignore malformed */
        }
      };

      const connectionTimeout = setTimeout(() => {
        if (socket && socket.readyState !== WebSocket.OPEN) {
          console.error("🚫 WebSocket connection timeout");
          socket.close();
          set({
            connectionState: "disconnected",
            connectionError: "Connection timeout",
          });
          scheduleReconnect();
        }
      }, 10000);

      socket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log("✅ WebSocket connected successfully");
        reconnectAttempts = 0;
        set({ connectionState: "connected", connectionError: null });

        // Use walletAddress as the single source of truth for connected wallet
        const address = localStorage.getItem("walletAddress");

        console.log("🔍 Checking for stored wallet address:", address);

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
            set({ connectionError: "Failed to attach wallet" });
          }
        } else {
          console.log(
            "ℹ️ No wallet address found, continuing without attachment",
          );
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
        console.log(
          `🔌 WebSocket closed: Code ${event.code}, Reason: ${event.reason}`,
        );
        set({
          connectionState: "disconnected",
          connectionError: event.reason || `Connection closed (${event.code})`,
        });

        // Don't auto-reconnect for normal closures or if explicitly disconnected
        if (event.code !== 1000 && event.code !== 1001) {
          scheduleReconnect();
        }
      };

      socket.onerror = (error) => {
        clearTimeout(connectionTimeout);
        console.error("🚫 WebSocket error:", error);
        set({
          connectionState: "disconnected",
          connectionError: "Connection error",
        });
      };
    } catch (error) {
      console.error("🚫 Failed to create WebSocket:", error);
      set({
        connectionState: "disconnected",
        connectionError: "Failed to create connection",
      });
      scheduleReconnect();
    }

    // Update socket reference in store
    set({ socket });
  };

  const scheduleReconnect = () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("🚫 Max reconnection attempts reached");
      set({
        connectionState: "disconnected",
        connectionError: "Max reconnection attempts reached",
      });
      return;
    }

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    console.log(`🔄 Scheduling reconnect in ${delay}ms`);

    set({ connectionState: "reconnecting" });
    reconnectAttempts++;

    reconnectTimeout = setTimeout(() => {
      connectWebSocket();
    }, delay);
  };

  if (typeof window !== "undefined" && !socket) {
    connectWebSocket();
  }

  return {
    players: Array(9).fill(null),
    playerIds: Array(9).fill(null),
    playerHands: Array(9).fill(null),
    community: Array(5).fill(null),
    chips: Array(9).fill(0),
    playerBets: Array(9).fill(0),
    playerStates: Array(9).fill("empty") as SeatUIState[],
    dealerIndex: null,
    pot: 0,
    currentTurn: null,
    street: 0,
    loading: false,
    error: null,
    logs: [],
    addLog: (msg) => set((s) => ({ logs: [...s.logs, msg] })),
    cardsRevealed: Array(9).fill(false),
    autoRevealAtShowdown:
      (typeof window !== "undefined"
        ? (localStorage.getItem("autoRevealAtShowdown") ?? "true")
        : "true") === "true",
    setAutoRevealAtShowdown: (v: boolean) => {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("autoRevealAtShowdown", v ? "true" : "false");
        } catch {}
      }
      set({ autoRevealAtShowdown: v });
    },
    recentWinners: new Set<number>(),
    lastActionLabels: Array(9).fill(null),
    smallBlind: DEFAULT_SMALL_BLIND,
    bigBlind: DEFAULT_BIG_BLIND,
    minRaise: DEFAULT_BIG_BLIND,
    startBlindTimer: () => {
      const increase = () =>
        set((s) => {
          const newSmall = s.smallBlind * 2;
          const newBig = s.bigBlind * 2;
          return {
            smallBlind: newSmall,
            bigBlind: newBig,
            minRaise: newBig,
          };
        });
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
        ? localStorage.getItem("walletAddress")
        : null,
    tableSeats: new Map<string, number>(),
    tableId: null,
    timer: null,
    countdowns: new Map<
      string,
      { startTime: number; duration: number; metadata?: any }
    >(),
    connectionState: "disconnected",
    connectionError: null,
    actionHistory: [],

    connectWallet: (address: string) => {
      const previousWallet = get().currentWalletId;

      if (!address || typeof address !== "string") {
        console.error("🚫 Invalid wallet address provided");
        set({ connectionError: "Invalid wallet address" });
        return;
      }

      console.log(
        `💼 Connecting wallet: ${address.slice(0, 10)}... (Previous: ${previousWallet?.slice(0, 10) + "..." || "none"})`,
      );

      // If switching wallets, disconnect from previous wallet's sessions
      if (previousWallet && previousWallet !== address) {
        console.log("🔄 Switching wallets - cleaning up previous state");
        get()
          .handleDisconnect()
          .then(() => {
            // After cleanup, connect with new wallet and ensure clean state
            set({
              currentWalletId: address,
              tableSeats: new Map(),
              connectionError: null,
              // Clear any game state that might be tied to previous wallet
              players: Array(9).fill(null),
              playerIds: Array(9).fill(null),
              chips: Array(9).fill(0),
              playerBets: Array(9).fill(0),
              playerStates: Array(9).fill("empty") as SeatUIState[],
            });

            if (typeof window !== "undefined") {
              // Validate localStorage consistency - ensure only this address is stored
              const storedAddress = localStorage.getItem("walletAddress");
              if (storedAddress !== address) {
                console.log(
                  `🧹 Cleaning inconsistent localStorage: ${storedAddress} → ${address}`,
                );
                localStorage.setItem("walletAddress", address);
              }
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
                console.log(
                  "📤 Sent ATTACH command with new wallet:",
                  address.slice(0, 10) + "...",
                );
              } catch (error) {
                console.error("🚫 Failed to attach new wallet:", error);
                set({ connectionError: "Failed to attach wallet" });
              }
            } else {
              console.log(
                "🔗 WebSocket not connected, attempting connection...",
              );
              connectWebSocket();
            }
          })
          .catch((error) => {
            console.error("🚫 Failed to disconnect previous wallet:", error);
            set({ connectionError: "Failed to switch wallets" });
          });
      } else {
        // First time connecting or same wallet - validate consistency
        if (typeof window !== "undefined") {
          const storedAddress = localStorage.getItem("walletAddress");
          if (storedAddress !== address) {
            console.log(
              `🧹 Syncing localStorage: ${storedAddress} → ${address}`,
            );
            localStorage.setItem("walletAddress", address);
          }
        }

        set({ currentWalletId: address, connectionError: null });

        // Ensure WebSocket is connected before attaching
        if (socket && socket.readyState === WebSocket.OPEN) {
          try {
            const cmd: ClientCommand = {
              cmdId: crypto.randomUUID(),
              type: "ATTACH",
              userId: address,
            } as any;
            socket.send(JSON.stringify(cmd));
            console.log(
              "📤 Sent ATTACH command with wallet address:",
              address.slice(0, 10) + "...",
            );
          } catch (error) {
            console.error("🚫 Failed to attach wallet:", error);
            set({ connectionError: "Failed to attach wallet" });
          }
        } else {
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
              await get().playerAction({ type: "FOLD" });
            } catch (error) {
              // Ignore fold errors - player might not be on turn
              console.log(
                "Failed to auto-fold (expected if not on turn):",
                error,
              );
            }

            // Leave the table
            try {
              await get().leaveSeat(tableId);
            } catch (error) {
              console.error("Failed to leave table", tableId, error);
            }
          })(),
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
        playerStates: Array(9).fill("empty") as SeatUIState[],
        currentTurn: null,
        pot: 0,
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
      console.log(
        `🪑 Attempting to join seat ${seatIdx} at table ${currentTableId}`,
      );

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

      console.log(
        `👤 Wallet: ${currentWalletId.slice(0, 10)}... attempting to join seat ${seatIdx}`,
      );

      // Check if already seated at this table
      if (tableSeats.has(currentTableId)) {
        console.error(
          `🚫 Already seated at table ${currentTableId}:`,
          tableSeats.get(currentTableId),
        );
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
          playerId: currentWalletId, // Send client wallet as authoritative
        } as ClientCommand;
        console.log("📤 Sending SIT command:", {
          tableId: currentTableId,
          seat: seatIdx,
          buyIn: 10000,
          playerId: currentWalletId?.slice(0, 10) + "...",
        });
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
          states[idx] = "empty";
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

    sitOut: async (tableId?: string) => {
      const currentTableId = tableId || get().tableId;
      if (!currentTableId) return;

      if (socket && socket.readyState === WebSocket.OPEN) {
        const cmd: ClientCommand = {
          cmdId: crypto.randomUUID(),
          type: "SIT_OUT",
          tableId: currentTableId,
        } as ClientCommand;
        socket.send(JSON.stringify(cmd));
      }
    },

    sitIn: async (tableId?: string) => {
      const currentTableId = tableId || get().tableId;
      if (!currentTableId) return;

      if (socket && socket.readyState === WebSocket.OPEN) {
        const cmd: ClientCommand = {
          cmdId: crypto.randomUUID(),
          type: "SIT_IN",
          tableId: currentTableId,
        } as ClientCommand;
        socket.send(JSON.stringify(cmd));
      }
    },

    startHand: async () => {},
    dealFlop: async () => {},
    dealTurn: async () => {},
    dealRiver: async () => {},

    playerAction: async (action) => {
      if (!action || !action.type) {
        console.error("🚫 Invalid action provided");
        throw new Error("Invalid action");
      }

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error("🚫 WebSocket not connected for player action");
        set({ connectionError: "Not connected to game server" });
        throw new Error("WebSocket not connected");
      }

      try {
        const { currentWalletId } = get(); // Extract from store
        const cmd: ClientCommand = {
          cmdId: crypto.randomUUID(),
          type: "ACTION",
          action: action.type,
          amount: action.amount,
          playerId: currentWalletId || undefined, // Safely handle null
        };

        socket.send(JSON.stringify(cmd));
        console.log("🎯 Sent player action:", {
          type: action.type,
          amount: action.amount,
        });
      } catch (error) {
        console.error("🚫 Failed to send player action:", error);
        set({ connectionError: "Failed to send action" });
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
    revealCards: (seatIndex: number) => {
      set((s) => {
        const newRevealed = [...s.cardsRevealed];
        newRevealed[seatIndex] = true;
        return { cardsRevealed: newRevealed };
      });
    },
    resetCardReveals: () => {
      set({ cardsRevealed: Array(9).fill(false) });
    },
    markWinner: (seatIndex: number) => {
      set((s) => {
        const newWinners = new Set(s.recentWinners);
        newWinners.add(seatIndex);
        return { recentWinners: newWinners };
      });
    },
    clearWinners: () => {
      set({ recentWinners: new Set<number>() });
    },
  };
});
