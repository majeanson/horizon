import { describe, expect, it } from 'vitest'
import { citedLeaves } from './cited.ts'
import { P2026 } from './2026.ts'

// THE 2026 FIGURES, RE-TYPED FROM THE OFFICIAL PAGES — a second, independent transcription.
//
// 2026.ts holds each figure beside the page it came from. This file holds each figure AGAIN, typed
// separately from the research notes, with the page's URL in the test's name. A typo in either
// file makes them disagree and fails the build; a figure changed deliberately must be changed in
// both, in one commit, with its source — which is exactly when someone should be looking.
//
// A figure that is DERIVED (not printed on any page) or read through an archived copy is still
// listed here: the test pins what the repo says, and `verify` on the source says how far to trust it.

const RQ = 'https://www.retraitequebec.gouv.qc.ca'
const FIGURES = `${RQ}/en/programs/quebec-pension-plan/quebec-pension-plan-figures`
const ADDITIONAL = `${RQ}/en/programs/quebec-pension-plan/additional-plan`
const EARNINGS = `${RQ}/en/programs/quebec-pension-plan/work-contributions/pensionable-earnings-contributions`
const CALC = `${RQ}/en/citizens/retirement-planning/applying-your-retirement-pension/retirement-pension-quebec-pension-plan/calculation-your-retirement-pension`
const LEAFLET_65 = `${RQ}/sites/default/files/SiteCollectionDocuments/RetraiteQuebec/en/publications/nos-programmes/regime-de-rentes/retraite/1036-1f-Methode-calcul-rente-2025.pdf`
const LEAFLET_68 = `${RQ}/sites/default/files/SiteCollectionDocuments/RetraiteQuebec/en/publications/nos-programmes/regime-de-rentes/retraite/1036-3a-Calcul-rente-68-ans-2025.pdf`
const Q4 = 'https://www.canada.ca/en/employment-social-development/programs/pensions/pension/statistics/2026-quarterly-october-december.html'
const OAS = 'https://www.canada.ca/en/services/benefits/publicpensions/old-age-security'
const ACT = 'https://laws-lois.justice.gc.ca/eng/acts/o-9/FullText.html'
const QPP_ACT = 'https://www.legisquebec.gouv.qc.ca/fr/pdf/lc/R-9.pdf'
const SURVIVOR = `${RQ}/en/citizens/death/surviving-spouse-pension`
const OAS_SURVIVOR = 'https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/guaranteed-income-supplement/allowance-survivor/benefit-amount.html'
const OGP = 'https://ouvert.canada.ca/data/dataset/dfa4daf1-669e-4514-82cd-982f27707ed0'
const CRA = 'https://www.canada.ca/en/revenue-agency/services/tax/individuals'
const LINES = `${CRA}/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses`
const QC_PDF = 'https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/finances/publications-adm/parametres/AUTFR_RegimeImpot2026.pdf'
const QC_2020 = 'https://www.budget.finances.gouv.qc.ca/budget/outils/depenses-fiscales/documents/Depenses_fiscales_2020_Description_mesures.pdf'

