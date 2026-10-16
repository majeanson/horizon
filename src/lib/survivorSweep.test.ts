import { describe, expect, it } from 'vitest'
import { paramsFor } from '../engine/params/index.ts'
import { project } from '../engine/projection.ts'
import type { Assumptions, Household, PersonId, YearRow } from '../engine/types.ts'
import { checkCases, genCases, type GenCase } from './householdGen.ts'
import { bookProblems } from './identities.ts'

// WHEN ONE OF THE TWO DIES FIRST. death.test.ts follows one couple through one death. This drives the same rules across random couples with EITHER spouse dying early, at any age from a few
// years ahead to the late eighties: the shape of the plan (who is in which row), the money (the books, the death benefit paid once, the budget at the survivor's share, the deceased's accounts
// passing to the survivor without a dollar lost or made), checked by rebuilding the survivor's balances from the flows the rows themselves state.

const COUPLES = [61, 612, 6120].flatMap((s) => genCases(s, 40)).filter((c) => c.household.persons.length === 2)

/** The couple with `k` dying at their own horizon age, and nothing in the household that is keyed to the first person or that a death does not move by design (home, children, dated flows). */
function withDeath(c: GenCase, k: 0 | 1, extra: number): { h: Household; a: Assumptions; deathYear: number; gone: PersonId; other: PersonId } {
  const a: Assumptions = { ...c.assumptions, horizonAge: 95, horizonForAll: undefined }
  const base: Household = { ...c.household, children: undefined, childSpending: null, kidsEffects: null, flows: undefined, spendingSplit: undefined, home: undefined }
  const age = a.today.year - base.persons[k].birth.year
  const horizonAge = age + extra
  const persons = base.persons.map((p, i) => ({ ...p, horizonAge: i === k ? horizonAge : null }))
  return { h: { ...base, persons }, a, deathYear: base.persons[k].birth.year + horizonAge, gone: base.persons[k].id, other: base.persons[k === 0 ? 1 : 0].id }
}

const eachCase = <T>(f: (c: GenCase, k: 0 | 1, extra: number) => T[]) => (c: GenCase) => ([0, 1] as const).flatMap((k, i) => f(c, k, [4, 9, 17, 27][(c.index + i) % 4]))

describe('the shape of a plan with an early death', { timeout: 300_000 }, () => {
  it('there are couples to sweep', () => expect(COUPLES.length).toBeGreaterThan(45))

  it('the deceased is in every row through their last year and in none after it; the survivor is in all of them; the plan runs to the survivor’s end', () => {
    expect(
      checkCases(COUPLES, eachCase((c, k, extra) => {
        const { h, a, deathYear, gone, other } = withDeath(c, k, extra)
        const rows = project(h, a)
        const out: string[] = []
        const lastYear = h.persons.find((p) => p.id === other)!.birth.year + 95
        if (rows[rows.length - 1].year !== lastYear) out.push(`the plan ends in ${rows[rows.length - 1].year}, the survivor's plan in ${lastYear}`)
        for (const r of rows) {
          if (r.year <= deathYear && !r.persons[gone]) out.push(`${r.year}: the deceased is missing before their last year ${deathYear}`)
          if (r.year > deathYear && r.persons[gone]) out.push(`${r.year}: the deceased is still in the rows after ${deathYear}`)
          if (!r.persons[other]) out.push(`${r.year}: the survivor is missing`)
        }
        return out.slice(0, 5)
      })),
    ).toBeNull()
  })

  it('the books hold in every year of every such plan', () => {
    expect(
      checkCases(COUPLES, eachCase((c, k, extra) => {
        const { h, a } = withDeath(c, k, extra)
        return bookProblems(project(h, a), a)
      })),
    ).toBeNull()
  })
})

