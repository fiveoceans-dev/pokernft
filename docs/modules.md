# Poker Modules

This document complements [`game-states.md`](./game-states.md) by mapping the
state machine to the main modules that drive the table. Each module has a
clear responsibility and can be swapped without affecting others, following the
MVVM style used in the UI. For an in-depth look at how cards are dealt and
betting rounds progress, see [`dealing-and-betting.md`](./dealing-and-betting.md).

## Core Modules

| Module                   | Responsibility                                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TableManager**         | Orchestrates the hand lifecycle and table state machine, moves the dealer button after payouts and enforces the minimum number of active players.                                                                                             |
| **SeatingManager**       | Handles seat assignment, buy‑in/top‑up, sit‑out/return and leave actions; on hand end, removes broke players when re‑buy is disallowed or marks them `SITTING_OUT` until they reload to at least `minToPlay` (≥ BB by default). |
| **BlindManager**         | Assigns blind positions, auto‑posts blinds (allowing all‑in when short), enforces heads‑up order and applies configurable dead‑blind rules for returning players.                                                                       |
| **Dealer**               | Shuffles the deck, deals hole and board cards (with optional burns) and keeps card visibility authoritative on the server.                                                                                                      |
| **BettingEngine**        | Manages turn order, validates actions and raise sizes, tracks `betToCall`/`minRaise` and detects round completion.                                                                                                              |
| **PotManager**           | Tracks per‑round and total commitments, rebuilds main and side pots on all‑ins, applies rake and settles payouts.                                                                                                               |
| **HandEvaluator**        | Ranks seven‑card hands, resolves ties and supports split pots.                                                                                                                                                                  |
| **TimerService**         | Runs per‑action countdowns with optional timebank and disconnect grace; triggers auto‑fold or check on expiry and provides deal/inter‑round delay helpers.                                                                      |
| **EventBus**             | Emits state changes to clients and queues validated commands to the server.                                                                                                                                                     |
| **Persistence/Audit**    | Records immutable hand and action logs for settlements and anti‑fraud analysis.                                                                                                                                                 |
| **RulesConfig**          | Defines game parameters such as blinds, rake and buy‑in limits.                                                                                                                                                                 |
| **Integrity/Anti‑Abuse** | Optional hooks for rate limiting and collusion detection.                                                                                                                                                                       |

## Interaction Flow

Typical hand lifecycle:

1. `TableManager.startHand` calls `BlindManager.assignBlindsAndButton` to set the button, post blinds and establish turn order, then deals hole cards through the `Dealer`.
2. `BettingEngine` prompts the acting player. After each action it updates commitments and asks `PotManager` to rebuild pots on all‑ins.
3. When a round completes, `BettingEngine` signals the `Dealer` to deal the next street or proceeds to showdown.
4. At showdown, `HandEvaluator` ranks hands and `PotManager` awards pots, applying rake if configured.
5. `TableManager` rotates the button and resets per‑hand state for the next hand.

This separation keeps rendering, state management and game rules isolated and mirrors the architecture described in the design guidelines.

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

- Only the player at `actingIndex` may act.
- Bets must be within the player's stack and at least the minimum bet.
- Raises consist of calling first, then raising by at least `minRaise` (unless all‑in for less).
- Players marked `FOLDED`, `ALL_IN` or `DISCONNECTED` cannot act.

These checks keep the server authoritative and ensure that illegal actions are rejected before state changes are broadcast to clients.