// path → [the figure, the page it is read on]
const EXPECTED: Record<string, readonly [unknown, string]> = {
  // ── Retraite Québec ─────────────────────────────────────────────────────────────────────────
  'rrq.mga': [74_600, FIGURES],
  'rrq.yampe': [85_000, FIGURES],
  'rrq.exemption': [3_500, EARNINGS],
  'rrq.rateBase': [0.053, ADDITIONAL],
  'rrq.rateFirst': [0.01, ADDITIONAL],
  'rrq.rateSecond': [0.04, ADDITIONAL],
  'rrq.maxPension65': [1_507.65, FIGURES],
  'rrq.maxBasePension65': [1_441.25, FIGURES],
  'rrq.indexation': [0.02, FIGURES],
  'rrq.baseReplacement': [0.25, LEAFLET_65],
  'rrq.excludedShare': [0.15, CALC],
  'rrq.firstReplacement': [0.0833, LEAFLET_65],
  'rrq.secondReplacement': [0.3333, LEAFLET_65],
  'rrq.firstFrom': [2019, LEAFLET_65],
  'rrq.secondFrom': [2024, ADDITIONAL],
  'rrq.phaseIn': [{ 2019: 0.15, 2020: 0.3, 2021: 0.5, 2022: 0.75 }, LEAFLET_65],
  'rrq.additionalMonths': [480, LEAFLET_65],
  'rrq.earlyBase': [0.005, LEAFLET_65],
  'rrq.earlySlope': [0.001, LEAFLET_65],
  'rrq.latePerMonth': [0.007, LEAFLET_65],
  'rrq.lateMaxMonths': [84, CALC],
  'rrq.lateProtectionFrom': [2024, LEAFLET_68],
  'rrq.careerStartAge': [18, LEAFLET_65],
  'rrq.careerMaxAge': [72, LEAFLET_65],
  'rrq.normalAge': [65, CALC],
  'rrq.earliestAge': [60, CALC],
  'rrq.latestAge': [72, CALC],
  // The surviving spouse's pension — Loi sur le régime de rentes du Québec, arts. 133–137.2 (shares), Retraite Québec (the flat rate derived, the maxima).
  'rrq.survivorBaseShareUnder65': [0.375, QPP_ACT],
  'rrq.survivorBaseShare65': [0.6, QPP_ACT],
  'rrq.survivorAdditionalShare': [0.5, QPP_ACT],
  'rrq.survivorOwnPensionOffset': [0.4, QPP_ACT],
  'rrq.survivorFlatRate45to64': [610.45, FIGURES],
  'rrq.survivorFlatRateUnder45': [156.36, FIGURES],
  'rrq.survivorMaxUnder65': [1_173.58, SURVIVOR],
  'rrq.survivorMax65': [881.48, SURVIVOR],

  // ── Service Canada ──────────────────────────────────────────────────────────────────────────
  'oas.monthly65to74': [762.5, Q4],
  'oas.monthly75plus': [838.75, Q4],
  'oas.increaseAt75': [0.1, ACT],
  'oas.deferralPerMonth': [0.006, `${OAS}/when-start.html`],
  'oas.deferralMaxMonths': [60, `${OAS}/when-start.html`],
  'oas.startAgeMin': [65, `${OAS}/when-start.html`],
  'oas.startAgeMax': [70, `${OAS}/when-start.html`],
  'oas.residenceYearsFull': [40, ACT],
  'oas.residenceYearsMinimum': [10, ACT],
  'oas.recoveryThreshold': [95_323, Q4],
  'oas.recoveryRate': [0.15, `${OAS}/repayment.html`],
  'oas.allowanceMax': [1_448.06, Q4],
  'oas.allowanceCutoff': [42_768, Q4],
  'oas.survivorAllowanceMax': [1_726.18, OAS_SURVIVOR],
  'oas.survivorAllowanceCutoff': [31_152, OAS_SURVIVOR],
  'oas.survivorAllowanceCurve': [{ 0: 1_726.18, 2_016: 1_601.01, 10_464: 897.01, 10_496: 895.77, 10_512: 892.77, 12_192: 787.77, 12_240: 787.27, 31_128: 0.27, 31_152: 0 }, OGP],
  'oas.allowanceCurve': [{ 0: 1_448.06, 4_192: 1_185.06, 8_928: 840.07, 12_192: 636.07, 42_720: 0.57, 42_768: 0 }, 'https://ouvert.canada.ca/data/dataset/dfa4daf1-669e-4514-82cd-982f27707ed0'],
  'oas.gisAllowanceCurve': [{ 0: 685.56, 4_176: 684.56, 8_880: 635.57, 12_288: 634.57, 30_144: 262.92, 42_720: 262.92, 42_768: 262.92 }, 'https://ouvert.canada.ca/data/dataset/dfa4daf1-669e-4514-82cd-982f27707ed0'],
  'oas.gis.single.max': [1_138.9, Q4],
  'oas.gis.single.cutoff': [23_112, Q4],
  'oas.gis.single.topUpCutoff': [10_496, Q4],
  'oas.gis.spouseOas.max': [685.56, Q4],
  'oas.gis.spouseOas.cutoff': [30_528, Q4],
  'oas.gis.spouseOas.topUpCutoff': [8_800, Q4],
  'oas.gis.spouseNone.max': [1_138.9, Q4],
  'oas.gis.spouseNone.cutoff': [55_392, Q4],
  'oas.gis.spouseNone.topUpCutoff': [20_992, Q4],
  'oas.gis.topUpStartSingle': [2_000, ACT],
  'oas.gis.topUpStartCouple': [4_000, ACT],
  'oas.gis.baseDivisorSingle': [24, ACT],
  'oas.gis.baseDivisorCouple': [48, ACT],
  'oas.gis.topUpDivisorSingle': [48, ACT],
  'oas.gis.topUpDivisorCouple': [96, ACT],
  'oas.gis.employmentExemptionFull': [5_000, ACT],
  'oas.gis.employmentExemptionBand': [10_000, ACT],

  // ── Canada Revenue Agency / Finance Canada ──────────────────────────────────────────────────
  'federal.brackets': [
    [
      { upTo: 58_523, rate: 0.14 },
      { upTo: 117_045, rate: 0.205 },
      { upTo: 181_440, rate: 0.26 },
      { upTo: 258_482, rate: 0.29 },
      { upTo: null, rate: 0.33 },
    ],
    `${CRA}/tax-rates-brackets/current-year.html`,
  ],
  'federal.creditRate': [0.14, 'https://www.canada.ca/en/department-finance/services/publications/report-impact-reducing-lowest-marginal-personal-income-tax-rate-non-refundable-tax-credits.html'],
  'federal.bpaMax': [16_452, `${CRA}/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html`],
  'federal.bpaMin': [14_829, `${CRA}/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html`],
  'federal.ageAmount': [9_208, `${CRA}/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html`],
  'federal.ageThreshold': [46_432, `${CRA}/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html`],
  'federal.ageReduction': [0.15, 'https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-118.html'],
  'federal.ageMinAge': [65, `${LINES}/line-30100-amount.html`],
  'federal.pensionAmountMax': [2_000, `${LINES}/line-31400-pension-income-amount.html`],
  'federal.pensionMinAge': [65, `${LINES}/line-31400-pension-income-amount.html`],
  'federal.employmentAmount': [1_501, `${LINES}/line-31260-canada-employment-amount.html`],
  'federal.quebecAbatement': [0.165, 'https://www.canada.ca/en/department-finance/programs/federal-transfers/quebec-abatement.html'],
  'federal.capitalGainsInclusion': [0.5, `${CRA}/topics/about-your-tax-return/tax-return/completing-a-tax-return/personal-income/line-12700-capital-gains/definitions-capital-gains.html`],
  'federal.splitMaxShare': [0.5, `${CRA}/topics/pension-income-splitting.html`],

  // ── Revenu Québec / Finances Québec ─────────────────────────────────────────────────────────
  'quebec.brackets': [
    [
      { upTo: 54_345, rate: 0.14 },
      { upTo: 108_680, rate: 0.19 },
      { upTo: 132_245, rate: 0.24 },
      { upTo: null, rate: 0.2575 },
    ],
    'https://www.revenuquebec.ca/en/citizens/income-tax-return/completing-your-income-tax-return/income-tax-rates/',
  ],
  'quebec.creditRate': [0.14, 'https://www.budget.finances.gouv.qc.ca/budget/outils/depenses-fiscales/fiches/fiche-110111.asp'],
  'quebec.bpa': [18_952, QC_PDF],
  'quebec.ageAmount': [3_986, QC_PDF],
  'quebec.livingAloneAmount': [2_172, QC_PDF],
  'quebec.retirementIncomeAmount': [3_541, QC_PDF],
  'quebec.reductionThreshold': [42_955, QC_PDF],
  'quebec.reductionRate': [0.1875, 'https://www.budget.finances.gouv.qc.ca/budget/outils/depenses-fiscales/fiches/fiche-110111.asp'],
  'quebec.retirementIncomeMultiple': [1.25, QC_2020],
  'quebec.ageMinAge': [65, 'https://www.revenuquebec.ca/fr/citoyens/declaration-de-revenus/produire-votre-declaration-de-revenus/comment-remplir-votre-declaration-de-revenus/aide-par-ligne/350-a-398-1-credits-dimpot-non-remboursables/ligne-361/'],
  'quebec.splitMinAge': [65, QC_2020],
  'quebec.splitMaxShare': [0.5, QC_2020],
  'quebec.workerDeductionRate': [0.06, 'https://www.budget.finances.gouv.qc.ca/budget/outils/depenses-fiscales/fiches/fiche-110906.asp'],
  'quebec.workerDeductionMax': [1_450, QC_PDF],
  // ── Employee premiums ───────────────────────────────────────────────────────────────────────
  'payroll.eiRate': [0.013, 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html'],
  'payroll.eiMaxInsurable': [68_900, 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html'],
  'payroll.qpipRate': [0.0043, 'https://www.quebec.ca/entreprises-et-travailleurs-autonomes/administrer-gerer/embauche-gestion-personnel/assurance-parentale/taux-cotisations'],
  'payroll.qpipMaxInsurable': [103_000, 'https://www.quebec.ca/entreprises-et-travailleurs-autonomes/administrer-gerer/embauche-gestion-personnel/assurance-parentale/revenu-maximal-assurable'],

  // ── Registered accounts ─────────────────────────────────────────────────────────────────────
  'accounts.rrspLimit': [33_810, 'https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html'],
  'accounts.rrspRate': [0.18, `${CRA}/topics/rrsps-related-plans/contributing-a-rrsp-prpp/contributions-affect-your-rrsp-prpp-deduction-limit.html`],
  'accounts.tfsaLimit': [7_000, `${CRA}/topics/tax-free-savings-account/contributing/before.html`],
  'accounts.tfsaCumulativeSince2009': [109_000, `${CRA}/topics/tax-free-savings-account/contributing/before.html`],
  'accounts.rrifFactors': [
    {
      71: 0.0528, 72: 0.054, 73: 0.0553, 74: 0.0567, 75: 0.0582, 76: 0.0598, 77: 0.0617, 78: 0.0636, 79: 0.0658,
      80: 0.0682, 81: 0.0708, 82: 0.0738, 83: 0.0771, 84: 0.0808, 85: 0.0851, 86: 0.0899, 87: 0.0955, 88: 0.1021,
      89: 0.1099, 90: 0.1192, 91: 0.1306, 92: 0.1449, 93: 0.1634, 94: 0.1879, 95: 0.2,
    },
    'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/completing-slips-summaries/t4rsp-t4rif-information-returns/payments/chart-prescribed-factors.html',
  ],
  'accounts.rrifDivisor': [90, 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/completing-slips-summaries/t4rsp-t4rif-information-returns/payments/chart-prescribed-factors.html'],
  'accounts.rrifConversionAge': [71, `${CRA}/topics/rrsps-related-plans/rrsp-options-when-you-turn-71.html`],
  'accounts.pensionAdjustmentFactor': [9, 'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4084/pension-adjustment-guide.html'],
  'accounts.lifPrescribedRate': [0.0625, 'https://www.retraitequebec.gouv.qc.ca/en/professionals-employers/professionals-involved-pension-plans/liras-lifs/rates-relating-lif-calculations'],
  'accounts.lifFreeAge': [55, 'https://www.retraitequebec.gouv.qc.ca/en/professionals-employers/professionals-involved-pension-plans/liras-lifs/characteristics-lif'],
  'accounts.lifUnlockAge': [65, 'https://www.retraitequebec.gouv.qc.ca/en/flash-retirement/flash-retirement-capsule-41'],
  'accounts.lifUnlockShareOfMga': [0.4, 'https://www.retraitequebec.gouv.qc.ca/en/flash-retirement/flash-retirement-capsule-41'],
  'accounts.pensionAdjustmentOffset': [600, 'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4084/pension-adjustment-guide.html'],
}

const leaves = new Map(citedLeaves(P2026).map((l) => [l.path, l.cited]))

describe('2026 parameters — each figure against the page it was read on', () => {
  it('has a literal here for EVERY leaf of 2026.ts, and no literal without a leaf', () => {
    expect([...leaves.keys()].filter((p) => !(p in EXPECTED)), 'a figure in 2026.ts with no independent transcription here').toEqual([])
    expect(Object.keys(EXPECTED).filter((p) => !leaves.has(p)), 'a transcription here with no figure in 2026.ts').toEqual([])
  })

  for (const [path, [expected, url]] of Object.entries(EXPECTED)) {
    it(`${path} = ${typeof expected === 'object' ? JSON.stringify(expected).slice(0, 48) : String(expected)} — ${url}`, () => {
      const leaf = leaves.get(path)
      expect(leaf, `no leaf at ${path}`).toBeDefined()
      expect(leaf!.value).toEqual(expected)
      expect(leaf!.source.url).toBe(url)
    })
  }
})
