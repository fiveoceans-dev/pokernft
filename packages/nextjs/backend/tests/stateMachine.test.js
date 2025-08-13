const assert = require('node:assert');
const { PokerStateMachine, GameState, BettingRound } = require('../dist');

const sm = new PokerStateMachine();
assert.strictEqual(sm.state, GameState.WaitingForPlayers);

sm.dispatch({ type: 'PLAYERS_READY' });
assert.strictEqual(sm.state, GameState.Shuffling);

sm.dispatch({ type: 'SHUFFLE_COMPLETE' });
assert.strictEqual(sm.state, GameState.Dealing);

sm.dispatch({ type: 'DEAL_COMPLETE' });
assert.strictEqual(sm.state, GameState.Betting);
assert.strictEqual(sm.round, BettingRound.PreFlop);

sm.dispatch({ type: 'BETTING_COMPLETE', remainingPlayers: 2 });
assert.strictEqual(sm.state, GameState.Dealing);

sm.dispatch({ type: 'DEAL_COMPLETE' });
assert.strictEqual(sm.state, GameState.Betting);
assert.strictEqual(sm.round, BettingRound.Flop);

sm.dispatch({ type: 'BETTING_COMPLETE', remainingPlayers: 2 });
assert.strictEqual(sm.state, GameState.Dealing);

sm.dispatch({ type: 'DEAL_COMPLETE' });
assert.strictEqual(sm.state, GameState.Betting);
assert.strictEqual(sm.round, BettingRound.Turn);

sm.dispatch({ type: 'BETTING_COMPLETE', remainingPlayers: 2 });
assert.strictEqual(sm.state, GameState.Dealing);

sm.dispatch({ type: 'DEAL_COMPLETE' });
assert.strictEqual(sm.state, GameState.Betting);
assert.strictEqual(sm.round, BettingRound.River);

sm.dispatch({ type: 'BETTING_COMPLETE', remainingPlayers: 2 });
assert.strictEqual(sm.state, GameState.Showdown);

sm.dispatch({ type: 'SHOWDOWN_COMPLETE' });
assert.strictEqual(sm.state, GameState.Payout);

sm.dispatch({ type: 'PAYOUT_COMPLETE' });
assert.strictEqual(sm.state, GameState.WaitingForPlayers);

sm.dispatch({ type: 'PLAYERS_READY' });
sm.dispatch({ type: 'PAUSE', reason: 'maintenance' });
assert.strictEqual(sm.state, GameState.Paused);
sm.dispatch({ type: 'RESUME' });
assert.strictEqual(sm.state, GameState.Shuffling);

console.log('State machine tests passed');
