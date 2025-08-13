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
- **Actions**:
  - Dealer button moves to the next seated player clockwise. In heads-up, the button also posts the small blind.
  - Small and big blinds are posted (automatically or by prompt).
- **Exit**: Blinds committed by required players.
- **Edge Cases**: Missing blinds result in the player sitting out or being removed.

### 3. **DEALING_HOLE**

- **Entry**: Blinds posted.
- **Actions**: Deck is shuffled and two hole cards dealt to each seated player.
- **Exit**: All players receive cards.
- **Edge Cases**: Disconnected players keep cards face down and are auto-folded if still absent when action reaches them.

### 4. **PRE_FLOP**

- **Entry**: Hole cards dealt.
- **Actions**: First betting round starting from the player left of the big blind. In heads-up play the button acts first.
- **Exit**: Betting closes when all active players have matched the highest bet or folded.
- **Edge Cases**: Expired action timer triggers auto-check or auto-fold. All-ins create side pots.

### 5. **FLOP**

- **Entry**: Pre-flop betting round completed.
- **Actions**: Three community cards dealt followed by a betting round. In heads-up play the big blind acts first.
- **Exit/Edge Cases**: Same as **PRE_FLOP**.

### 6. **TURN**

- **Entry**: Flop betting round completed.
- **Actions**: One community card dealt followed by a betting round. In heads-up play the big blind acts first.
- **Exit/Edge Cases**: Same as **PRE_FLOP**.

### 7. **RIVER**

- **Entry**: Turn betting round completed.
- **Actions**: Final community card dealt followed by the last betting round. In heads-up play the big blind acts first.
- **Exit/Edge Cases**: Same as **PRE_FLOP**.

### 8. **SHOWDOWN**

- **Entry**: Final betting round completed with more than one player remaining.
- **Actions**: Remaining hands are revealed and ranked.
- **Exit**: Winners determined and pot shares calculated.
- **Edge Cases**: Disconnected players' hands are revealed automatically; ties and split pots handled by the evaluator.

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
- **Actions**: Board, pots and per-hand metadata are reset. Players marked **LEAVING** are removed and, if the button seat becomes empty, the button advances to the next active player.
- **Exit**: If at least two active players can post the blinds, the table waits `interRoundDelayMs` then returns to **BLINDS**. Otherwise it falls back to **WAITING**.

### **PAUSED** _(optional)_

- **Entry**: Critical error, manual intervention or network partition.
- **Actions**: No gameplay. Admins or automated recovery processes may attempt to resolve the issue.
- **Exit**: Resolved back to previous state or terminated.

## Additional Considerations

- **State Persistence**: Transitions are logged for auditing and recovery.
- **Reconnection Logic**: Rejoining players receive a replay of missing state changes.
- **Security**: Deck shuffling and card dealing happen server-side; clients only receive authorised information.

## Seat, Player & Table States

### Player State Machine (per hand)

SEATED → (ACTIVE | SITTING_OUT)

On new hand:

- If stack ≥ `minToPlay` (≥ BB by default) and not sitting out → **ACTIVE**.
- Else → **SITTING_OUT**.

During betting:

- **ACTIVE** → **FOLDED** on Fold.
- **ACTIVE** → **ALL_IN** if action commits all chips.

Disconnection: **ACTIVE** → **DISCONNECTED** (timer); auto-fold when timer expires.

End of hand:

- Stack == 0 & re-buy allowed → **SITTING_OUT** until stack ≥ `minToPlay`.
- Stack == 0 & no re-buy → seat cleared immediately.
- Voluntary sit-out toggle → **SITTING_OUT** next hand.
- **LEAVING** during hand → seat becomes **EMPTY**.

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
- Players unable to post are marked sitting out and blinds are reassigned. Returning players with missed blinds either post them as dead chips or wait for the big blind depending on `deadBlindRule`. If only one player can post, the table returns to **WAITING**.
- Pre-flop action begins left of the big blind, except heads-up where the button acts first and the big blind acts first on later streets.
