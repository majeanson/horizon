import { describe, expect, it } from 'vitest'
import { EXAMPLES } from './golden/examples.ts'
import { agesLedger } from './ledger.ts'
import { paramsFor } from './params/index.ts'
import { RRQ_INDEXATION_HISTORY } from './params/rrqHistory.ts'
import { project, resolve } from './projection.ts'
import { makeQppIndexation, makeRrqRules } from './rrqRules.ts'

// A QPP PENSION THAT BEGAN BEFORE TODAY is paid today what Retraite Québec really raised it to: every January's PUBLISHED indexation since its
// start, never the assumed inflation of the plan (a forecast has no business deciding the past). Gilles (the « retired » example) has been paid
// since April 2023: 842,94 $ a month then, × 1,044 (2024) × 1,026 (2025) × 1,02 (2026) today — not × 1,021³.

const { household: h, assumptions: a } = EXAMPLES.retired
const rules = makeRrqRules({ inflation: a.inflation, wageGrowth: a.wageGrowth })
const gilles = resolve(h.persons[0], a, {}, rules, h)
const rows = project(h, a)
const rrqOf = (year: number) => rows.find((r) => r.year === year)!.persons.self!.rrq

describe('the January indexation of a QPP pension already in pay', () => {
  it('the example is what the test needs: a pension started in an earlier year, an assumed inflation that is not the observed one', () => {
    expect(gilles.rrq.start).toEqual({ year: 2023, month: 4 })
    expect(a.today.year).toBe(2026)
    expect(a.inflation).not.toBe(0.02)
  })

  it('today’s row pays the start amount raised by the three published Januaries since', () => {
    const observed = (1 + RRQ_INDEXATION_HISTORY.value[2024]) * (1 + RRQ_INDEXATION_HISTORY.value[2025]) * (1 + paramsFor(2026, a).rrq.indexation)
    expect(observed).toBeCloseTo(1.044 * 1.026 * 1.02, 10)
    expect(rrqOf(2026)).toBeCloseTo(gilles.rrq.monthly * 12 * observed, 1)
    // and NOT what the assumed inflation would have made of it
    expect(Math.abs(rrqOf(2026) - gilles.rrq.monthly * 12 * (1 + a.inflation) ** 3)).toBeGreaterThan(100)
  })

  it('each year after today grows by the assumed inflation, as any forecast does', () => {
    expect(rrqOf(2027) / rrqOf(2026)).toBeCloseTo(1 + a.inflation, 6)
    expect(rrqOf(2040) / rrqOf(2039)).toBeCloseTo(1 + a.inflation, 6)
  })

  it('the factor: the observed Januaries strictly after the start year, the inflation beyond the last published one and before the first', () => {
    const f = makeQppIndexation(0.03)
    expect(f(2023, 2023)).toBe(1)
    expect(f(2023, 2022)).toBe(1)
    expect(f(2021, 2026)).toBeCloseTo(1.027 * 1.065 * 1.044 * 1.026 * 1.02, 12)
    expect(f(2026, 2028)).toBeCloseTo(1.03 ** 2, 12)
    expect(f(1998, 2001)).toBeCloseTo(1.03 * 1.03 * 1.025, 12) // 1999 and 2000 are not published here: the assumption fills them
  })

  it('the ledger’s « today » figure is the row’s own: the observed growth for the QPP, today’s published level for the OAS (never inflated twice)', () => {
    const l = agesLedger(h, a)[0]
    expect(l.rrq.monthlyToday).toBeCloseTo(rrqOf(2026) / 12, 2)
    // Gilles's OAS began in 2023 too: its figure is read at TODAY's parameters, so today's dollars are that figure itself
    expect(l.oas.done).toBe(true)
    expect(l.oas.monthlyToday).toBeCloseTo(l.oas.monthly, 6)
  })
})
