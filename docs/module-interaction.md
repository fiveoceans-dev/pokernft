# Module Interaction & APIs

## Event Flow (Server Authoritative)

`TableManager.startHand()` → `BlindManager.post()` → `Dealer.dealHole()` → `BettingEngine.startRound(PREFLOP)`

Client action: `PlayerAction` `{ seatIndex, action: FOLD|CHECK|CALL|BET|RAISE|ALL_IN, amount? }`

`BettingEngine.applyAction()`:

- Validate turn, legal move, amounts, minRaise.
- Update commitments, `betToCall`, `minRaise`, player state.
- If all-in: `PotManager.rebuildPots()`.
- Advance `actingIndex` to next eligible player.
- If round complete: `BettingEngine.finishRound()` → `Dealer.dealBoard(nextStreet)` or **SHOWDOWN**.

Showdown → `HandEvaluator.rank()` → `PotManager.payout()` → `TableManager.rotateAndCleanup()`.

## Key Validation Rules

- Only `actingIndex` may act; others are rejected.
- Amounts: `BET` ≥ `minBet` (big blind preflop) and ≤ player stack.
- `RAISE`: `(callAmount + raiseSize)` with `raiseSize` ≥ `minRaise`, unless all-in for less.
- No action if player `FOLDED`/`ALL_IN`/`DISCONNECTED`.

## Pseudocode: Round Completion

```pseudo
function isRoundComplete():
  active = players.filter(p => p.state in {ACTIVE, ALL_IN})
  if active.count <= 1: return true  // hand ends
  if active.every(p => p.state == ALL_IN): return true  // proceed to next street/showdown
  // Everyone matched highest commitment and no further action available
  maxCommit = max(p.betThisRound for p in active if p.state == ACTIVE)
  canAct = nextActorExists()
  allMatched = active.every(p =>
      p.state != ACTIVE || p.betThisRound == maxCommit || (maxCommit == 0 && p.lastAction in {CHECK}))
  return allMatched && !canAct
```

## Pseudocode: Side-Pot Construction (on any all-in)

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
      pots.push({ amountAccumulated += amount,
                  eligible: set(tierContribPlayers.map(p => p.seatIndex)) })
      prev = t
```
