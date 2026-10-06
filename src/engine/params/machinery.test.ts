import { describe, expect, expectTypeOf, it } from 'vitest'
import { citedLeaves, isCited, plain, type Bracket, type Cited, type Plain, type Source } from './cited.ts'
import { advance, resolveYear, roundTo, type Indexation } from './project.ts'

// The machinery under every parameter: strip a citation, move a figure into a year nobody has
// published. Tested against a TOY tree so that a wrong figure in 2026.ts can never hide a wrong
// formula here, and a wrong formula here can never hide behind a right-looking figure there.

const SRC: Source = { url: 'https://www.canada.ca/example', title: 'Example page', retrieved: '2026-10-06' }
const cited = <T>(value: T, index: Cited<T>['index'], round?: number): Cited<T> => ({ value, source: SRC, index, ...(round === undefined ? {} : { round }) })

const A: Indexation = { inflation: 0.02, wageGrowth: 0.03 }

const toy = {
  year: 2026,
  amount: cited(1000, 'cpi', 1),
  wage: cited(70000, 'wage', 100),
  rate: cited(0.14, 'fixed'),
  tfsa: cited(7000, 'cpi', 500),
  pension: cited(1507.65, 'cpi', 0.01),
  brackets: cited<Bracket[]>([{ upTo: 50000, rate: 0.14 }, { upTo: 100000, rate: 0.2 }, { upTo: null, rate: 0.3 }], 'cpi', 1),
  factors: cited<Record<number, number>>({ 71: 0.0528, 72: 0.054 }, 'fixed'),
  history: cited<Record<number, number>>({ 2025: 71300 }, 'none'),
  nested: { inner: cited(200, 'cpi', 1) },
}

describe('plain() / isCited()', () => {
  it('recognises a citation by its shape — value, index and a source with a url', () => {
    expect(isCited(toy.amount)).toBe(true)
    expect(isCited({ value: 1, index: 'cpi' })).toBe(false) // no source
    expect(isCited({ value: 1, index: 'cpi', source: {} })).toBe(false) // no url
    expect(isCited(null)).toBe(false)
    expect(isCited(5)).toBe(false)
  })

  it('strips every citation, whatever the depth, and leaves plain leaves alone', () => {
    const p = plain(toy)
    expect(p.year).toBe(2026)
    expect(p.amount).toBe(1000)
    expect(p.nested.inner).toBe(200)
    expect(p.brackets).toEqual(toy.brackets.value)
    expect(p.factors[71]).toBe(0.0528)
  })

  it('has a type that matches what it does', () => {
    const p = plain(toy)
    expectTypeOf(p.amount).toEqualTypeOf<number>()
    expectTypeOf(p.brackets).toEqualTypeOf<Bracket[]>()
    expectTypeOf(p.nested.inner).toEqualTypeOf<number>()
    expectTypeOf<Plain<Cited<string>>>().toEqualTypeOf<string>()
  })

  it('lists every cited leaf with its dotted path', () => {
    const paths = citedLeaves(toy).map((l) => l.path)
    expect(paths).toContain('amount')
    expect(paths).toContain('nested.inner')
    expect(paths).not.toContain('year')
    expect(paths).toHaveLength(9)
  })
})

describe('roundTo()', () => {
  it.each([
    [7576.2, 500, 7500],
    [7751, 500, 8000],
    [1020.4, 1, 1020],
    [1020.5, 1, 1021],
    [1537.8, 0.01, 1537.8],
    [1537.8049, 0.01, 1537.8],
    [1537.805, 0.01, 1537.81],
    [0.1, 0.01, 0.1],
  ])('rounds %d to a multiple of %d → %d', (x, step, expected) => {
    expect(roundTo(x, step)).toBe(expected)
  })

  it('never leaks a binary-float tail on a cent-sized step', () => {
    for (const x of [0.1 + 0.2, 1.005, 2.675, 1507.65 * 1.02]) expect(String(roundTo(x, 0.01)).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2)
  })
})

