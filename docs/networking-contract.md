# Networking Contract

This document outlines the WebSocket messages exchanged between the server and clients.

## Server → Client Events

- `TABLE_SNAPSHOT { table }`
- `HAND_START`
- `BLINDS_POSTED`
- `DEAL_HOLE`
- `ACTION_PROMPT { actingIndex, betToCall, minRaise, timeLeftMs }`
- `PLAYER_ACTION_APPLIED`
- `ROUND_END { street }`
- `DEAL_FLOP` / `DEAL_TURN` / `DEAL_RIVER`
- `SHOWDOWN { revealOrder }`
- `PAYOUT { potBreakdown }`
- `HAND_END`
- `BUTTON_MOVED`
- `ERROR { code, msg }`

## Client → Server Commands

- `SIT { buyIn }`
- `LEAVE`
- `SIT_OUT`
- `SIT_IN`
- `POST_BLIND { type }`
- `ACTION { Fold|Check|Call|Bet|Raise|AllIn, amount }`
- `REBUY { amount }`

All commands include a unique `cmdId` and are **idempotent**. The server ignores
duplicate `cmdId`s and always replies with the authoritative `TABLE_SNAPSHOT`.