describe('what a death moves, and what it does not', { timeout: 300_000 }, () => {
  it('the death benefit is paid once, to the survivor, in the year after the death — and not at all when the plan ends first', () => {
    expect(
      checkCases(COUPLES, eachCase((c, k, extra) => {
        const { h, a, deathYear, other } = withDeath(c, k, extra)
        const rows = project(h, a)
        const paid = rows.filter((r) => (r.persons[other]?.deathBenefit ?? 0) > 0)
        const expected = paramsFor(deathYear + 1, { inflation: a.inflation, wageGrowth: a.wageGrowth }).rrq.deathBenefit
        if (paid.length !== 1) return [`the benefit is paid in ${paid.length} years (${paid.map((r) => r.year).join(', ')})`]
        if (paid[0].year !== deathYear + 1) return [`paid in ${paid[0].year}, the year after the death is ${deathYear + 1}`]
        return Math.abs((paid[0].persons[other]?.deathBenefit ?? 0) - expected) < 0.01 ? [] : [`the benefit is ${paid[0].persons[other]?.deathBenefit}, the year's figure ${expected}`]
      })),
    ).toBeNull()
  })

  // The household spends its « still working » budget until the LAST of them retires, then the retired one: if the later-retiring spouse is the one who dies, the budget changes phase
  // at the death for that reason, not for the survivor's share. So both retire in the same CALENDAR year here (the same age is not the same year when they were born apart), and the reference (nobody dying early) is read only up to ITS first death at 95.
  it('the budget of the years after the death is the survivor’s share of the budget the same couple would have kept spending', () => {
    expect(
      checkCases(COUPLES, eachCase((c, k, extra) => {
        const w = withDeath(c, k, extra)
        const retireYear = Math.max(...w.h.persons.map((p) => p.birth.year + p.retirementAge), w.a.today.year + 1)
        const h: Household = { ...w.h, persons: w.h.persons.map((p) => ({ ...p, retirementAge: retireYear - p.birth.year })) }
        const dying = project(h, w.a)
        const living = project({ ...h, persons: h.persons.map((p) => ({ ...p, horizonAge: null })) }, w.a)
        const naturalFirstDeath = Math.min(...h.persons.map((p) => p.birth.year + 95))
        const share = w.a.survivorSpending ?? 1
        return dying.filter((r) => r.year > w.deathYear && r.year <= naturalFirstDeath).flatMap((r) => {
          const both = living.find((x) => x.year === r.year)!
          return Math.abs(r.household.spending - both.household.spending * share) <= 0.02 ? [] : [`${r.year}: spends ${r.household.spending.toFixed(2)}, a share of ${share} of ${both.household.spending.toFixed(2)} is ${(both.household.spending * share).toFixed(2)}`]
        }).slice(0, 4)
      })),
    ).toBeNull()
  })

  it('the deceased’s accounts pass whole to the survivor: each account at the end of the year after the death is the two together, grown, plus what was put in, less what was drawn', () => {
    expect(
      checkCases(COUPLES, eachCase((c, k, extra) => {
        const { h, a, deathYear, gone, other } = withDeath(c, k, extra)
        const rows = project(h, a)
        const before = rows.find((r) => r.year === deathYear)
        const after = rows.find((r) => r.year === deathYear + 1)
        if (!before || !after) return [] // the plan ends with the death: nothing passes
        const g = before.persons[gone]!
        const s0 = before.persons[other]!
        const s1 = after.persons[other]!
        const out: string[] = []
        // the growth convention of accounts.grow: the January balance grown, plus half a year's growth on the net flow
        const grow = (start: number, flow: number, r: number) => start * (1 + r) + flow * (1 + r) ** 0.5
        const rrspLockedOnly = (s0.rrspLockedEnd + g.rrspLockedEnd) > 0
        for (const [kind, r] of [['tfsa', a.returns.tfsa], ['rrsp', a.returns.rrsp], ['nonReg', a.returns.nonReg]] as const) {
          if (kind === 'rrsp' && rrspLockedOnly) continue // the locked part grows on its own flows too, but is read from a separate figure
          const start = s0.balancesEnd[kind] + g.balancesEnd[kind]
          const flow = s1.contributions[kind] - s1.withdrawals[kind]
          const expected = grow(start, flow, r)
          if (Math.abs(s1.balancesEnd[kind] - expected) > 1.5) out.push(`${kind}: ${s1.balancesEnd[kind].toFixed(2)} at the end of ${deathYear + 1}, the two together grown give ${expected.toFixed(2)}`)
        }
        return out
      })),
    ).toBeNull()
  })

  it('a household of one has no survivor: no death benefit, no survivor pension, and the budget is its own', () => {
    const singles = [61, 612].flatMap((s) => genCases(s, 40)).filter((c) => c.household.persons.length === 1).slice(0, 25)
    expect(singles.length).toBeGreaterThan(8)
    for (const c of singles) {
      const rows: YearRow[] = project(c.household, c.assumptions)
      for (const r of rows) {
        const p = Object.values(r.persons)[0]!
        expect(p.deathBenefit, `seed ${c.seed} case ${c.index} ${r.year}`).toBe(0)
        expect(p.survivorPension, `seed ${c.seed} case ${c.index} ${r.year}`).toBe(0)
      }
    }
  })
})
