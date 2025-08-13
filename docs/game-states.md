# Poker Table State Machine

This document describes the server-side `TableState` lifecycle for a single no-limit Texas Hold'em table. Each state has clear entry conditions, responsibilities and exit criteria.

## States

### 1. **WAITING**
- **Entry**: Table created or previous hand cleaned up.
- **Actions**: Players join, leave or buy in. Backend validates seats and buy-ins.
- **Exit**: Minimum required players are ready.
- **Edge Cases**: Disconnected players may lose their seat after a timeout.

### 2. **BLINDS**
- **Entry**: Enough players are seated.
- **Actions**: Small and big blinds are posted (automatically or by prompt).
- **Exit**: Blinds committed by required players.
- **Edge Cases**: Missing blinds result in the player sitting out or being removed.

### 3. **DEALING_HOLE**
- **Entry**: Blinds posted.
- **Actions**: Deck is shuffled and two hole cards dealt to each seated player.
- **Exit**: All players receive cards.
- **Edge Cases**: Disconnected players keep cards face down and are auto-folded if still absent when action reaches them.

### 4. **PRE_FLOP**
- **Entry**: Hole cards dealt.
- **Actions**: First betting round starting from the player left of the big blind.
- **Exit**: Betting closes when all active players have matched the highest bet or folded.
- **Edge Cases**: Expired action timer triggers auto-check or auto-fold. All-ins create side pots.

### 5. **FLOP**
- **Entry**: Pre-flop betting round completed.
- **Actions**: Three community cards dealt followed by a betting round.
- **Exit/Edge Cases**: Same as **PRE_FLOP**.

### 6. **TURN**
- **Entry**: Flop betting round completed.
- **Actions**: One community card dealt followed by a betting round.
- **Exit/Edge Cases**: Same as **PRE_FLOP**.

### 7. **RIVER**
- **Entry**: Turn betting round completed.
- **Actions**: Final community card dealt followed by the last betting round.
- **Exit/Edge Cases**: Same as **PRE_FLOP**.

### 8. **SHOWDOWN**
- **Entry**: Final betting round completed with more than one player remaining.
- **Actions**: Remaining hands are revealed and ranked.
- **Exit**: Winners determined and pot shares calculated.
- **Edge Cases**: Disconnected players' hands are revealed automatically; ties and split pots handled by the evaluator.

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
- **Actions**: In turn order, each active player can *fold*, *check/call*, or *bet/raise*.
- **Exit**: Betting is closed when all active players have matched the highest bet or folded. When a round ends, each player's `betThisRound` resets while `totalCommitted` persists for pot calculations.
  - **Edge Cases**:
  - **Disconnect**: A disconnected player is treated as “timebanked”. If the action timer expires, the backend auto-folds or checks based on game rules.
  - **Timeout**: Each player action is limited by a configurable timer. Expiration triggers auto-fold/check and records a timeout event.
  - **Insufficient Funds**: All-in rules apply automatically; the `PotManager` tracks commitments and rebuilds pots as thresholds are reached.
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
- **Actions**: The `PotManager` sorts total commitments into threshold layers, builds main and side pots, optionally rakes each pot, then awards chips and clears state.
- **Exit**: Payout complete.
- **Edge Cases**: 
- **Actions**: Chips are awarded, pots are cleared, and statistics updated.
- **Exit**: Payout complete. The table then pauses for `interRoundDelayMs` before the next hand.
- **Edge Cases**:
  - Transfer failure triggers retry logic; if unresolved, the table enters a Paused state pending admin resolution.

For detailed reveal order, evaluation, and payout rules, see [Showdown & Payouts](./showdown-payouts.md).

### 7. **Paused** _(optional)_

- **Entry**: Critical error, manual intervention, or network partition.
- **Actions**: No gameplay. Admins or automated recovery processes may attempt to resolve the issue.
- **Exit**: Resolved back to previous state or terminated.

### 9. **PAYOUT**
- **Entry**: Winners resolved.
- **Actions**: Chips are distributed, rake is applied and pots cleared.
- **Exit**: Stacks updated and pots emptied.
- **Edge Cases**: Transfer failures pause the table until resolved.

### 10. **ROTATE**
- **Entry**: Payout complete.
- **Actions**: Dealer button and blinds move to the next eligible players.
- **Exit**: Rotation finished.

### 11. **CLEANUP**
- **Entry**: Rotation complete.
- **Actions**: Board, pots and per-hand metadata are reset.
- **Exit**: Table returns to **WAITING** for the next hand.

## Additional Considerations
- **State Persistence**: Transitions are logged for auditing and recovery.
- **Reconnection Logic**: Rejoining players receive a replay of missing state changes.
- **Security**: Deck shuffling and card dealing happen server-side; clients only receive authorised information.
=======
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

## Starting & Ending a Hand

### Start Conditions

- At least two active players who can post blinds or are allowed to post all-in blinds.
- Button assigned to the next active seat from the previous hand; for the first hand, choose a random active seat.

### End Conditions

- If all but one player fold, the remaining player immediately receives the entire pot or pots.
- After a showdown, payouts are completed based on hand evaluation.

### Cleanup

- Clear the board, pots, `betToCall`, `minRaise`, and per-round commitments.
- Reset each player's `lastAction`, `betThisRound`, and `holeCards`.
- Move to **ROTATE** to advance the button to the next active seat.
- Proceed to **BLINDS** if at least two active players remain; otherwise return to **WAITING**.

#### BLINDS

- Dealer button moves to the next seated player clockwise. In heads-up, the button also posts the small blind.
- Attempt to auto-post the small and big blinds:
  - If a stack covers the blind, deduct it and mark the bet for this round.
  - Short stacks may post all-in for their remaining chips.
- Players unable to post are marked sitting out and blinds are reassigned. If only one player can post, the table returns to **WAITING**.
- Pre-flop action begins left of the big blind, except heads-up where the button acts first and the big blind acts first on later streets.
