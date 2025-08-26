export interface RNG {
    next(): number;
}
export declare function setRNG(rng: RNG): void;
export declare function random(): number;
export declare function randomInt(max: number): number;
export type { RNG as RandomGenerator };
/** Create a deterministic RNG from a string seed */
export declare function seededRNG(seed: string): RNG;
