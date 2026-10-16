import { describe, expect, it } from 'vitest'
import { householdTax, type PersonIncome, type TaxRules } from '../tax.ts'
import { P2026 } from './2026.ts'
import { citedLeaves, isCited, type Bracket } from './cited.ts'
import { LAST_KNOWN_YEAR, paramsFor, type PlainYear } from './index.ts'

// THE SEAM BETWEEN WHAT AN OFFICIAL PAGE SAYS AND WHAT IS ASSUMED. Only 2026 has a page behind it; a plan that runs to 95 lives almost entirely in years that are the 2026 figures moved by each
// one's own index rule. machinery.test.ts holds that machinery on a toy registry; this holds it on the REAL one, figure by figure (every cited leaf of 2026 is moved by the rule it declares,
// derived here without calling the engine's own projection), and holds what must remain true of any year the engine can invent: the rates are statute and never move, nothing money-like
// falls, nothing grows faster than prices (or wages) plus the rounding, the brackets stay in order, and the TAX a person pays at the same income, in the year's own dollars, does not jump
// when the figures stop being cited.

const I = { inflation: 0.021, wageGrowth: 0.031 }
const YEARS = [2027, 2028, 2030, 2040, 2060, 2090]
const at = (p: unknown, path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], p)
const roundTo = (x: number, step: number) => (step >= 1 ? Math.round(x / step) * step : Number((Math.round(x / step) * step).toFixed(Math.max(0, Math.ceil(-Math.log10(step))))))
const isBrackets = (v: unknown): v is Bracket[] => Array.isArray(v) && v.length > 0 && v.every((b) => typeof b === 'object' && b !== null && 'rate' in b && 'upTo' in b)

describe('which year is real and which is assumed', () => {
  it('2026 is the only known year; it is not projected, and every later year says it is', () => {
    expect(LAST_KNOWN_YEAR).toBe(2026)
    expect(paramsFor(2026, I).projected).toBe(false)
    for (const y of YEARS) {
      const p = paramsFor(y, I)
      expect(p.projected, `${y}`).toBe(true)
      expect(p.year, `${y}`).toBe(y)
    }
  })

  it('a year before the first known one is refused: the past comes from a person’s own statement', () => {
    expect(() => paramsFor(2025, I)).toThrow(/no parameters before 2026/)
  })

  it('no inflation, no wage growth: every projected year has exactly 2026’s figures', () => {
    const flat = { inflation: 0, wageGrowth: 0 }
    const base = paramsFor(2026, flat)
    for (const y of YEARS) expect({ ...paramsFor(y, flat), year: 2026, projected: false }, `${y}`).toEqual(base)
  })
})

describe('every cited figure of 2026 moves by the rule it declares', () => {
  const leaves = citedLeaves(P2026)
  it('there are about a hundred of them (a floor, so an empty walk cannot pass)', () => expect(leaves.length).toBeGreaterThan(90))

  for (const n of [1, 2, 14, 64]) {
    it(`${2026 + n}: cpi figures by (1 + inflation)^${n}, wage figures by (1 + wage growth)^${n}, fixed and « none » figures untouched, rates never`, () => {
      const p = paramsFor(2026 + n, I)
      const wrong: string[] = []
      for (const { path, cited } of leaves) {
        const base = cited.value
        const got = at(p, path)
        const factor = cited.index === 'cpi' ? (1 + I.inflation) ** n : cited.index === 'wage' ? (1 + I.wageGrowth) ** n : 1
        const r = (x: number) => (cited.round === undefined ? x : roundTo(x, cited.round))
        if (typeof base === 'number') {
          const want = factor === 1 ? base : r(base * factor)
          if (Math.abs((got as number) - want) > 1e-9 * Math.max(1, Math.abs(want))) wrong.push(`${path}: ${got} against ${want}`)
        } else if (isBrackets(base)) {
          base.forEach((b, i) => {
            const g = (got as Bracket[])[i]
            const want = b.upTo === null || factor === 1 ? b.upTo : r(b.upTo * factor)
            if (g.upTo !== want) wrong.push(`${path}[${i}].upTo: ${g.upTo} against ${want}`)
            if (g.rate !== b.rate) wrong.push(`${path}[${i}].rate moved: ${g.rate} against ${b.rate}`)
          })
        } else if (JSON.stringify(got) !== JSON.stringify(base)) wrong.push(`${path}: a table or a flag changed`)
      }
      expect(wrong.slice(0, 8)).toEqual([])
    })
  }
})

