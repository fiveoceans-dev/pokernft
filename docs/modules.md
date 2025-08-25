# Poker Modules

This document complements [`game-states.md`](./game-states.md) by mapping the
table state machine to the modules that drive the backend poker engine. Each
module has a clear responsibility and exposes an interface that allows
implementations to be swapped without affecting others, mirroring the MVVM
style used in the UI. For a deeper look at how cards are dealt and betting
rounds progress, see [`dealing-and-betting.md`](./dealing-and-betting.md) and
[`turn-order-and-seating.md`](./turn-order-and-seating.md). For a numbered implementation roadmap, consult
[action-plan.md](./action-plan.md).

## Core Modules

| Module | Responsibility |
| --- | --- |
| **TableManager** | Orchestrates the hand lifecycle and table state machine, rotating through **ROTATE** and **CLEANUP** after payouts while enforcing the minimum number of active players. When at least two seats are filled during the **WAITING** state it starts a countdown (`handStartDelayMs`) to automatically begin the next hand. |
| **HandLifecycle** | Provides `startTableHand`/`endHand` helpers, resolves showdowns and splits pots, and calls `resetTableForNextHand` to rotate the button and prepare a fresh deal. |
| **SeatingManager** | Handles seat assignment, buy‑in/top‑up, sit‑out/return and leave actions. Voluntary sit-outs take effect after the current hand. At hand end, broke players are marked `SITTING_OUT` if re‑buy is allowed or `LEAVING` when it is not. |
| **BlindManager** | Assigns blind positions, auto‑posts blinds (allowing all‑in when short), enforces heads‑up order and applies configurable dead‑blind rules for returning players. |
| **Dealer** | Shuffles the deck, deals hole and board cards (with optional burns) and keeps card visibility authoritative on the server. |
| **BettingEngine** | Manages turn order, validates actions and raise sizes, tracks `betToCall`/`minRaise` and detects round completion. |
| **PotManager** | Tracks per‑round and total commitments, rebuilds main and side pots on all‑ins, applies rake and settles payouts. |
| **HandEvaluator** | Ranks seven‑card hands, resolves ties and supports split pots. |
| **TimerService** | Runs per‑action countdowns with optional timebank and disconnect grace; triggers auto‑fold or check on expiry and provides deal/inter‑round delay helpers. |
| **EventBus** | Emits state changes to clients and queues validated commands to the server. |
| **Persistence/Audit** | Records immutable hand and action logs for settlements and anti‑fraud analysis. |
| **RulesConfig** | Defines game parameters such as blinds, rake and buy‑in limits. |
| **Integrity/Anti‑Abuse** | Optional hooks for rate limiting and collusion detection. |

## Interaction Flow

Typical hand lifecycle:

1. `TableManager.startHand` calls `BlindManager.assignBlindsAndButton` to set the button, post blinds and establish turn order,
   then deals hole cards through the `Dealer`.
2. `BettingEngine` prompts the acting player and `TimerService` starts the
   action countdown. After each action the engine updates commitments and asks
   `PotManager` to rebuild pots on all‑ins.
3. When a round completes, `BettingEngine` signals the `Dealer` to deal the next
   street or proceeds to showdown.
4. At showdown, `HandEvaluator` ranks hands and `PotManager` awards pots,
   applying rake if configured.
5. `TableManager` calls `resetTableForNextHand` to run **ROTATE** and
   **CLEANUP**, moving the button, clearing per-hand data and after
   `interRoundDelayMs` either restarting in **BLINDS** or waiting for more
   players.

This separation keeps rendering, state management and game rules isolated and
mirrors the architecture described in the design guidelines.

## Module Interaction & APIs

Server-side flow for a single hand:

```
TableManager.startHand()
  → BlindManager.post()
  → Dealer.dealHole()
  → BettingEngine.startRound(PREFLOP)
```

Clients submit actions as:

```
PlayerAction { seatIndex, action: FOLD|CHECK|CALL|BET|RAISE|ALL_IN, amount? }
```

`BettingEngine.applyAction` validates turn order, legal moves and minimum raise sizing. It updates each player's commitments, adjusts `betToCall`/`minRaise` and advances the `actingIndex`. When an action pushes a player all‑in the `PotManager.rebuildPots` helper recalculates main and side pots.

### Key Validation Rules

- Only the player at `actingIndex` may act; out-of-turn commands are rejected.
- BET amounts must be at least the table's minimum bet (`bigBlindAmount` preflop) and may not exceed the player's stack.
- RAISE requires matching the current `betToCall` then increasing the wager by at least `minRaise` unless the player is all-in for less.
- Players marked `FOLDED`, `ALL_IN` or `DISCONNECTED` cannot act.

These checks keep the server authoritative and ensure that illegal actions are rejected before state changes are broadcast to clients.

#### Round Completion

```pseudo
function isBettingRoundComplete():
  active = players.filter(p => p.state in {ACTIVE, ALL_IN})
  if active.count <= 1: return true  // hand ends
  if active.every(p => p.state == ALL_IN): return true  // proceed to next street/showdown
  maxCommit = max(p.betThisRound for p in active if p.state == ACTIVE)
  canAct = nextActorExists()
  allMatched = active.every(p =>
      p.state != ACTIVE || p.betThisRound == maxCommit ||
      (maxCommit == 0 && p.lastAction in {CHECK}))
  return allMatched && !canAct
```

#### Side-Pot Construction (on any all-in)

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

