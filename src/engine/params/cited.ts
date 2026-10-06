// The shape of a CITED government figure, and the machinery that strips the citations when the
// engine needs the plain number.
//
// Every figure that comes from an official page lives in src/engine/params/ as a `Cited` value:
// the number, the page it was read on, when it was read, and how it moves from one year to the
// next. The engine never sees a `Cited` — it reads `plain(...)` — while the UI and SOURCES.md
// read the cited tree. So a bare constant that is really a government figure has nowhere to
// hide: the type of the params tree is the type of a citation.
//
// This file imports nothing and runs under plain Node (npm run sources), so its relative imports
// elsewhere in the engine carry explicit `.ts` extensions.

/** Where a number was read. `retrieved` is the day a person (or this repo's tooling) read it. */
export interface Source {
  /** The official page — an https URL on an allow-listed host (cited.test.ts holds the list). */
  url: string
  /** The page's own title, as printed — not a paraphrase. */
  title: string
  /** YYYY-MM-DD. The day the figure was read off the page. */
  retrieved: string
  /** Anything a verifier needs: the table row, the footnote, why a derived value is derived. */
  note?: string
  /**
   * Present = this figure is NOT confirmed against a page a reader can open and compare, and this
   * says why (read through an archived copy because the agency blocks automated access, derived
   * from official figures by arithmetic, taken from a summary rather than the page itself).
   * SOURCES.md prints it as « À VÉRIFIER », the UI flags it, and a test holds the count to a ratchet
   * that may fall and never rise: an unconfirmed figure is allowed to exist, never to hide.
   */
  verify?: string
}

/**
 * How a value moves into a year no official page covers yet.
 *   cpi   — indexed by consumer prices (brackets, credits, pension amounts)
 *   wage  — indexed by average wages (the RRQ's pensionable-earnings ceilings)
 *   fixed — a statutory constant that does not move (a rate, a table of factors)
 *   none  — an observation, not a rule: it is never projected (a historical series)
 */
export type IndexRule = 'cpi' | 'wage' | 'fixed' | 'none'

/** One step of a progressive scale: the income up to which `rate` applies (null = no ceiling). */
export interface Bracket {
  upTo: number | null
  rate: number
}

export interface Cited<T = number> {
  value: T
  source: Source
  index: IndexRule
  /**
   * The official rounding of the PROJECTED value: 1 = nearest dollar, 500 = nearest $500 (the
   * TFSA limit), 0.01 = nearest cent (a monthly pension). Omitted = no rounding. This is data,
   * not code, so projection needs no per-field cases.
   */
  round?: number
}

/** What a `Cited` tree looks like once the citations are stripped. */
export type Plain<T> = T extends Cited<infer V>
  ? V
  : T extends readonly (infer U)[]
    ? Plain<U>[]
    : T extends object
      ? { [K in keyof T]: Plain<T[K]> }
      : T

export function isCited(x: unknown): x is Cited<unknown> {
  if (typeof x !== 'object' || x === null) return false
  const o = x as Record<string, unknown>
  const s = o.source
  return 'value' in o && 'index' in o && typeof s === 'object' && s !== null && typeof (s as Record<string, unknown>).url === 'string'
}

/** Strip every citation from a tree. The engine's only way to read a parameter. */
export function plain<T>(tree: T): Plain<T> {
  if (isCited(tree)) return tree.value as Plain<T>
  if (Array.isArray(tree)) return tree.map((x) => plain(x)) as Plain<T>
  if (typeof tree === 'object' && tree !== null) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(tree)) out[k] = plain(v)
    return out as Plain<T>
  }
  return tree as Plain<T>
}

/** Every `Cited` leaf of a tree, with its dotted path (`rrq.mga`, `federal.brackets`). */
export function citedLeaves(tree: unknown, prefix = ''): { path: string; cited: Cited<unknown> }[] {
  if (isCited(tree)) return [{ path: prefix, cited: tree }]
  if (typeof tree !== 'object' || tree === null) return []
  const out: { path: string; cited: Cited<unknown> }[] = []
  for (const [k, v] of Object.entries(tree)) out.push(...citedLeaves(v, prefix ? `${prefix}.${k}` : k))
  return out
}
