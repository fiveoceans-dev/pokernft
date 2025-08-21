# Multiplayer Server & Session Management

This document outlines how the poker server tracks connected players and guarantees unique identities.

## Session Lifecycle

- When a client connects, the server creates a new session object scoped to that network connection.
- Each session is associated with **exactly one user**. Additional connections must negotiate a separate session.
- Sessions terminate when the connection closes or when the server explicitly revokes them.

## User Identifier

- Upon session creation the server assigns a `userId` representing the player.
- The identifier is formatted like a Starknet public address: a 0x-prefixed hexadecimal string.
- Commands and events carry this `userId` so that state changes can be attributed to a single wallet-like address.

## Guarantees

- Only one user may exist per session; attempts to reuse or share a session are rejected.
- A fresh `userId` is generated for each new session, preventing collisions across reconnects.
- Future extensions may sign messages with a Starknet private key to prove control over the `userId`.
