# Showdown & Payouts

This document outlines how a hand transitions from showdown to awarding chips.
Responsibilities are mainly handled by the `HandEvaluator` and `PotManager`
modules described in [`modules.md`](./modules.md). The surrounding state
transitions are covered in [`game-states.md`](./game-states.md).

## When does a showdown occur?

- End of river betting when at least two players have not folded.
- An earlier betting round ends with one or more players all-in and all remaining board cards have been dealt.

## Reveal order

- If the river was checked down, the first player to the left of the button exposes their hand first (table policy may vary).
- Otherwise the last aggressor reveals first. Remaining eligible players may either muck or show to claim the pot.

## Hand evaluation

For each pot that still has contenders:

1. Consider only non-folded players whose chips make them eligible for that pot.
2. From each player's two hole cards and the five community cards, compute the best five-card hand.
3. Rank hands and identify any ties.
4. Split the pot equally among the winning players. If the chips cannot be divided evenly, award the leftover chip(s) by house rule
   (e.g. first winner clockwise from the button).

## Payout

- Transfer chips from each pot to its winning players and update their stacks.
- Remainder chips from split pots are given one at a time starting with the first winning seat clockwise from the button.
- A player reduced to zero chips cannot post blinds on the next hand. If re-buy is allowed, they are marked `SITTING_OUT` and must reload to at least the `minToPlay` amount (big blind by default) before being dealt in again. Otherwise their seat is cleared immediately.

## Post-hand cleanup & next hand

- `resetTableForNextHand` clears per-hand state, rotates the dealer button with `advanceButton` and prepares active players for the next deal.
- After `interRoundDelayMs`, `TableManager.startHand` shuffles a fresh deck and begins the next hand if at least two players remain; otherwise the table returns to `WAITING`.
