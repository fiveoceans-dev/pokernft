# Project Structure

This monorepo uses **Yarn 3** workspaces to separate the web client and smart
contract code. Documentation lives in `docs/` and covers the backend modules and
state machines that power the engine.

## Root

- `package.json` – workspace configuration and shared scripts.
- `docs/` – design documents including [modules](./modules.md),
  [game-states](./game-states.md) and [turn-order-and-seating](./turn-order-and-seating.md).
- `packages/` – all runnable source code lives inside these packages.

## `packages/nextjs`

Next.js application that serves the PokerNFTs UI and API routes.

Directory highlights:

- `app/` – React components and routing.
- `lib/` – shared utilities used by server and client modules.
- `tests/` – Vitest unit tests.

## `packages/snfoundry`

Cairo smart contracts and scripts for Starknet Foundry.

Directory highlights:

- `src/` – contract sources.
- `lib/` – reusable Cairo libraries.
- `tests/` – `snforge` test suites.

## Extending the Layout

Add new top-level folders within the appropriate package and update this document when the project grows.
