import { describe, expect, it } from 'vitest'
import { bridgeView, profileLevers } from '../bridge.ts'
import { deferralView } from '../deferral.ts'
import { agesLedger, planGlance } from '../ledger.ts'
import { project } from '../projection.ts'
import { retireAt } from '../retireAt.ts'
import type { YearRow } from '../types.ts'
import { EXAMPLE_IDS, EXAMPLES } from './examples.ts'

// EACH EXAMPLE HOUSEHOLD MUST DO WHAT ITS STORY SAYS. They exist so that every table and every result can be looked at, and
// checked by hand, for more than one kind of life; a household that tells the wrong story (a « poor » one that is rich, a
// « retired » one still earning) makes every figure read from it a figure about nobody.

const rowsOf = (id: (typeof EXAMPLE_IDS)[number]) => project(EXAMPLES[id].household, EXAMPLES[id].assumptions)
const sumOver = (rows: YearRow[], pick: (p: NonNullable<YearRow['persons']['self']>) => number) => rows.reduce((s, r) => s + Object.values(r.persons).reduce((t, p) => t + (p ? pick(p) : 0), 0), 0)

describe('every example runs, and its books are sane', () => {
  for (const id of EXAMPLE_IDS) {
    it(`${id}: finite figures, no negative balance, no negative shortfall, a ledger and a plan summary`, () => {
      const { household, assumptions } = EXAMPLES[id]
      const rows = rowsOf(id)
      expect(rows.length).toBeGreaterThan(20)
      for (const r of rows) {
        expect(Number.isFinite(r.household.netWorthEnd), `${r.year} net worth`).toBe(true)
        expect(r.household.shortfall, `${r.year} shortfall`).toBeGreaterThanOrEqual(0)
        for (const p of Object.values(r.persons)) {
          for (const k of ['nonReg', 'rrsp', 'tfsa'] as const) expect(p!.balancesEnd[k], `${r.year} ${k}`).toBeGreaterThanOrEqual(-0.01)
        }
      }
      expect(agesLedger(household, assumptions)).toHaveLength(household.persons.length)
      expect(Number.isFinite(planGlance(household, assumptions).netWorthEnd)).toBe(true)
    })
  }
})

describe('each story', () => {
  it('average: the plan holds, no GIS, and the earliest age that works is no later than the one planned', () => {
    const { household, assumptions } = EXAMPLES.average
    expect(planGlance(household, assumptions).ok).toBe(true)
    expect(sumOver(rowsOf('average'), (p) => p.gis)).toBe(0)
    expect(retireAt(household, assumptions, { stopAtFirstOk: true }).earliestOk!).toBeLessThanOrEqual(Math.max(...household.persons.map((p) => p.retirementAge)))
  })

  it('modest: the plan holds only just, and the GIS is a large part of why', () => {
    const { household, assumptions } = EXAMPLES.modest
    const g = planGlance(household, assumptions)
    expect(g.ok).toBe(true)
    expect(sumOver(rowsOf('modest'), (p) => p.gis)).toBeGreaterThan(100_000)
    expect(g.netWorthEnd).toBeLessThan(150_000)
  })

  it('rich: retires early, the plan holds with a large nest left, and the GIS is next to nothing', () => {
    const { household, assumptions } = EXAMPLES.rich
    const g = planGlance(household, assumptions)
    expect(g.ok).toBe(true)
    expect(g.netWorthEnd).toBeGreaterThan(500_000)
    expect(Math.max(...household.persons.map((p) => p.retirementAge))).toBeLessThanOrEqual(60)
    expect(sumOver(rowsOf('rich'), (p) => p.gis)).toBeLessThan(25_000)
  })

  it('behind: runs out of money well before the horizon, and no retirement age up to 70 fixes it by itself', () => {
    const { household, assumptions } = EXAMPLES.behind
    const g = planGlance(household, assumptions)
    expect(g.ok).toBe(false)
    expect(g.firstShortfallYear!).toBeLessThan(household.persons[0].birth.year + 70)
    const earliest = retireAt(household, assumptions, { stopAtFirstOk: true }).earliestOk
    expect(earliest === null || earliest > household.persons[0].retirementAge).toBe(true)
  })

  it('retired: nobody earns, the employer pension and both public pensions pay from the first year, and the nest is drawn', () => {
    const rows = rowsOf('retired')
    expect(sumOver(rows, (p) => p.employment)).toBe(0)
    const first = rows[0]
    for (const p of Object.values(first.persons)) {
      expect(p!.rrq, 'QPP already paid').toBeGreaterThan(0)
      expect(p!.oas, 'OAS already paid').toBeGreaterThan(0)
    }
    expect(first.persons.self!.db).toBeGreaterThan(30_000)
    expect(sumOver(rows, (p) => p.withdrawals.rrsp + p.withdrawals.tfsa + p.withdrawals.nonReg)).toBeGreaterThan(0)
    // an already-retired household can still be looked at in every view without a crash: the ledger, the deferral table, the bridge
    const { household, assumptions } = EXAMPLES.retired
    expect(agesLedger(household, assumptions).every((l) => l.rrq.monthly > 0 && l.oas.monthly > 0)).toBe(true)
    expect(deferralView(household, assumptions).persons).toHaveLength(2)
    expect(bridgeView(household, assumptions, profileLevers(household, 'self')).strategies.length).toBeGreaterThan(3)
  })

  it('newcomer: the OAS is the share her years of residence earn (35 of 40, rounded down), and the QPP history starts when she arrived', () => {
    const { household, assumptions } = EXAMPLES.newcomer
    const [l] = agesLedger(household, assumptions)
    expect(l.oas.residence).toBeCloseTo(35 / 40, 6)
    expect(Math.min(...Object.keys(household.persons[0].earningsHistory).map(Number))).toBe(household.persons[0].oas.residentSince)
    expect(planGlance(household, assumptions).ok).toBe(true)
  })

  it('behind (a single person, edge case): the bridge and deferral views run', () => {
    const { household, assumptions } = EXAMPLES.behind
    expect(bridgeView(household, assumptions, profileLevers(household, 'self')).strategies.map((s) => s.key)).not.toContain('both')
    expect(deferralView(household, assumptions).persons).toHaveLength(1)
  })
})
