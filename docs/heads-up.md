# Heads-Up Specifics

When only two players remain in a hand, turn order and blinds differ from
multi-way play. This note supplements [`dealing-and-betting.md`](./dealing-and-betting.md)
with heads-up specific rules.

## Summary

- **Button = SB** – the player on the button posts the small blind.
- **Preflop** – the small blind on the button acts first.
- **Postflop** – the player without the button (big blind) acts first.
- **Side pots** – side‑pot logic remains identical to multi‑way play.

These rules are enforced by `BlindManager.assignBlindsAndButton` and `BettingEngine.startBettingRound`.
