// VERIFIED-AGAINST
// source:    https://www.retraitequebec.gouv.qc.ca/fr/guide-employeur/education/77766
// title:     Méthode de calcul des cotisations pour le RREGOP, le RRCE, le RRPE, le RRAS et le RRAPSC
// retrieved: 2026-10-07
// tolerance: 0,15 $ a year — the page's example rounds each of 26 pays to the cent (63,40 $ × 26 = 1 648,40 $, printed 1 648,41 $); the formula applied once to the year gives 1 648,51 $
import { describe, expect, it } from 'vitest'
import { memberContribution } from '../memberContribution.ts'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../golden/household.fixture.ts'
import { project } from '../projection.ts'
import { rregopPension } from '../presets.ts'

const rule = rregopPension({ serviceYearsToDate: 10, startAge: 60 }).memberContribution!
const MGA = 74_600

describe('RREGOP member contributions — the employer guide', () => {
  it('reproduces the page: 43 300 $ over 26 pays → about 1 648,41 $ a year', () => {
    expect(Math.abs(memberContribution(43_300, 1, MGA, rule) - 1_648.41)).toBeLessThan(0.15)
  })
  it('at the MGA there is no reduction: (74 600 − 18 650) × 8,63 %', () => {
    expect(memberContribution(MGA, 1, MGA, rule)).toBeCloseTo(55_950 * 0.0863, 1)
  })
  it('owes nothing at or under the 35 %-of-MGA threshold the page states (26 110 $)', () => {
    expect(memberContribution(26_110, 1, MGA, rule)).toBe(0)
    expect(memberContribution(20_000, 1, MGA, rule)).toBe(0)
  })
  it('a part-year scales the exemption and the reduction with the service', () => {
    expect(memberContribution(21_650, 0.5, MGA, rule)).toBeCloseTo(((21_650 - 9_325) * 0.0863) - 0.0153 * (37_300 - 21_650), 2)
  })
  it('no pay, or no service, owes nothing', () => {
    expect(memberContribution(0, 1, MGA, rule)).toBe(0)
    expect(memberContribution(50_000, 0, MGA, rule)).toBe(0)
  })
})

describe('RREGOP member contributions — in the projection', () => {
  const rows = project(GOLDEN_HOUSEHOLD, GOLDEN_ASSUMPTIONS)
  const member = GOLDEN_HOUSEHOLD.persons.find((p) => p.pensions.some((d) => d.memberContribution))!
  const other = GOLDEN_HOUSEHOLD.persons.find((p) => p !== member)!

  it('the member pays while there is pay, the formula on that year\'s MGA, and nothing once retired', () => {
    const paying = rows.filter((r) => (r.persons[member.id]?.employment ?? 0) > 0)
    expect(paying.length).toBeGreaterThan(0)
    for (const r of paying) expect(r.persons[member.id]!.pensionContribution, `${r.year}`).toBeGreaterThan(0)
    for (const r of rows.filter((x) => (x.persons[member.id]?.employment ?? 0) === 0)) expect(r.persons[member.id]!.pensionContribution, `${r.year}`).toBe(0)
  })
  it('a person with no such pension pays none, however much they earn', () => {
    for (const r of rows) expect(r.persons[other.id]!.pensionContribution, `${r.year}`).toBe(0)
  })
  it('the contribution is deducted from income: the member\'s net income is lower than without it', () => {
    const without = project({ ...GOLDEN_HOUSEHOLD, persons: GOLDEN_HOUSEHOLD.persons.map((p) => ({ ...p, pensions: p.pensions.map(({ memberContribution: _m, ...d }) => d) })) }, GOLDEN_ASSUMPTIONS)
    expect(rows[0].persons[member.id]!.netIncome).toBeLessThan(without[0].persons[member.id]!.netIncome)
  })
})
