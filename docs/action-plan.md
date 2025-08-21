# Implementation Action Plan

This roadmap outlines a sequential plan to deliver the poker dApp from the user interface through the backend engine and multiplayer layer. Each subsection lists concrete requirements so developers can implement or revise code confidently.

## 1. User Interface

1.1 **Table & Lobby Views**
- Build Next.js pages for lobby selection and in-table play.
- Apply MVVM: keep React components dumb and derive state from the engine via hooks.
- Render seat positions, chip counts and action prompts based on state updates.

1.2 **Player Interaction**
- Emit `PlayerAction` messages defined in the [networking contract](./networking-contract.md).
- Provide buttons for `FOLD`, `CHECK/CALL`, `BET/RAISE` with amount input respecting `minRaise`.
- Show countdown timers from `TimerService` and visually mark auto-folds.

1.3 **Wallet & Session**
- Integrate Starknet wallet connection for address display and signature.
- Persist session tokens and reconnect automatically on refresh.

## 2. Poker Engine Backend

2.1 **Table Lifecycle**
- Implement `TableManager.startHand` → `BlindManager.assignBlindsAndButton` → `Dealer.dealHole` chain.
- After each hand call `resetTableForNextHand` to rotate seats and cleanup.

2.2 **Module Requirements**
1. **SeatingManager**
   - Maintain fixed seat indexes; enforce buy-in limits and sit-out rules.
2. **BlindManager**
   - Auto-post blinds; support heads-up ordering and dead-blind returns.
3. **Dealer**
   - Shuffle with deterministic PRNG and log seed per hand.
4. **BettingEngine**
   - Validate turn order and min-raise; expose `applyAction` and `startRound` helpers.
5. **PotManager**
   - Track commitments and rebuild side pots on all-ins; log rake taken.
6. **HandEvaluator**
   - Rank hands and resolve ties for split pots.
7. **TimerService**
   - Run per-action countdowns with timebank and disconnect grace.
8. **EventBus**
   - Broadcast state changes and queue validated commands.
9. **Persistence/Audit**
   - Store immutable action logs for replay and anti-fraud analysis.

2.3 **Testing**
- Cover min-raise reopen cases, multi-way side pots and dead-blind returns as listed in [TODO](./TODO.md).

## 3. Multiplayer Networking

3.1 **WebSocket Gateway**
- Implement server following [networking-contract](./networking-contract.md).
- Relay `GameEvent` updates from the engine and route `PlayerAction` commands.

3.2 **Session Management**
- Assign one Starknet-style address per connection; block concurrent logins.
- Expire sessions on disconnect after grace period from `TimerService`.

3.3 **Scalability**
- Support multiple tables by namespacing events and isolating game state per room.
- Prepare for horizontal scaling by keeping sessions stateless and persisting hands.

---

This action plan complements the design details in [modules.md](./modules.md) and provides a numbered path for implementation across the stack.
