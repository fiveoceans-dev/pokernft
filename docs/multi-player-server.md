# Multiplayer Server & Session Management

This document explains how the WebSocket server tracks client sessions and wallet-based player identities.
For message formats and command shapes, see [`networking-contract.md`](./networking-contract.md).

## Session Lifecycle

- When a client connects, the server issues a random **`sessionId`** and stores the WebSocket in `SessionManager`.
- The server immediately responds with a `SESSION` message so the client learns its connection identifier.
- A session becomes associated with a persistent user only after the client sends an `ATTACH` command containing its wallet address.
- The same session record holds both the temporary `sessionId` and the attached `userId`.
- Disconnects trigger a grace timer via `handleDisconnect`. Reconnecting with the same `userId` before expiry cancels the timer and restores the session.

## User Identifier

- The `userId` is the player's wallet address (`0x`-prefixed hexadecimal string).
- Clients supply this identifier when issuing `ATTACH`; the server no longer generates new user IDs on connect.
- `SessionManager.attach` rejects multiple simultaneous logins with the same `userId`, ensuring a single active connection per wallet.

## Guarantees

- One active WebSocket session per wallet address.
- `ServerEvent` messages include both `sessionId` and `userId` so clients can reconcile their identity after reattaching.
- Reconnecting within the grace window preserves table membership; expired sessions are removed from room state.
- Room snapshots are keyed by `userId` so reconnecting clients regain their seat and chip stack.

## Current Implementation Status

- Wallet-based session attachment and reconnection timers are implemented, and server events/snapshots reference user IDs.
- Table state is still managed via simple room helpers; integration with `GameEngine` and richer lifecycle events remain TODO.
