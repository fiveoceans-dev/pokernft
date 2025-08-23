# Networking Contract

This document defines the WebSocket protocol between poker clients and the
server. All client commands are idempotent and carry a unique `cmdId`; the
server ignores duplicates and always replies with the authoritative state. See
[`multi-player-server.md`](./multi-player-server.md) for session creation and
[`modules.md`](./modules.md) for how the `EventBus` module feeds these events to
clients.

## Server → Client Events

All server events include a `tableId` field so that clients can route updates to
the appropriate table. The following event types are emitted:

- `SESSION {userId}` – the server has assigned an ephemeral Starknet-style
  address to this connection.
- `TABLE_SNAPSHOT` – full `Table` state for reconciliation.
- `HAND_START` – a new hand has begun.
- `BLINDS_POSTED` – blinds have been applied for the hand.
- `DEAL_HOLE` – server reveals two cards to the specified `seat`.
- `ACTION_PROMPT {actingIndex, betToCall, minRaise, timeLeftMs}` – notify the
  next acting player.
- `PLAYER_ACTION_APPLIED {playerId, action, amount?}` – a validated action was
  processed.
- `ROUND_END {street}` – current betting round completed.
- `DEAL_FLOP` / `DEAL_TURN` / `DEAL_RIVER` – community cards dealt for each
  street.
- `SHOWDOWN {revealOrder}` – order of hand revelation at showdown.
- `PAYOUT {potBreakdown}` – distribution of the pot(s).
- `HAND_END` – hand concluded and state will reset shortly.
- `BUTTON_MOVED {buttonIndex}` – dealer button advanced to the new position.
- `PLAYER_JOINED {seat, playerId}` – a player sat in the specified seat.
- `PLAYER_LEFT {seat, playerId}` – a seat was vacated.
- `PLAYER_DISCONNECTED {seat, playerId}` – a player's connection dropped but the seat is held briefly.
- `PLAYER_REJOINED {seat, playerId}` – a disconnected player reconnected before their seat was released.
- `ERROR {code,msg}` – any recoverable error. Clients should surface the
  message to the user and resynchronise using the snapshot.

## Client → Server Commands

Every command must carry a `cmdId` field. If the server receives the same
`cmdId` again it simply resends the latest `TABLE_SNAPSHOT` without applying the
command.

- `SIT {tableId, buyIn}` – take a seat at the specified table with the provided
  buy‑in amount.
- `LEAVE` – vacate the current seat.
- `SIT_OUT` – mark the player sitting out next hand.
- `SIT_IN` – return a previously sitting out player to action.
- `POST_BLIND {blindType}` – post a small or big blind when prompted.
- `ACTION {Fold|Check|Call|Bet|Raise|AllIn, amount}` – perform a betting action.
- `REBUY {amount}` – add chips to the player's stack.

## Additional Guarantees

- The server processes incoming commands in the order they are received and validates that the sender matches the current `actingIndex`. Out‑of‑turn actions are rejected with an `ERROR` response and do not reset any timers.
- If a player disconnects while it is their turn, a separate grace timer runs. When it expires the player's `timebankMs` is consumed before the server issues an automatic `Fold` or `Check`.
