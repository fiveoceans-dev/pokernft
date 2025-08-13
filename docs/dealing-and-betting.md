# Dealing & Betting Rounds

This document describes how cards are dealt and betting rounds proceed in a no‑limit Texas Hold'em hand.

## Dealing Order

- **Hole cards**: Starting with the small blind and moving clockwise, the dealer distributes one card at a time until each player has two.
- **Board cards**: For each street, the dealer burns one card (optional) and then reveals:
  - **Flop**: three community cards
  - **Turn**: one community card
  - **River**: one community card

## Betting Rounds & Acting Order

- **Preflop**: the first active player to the left of the big blind acts first. In heads‑up play the small blind acts first.
- **Flop / Turn / River**: the first active player to the left of the button acts first. In heads‑up play the big blind acts first.

See [Heads-Up Specifics](./heads-up.md) for a concise summary of the two-player rules.

## Legal Actions

Players take turns and may perform one of the following actions:

- **Fold** – leave the hand immediately.
- **Check** – only allowed when `betToCall` is `0`.
- **Call** – commit `betToCall - betThisRound` chips.
- **Bet** – only allowed when `betToCall` is `0`; sets a new `betToCall`.
- **Raise** – call first, then increase the wager by at least the current `minRaise`.
- **All‑in** – commit up to the remaining stack; counts as a raise only if it meets `minRaise`.

## Min‑Raise Logic (No‑Limit)

- Track the size of the last aggressive raise (`lastAggressiveRaiseSize`).
- At the start of preflop, the minimum raise is the big blind amount.
- After a bet or raise, the next raise must be at least the size of the previous raise.
- Short all‑ins below the minimum raise do not re‑open the action for players who have already acted.

## Round Completion

A betting round ends when any of the following occurs:

- All active players either fold or match the highest commitment (calls or checks), and no further action is possible.
- Only one player remains; the hand ends immediately without dealing remaining board cards.
- All players are all‑in; the remaining board cards are dealt without further betting and the hand proceeds to showdown.
