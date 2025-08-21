# Design Rules and Guidelines

These guidelines describe architectural principles for the poker backend to
ensure modularity, maintainability, and future extensibility. They complement
[`modules.md`](./modules.md) and [`game-states.md`](./game-states.md), which
detail how these principles map to concrete components.

## Modular Architecture

- **Separation of Concerns**: Distinct modules handle networking, game logic, randomness, hand evaluation, and persistence.
- **Replaceable Components**: Each module communicates through clearly defined interfaces. Implementations (e.g., RNG provider or evaluation library) can be swapped without changing consumers.
- **State Machine Core**: The game engine exposes a state machine (see
  [`game-states.md`](./game-states.md)). All state transitions originate from
  the core to avoid inconsistent logic scattered across modules.

## Security and Fairness

- **Secure RNG**: Use cryptographically secure randomness for shuffling and card distribution. Prefer verifiable sources when available.
- **Card Secrecy**: Only the server knows all card assignments. Clients receive only the information pertinent to them.
- **Auditing**: Log significant actions and state transitions to immutable storage for dispute resolution.

## Resilience

- **Timeout Handling**: Every player action is bounded by a timer; default resolutions (auto-check/fold) occur when it expires.
- **Timebank**: A per-player reserve extends the action timer automatically before a forced action is applied.
- **Disconnect Recovery**: Persist user state so that reconnecting clients can resume seamlessly. Disconnected players are treated as passive until the timer expires.
- **Graceful Degradation**: Critical failures move the table to a Paused state while allowing unaffected tables to continue.

## Testing and Upgrades

- **Extensive Test Coverage**: Unit and integration tests validate state transitions and module contracts.
- **Versioned APIs**: Public interfaces are versioned to allow backwards-compatible enhancements.
- **Continuous Deployment**: Automate deployment with rollback capability so that upgrades can happen without downtime.

## Documentation

- Document all public APIs and state transitions.
- Include examples of module interactions and recommended patterns in this `docs/` directory.

