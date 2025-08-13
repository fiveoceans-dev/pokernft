const assert = require('node:assert');
const {
  createRoom,
  addPlayer,
  handleAction,
  nextTurn,
  determineWinners,
  isRoundComplete,
  payout,
  startHand,
  BlindManager,
} = require('../dist');

// startHand should only begin when more than two players are seated
const startRoom = createRoom('start');
addPlayer(startRoom, { id: 'a', nickname: 'A', seat: 0, chips: 100 });
addPlayer(startRoom, { id: 'b', nickname: 'B', seat: 1, chips: 100 });
startHand(startRoom);
assert.strictEqual(startRoom.stage, 'waiting');

addPlayer(startRoom, { id: 'c', nickname: 'C', seat: 2, chips: 100 });
startHand(startRoom);
assert.strictEqual(startRoom.stage, 'preflop');
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

const room = createRoom('r');
const p1 = addPlayer(room, { id: 'p1', nickname: 'A', seat: 0, chips: 100 });
const p2 = addPlayer(room, { id: 'p2', nickname: 'B', seat: 1, chips: 100 });

handleAction(room, p1.id, { type: 'raise', amount: 20 });
handleAction(room, p2.id, { type: 'call' });
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
  id: 'r',
  players: [
    {
      id: 'a',
      nickname: 'A',
      tableId: 'r',
      seat: 0,
      chips: 0,
      isDealer: false,
      isTurn: false,
      hand: [
        { rank: 'A', suit: '\u2660' },
        { rank: 'K', suit: '\u2666' },
      ],
      hasFolded: false,
      currentBet: 0,
    },
    {
      id: 'b',
      nickname: 'B',
      tableId: 'r',
      seat: 1,
      chips: 0,
      isDealer: false,
      isTurn: false,
      hand: [
        { rank: 'Q', suit: '\u2660' },
        { rank: 'J', suit: '\u2666' },
      ],
      hasFolded: false,
      currentBet: 0,
    },
  ],
  dealerIndex: 0,
  currentTurnIndex: 0,
  stage: 'showdown',
  pot: 100,
  communityCards: [
    { rank: '2', suit: '\u2663' },
    { rank: '3', suit: '\u2663' },
    { rank: '4', suit: '\u2663' },
    { rank: '5', suit: '\u2663' },
    { rank: '7', suit: '\u2666' },
  ],
  minBet: 0,
  deck: [],
};

const winners = determineWinners(showdownRoom);
assert.strictEqual(winners.length, 1);
assert.strictEqual(winners[0].id, 'a');

payout(showdownRoom, winners);
assert.strictEqual(showdownRoom.pot, 0);
assert.strictEqual(winners[0].chips, 100);

assert.ok(isRoundComplete(room));

console.log('Room tests passed');
