import { describe, it, expect } from "vitest";
import { dealDeck } from "./utils";
import {
  addPlayer,
  createRoom,
  determineWinners,
  handleAction,
  nextTurn,
} from "./room";
import { GameRoom } from "./types";

describe("dealDeck", () => {
  it("returns 52 unique cards", () => {
    const deck = dealDeck();
    expect(deck).toHaveLength(52);
    const uniq = new Set(deck.map((c) => c.rank + c.suit));
    expect(uniq.size).toBe(52);
  });
});

describe("turn management", () => {
  it("skips folded players", () => {
    const room = createRoom("r");
    addPlayer(room, { id: "p1", nickname: "A", seat: 0, chips: 100 });
    addPlayer(room, { id: "p2", nickname: "B", seat: 1, chips: 100 });
    addPlayer(room, { id: "p3", nickname: "C", seat: 2, chips: 100 });
    room.players[1].hasFolded = true;
    room.currentTurnIndex = 0;
    nextTurn(room);
    expect(room.currentTurnIndex).toBe(2);
    expect(room.players[2].isTurn).toBe(true);
  });
});

describe("betting and showdown", () => {
  it("updates chips and pot", () => {
    const room = createRoom("r");
    const p1 = addPlayer(room, { id: "p1", nickname: "A", seat: 0, chips: 100 });
    const p2 = addPlayer(room, { id: "p2", nickname: "B", seat: 1, chips: 100 });
    handleAction(room, p1.id, { type: "raise", amount: 20 });
    handleAction(room, p2.id, { type: "call" });
    expect(room.pot).toBe(40);
    expect(p1.chips).toBe(80);
    expect(p2.chips).toBe(80);
  });

  it("finds high-card winner", () => {
    const room: GameRoom = {
      id: "r",
      players: [
        {
          id: "p1",
          nickname: "A",
          tableId: "r",
          seat: 0,
          chips: 0,
          isDealer: false,
          isTurn: false,
          hand: [
            { rank: "A", suit: "♠" },
            { rank: "K", suit: "♦" },
          ],
          hasFolded: false,
          currentBet: 0,
        },
        {
          id: "p2",
          nickname: "B",
          tableId: "r",
          seat: 1,
          chips: 0,
          isDealer: false,
          isTurn: false,
          hand: [
            { rank: "Q", suit: "♠" },
            { rank: "J", suit: "♦" },
          ],
          hasFolded: false,
          currentBet: 0,
        },
      ],
      dealerIndex: 0,
      currentTurnIndex: 0,
      stage: "showdown",
      pot: 0,
      communityCards: [
        { rank: "2", suit: "♣" },
        { rank: "3", suit: "♣" },
        { rank: "4", suit: "♣" },
        { rank: "5", suit: "♣" },
        { rank: "7", suit: "♣" },
      ],
      minBet: 0,
      deck: [],
    };
    const winners = determineWinners(room);
    expect(winners).toHaveLength(1);
    expect(winners[0].id).toBe("p1");
  });
});

