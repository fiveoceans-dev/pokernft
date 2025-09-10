# @pokernft/engine (Planned)

Pure TypeScript poker engine. Extracted from `packages/nextjs/server/game-engine`.

- No Node/browser globals; inject RNG/timer/persistence via ports.
- Exports: `EventEngine`, `reduce`, domain types.
- Tests: unit and integration, deterministic seeds.

This is a placeholder until migration (see docs/architecture/ADR-001-Architecture-Realignment.md).

