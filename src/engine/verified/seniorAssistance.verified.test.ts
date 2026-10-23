// VERIFIED-AGAINST
// source:    https://www.revenuquebec.ca/fr/citoyens/credits-dimpot/credit-dimpot-pour-soutien-aux-aines/montant-du-credit-dimpot-pour-soutien-aux-aines/
// title:     Montant du crédit d’impôt pour soutien aux aînés
// retrieved: 2026-10-23
// tolerance: to the dollar (the page prints whole-dollar ceilings: the credit is zero from the ceiling it prints, and the ceiling a dollar short pays under 6 cents)
//
// Revenu Québec's page for the 2025 tax year (situation on 31 December 2025) prints the maximum credit by situation, the reduction (« 5,40 % de la partie du revenu familial qui dépasse 45 270 $ avec
// conjoint, 27 835 $ sans conjoint ») and the family income from which nothing is paid: 119 345 $ for a couple of two people aged 70 or over (4 000 $), 82 308 $ for a couple of whom one is (2 000 $),
// 64 873 $ for a person without a spouse (2 000 $). The engine (qcCredits.ts `seniorAssistance`) must reproduce those three ceilings from the maximum, the threshold and the rate alone.
import { describe, expect, it } from 'vitest'
import { seniorAssistance, seniorAssistanceRulesOf } from '../qcCredits.ts'
import { knownYear } from '../params/index.ts'

const S = knownYear(2026).qcCredits.seniorAssistance
const R = seniorAssistanceRulesOf(S)

describe('the senior assistance tax credit — Revenu Québec’s own figures for the 2025 tax year', () => {
  it('the cited figures are the page’s: 2 000 $ · age 70 · 27 835 $ · 45 270 $ · 5,40 %', () => {
    expect([S.maxPerPerson, S.minAge, S.thresholdSingle, S.thresholdCouple, S.reductionRate]).toEqual([2_000, 70, 27_835, 45_270, 0.054])
  })

  it('a person without a spouse: 2 000 $ up to 27 835 $, nothing from the 64 873 $ the page prints', () => {
    expect(seniorAssistance(27_835, [72], R)).toBe(2_000)
    expect(seniorAssistance(64_873, [72], R)).toBe(0)
    expect(seniorAssistance(64_871, [72], R)).toBeLessThan(0.06)
    expect(seniorAssistance(64_871, [72], R)).toBeGreaterThan(0)
  })

  it('a couple of two people aged 70 or over: 4 000 $ up to 45 270 $, nothing from the 119 345 $ the page prints', () => {
    expect(seniorAssistance(45_270, [71, 74], R)).toBe(4_000)
    expect(seniorAssistance(119_345, [71, 74], R)).toBe(0)
    expect(seniorAssistance(119_343, [71, 74], R)).toBeLessThan(0.06)
    expect(seniorAssistance(119_343, [71, 74], R)).toBeGreaterThan(0)
  })

  it('a couple of whom only one is 70 or over: 2 000 $ at the couple’s threshold, nothing from the 82 308 $ the page prints', () => {
    expect(seniorAssistance(45_270, [70, 66], R)).toBe(2_000)
    expect(seniorAssistance(82_308, [70, 66], R)).toBe(0)
    expect(seniorAssistance(82_306, [70, 66], R)).toBeLessThan(0.06)
  })

  it('under 70 nothing is paid, whatever the income', () => {
    expect(seniorAssistance(10_000, [69], R)).toBe(0)
    expect(seniorAssistance(10_000, [69, 66], R)).toBe(0)
  })

  it('the three ceilings follow from the maximum, the threshold and the rate, max / rate + threshold, rounded UP to the dollar as the page prints them', () => {
    expect(Math.ceil(2_000 / 0.054 + 27_835)).toBe(64_873) // 64 872,04
    expect(Math.ceil(4_000 / 0.054 + 45_270)).toBe(119_345) // 119 344,07
    expect(Math.ceil(2_000 / 0.054 + 45_270)).toBe(82_308) // 82 307,04
  })
})
