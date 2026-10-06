import { isCited, plain, type Bracket, type Cited, type Plain } from './cited.ts'

// Projecting a parameter tree into a year no official page covers yet.
//
// The government publishes next year's figures a few months ahead of the year, so a plan that
// runs to age 95 spends nearly all of its life in years nobody has published. Those years are
// PROJECTED from the last known one by each figure's own index rule — and every projected row
// says so (`projected: true`), so the UI can show « projeté » beside a number that is an
// assumption, not a citation.
//
// The projection is CUMULATIVE — `round(last × (1 + i)^n)` — not iterated year by year. The
// difference is at most a dollar or two on a bracket 30 years out, which is lost in the
// uncertainty of the inflation assumption itself, and it is the only reading under which the
// TFSA limit (rounded to the nearest $500 *from cumulative indexation*) behaves: iterating a
// round-to-$500 on 7 000 × 1.02 never leaves 7 000.

export interface Indexation {
  /** Annual consumer-price inflation, as a fraction (0.02 = 2 %). */
  inflation: number
  /** Annual average-wage growth, as a fraction. Drives the RRQ's wage-indexed ceilings. */
  wageGrowth: number
}

/** Round to a multiple of `step`, taming binary floating point for cent-sized steps. */
export function roundTo(x: number, step: number): number {
  if (step >= 1) return Math.round(x / step) * step
  const decimals = Math.max(0, Math.ceil(-Math.log10(step)))
  return Number((Math.round(x / step) * step).toFixed(decimals))
}

const isBracketList = (v: unknown): v is Bracket[] =>
  Array.isArray(v) && v.length > 0 && v.every((b) => typeof b === 'object' && b !== null && 'rate' in b && 'upTo' in b)

function scaleValue(v: unknown, factor: number, round: number | undefined): unknown {
  const r = (x: number) => (round === undefined ? x : roundTo(x, round))
  if (typeof v === 'number') return r(v * factor)
  // A scale's THRESHOLDS move with the index; its RATES are statute and do not.
  if (isBracketList(v)) return v.map((b) => ({ upTo: b.upTo === null ? null : r(b.upTo * factor), rate: b.rate }))
  // A table (RRIF factors by age) or a flag is not a money amount: it does not scale.
  return v
}

function factorFor(c: Cited<unknown>, a: Indexation, years: number): number {
  if (c.index === 'cpi') return (1 + a.inflation) ** years
  if (c.index === 'wage') return (1 + a.wageGrowth) ** years
  return 1
}

/** The tree, `years` ahead, still cited (sources kept, values moved). */
export function advance<T>(tree: T, a: Indexation, years: number): T {
  if (isCited(tree)) {
    const f = factorFor(tree, a, years)
    return f === 1 ? tree : ({ ...tree, value: scaleValue(tree.value, f, tree.round) } as T)
  }
  if (Array.isArray(tree)) return tree.map((x) => advance(x, a, years)) as T
  if (typeof tree === 'object' && tree !== null) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(tree)) out[k] = advance(v, a, years)
    return out as T
  }
  return tree
}

/**
 * Parameters for `year` out of a registry of known years.
 *   · a known year        → its own figures, `projected: false`
 *   · a year after them   → the LAST known year moved by each figure's index rule, `projected: true`
 *   · a year before them  → an error: the past comes from a person's own statement, never from here
 */
export function resolveYear<T extends { year: number }>(
  registry: Readonly<Record<number, T>>,
  year: number,
  a: Indexation,
): Plain<T> & { projected: boolean } {
  const known = registry[year]
  if (known) return { ...plain(known), projected: false }
  const years = Object.keys(registry).map(Number)
  const first = Math.min(...years)
  const last = Math.max(...years)
  if (year < first) throw new Error(`no parameters before ${first}: a past year comes from the person's own statement, not from this engine (asked for ${year})`)
  const moved = advance(registry[last], a, year - last)
  return { ...plain(moved), year, projected: true }
}
