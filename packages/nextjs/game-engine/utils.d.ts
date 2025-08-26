import type { Card } from "./types";
export declare function freshDeck(seed?: string): Card[];
/** Convenience alias used by higher level room logic */
export declare const dealDeck: typeof freshDeck;
/** Fisher-Yates in-place shuffle (returns same ref for convenience) */
export declare function shuffle<T>(array: T[]): T[];
/** Deterministic shuffle using a string seed */
export declare function shuffleWithSeed<T>(array: T[], seed: string): T[];
/** Draws & returns the **top** card (mutates deck) */
export declare function draw(deck: Card[]): Card;
/** Convert a numeric card code (0..51) into a Card object */
export declare function indexToCard(code: number): Card;
/** Convert a Card object back into its numeric code (0..51) */
export declare function cardToIndex(card: Card): number;
