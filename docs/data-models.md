# Core Poker Data Models

The backend exposes strongly typed interfaces that describe the state of a poker table. The key models are defined in `packages/nextjs/backend/types.ts` and are summarised below for reference.

## Player

Represents a seat at the table.

| Field            | Description                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `id`             | Unique player identifier                                                                         |
| `seatIndex`      | Seat position in the table array                                                                 |
| `stack`          | Chips currently available                                                                        |
| `state`          | One of `EMPTY`, `SEATED`, `SITTING_OUT`, `ACTIVE`, `FOLDED`, `ALL_IN`, `DISCONNECTED`, `LEAVING` |
| `hasButton`      | Player holds the dealer button this hand                                                         |
| `autoPostBlinds` | Automatically post blinds when required                                                          |
| `timebankMs`     | Accumulated extra action time in milliseconds                                                    |
| `betThisRound`   | Chips committed in the current betting round                                                     |
| `totalCommitted` | Total chips committed across all rounds of the hand                                              |
| `holeCards`      | Up to two face-down cards                                                                        |
| `lastAction`     | Last action taken: `NONE`, `FOLD`, `CHECK`, `CALL`, `BET`, `RAISE` or `ALL_IN`                   |

`SITTING_OUT` players remain seated but are not dealt until they buy in again. `LEAVING` denotes a player scheduled to be removed after the hand.

## Table

Describes the state of the table for the current hand.

| Field                                        | Description                                                                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `seats`                                      | Circular array of `Player \| null`                                                                                                         |
| `buttonIndex`                                | Seat with the dealer button                                                                                                                |
| `smallBlindIndex` / `bigBlindIndex`          | Seats responsible for blinds                                                                                                               |
| `smallBlindAmount` / `bigBlindAmount`        | Blind sizes                                                                                                                                |
| `minBuyIn` / `maxBuyIn`                      | Buy‑in limits                                                                                                                              |
| `state`                                      | Current `TableState` (`WAITING`, `BLINDS`, `DEALING_HOLE`, `PRE_FLOP`, `FLOP`, `TURN`, `RIVER`, `SHOWDOWN`, `PAYOUT`, `ROTATE`, `CLEANUP`) |
| `deck`                                       | Remaining cards in the deck                                                                                                                |
| `board`                                      | Community cards on the table                                                                                                               |
| `pots`                                       | Array of `{ amount, eligibleSeatSet }` including side pots                                                                                 |
| `currentRound`                               | Betting round (`PREFLOP`, `FLOP`, `TURN`, `RIVER`)                                                                                         |
| `actingIndex`                                | Seat whose turn it is or `null` when idle                                                                                                  |
| `betToCall`                                  | Highest commitment to match in the current round                                                                                           |
| `minRaise`                                   | Minimum raise size per no‑limit rules                                                                                                      |
| `actionTimer`                                | Default action time in milliseconds                                                                                                        |
| `interRoundDelayMs` / `dealAnimationDelayMs` | Timing helpers for UX                                                                                                                      |
| `rakeConfig`                                 | Optional rake percentage, cap and minimum                                                                                                  |

## HandLog

Immutable record for each completed hand.

| Field                | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `handId` / `tableId` | Identifiers for the hand and table                           |
| `startTs` / `endTs`  | Start and end timestamps                                     |
| `initialStacks`      | Player stacks at hand start                                  |
| `seatMap`            | Mapping of seat index to player id                           |
| `actions`            | Sequence of `{ playerId, round, action, amount, elapsedMs }` |
| `deckSeed`           | Seed or hash for deck permutation                            |
| `pots`               | Final pot structures including side pots                     |
| `winners`            | Array of `{ playerId, amount, potIndexes }`                  |
| `rake`               | Optional rake taken from pots                                |

These definitions provide a consistent contract between the backend engine and any consuming services or clients.