describe('advance() — one figure into a later year, by its own index rule', () => {
  it('a cpi figure compounds the inflation assumption and rounds as the official rule does', () => {
    expect(plain(advance(toy, A, 1)).amount).toBe(1020)
    expect(plain(advance(toy, A, 5)).amount).toBe(Math.round(1000 * 1.02 ** 5)) // 1104
    expect(plain(advance(toy, A, 1)).pension).toBe(1537.8)
  })

  it('a wage figure follows wage growth, not inflation', () => {
    expect(plain(advance(toy, A, 1)).wage).toBe(72100)
    expect(plain(advance(toy, A, 10)).wage).toBe(roundTo(70000 * 1.03 ** 10, 100))
  })

  it('a fixed figure and a statutory table never move', () => {
    const p = plain(advance(toy, A, 30))
    expect(p.rate).toBe(0.14)
    expect(p.factors).toEqual({ 71: 0.0528, 72: 0.054 })
  })

  it('an observation (index: none) is never projected', () => {
    expect(plain(advance(toy, A, 30)).history).toEqual({ 2025: 71300 })
  })

  it('moves a scale\'s THRESHOLDS and leaves its RATES, and keeps the open top bracket open', () => {
    const b = plain(advance(toy, A, 1)).brackets
    expect(b).toEqual([
      { upTo: 51000, rate: 0.14 },
      { upTo: 102000, rate: 0.2 },
      { upTo: null, rate: 0.3 },
    ])
  })

  it('projects the TFSA limit from cumulative indexation — iterating a round-to-$500 would never leave 7 000', () => {
    expect(plain(advance(toy, A, 1)).tfsa).toBe(7000) // 7 140 → 7 000
    expect(plain(advance(toy, A, 4)).tfsa).toBe(7500) // 7 576 → 7 500
    expect(plain(advance(toy, A, 10)).tfsa).toBe(8500) // 8 533 → 8 500
  })

  it('keeps the sources while the values move (a projected number is still traceable to its base)', () => {
    const moved = advance(toy, A, 3)
    expect(moved.amount.source).toEqual(SRC)
    expect(moved.amount.value).not.toBe(toy.amount.value)
  })

  it('zero years ahead changes nothing at all', () => {
    expect(plain(advance(toy, A, 0))).toEqual(plain(toy))
  })

  it('does not mutate its input', () => {
    const before = JSON.stringify(toy)
    advance(toy, A, 7)
    expect(JSON.stringify(toy)).toBe(before)
  })

  it('moves with the assumption: higher inflation, higher figure; zero inflation, same figure', () => {
    expect(plain(advance(toy, { ...A, inflation: 0 }, 9)).amount).toBe(1000)
    expect(plain(advance(toy, { ...A, inflation: 0.04 }, 9)).amount).toBeGreaterThan(plain(advance(toy, A, 9)).amount)
  })
})

describe('resolveYear() — known, projected, and refused', () => {
  const registry = { 2026: toy, 2027: { ...toy, year: 2027, amount: cited(1030, 'cpi', 1) } }

  it('answers a known year with its own figures, not projected', () => {
    const p = resolveYear(registry, 2026, A)
    expect(p.projected).toBe(false)
    expect(p.amount).toBe(1000)
    expect(p.year).toBe(2026)
  })

  it('projects a later year from the LAST known one, and says so', () => {
    const p = resolveYear(registry, 2030, A)
    expect(p.projected).toBe(true)
    expect(p.year).toBe(2030)
    expect(p.amount).toBe(Math.round(1030 * 1.02 ** 3)) // from 2027, three years on
  })

  it('refuses a year before the first known one: the past comes from the person\'s statement', () => {
    expect(() => resolveYear(registry, 2024, A)).toThrow(/no parameters before 2026/)
  })

  it('is monotone in the year for a cpi figure (a later year never costs less)', () => {
    let prev = 0
    for (let y = 2027; y <= 2060; y++) {
      const v = resolveYear(registry, y, A).amount
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
})
