# Poker Modules

This document complements [`game-states.md`](./game-states.md) by mapping the
state machine to the main modules that drive the table. Each module has a
clear responsibility and can be swapped without affecting others, following the
MVVM style used in the UI. For an in-depth look at how cards are dealt and
betting rounds progress, see [`dealing-and-betting.md`](./dealing-and-betting.md).

## Core Modules

| Module                   | Responsibility                                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TableManager**         | Orchestrates the hand lifecycle and table state machine, moves the dealer button and enforces the minimum number of active players.                                                                                             |
| **SeatingManager**       | Handles seat assignment, buy‑in/top‑up, sit‑out/return and leave actions; on hand end, removes broke players when re‑buy is disallowed or marks them `SITTING_OUT` until they reload to at least `minToPlay` (≥ BB by default). |
| **BlindManager**         | Assigns the dealer button and blind positions, auto‑posts blinds (allowing all‑in when short), enforces heads‑up order and manages dead or missed blinds.                                                                       |
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
