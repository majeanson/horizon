import { describe, expect, it } from 'vitest'
import { bridgeView, profileLevers } from '../bridge.ts'
import { deferralView } from '../deferral.ts'
import { agesLedger, planGlance } from '../ledger.ts'
import { project } from '../projection.ts'
import { retireAt, worksNow } from '../retireAt.ts'
import type { YearRow } from '../types.ts'
import { EXAMPLE_IDS, EXAMPLES, plannerHousehold } from './examples.ts'

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

  it('average: the home has a mortgage that ENDS before either retires — the payment is in the spending until then and gone after, and the equity is wealth beside the nest', () => {
    const { household, assumptions } = EXAMPLES.average
    const rows = rowsOf('average')
    const paid = rows.find((r) => r.household.mortgageBalanceEnd === 0)!
    expect(paid.year).toBe(2041)
    expect(Math.max(...household.persons.map((p) => p.birth.year + p.retirementAge))).toBeGreaterThan(paid.year)
    expect(rows[0].household.mortgagePayment).toBeCloseTo(12 * 1_150, 0)
    expect(rows.filter((r) => r.year > paid.year).every((r) => r.household.mortgagePayment === 0)).toBe(true)
    expect(rows[0].household.homeValueEnd).toBeGreaterThan(household.home!.value)
    expect(rows[rows.length - 1].household.homeValueEnd).toBeGreaterThan(0) // never sold: still there at the horizon
    expect(planGlance(household, assumptions).ok).toBe(true)
  })

  it('average: Luc has an RVER — a locked part that grows with the employer’s money, stays within the REER, and is free to draw long before he needs it', () => {
    const { household, assumptions } = EXAMPLES.average
    const luc = household.persons[1]
    expect(luc.accounts.rrsp.lockedIn).toBe(25_000)
    const rows = rowsOf('average')
    const lucAt = (year: number) => rows.find((r) => r.year === year)!.persons.spouse!
    expect(lucAt(2026).rrspLockedEnd).toBeGreaterThan(25_000) // the employer's 2 000 $ and a year of growth
    for (const r of rows.filter((x) => x.persons.spouse)) expect(r.persons.spouse!.rrspLockedEnd).toBeLessThanOrEqual(r.persons.spouse!.balancesEnd.rrsp + 0.005)
    // nothing drawn from it while he works; the plan, as ever, holds
    expect(lucAt(2030).withdrawals.rrsp).toBe(0)
    expect(planGlance(household, assumptions).ok).toBe(true)
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

  it('heir: 27 years old, the inheritance is non-registered, and stopping TODAY works — the earliest age is the first one tried, not a minimum', () => {
    const { household, assumptions } = EXAMPLES.heir
    const p = household.persons[0]
    expect(assumptions.today.year - p.birth.year).toBe(27)
    expect(p.accounts.nonReg.balance).toBeGreaterThan(3_000_000)
    expect(p.retirementAge).toBeLessThanOrEqual(30)
    const r = retireAt(household, assumptions, { stopAtFirstOk: true })
    expect(r.earliestOk).toBe(27) // the floor: nobody can retire in the past
    expect(worksNow(household, assumptions, r.earliestOk)).toBe(true)
    // …and a life that long is a plan that long: the money lasts to the horizon, seventy years on, with a large nest left.
    const g = planGlance(household, assumptions)
    expect(g.ok).toBe(true)
    expect(g.netWorthEnd).toBeGreaterThan(1_000_000)
    expect(rowsOf('heir').length).toBeGreaterThan(65)
    // nobody is asked to wait: asking from 18 gives the same answer as from the age already reached
    expect(retireAt(household, assumptions, { from: 18, stopAtFirstOk: true }).earliestOk).toBe(27)
  })

  it('downsizer: the sale of the house is what makes stopping at 58 work — keep the house and the accounts alone run out', () => {
    const { household, assumptions } = EXAMPLES.downsizer
    const home = household.home!
    expect(home.sale).toEqual({ age: 58, replacementCost: 360_000 })
    expect(Math.max(...household.persons.map((p) => p.retirementAge))).toBe(58)
    // with the sale: the plan holds, and 58 is the earliest age that works
    expect(planGlance(household, assumptions).ok).toBe(true)
    expect(retireAt(household, assumptions, { stopAtFirstOk: true }).earliestOk).toBe(58)
    // the sale frees real money: the equity less the replacement, paid into Nadia's non-registered account the year she turns 58
    const rows = rowsOf('downsizer')
    const saleYear = household.persons[0].birth.year + 58
    const before = rows.find((r) => r.year === saleYear - 1)!
    const during = rows.find((r) => r.year === saleYear)!
    expect(during.household.netWorthEnd - before.household.netWorthEnd).toBeGreaterThan(300_000)
    // the same household that keeps its house: no money for it, a shortfall, and a later earliest age
    const kept = { ...household, home: { ...home, sale: null } }
    expect(planGlance(kept, assumptions).ok).toBe(false)
    expect(retireAt(kept, assumptions, { stopAtFirstOk: true }).earliestOk!).toBeGreaterThan(58)
  })

  it('planner: a life, not a budget — the plan holds at 58, and each life event moves the earliest age by what it costs', () => {
    const { household, assumptions } = EXAMPLES.planner
    expect(planGlance(household, assumptions).ok).toBe(true)
    expect(Math.max(...household.persons.map((p) => p.retirementAge))).toBe(58)
    const earliest = (events: Partial<Parameters<typeof plannerHousehold>[0]>) =>
      retireAt(plannerHousehold({ child: true, care: true, heritage: true, partTime: true, ...events }), assumptions, { stopAtFirstOk: true }).earliestOk!
    const all = earliest({})
    expect(all).toBe(56)
    // a child still to come adds its cost (and the state's benefits take some back): without it they could stop two years sooner
    expect(earliest({ child: false })).toBe(54)
    // the care of the last years is paid decades before it is spent: without it, two years sooner as well
    expect(earliest({ care: false })).toBe(54)
    // an inheritance and part-time work each help: take either away and the earliest age is the same or later, never sooner
    expect(earliest({ heritage: false })).toBeGreaterThanOrEqual(all)
    expect(earliest({ partTime: false })).toBeGreaterThanOrEqual(all)
    expect(planGlance(plannerHousehold({ child: true, care: true, heritage: false, partTime: true }), assumptions).netWorthEnd).toBeLessThan(planGlance(household, assumptions).netWorthEnd)
    // every event is really in the household the projection reads
    expect(household.children).toEqual([2028])
    expect(household.kidsEffects?.leave?.birthParent).toBe('self')
    expect(household.flows?.map((f) => f.kind).sort()).toEqual(['expense', 'windfall'])
    expect(household.persons[0].partTime).toEqual({ untilAge: 64, share: 0.3 })
    expect(assumptions.retiredSpendingDrift).toBe(-0.01)
  })

  it('« dès maintenant » is only said when today is the floor AND works: a household whose first working age is later is not told « now »', () => {
    const { household, assumptions } = EXAMPLES.behind
    expect(worksNow(household, assumptions, null)).toBe(false)
    expect(worksNow(household, assumptions, 60)).toBe(false) // 52 today: 60 is not the floor
    const heir = EXAMPLES.heir
    expect(worksNow(heir.household, heir.assumptions, 28)).toBe(false) // 28 is not the floor either (27 is)
  })

  it('behind (a single person, edge case): the bridge and deferral views run', () => {
    const { household, assumptions } = EXAMPLES.behind
    expect(bridgeView(household, assumptions, profileLevers(household, 'self')).strategies.map((s) => s.key)).not.toContain('both')
    expect(deferralView(household, assumptions).persons).toHaveLength(1)
  })
})
