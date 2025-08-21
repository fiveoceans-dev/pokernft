# Turn Order & Seating Structures

This document outlines data structures typically used in poker software to
ensure players act in the correct sequence and that seats remain consistent
throughout play. See [`modules.md`](./modules.md) for the modules that consume
these structures and [`game-states.md`](./game-states.md) for where turn changes
occur in the hand lifecycle.

## Turn Management

- Maintain a circular array of seat objects representing each position at the table.
- Track the `actingIndex` pointing to the seat whose turn it is.
- A helper such as `nextActiveSeat(startIndex)` advances clockwise, skipping seats that are `null`, `SITTING_OUT`, `FOLDED`, or `ALL_IN`.
- Actions are only accepted from the player at `actingIndex`. Invalid or out-of-turn actions are rejected.
- After a valid action, update `actingIndex` to the next active seat and determine if the betting round is complete.

## Seat Structure

- Each seat holds either a `Player` object or `null` when empty.
- Seat objects persist across hands so that identifiers, stack sizes, and configuration flags remain stable.
- Transitions such as a player leaving or sitting out update the seat state rather than reshuffling the array, preserving turn order.
- Utility functions should safely insert or remove players while maintaining the circular structure.

## Architecture

Most poker engines organize state into three core models:

1. **Player** – chips, hand cards, and current status such as folded or all-in.
2. **Seat** – table position referencing a `Player` or `null` when empty.
3. **Table** – collection of seats plus metadata like blind sizes, button index, pot, and deck state.

The table acts as the single source of truth and exposes an API to specialized modules:

- **TurnManager** – tracks `actingIndex`, validates whose turn it is, and advances to the next active seat.
- **BettingEngine** – verifies bet sizes, builds pots, and determines round completion.
- **BlindManager** – posts blinds/antes and handles dead-blind returns.
- **Dealer** – shuffles, deals cards, and progresses through hand stages.

Each module reads from and mutates the table state through clear interfaces so that actions can be audited and replayed deterministically. A typical hand flows through these steps:

1. `BlindManager` posts blinds and updates stacks.
2. `Dealer` deals cards and initializes `actingIndex`.
3. The game loop calls `TurnManager` to request the next action.
4. Accepted actions are processed by `BettingEngine`, which may update pots and signal round completion.
5. When a betting round ends, `Dealer` advances the stage or awards the pot.

By centralizing state and isolating responsibilities, the architecture maintains seat integrity and enforces turn order even as players join, leave, or sit out.
