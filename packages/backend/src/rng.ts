export interface RNG {
  next(): number;
}

class DefaultRNG implements RNG {
  next(): number {
    return Math.random();
  }
}

let current: RNG = new DefaultRNG();

export function setRNG(rng: RNG) {
  current = rng;
}

export function random(): number {
  return current.next();
}

export function randomInt(max: number): number {
  return Math.floor(random() * max);
}

export { RNG as RandomGenerator };
