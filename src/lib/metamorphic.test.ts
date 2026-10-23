import { describe, expect, it } from 'vitest'

import { benefitsOfYear } from '../engine/benefitsOf.ts'
import { project } from '../engine/projection.ts'
import type { Assumptions, Household, YearRow } from '../engine/types.ts'
import { checkCases, genCases, type GenCase } from './householdGen.ts'

// METAMORPHIC PROPERTIES: no answer is known in advance for a random household, but two runs that must be RELATED can be compared. Change the input in a way that must change nothing (the order the two
// people are listed, a plan that runs longer, a setting that says « none » two ways) and the outputs must agree; change it in a way that can only help or only hurt (more spent, more saved) and the
// outputs must move the right way. An engine that gets one of these wrong gets the answer wrong for somebody, and no example household needs to be the one.

/** How many (couple, fill) pairs of the sample the listing order still moves by more than 0.3 % (see the ratchet in « who is listed first »): today seed 909, case 24 at the first bracket (0.33 %). */
const KNOWN_ORDER_SENSITIVE = 1
const CASES = [5, 77, 909].flatMap((s) => genCases(s, 30))
const COUPLES = CASES.filter((c) => c.household.persons.length === 2)
const real = (a: Assumptions, y: number) => (1 + a.inflation) ** (y - a.today.year)
const total = (rows: readonly YearRow[], pick: (r: YearRow) => number) => rows.reduce((s, r) => s + pick(r), 0)
/** Equal to the cents the engine rounds to: 5 cents, plus a hundred-millionth of the figure (a two-million balance is a sum of many cent-rounded years). */
const near = (x: number, y: number, rel = 1e-7) => Math.abs(x - y) <= 0.05 + rel * Math.max(Math.abs(x), Math.abs(y))

/** The household with the two people listed the other way round (ids stay `self`, `spouse` by position: the first listed is the first person). */
function swapped(h: Household): Household {
  const [a, b] = h.persons
  return { ...h, persons: [{ ...b, id: 'self' }, { ...a, id: 'spouse' }] }
}

/**
 * The household with everything removed that is keyed to « the first person » BY DESIGN, so that swapping the two people can be asked to change nothing: the children and the dated flows (an owner,
 * a first parent), a budget split by person, and the sale of the home (it happens when the FIRST person reaches an age).
 */
function symmetric(h: Household): Household {
  return { ...h, children: undefined, childSpending: null, kidsEffects: null, flows: undefined, spendingSplit: undefined, home: h.home ? { ...h.home, sale: null } : undefined }
}

describe('who is listed first does not change the household’s money', { timeout: 300_000 }, () => {
  it('there are couples to swap', () => expect(COUPLES.length).toBeGreaterThan(40))

  it('without a fill, every year’s tax, net worth and shortfall are the same with the two people swapped, whatever the split', () => {
    expect(
      checkCases(COUPLES, (c) => {
        const out: string[] = []
        // children and dated flows name an owner or the first parent; a household without them is symmetric
        const h = symmetric(c.household)
        for (const [name, over] of [['no fill, its own split setting', { bracketFill: null }], ['no fill, no split', { bracketFill: null, pensionSplitting: false }], ['no fill, split on', { bracketFill: null, pensionSplitting: true }]] as const) {
          const a: Assumptions = { ...c.assumptions, ...over }
          const x = project(h, a)
          const y = project(swapped(h), a)
          if (x.length !== y.length) return [`${name}: ${x.length} years against ${y.length}`]
          x.forEach((r, i) => {
            for (const [field, f] of [['tax', (v: YearRow) => v.household.tax], ['netWorthEnd', (v: YearRow) => v.household.netWorthEnd], ['shortfall', (v: YearRow) => v.household.shortfall]] as const) {
              if (!near(f(r), f(y[i]), 1e-3)) out.push(`${name} ${r.year}: ${field} ${f(r).toFixed(2)} against ${f(y[i]).toFixed(2)} when swapped`)
            }
          })
        }
        return out.slice(0, 6)
      }),
    ).toBeNull()
  })

  // With a fill, the two plans are not exactly equal: the fill is a greedy pass over the people (the lower own income first, whoever is listed first), and a tie, or a spouse who is paid OAS,
  // can still send it down a different path. Measured on these couples (seed lists below), not assumed: a ratchet on how many differ by more than 0.3 % and by how much.
  it('with a fill, the lifetime tax is the same with the two people swapped, to within a measured few', () => {
    const rows: string[] = []
    let max = 0
    for (const c of COUPLES) {
      const h = symmetric(c.household)
      for (const fill of ['bracket1', 'oas'] as const) {
        const a: Assumptions = { ...c.assumptions, bracketFill: fill }
        const tax = (x: Household) => total(project(x, a), (r) => r.household.tax / real(a, r.year))
        const d = Math.abs(tax(h) - tax(swapped(h))) / Math.min(tax(h), tax(swapped(h)))
        max = Math.max(max, d)
        if (d > 0.003) rows.push(`seed ${c.seed} case ${c.index} ${fill}: ${(100 * d).toFixed(2)} %`)
      }
    }
    expect(rows.length, rows.join('\n')).toBeLessThanOrEqual(KNOWN_ORDER_SENSITIVE)
    expect(max).toBeLessThan(0.025)
  })
})

