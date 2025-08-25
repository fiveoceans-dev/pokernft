import { strict as assert } from "assert";
import {
  createRoom,
  addPlayer,
  handleAction,
  nextTurn,
  determineWinners,
  isRoomRoundComplete,
  payout,
  startRoomHand,
  BlindManager,
} from "..";
import { describe, it } from "vitest";

// Comprehensive integration test for core room helpers
describe("room helpers", () => {
  it("handles hand flow and payouts", () => {
    // startRoomHand should begin only when at least two players are seated
    const startRoom = createRoom("start");
    addPlayer(startRoom, { id: "a", nickname: "A", seat: 0, chips: 100 });
    startRoomHand(startRoom);
    assert.strictEqual(startRoom.stage, "waiting");

    addPlayer(startRoom, { id: "b", nickname: "B", seat: 1, chips: 100 });
    startRoomHand(startRoom);
    assert.strictEqual(startRoom.stage, "preflop");
    startRoom.players.forEach((p) => assert.strictEqual(p.hand.length, 2));

    // blinds should be posted and action starts after the big blind
    const bm = new BlindManager(startRoom.minBet / 2, startRoom.minBet);
    const { sb, bb } = bm.getBlindIndices(startRoom);
    assert.strictEqual(startRoom.players[sb].currentBet, startRoom.minBet / 2);
    assert.strictEqual(startRoom.players[bb].currentBet, startRoom.minBet);
    assert.strictEqual(startRoom.pot, startRoom.minBet + startRoom.minBet / 2);
    assert.strictEqual(
      startRoom.currentTurnIndex,
      bm.nextActiveIndex(startRoom, bb + 1),
    );

    const room = createRoom("r");
    const p1 = addPlayer(room, {
      id: "p1",
      nickname: "A",
      seat: 0,
      chips: 100,
    });
    const p2 = addPlayer(room, {
      id: "p2",
      nickname: "B",
      seat: 1,
      chips: 100,
    });

    handleAction(room, p1.id, { type: "raise", amount: 20 });
    handleAction(room, p2.id, { type: "call" });
    assert.strictEqual(room.pot, 40);
    assert.strictEqual(p1.chips, 80);
    assert.strictEqual(p2.chips, 80);

    room.players[1].hasFolded = true;
    room.currentTurnIndex = 0;
    nextTurn(room);
    assert.strictEqual(room.currentTurnIndex, 0);
    assert.strictEqual(room.players[0].isTurn, true);

    // showdown winner test
    const showdownRoom = {
      id: "r",
      players: [
        {
          id: "a",
          nickname: "A",
          tableId: "r",
          seat: 0,
          chips: 0,
          isDealer: false,
          isTurn: false,
          hand: [
            { rank: "A", suit: "s" },
            { rank: "K", suit: "d" },
          ],
          hasFolded: false,
          currentBet: 0,
        },
        {
          id: "b",
          nickname: "B",
          tableId: "r",
          seat: 1,
          chips: 0,
          isDealer: false,
          isTurn: false,
          hand: [
            { rank: "Q", suit: "s" },
            { rank: "J", suit: "d" },
          ],
          hasFolded: false,
          currentBet: 0,
        },
      ],
      dealerIndex: 0,
      currentTurnIndex: 0,
      stage: "showdown",
      pot: 100,
      communityCards: [
        { rank: "2", suit: "c" },
        { rank: "3", suit: "c" },
        { rank: "4", suit: "c" },
        { rank: "5", suit: "c" },
        { rank: "7", suit: "d" },
      ],
      minBet: 0,
      deck: [],
    } as any;

    const winners = determineWinners(showdownRoom);
    assert.strictEqual(winners.length, 1);
    assert.strictEqual(winners[0].id, "a");

    payout(showdownRoom, winners);
    assert.strictEqual(showdownRoom.pot, 0);
    assert.strictEqual(winners[0].chips, 100);

    assert.ok(isRoomRoundComplete(room));

    // payout remainder test
    const remainderRoom = {
      id: "r",
      players: [
        {
          id: "a",
          nickname: "A",
          tableId: "r",
          seat: 0,
          chips: 0,
          isDealer: false,
          isTurn: false,
          hand: [],
          hasFolded: false,
          currentBet: 0,
        },
        {
          id: "b",
          nickname: "B",
          tableId: "r",
          seat: 1,
          chips: 0,
          isDealer: false,
          isTurn: false,
          hand: [],
          hasFolded: false,
          currentBet: 0,
        },
        {
          id: "c",
          nickname: "C",
          tableId: "r",
          seat: 2,
          chips: 0,
          isDealer: false,
          isTurn: false,
          hand: [],
          hasFolded: false,
          currentBet: 0,
        },
      ],
      dealerIndex: 0,
      currentTurnIndex: 0,
      stage: "showdown",
      pot: 5,
      communityCards: [],
      minBet: 0,
      deck: [],
    } as any;

    const remainderWinners = [
      remainderRoom.players[1],
      remainderRoom.players[2],
    ];
    payout(remainderRoom, remainderWinners);
    assert.strictEqual(remainderRoom.pot, 0);
    const b = remainderRoom.players.find((p: any) => p.id === "b");
    const c = remainderRoom.players.find((p: any) => p.id === "c");
    assert.strictEqual(b?.chips, 3);
    assert.strictEqual(c?.chips, 2);

    // players with zero chips are removed before the next hand
    const bustRoom = {
      id: "br",
      players: [
        {
          id: "a",
          nickname: "A",
          tableId: "br",
          seat: 0,
          chips: 0,
          isDealer: false,
          isTurn: false,
          hand: [],
          hasFolded: false,
          currentBet: 0,
        },
        {
          id: "b",
          nickname: "B",
          tableId: "br",
          seat: 1,
          chips: 0,
          isDealer: false,
          isTurn: false,
          hand: [],
          hasFolded: false,
          currentBet: 0,
        },
        {
          id: "c",
          nickname: "C",
          tableId: "br",
          seat: 2,
          chips: 0,
          isDealer: false,
          isTurn: false,
          hand: [],
          hasFolded: false,
          currentBet: 0,
        },
      ],
      dealerIndex: 0,
      currentTurnIndex: 0,
      stage: "showdown",
      pot: 30,
      communityCards: [],
      minBet: 0,
      deck: [],
    } as any;

    const bustWinners = [bustRoom.players[2]];
    payout(bustRoom, bustWinners);
    assert.strictEqual(bustRoom.players.length, 1);
    assert.strictEqual(bustRoom.players[0].id, "c");
    assert.strictEqual(bustRoom.players[0].chips, 30);
  });

  it("awards pot immediately when all but one fold", () => {
    const room = createRoom("foldwin");
    const p1 = addPlayer(room, {
      id: "p1",
      nickname: "A",
      seat: 0,
      chips: 100,
    });
    const p2 = addPlayer(room, {
      id: "p2",
      nickname: "B",
      seat: 1,
      chips: 100,
    });
    const p3 = addPlayer(room, {
      id: "p3",
      nickname: "C",
      seat: 2,
      chips: 100,
    });
    room.stage = "preflop";
    room.pot = 30;
    room.currentTurnIndex = 0;
    room.players[0].isTurn = true;
    handleAction(room, p1.id, { type: "fold" });
    handleAction(room, p2.id, { type: "fold" });
    assert.strictEqual(room.stage, "waiting");
    assert.strictEqual(room.pot, 0);
    const winner = room.players.find((p) => p.id === p3.id)!;
    assert.strictEqual(winner.chips, 130);
  });
});
