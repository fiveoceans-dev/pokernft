# Poker Game States

This document outlines the state machine governing a single poker table. The backend is responsible for enforcing state transitions and ensuring fairness while keeping the implementation modular.

## Overview

The game is represented as a deterministic state machine. Each state has well-defined entry conditions, allowed actions, exit conditions, and resolution logic for edge cases. Components such as random number generation (RNG), hand evaluation, and networking are pluggable modules so they can be swapped or upgraded without altering the overall workflow.

## States

### 1. **WaitingForPlayers**

- **Entry**: Table created or round finished.
- **Actions**: Players join, leave, or buy in. Backend verifies eligibility and reserves seats.
- **Exit**: Minimum required players are seated and ready.
- **Edge Cases**:
  - If a player disconnects before the round starts, the seat is released after a timeout.

### 2. **Shuffling**

- **Entry**: Minimum players are ready.
- **Actions**: Deck is shuffled using a verifiable RNG module. Card order is secret to everyone except the RNG module.
- **Exit**: Deck is prepared for dealing.
- **Edge Cases**:
  - RNG failure triggers a re-shuffle using a backup generator.

### 3. **Dealing**

- **Entry**: Deck ready.
- **Actions**: Dealer distributes cards to players and board as required for the variant.
- **Timing**: Each card is dealt with `dealAnimationDelayMs` between events to pace animations.
- **Exit**: All required cards are dealt.
- **Edge Cases**:
  - Player disconnects while receiving cards: cards remain face down; if the player does not reconnect before their first action, they are folded.

### 4. **BettingRound**

This state repeats for each betting phase (Pre-Flop, Flop, Turn, River).

- **Entry**: Dealing phase or previous betting round completed.
- **Actions**: In turn order, each active player can _fold_, _check/call_, or _bet/raise_.
- **Exit**: Betting is closed when all active players have matched the highest bet or folded.
- **Edge Cases**:
  - **Disconnect**: A disconnected player receives a separate grace timer. On expiry the backend applies the same resolution as a normal timeout.
  - **Timeout**: Each player action is limited by a configurable timer. When it expires the player's timebank is consumed automatically; if none remains the backend auto-checks or folds based on game rules.
  - **Insufficient Funds**: All-in rules apply automatically; side pots are created by the backend.

### 5. **Showdown**

- **Entry**: Last betting round completed with more than one player remaining.
- **Actions**: Hands are revealed. The evaluation module determines the winner(s).
- **Exit**: Winning players identified.
- **Edge Cases**:
  - Ties or split pots are calculated by the evaluation module.
  - Disconnected players’ hands are revealed automatically if eligible for the pot.

### 6. **Payout**

- **Entry**: Winners determined.
- **Actions**: Chips are awarded, pots are cleared, and statistics updated.
- **Exit**: Payout complete. The table then pauses for `interRoundDelayMs` before the next hand.
- **Edge Cases**:
  - Transfer failure triggers retry logic; if unresolved, the table enters a Paused state pending admin resolution.

For detailed reveal order, evaluation, and payout rules, see [Showdown & Payouts](./showdown-payouts.md).

### 7. **Paused** _(optional)_

- **Entry**: Critical error, manual intervention, or network partition.
- **Actions**: No gameplay. Admins or automated recovery processes may attempt to resolve the issue.
- **Exit**: Resolved back to previous state or terminated.

## Additional Considerations

- **State Persistence**: All state transitions are logged to durable storage for auditing and recovery.
- **Reconnection Logic**: When a player reconnects, the backend replays the necessary state changes to synchronize the client.
- **Modularity**: RNG, evaluation, networking, and persistence are separate modules communicating via defined interfaces. This enables upgrading any component without redefining game flow.
- **Security**: Sensitive operations (e.g., deck shuffling, card dealing) happen server-side; clients only receive information they are authorized to view.

## Seat, Player & Table States

### Player State Machine (per hand)

SEATED → (ACTIVE | SITTING_OUT)

On new hand:

- If stack ≥ BB (or allowed to post short/all-in blind), and not sitting out → **ACTIVE**.
- Else → **SITTING_OUT**.

During betting:

- **ACTIVE** → **FOLDED** on Fold.
- **ACTIVE** → **ALL_IN** if action commits all chips.

Disconnection: **ACTIVE** → **DISCONNECTED** (timer); auto-fold when timer expires.

Zero chips after payout: remain **SEATED** but **SITTING_OUT** (or **LEAVING** if user chose to leave).

### Table State Machine (per hand)

- **WAITING** (need ≥2 active seats)
- **BLINDS** (assign button/SB/BB; collect blinds)
- **DEALING_HOLE** (2 cards each in order starting SB → …)
- **PRE_FLOP** (betting round)
- **FLOP** (deal 3; betting)
- **TURN** (deal 1; betting)
- **RIVER** (deal 1; betting)
- **SHOWDOWN** (if ≥2 players not folded and not all folded earlier)
- **PAYOUT** (rank, resolve side pots, split, rake)
- **ROTATE** (move button to next active seat)
- **CLEANUP** (reset per-hand fields) → back to **WAITING** or **BLINDS**

#### BLINDS

- Dealer button moves to the next seated player clockwise. In heads-up, the button also posts the small blind.
- Attempt to auto-post the small and big blinds:
  - If a stack covers the blind, deduct it and mark the bet for this round.
  - Short stacks may post all-in for their remaining chips.
- Players unable to post are marked sitting out and blinds are reassigned. If only one player can post, the table returns to **WAITING**.
- Pre-flop action begins left of the big blind, except heads-up where the button acts first and the big blind acts first on later streets.