describe('a plan that runs longer does not change the years it already ran', { timeout: 300_000 }, () => {
  // Only up to the FIRST person's last year: after it the survivor's rules apply (the spending cut, the survivor pension, the death benefit), and a plan that runs longer reaches that day later,
  // so the years after it differ BY DESIGN. (A first version compared every year and « found » exactly that.)
  it('the horizon age is 5 years later: every year up to the first person’s death is the same row', () => {
    expect(
      checkCases(CASES.slice(0, 60), (c) => {
        // a person’s own plan end overrides the scenario’s: drop them so the scenario’s horizon is the only one that moves
        const h: Household = { ...c.household, persons: c.household.persons.map((p) => ({ ...p, horizonAge: null })) }
        const short = project(h, { ...c.assumptions, horizonAge: 90 })
        const long = project(h, { ...c.assumptions, horizonAge: 95 })
        const firstDeath = Math.min(...h.persons.map((p) => p.birth.year + 90))
        const out: string[] = []
        short.filter((r) => r.year <= firstDeath).forEach((r) => {
          const l = long.find((x) => x.year === r.year)
          if (!l) return void out.push(`${r.year}: missing from the longer plan`)
          for (const [field, f] of [['tax', (v: YearRow) => v.household.tax], ['netWorthEnd', (v: YearRow) => v.household.netWorthEnd], ['shortfall', (v: YearRow) => v.household.shortfall]] as const) {
            if (!near(f(r), f(l))) out.push(`${r.year}: ${field} ${f(r).toFixed(2)} (to 90) against ${f(l).toFixed(2)} (to 95)`)
          }
        })
        return out.slice(0, 6)
      }),
    ).toBeNull()
  })
})

describe('« none » said two ways is one plan', { timeout: 120_000 }, () => {
  it('a bracket fill of null and of undefined give the very same rows', () => {
    expect(
      checkCases(CASES.slice(0, 40), (c) => {
        const { bracketFill: _drop, ...rest } = c.assumptions
        const a = project(c.household, { ...rest, bracketFill: null })
        const b = project(c.household, rest as Assumptions)
        return JSON.stringify(a) === JSON.stringify(b) ? [] : ['null and absent differ']
      }),
    ).toBeNull()
  })
})

describe('more spent can only hurt; more saved can only help', { timeout: 300_000 }, () => {
  const run = (c: GenCase, h: Household) => project(h, c.assumptions)

  it('spending 10 % more (working and retired) never lowers a year’s shortfall, nor raises the net worth at the end of any year', () => {
    expect(
      checkCases(CASES.slice(0, 60), (c) => {
        const more: Household = { ...c.household, spending: { workingToday: c.household.spending.workingToday * 1.1, retiredToday: c.household.spending.retiredToday * 1.1 } }
        const base = run(c, c.household)
        const hurt = run(c, more)
        const out: string[] = []
        base.forEach((r, i) => {
          if (hurt[i].household.shortfall < r.household.shortfall - 0.01) out.push(`${r.year}: shortfall ${hurt[i].household.shortfall.toFixed(2)} spending more, ${r.household.shortfall.toFixed(2)} spending less`)
          // net worth compared in today’s dollars with a dollar of slack per year of the plan (the draw order and the tax steps move cents)
          if (hurt[i].household.netWorthEnd > r.household.netWorthEnd + 1 + i) out.push(`${r.year}: net worth ${hurt[i].household.netWorthEnd.toFixed(0)} spending more, ${r.household.netWorthEnd.toFixed(0)} spending less`)
        })
        return out.slice(0, 6)
      }),
    ).toBeNull()
  })

  it('$100 000 more in the TFSA at the start never lowers a year’s net worth, nor adds a shortfall', () => {
    expect(
      checkCases(CASES.slice(0, 60), (c) => {
        const richer: Household = {
          ...c.household,
          persons: c.household.persons.map((p, i) => (i === 0 ? { ...p, accounts: { ...p.accounts, tfsa: { ...p.accounts.tfsa, balance: p.accounts.tfsa.balance + 100_000 } } } : p)),
        }
        const base = run(c, c.household)
        const rich = run(c, richer)
        const out: string[] = []
        base.forEach((r, i) => {
          if (rich[i].household.netWorthEnd < r.household.netWorthEnd - 1 - i) out.push(`${r.year}: net worth ${rich[i].household.netWorthEnd.toFixed(0)} with more, ${r.household.netWorthEnd.toFixed(0)} with less`)
          // More money can add a shortfall in one way only: it raises next year's income and an income-tested benefit (a State benefit or credit) pays less. The shortfall may then
          // grow by at most what the benefit lost, never more (a plan whose money is gone anyway shows it, down to the cent).
          const lostBenefit = Math.max(0, benefitsOfYear(r.household) - benefitsOfYear(rich[i].household))
          if (rich[i].household.shortfall > r.household.shortfall + 0.01 + lostBenefit) out.push(`${r.year}: a shortfall of ${rich[i].household.shortfall.toFixed(2)} appears with more money`)
        })
        return out.slice(0, 6)
      }),
    ).toBeNull()
  })

  it('a higher return on every account never lowers the net worth at the end of the plan', () => {
    expect(
      checkCases(CASES.slice(0, 60), (c) => {
        const r = c.assumptions.returns
        const base = project(c.household, c.assumptions)
        const up = project(c.household, { ...c.assumptions, returns: { nonReg: r.nonReg + 0.01, rrsp: r.rrsp + 0.01, tfsa: r.tfsa + 0.01 } })
        const last = base.length - 1
        return up[last].household.netWorthEnd + 1 + last >= base[last].household.netWorthEnd ? [] : [`end of plan: ${up[last].household.netWorthEnd.toFixed(0)} at +1 % return, ${base[last].household.netWorthEnd.toFixed(0)} at the base`]
      }),
    ).toBeNull()
  })

  it('the tax paid over the plan (today’s dollars) is a real number and never negative', () => {
    for (const c of CASES.slice(0, 30)) {
      const t = total(project(c.household, c.assumptions), (r) => r.household.tax / real(c.assumptions, r.year))
      expect(Number.isFinite(t) && t >= 0, `seed ${c.seed} case ${c.index}`).toBe(true)
    }
  })
})
