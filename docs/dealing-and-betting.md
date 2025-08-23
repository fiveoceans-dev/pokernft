# Dealing & Betting Rounds

This document describes how cards are dealt and betting rounds proceed in a
no‑limit Texas Hold'em hand. It pairs with [`game-states.md`](./game-states.md)
for the table lifecycle and [`modules.md`](./modules.md) for the engine
components that enforce these rules.

## Dealing Order

- **Hole cards**: Starting with the small blind and moving clockwise, the dealer distributes one card at a time until each player has two.
- **Board cards**: For each street, the dealer burns one card (optional) and then reveals:
  - **Flop**: three community cards
  - **Turn**: one community card
  - **River**: one community card

Between individual deal events the server pauses `dealAnimationDelayMs`
milliseconds so clients can animate the action. The `TimerService` also
manages per-action countdowns to keep play moving.

## Betting Rounds & Acting Order

- **Preflop**: the first active player to the left of the big blind acts first. In heads‑up play the small blind acts first.
- **Flop / Turn / River**: the first active player to the left of the button acts first. In heads‑up play the big blind acts first.

- **Side pots**: when heads‑up, side‑pot construction and all‑in handling work the same as in multi‑way pots.

See [Heads-Up Specifics](./heads-up.md) for a concise summary of the two-player rules.

## Legal Actions

Players take turns and may perform one of the following actions:

- **Fold** – leave the hand immediately.
- **Check** – only allowed when `betToCall` is `0`.
- **Call** – commit `betToCall - betThisRound` chips.
- **Bet** – only allowed when `betToCall` is `0`; sets a new `betToCall`.
- **Raise** – call first, then increase the wager by at least the current `minRaise`.
- **All‑in** – commit up to the remaining stack; counts as a raise only if it meets `minRaise`.

## Min‑Raise Logic (No‑Limit)

- Track the size of the last aggressive raise (`lastAggressiveRaiseSize`).
- At the start of preflop, the minimum raise is the big blind amount.
- After a bet or raise, the next raise must be at least the size of the previous raise.
- Short all‑ins below the minimum raise do not re‑open the action for players who have already acted.

## Round Completion

A betting round ends when any of the following occurs:

- All active players either fold or match the highest commitment (calls or checks), and no further action is possible.
- Only one player remains; the hand ends immediately without dealing remaining board cards.
- All players are all‑in; the remaining board cards are dealt without further betting and the hand proceeds to showdown.

```pseudo
function isBettingRoundComplete():
  active = players.filter(p => p.state in {ACTIVE, ALL_IN})
  if active.count <= 1: return true
  if active.every(p => p.state == ALL_IN): return true
  maxCommit = max(p.betThisRound for p in active if p.state == ACTIVE)
  canAct = nextActorExists()
  allMatched = active.every(p =>
      p.state != ACTIVE || p.betThisRound == maxCommit ||
      (maxCommit == 0 && p.lastAction in {CHECK}))
  return allMatched && !canAct
```

## Side-Pot Construction

Any time a player goes all‑in, pot layers are rebuilt based on total commitments:

```pseudo
function rebuildPots():
  live = players.filter(p => p.state != FOLDED)
  byCommit = sortAsc(unique(live.map(p => p.totalCommitted)))
  prev = 0
  pots = []
  for t in byCommit:
    tierContribPlayers = live.filter(p => p.totalCommitted >= t)
    if tierContribPlayers.length >= 2 and t > prev:
      amount = (t - prev) * tierContribPlayers.length
      pots.push({ amount, eligible: set(tierContribPlayers.map(p => p.seatIndex)) })
      prev = t
```

## Consistency & Edge Cases

- If all but one player folds at any point, that player wins the pot immediately and no further streets are dealt.
- Short all-in raises that do not meet the current `minRaise` never reopen the betting; players who already acted may only call or fold.
- Invalid actions (for example, trying to check when `betToCall > 0`) are rejected and the turn timer continues to run.
- When a player's `actionTimer` (typically around 10s) expires, they automatically check if `betToCall` is `0` or fold otherwise.
- The server serializes simultaneous inputs and only accepts commands from the current `actingIndex`.
- When a player disconnects during their turn, a separate grace timer runs. When it elapses the player's remaining `timebankMs` is consumed before an automatic fold or check is applied.
- After payouts the dealer button moves to the next active seat clockwise. Players returning from sitting out must either post any missed blinds immediately (`deadBlindRule = POST`) or wait for the big blind to reach them (`deadBlindRule = WAIT`). When the small-blind seat is empty the blinds roll forward to the next available active players.
- After payouts the table waits `interRoundDelayMs` before the next hand begins.
- In heads-up play the button posts the small blind, the opposing player posts the big blind, and acting order follows those positions.
