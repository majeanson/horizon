// VERIFIED-AGAINST
// source:    https://www.canada.ca/fr/emploi-developpement-social/programmes/pensions/pension/statistiques/rapport-trimestriel/2023-trimestriel-janvier-mars.html
// title:     Montants trimestriels des prestations et données connexes du Régime de pensions du Canada et de la Sécurité de la vieillesse - janvier à mars 2023 - Canada.ca
// retrieved: 2026-10-08
// tolerance: 0,05 $ a month on the flat-rate portion carried from 2023 to 2026 (three cent-rounded January indexations); exact on the 2019 ratio
//
// Service Canada's quarterly report is the ONE official page that prints the QPP surviving spouse's pension split into its « montant
// uniforme » (the Act's flat-rate portion, art. 133 2nd para., indexed since 1994) and its earnings-related part. It stopped
// carrying QPP figures after 2023 (the 2024–2026 editions link to Retraite Québec instead), so the 2026 figure in params/2026.ts is
// the 2023 one indexed by the QPP's own January rates — each printed by Retraite Québec. Independent of the derivation from the
// three published maxima (survivor.test.ts), and the two agree to two cents.
//
// Further sources, all read on 2026-10-08:
//   · https://www.canada.ca/fr/emploi-developpement-social/programmes/pensions/pension/statistiques/rapport-trimestriel/2019-trimestriel-octobre-decembre.html
//       the same report, October to December 2019: RRQ « Montant uniforme » 127,12 $ (under 45, no child) · 496,33 $ (45 to 64) — the 80 : 312,33 ratio of the Act.
//   · https://www.retraitequebec.gouv.qc.ca/fr/programmes/regime-rentes-quebec/regime-chiffres — « Le Régime en chiffres »: « Taux d'indexation des
//       prestations au 1er janvier 2026 » 2,00 %; « … au 1er janvier 2025 » 2,6 %. The English edition's 2024-figures section prints 4,4 % — the
//       January 2024 rate (its row is labelled « as at 1 January 2023 », a year whose rate was 6,5 %; Retraite Québec's 2023-11 announcement said 4,4 % for 2024).
//   · https://www.quebec.ca/nouvelles/actualites/details/regime-de-rentes-du-quebec-la-rente-de-plus-de-22-millions-de-beneficiaires-augmentera-en-janvier-2025-59753
//       Retraite Québec, 2024-11-22: the pensions « verront leur rente augmenter de 2,6 % » in January 2025.
import { describe, expect, it } from 'vitest'
import { knownYear } from '../params/index.ts'
import { roundTo } from '../params/project.ts'

const P = knownYear(2026).rrq

/** A QPP amount indexed each January, rounded to the cent each time as the paid amounts are. */
const indexed = (amount: number, rates: readonly number[]): number => rates.reduce((a, r) => roundTo(a * (1 + r), 0.01), amount)
const RATES_2024_TO_2026 = [0.044, 0.026, 0.02]

describe('the flat-rate portion of the surviving spouse’s pension — against Service Canada’s quarterly report', () => {
  it('January–March 2023: « Montant uniforme » 558,71 $ (45 to 64) and 143,10 $ (under 45, no child), indexed 4,4 % · 2,6 % · 2,0 %, are the 2026 figures', () => {
    expect(indexed(558.71, RATES_2024_TO_2026)).toBeCloseTo(P.survivorFlatRate45to64, 1)
    expect(indexed(143.1, RATES_2024_TO_2026)).toBeCloseTo(P.survivorFlatRateUnder45, 1)
    expect(Math.abs(indexed(558.71, RATES_2024_TO_2026) - P.survivorFlatRate45to64)).toBeLessThan(0.05)
  })

  it('the report’s two flat amounts stand in the Act’s ratio, 312,33 : 80 — in 2023 and in 2019 alike (the indexation never bends it)', () => {
    expect(558.71 / 143.1).toBeCloseTo(312.33 / 80, 2)
    expect(496.33 / 127.12).toBeCloseTo(312.33 / 80, 2)
  })

  it('the report’s earnings-related part is 37,5 % of the maximum base pension plus half the additional components: the CPP row shows the 37,5 % alone', () => {
    // CPP, younger than 65: « Partie liée aux gains » 489,96 $ = 37,5 % × 1 306,57 $ (the 2023 maximum pension at 65, the same for both plans).
    expect(0.375 * 1306.57).toBeCloseTo(489.96, 2)
    // QPP, 45 to 64: 506,10 $ — the same 37,5 % plus 50 % of the additional components a maximum contributor had earned by 2023 (16,14 $ a month of them).
    expect(506.1 - 489.96).toBeGreaterThan(0)
    expect(506.1 - 489.96).toBeLessThan(0.5 * (P.maxPension65 - P.maxBasePension65)) // less than half of 2026's additional maximum: fewer years had accrued
    // …and the totals are the sums the report prints.
    expect(558.71 + 506.1).toBeCloseTo(1064.81, 2)
    expect(143.1 + 506.1).toBeCloseTo(649.2, 2)
  })
})
