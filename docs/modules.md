# Poker Modules

This document complements [`game-states.md`](./game-states.md) by mapping the
state machine to the main modules that drive the table.  Each module has a
clear responsibility and can be swapped without affecting others, following the
MVVM style used in the UI.

## Core Modules

| Module | Responsibility |
| ------ | -------------- |
| **State Machine** | Drives high level phases such as `WaitingForPlayers`, `Shuffling`, `Dealing`, `Betting`, `Showdown` and `Payout`. Implemented in `packages/nextjs/backend/stateMachine.ts` and consumed by the view‑model. |
| **Game Engine** | Holds mutable hand data: seats, chips, deck, community cards and betting logic. Exposed as the `GameEngine` class in `packages/nextjs/backend` for easy integration with hooks. |
| **View Model** | Bridges the state machine and React components.  `useGameStore.ts` exposes observable state and actions for the UI. |
| **UI Components** | Render the current table, players and action bar.  Components react to state changes emitted by the view model. |

## Progression

1. **WaitingForPlayers** – the table is idle.  When two or more players join,
   the view model dispatches `PLAYERS_READY` and moves to shuffling.
2. **Shuffling/Dealing** – the deck is prepared and hole cards are dealt via the
   game engine.
3. **Betting Rounds** – for each street (preflop, flop, turn, river) the state
   machine enters `Betting`.  The view model advances by calling
   `dealFlop/Turn/River` which dispatch `BETTING_COMPLETE` followed by
   `DEAL_COMPLETE`.
4. **Showdown** – after the final `BETTING_COMPLETE`, the machine resolves to
   `Showdown` where winners are evaluated.
5. **Payout** – chips are awarded and the machine transitions back to
   `WaitingForPlayers` ready for the next hand.

## Betting & Payout

The game engine exposes helpers such as `handleAction`, `isRoundComplete` and
`payout`. The view model calls these after each player move to advance streets,
reveal community cards and award the pot to the winning seat(s).

This separation keeps rendering, state management and game rules isolated and
mirrors the architecture described in the design guidelines.
