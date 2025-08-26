import { describe, it, expect } from "vitest";
import {
  Table,
  Player,
  PlayerState,
  PlayerAction,
  TableState,
  Round,
  Card,
} from "../types";
import { awardPots } from "../potManager";

const createPlayer = (
  id: string,
  seatIndex: number,
  holeCards: Card[],
  committed: number,
): Player => ({
  id,
  seatIndex,
  stack: 0,
  state: PlayerState.ACTIVE,
  hasButton: false,
  autoPostBlinds: true,
  timebankMs: 0,
  betThisRound: 0,
  totalCommitted: committed,
  holeCards,
  lastAction: PlayerAction.NONE,
});

const createTable = (players: Player[], extra: Partial<Table> = {}): Table => ({
  seats: players,
  buttonIndex: 0,
  smallBlindIndex: 0,
  bigBlindIndex: 0,
  smallBlindAmount: 5,
  bigBlindAmount: 10,
  minBuyIn: 0,
  maxBuyIn: 0,
  state: TableState.RIVER,
  deck: [],
  board: [],
  pots: [],
  currentRound: Round.RIVER,
  actingIndex: null,
  betToCall: 0,
  minRaise: 0,
  lastFullRaise: null,
  actedSinceLastRaise: new Set(),
  actionTimer: 0,
  interRoundDelayMs: 0,
  handStartDelayMs: 0,
  dealAnimationDelayMs: 0,
  ...extra,
});

describe("payouts", () => {
  it("awards main and side pots based on hand strength", () => {
    const spade = "s";
    const board: Card[] = [
      { rank: "2", suit: spade },
      { rank: "3", suit: spade },
      { rank: "4", suit: spade },
      { rank: "5", suit: spade },
      { rank: "7", suit: spade },
    ];
    const p1 = createPlayer(
      "a",
      0,
      [
        { rank: "A", suit: spade },
        { rank: "A", suit: "h" },
      ],
      100,
    );
    const p2 = createPlayer(
      "b",
      1,
      [
        { rank: "K", suit: spade },
        { rank: "K", suit: "h" },
      ],
      200,
    );
    const p3 = createPlayer(
      "c",
      2,
      [
        { rank: "Q", suit: spade },
        { rank: "Q", suit: "h" },
      ],
      300,
    );
    const table = createTable([p1, p2, p3], {
      board,
      pots: [
        { amount: 300, eligibleSeatSet: [0, 1, 2] },
        { amount: 200, eligibleSeatSet: [1, 2] },
      ],
    });

    awardPots(table);

    expect(p1.stack).toBe(300); // wins main pot
    expect(p2.stack).toBe(200); // wins side pot
    expect(p3.stack).toBe(0);
    expect(p3.state).toBe(PlayerState.SITTING_OUT);
    expect(table.pots[0].amount).toBe(0);
    expect(table.pots[1].amount).toBe(0);
  });

  it("distributes remainder chips clockwise from the button", () => {
    const board: Card[] = [
      { rank: "2", suit: "s" },
      { rank: "3", suit: "c" },
      { rank: "4", suit: "h" },
      { rank: "5", suit: "d" },
      { rank: "6", suit: "s" },
    ];
    const p1 = createPlayer(
      "a",
      0,
      [
        { rank: "J", suit: "c" },
        { rank: "8", suit: "h" },
      ],
      5,
    );
    const p2 = createPlayer(
      "b",
      1,
      [
        { rank: "T", suit: "c" },
        { rank: "9", suit: "h" },
      ],
      5,
    );
    const table = createTable([p1, p2], {
      board,
      buttonIndex: 1,
      pots: [{ amount: 5, eligibleSeatSet: [0, 1] }],
    });

    awardPots(table);

    expect(p1.stack).toBe(3); // receives remainder
    expect(p2.stack).toBe(2);
  });
});