describe('what must hold of any year the engine can invent', () => {
  const years = Array.from({ length: 70 }, (_, i) => 2026 + i)
  const leaves = citedLeaves(P2026)
  const numeric = leaves.filter((l) => typeof l.cited.value === 'number')

  it('no figure falls from one year to the next, and none grows faster than its own index plus the rounding step', () => {
    const wrong: string[] = []
    for (const { path, cited } of numeric) {
      const growth = cited.index === 'cpi' ? 1 + I.inflation : cited.index === 'wage' ? 1 + I.wageGrowth : 1
      let prev = at(paramsFor(2026, I), path) as number
      for (const y of years.slice(1)) {
        const now = at(paramsFor(y, I), path) as number
        const slack = (cited.round ?? 0) * 1.01 + 1e-9
        if (now < prev - 1e-9) wrong.push(`${path} falls in ${y}: ${prev} → ${now}`)
        if (now > prev * growth + slack + Math.abs(prev) * 1e-12) wrong.push(`${path} grows too fast in ${y}: ${prev} → ${now}`)
        prev = now
      }
    }
    expect(wrong.slice(0, 8)).toEqual([])
  })

  it('the brackets of both governments stay in strictly rising order, with their rates, in every year', () => {
    const wrong: string[] = []
    for (const y of years) {
      const p = paramsFor(y, I) as PlainYear
      for (const [name, bs] of [['federal', p.federal.brackets], ['quebec', p.quebec.brackets]] as const) {
        bs.forEach((b, i) => {
          if (i > 0 && !(bs[i - 1].upTo !== null && b.rate > bs[i - 1].rate)) wrong.push(`${y} ${name}: the rates do not rise at ${i}`)
          if (i > 0 && b.upTo !== null && !(b.upTo > (bs[i - 1].upTo ?? Infinity))) wrong.push(`${y} ${name}: the thresholds do not rise at ${i}`)
        })
        if (bs[bs.length - 1].upTo !== null) wrong.push(`${y} ${name}: the top bracket is bounded`)
      }
      if (!(p.federal.bpaMax >= p.federal.bpaMin)) wrong.push(`${y}: the basic personal amount's maximum is under its minimum`)
    }
    expect(wrong.slice(0, 6)).toEqual([])
  })

  it('the federal basic-amount phase-down still spans the 29 % bracket in every year (its two ends are the thresholds it is defined by)', () => {
    for (const y of years) {
      const p = paramsFor(y, I)
      expect(p.federal.brackets[2].upTo, `${y}`).toBeLessThan(p.federal.brackets[3].upTo!)
    }
  })

  it('the cited figures are all still there in a projected year: not a path lost on the way', () => {
    const p = paramsFor(2060, I)
    for (const { path } of leaves) expect(at(p, path), path).not.toBeUndefined()
    expect(isCited(at(P2026, 'federal.brackets'))).toBe(true)
  })
})

describe('the tax a person pays does not jump where the citations stop', () => {
  const rules = (y: number): TaxRules => {
    const p = paramsFor(y, I)
    return { federal: p.federal, quebec: p.quebec, oas: p.oas, livesAlone: false }
  }
  const income = (x: number): PersonIncome => ({ age: 50, employment: 0, rrq: 0, oas: 0, db: 0, registered: x, capitalGains: 0, rrqBase: 0, rrqEnhanced: 0, payrollPremiums: 0, rrspDeduction: 0 })
  const tax = (y: number, x: number) => householdTax([income(x)], rules(y)).total

  for (const n of [1, 2, 10, 40]) {
    it(`the same income in 2026 dollars, ${2026 + n}: tax ${n} years on at the same real income is the same real tax, to within 2 %`, () => {
      const grow = (1 + I.inflation) ** n
      const wrong: string[] = []
      for (const x of [40_000, 60_000, 90_000, 130_000, 200_000, 300_000]) {
        const real = tax(2026 + n, x * grow) / grow
        const base = tax(2026, x)
        if (Math.abs(real / base - 1) > 0.02) wrong.push(`${x}: ${base.toFixed(0)} in 2026, ${real.toFixed(0)} in 2026 dollars in ${2026 + n}`)
      }
      expect(wrong).toEqual([])
    })
  }

  it('the real tax never RISES with the years for the same real income by more than the rounding (bracket creep is not modelled)', () => {
    for (const x of [60_000, 130_000]) {
      let prev = tax(2026, x)
      for (let n = 1; n <= 40; n++) {
        const grow = (1 + I.inflation) ** n
        const real = tax(2026 + n, x * grow) / grow
        expect(real, `${x} in ${2026 + n}`).toBeLessThan(prev * 1.01 + 5)
        prev = real // each year against the last
      }
    }
  })
})
