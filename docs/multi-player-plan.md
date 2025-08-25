# Multiplayer Workflow Plan

This document captures the roadmap for turning the prototype WebSocket server into a fully featured multiplayer poker table.
It reflects the current state of the codebase and enumerates the remaining work.

## Current Status

- Sessions are identified by a random `sessionId` and can be attached to a wallet-based `userId` via the `ATTACH` command.
- `SessionManager` prevents multiple simultaneous sessions for the same wallet and supports a disconnect grace period.
- Table logic on the server still relies on low-level room helpers; the front end runs a local game engine.

## Next Steps

1. **GameEngine Integration**
   - Instantiate a `GameEngine` per table and subscribe to `stateChanged`, `stageChanged` and `handEnded` events.
   - Replace direct calls to `startRoomHand`, `handleAction` and `progressStage` with `engine.startHand`, `engine.handleAction` and `engine.progressStage`.
   - Expose the engine’s internal `GameRoom` for snapshot broadcasts.

2. **Seat Enforcement**
   - Use `SeatingManager` to ensure one seat per wallet ID and track seat assignments for reconnection.

3. **Lifecycle Events**
   - Extend `ServerEvent` with `PLAYER_JOINED`, `PLAYER_LEFT`, `PLAYER_DISCONNECTED` and `PLAYER_REJOINED`.
   - Emit these events on seat changes and when disconnect timers fire or are cleared.

4. **Disconnect & Reconnect Flow**
   - Immediately broadcast `PLAYER_DISCONNECTED` when a socket closes and remove the player after the grace period.
   - Add a `REATTACH` command branch that calls `handleReconnect` and broadcasts `PLAYER_REJOINED` when the timer is cleared.

5. **Frontend Refactor**
   - Replace the local `GameEngine` in `useGameStore` with a WebSocket-driven store.
   - On mount, send `ATTACH` using the stored wallet ID and process snapshots and server events to update state.
   - Provide actions that send `ClientCommand`s (`SIT`, `ACTION`, `REBUY`, etc.) over the socket.

6. **Integration Tests**
   - Add tests simulating two WebSocket clients covering connect → seat → action → disconnect → reconnect flows.

7. **Optional Persistence**
   - Persist sessions and table snapshots in Redis so disconnect timers and game state survive server restarts.

These tasks build upon the existing session infrastructure to deliver a synchronized multiplayer experience for a single table.
