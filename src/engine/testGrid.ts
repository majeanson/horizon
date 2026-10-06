// Deterministic generators for the engine's property tests.
//
// A property test says « for EVERY input of this kind, this holds » — monotonicity, caps, invariances
// — which a handful of hand-picked examples cannot. No property-testing library: the domain's
// properties are over a few scalars, a seeded generator gives the same cases on every machine and
// every run, and a failure names the seed and the case index that reproduces it exactly. (If a bug
// ever escapes a grid like this one, that is the day to reach for fast-check.)

/** A small, fast, seedable generator of numbers in [0, 1). Same seed, same sequence, anywhere. */
export function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/** A float in [lo, hi). */
export const between = (r: () => number, lo: number, hi: number): number => lo + (hi - lo) * r()

/** An integer in [lo, hi]. */
export const intBetween = (r: () => number, lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1))

/** Every value from `lo` to `hi` by `step` — an exhaustive grid for a single scalar. */
export function range(lo: number, hi: number, step = 1): number[] {
  const out: number[] = []
  for (let x = lo; x <= hi + 1e-9; x += step) out.push(Math.round(x * 1e9) / 1e9)
  return out
}

/** `n` cases from one seed — each case is built by `make` from the shared generator. */
export function cases<T>(seed: number, n: number, make: (r: () => number, i: number) => T): T[] {
  const r = lcg(seed)
  return Array.from({ length: n }, (_, i) => make(r, i))
}
