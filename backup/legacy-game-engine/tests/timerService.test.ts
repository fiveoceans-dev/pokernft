import { describe, it, expect, vi } from "vitest";
import TimerService from "../timerService";
import {
  Player,
  PlayerAction,
  PlayerState,
  Table,
  TableState,
  Round,
} from "../types";

const createPlayer = (id: string, seatIndex: number): Player => ({
  id,
  seatIndex,
  stack: 100,
  state: PlayerState.ACTIVE,
  hasButton: false,
  autoPostBlinds: true,
  timebankMs: 0,
  betThisRound: 0,
  totalCommitted: 0,
  holeCards: [],
  lastAction: PlayerAction.NONE,
});

const createTable = (player: Player, extra: Partial<Table> = {}): Table => ({
  seats: [player],
  buttonIndex: 0,
  smallBlindIndex: 0,
  bigBlindIndex: 0,
  smallBlindAmount: 5,
  bigBlindAmount: 10,
  minBuyIn: 0,
  maxBuyIn: 0,
  state: TableState.PRE_FLOP,
  deck: [],
  board: [],
  pots: [],
  currentRound: Round.PREFLOP,
  actingIndex: 0,
  betToCall: 0,
  minRaise: 0,
  lastFullRaise: null,
  actedSinceLastRaise: new Set(),
  actionTimer: 50,
  interRoundDelayMs: 0,
  handStartDelayMs: 0,
  dealAnimationDelayMs: 0,
  ...extra,
});

describe("TimerService", () => {
  it("defaults to 10s when actionTimer is zero", () => {
    vi.useFakeTimers();
    const player = createPlayer("p1", 0);
    const table = createTable(player, { betToCall: 0, actionTimer: 0 });
    const onAutoAction = vi.fn();
    const timers = new TimerService(table, { onAutoAction });
    timers.startActionTimer(player);
    vi.advanceTimersByTime(9999);
    expect(onAutoAction).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onAutoAction).toHaveBeenCalledWith("p1", PlayerAction.CHECK);
    vi.useRealTimers();
  });

  it("auto-checks when no bet to call", () => {
    vi.useFakeTimers();
    const player = createPlayer("p1", 0);
    const table = createTable(player, { betToCall: 0, actionTimer: 10 });
    const onAutoAction = vi.fn();
    const timers = new TimerService(table, { onAutoAction });
    timers.startActionTimer(player);
    vi.runAllTimers();
    expect(onAutoAction).toHaveBeenCalledWith("p1", PlayerAction.CHECK);
    vi.useRealTimers();
  });

  it("auto-folds when bet to call is present", () => {
    vi.useFakeTimers();
    const player = createPlayer("p1", 0);
    const table = createTable(player, { betToCall: 5, actionTimer: 10 });
    const onAutoAction = vi.fn();
    const timers = new TimerService(table, { onAutoAction });
    timers.startActionTimer(player);
    vi.runAllTimers();
    expect(onAutoAction).toHaveBeenCalledWith("p1", PlayerAction.FOLD);
    vi.useRealTimers();
  });

  it("consumes timebank before auto action", () => {
    vi.useFakeTimers();
    const player = createPlayer("p1", 0);
    player.timebankMs = 20;
    const table = createTable(player, { betToCall: 0, actionTimer: 10 });
    const onAutoAction = vi.fn();
    const timers = new TimerService(table, { onAutoAction });
    timers.startActionTimer(player);
    vi.advanceTimersByTime(10);
    expect(onAutoAction).not.toHaveBeenCalled();
    vi.advanceTimersByTime(20);
    expect(onAutoAction).toHaveBeenCalledWith("p1", PlayerAction.CHECK);
    vi.useRealTimers();
  });

  it("applies disconnect grace then timebank", () => {
    vi.useFakeTimers();
    const player = createPlayer("p1", 0);
    player.timebankMs = 30;
    const table = createTable(player, { betToCall: 5 });
    const onAutoAction = vi.fn();
    const timers = new TimerService(table, { onAutoAction }, 20);
    timers.handleDisconnect(player);
    vi.advanceTimersByTime(20);
    expect(onAutoAction).not.toHaveBeenCalled();
    vi.advanceTimersByTime(30);
    expect(onAutoAction).toHaveBeenCalledWith("p1", PlayerAction.FOLD);
    vi.useRealTimers();
  });
});
