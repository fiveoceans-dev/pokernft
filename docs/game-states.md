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
- **Actions**: Board, pots and per-hand metadata are reset.
- **Exit**: Table returns to **WAITING** for the next hand.

### **PAUSED** _(optional)_

- **Entry**: Critical error, manual intervention or network partition.
- **Actions**: No gameplay. Admins or automated recovery processes may attempt to resolve the issue.
- **Exit**: Resolved back to previous state or terminated.

## Additional Considerations

- **State Persistence**: Transitions are logged for auditing and recovery.
- **Reconnection Logic**: Rejoining players receive a replay of missing state changes.
- **Security**: Deck shuffling and card dealing happen server-side; clients only receive authorised information.
