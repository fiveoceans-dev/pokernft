# Heads-Up Specifics

When only two players remain in a hand, turn order and blinds differ from multi-way play:

- **Button equals Small Blind** – the player on the button posts the small blind.
- **Preflop** – the button (small blind) acts first.
- **Postflop** – the player without the button (big blind) acts first on the flop, turn and river.
- **Side pots** – side-pot and all-in logic are unchanged.

These rules are enforced by `BlindManager.assignBlindsAndButton` and `BettingEngine.startBettingRound`.
