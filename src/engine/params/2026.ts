import type { Bracket, Cited, IndexRule, Source } from './cited.ts'
import type { YearParams } from './types.ts'

// The government figures for the 2026 tax year — every one read, on 2026-10-06, off the official
// page named beside it. Read this file the way a verifier would: pick a line, open its URL, find
// the quoted row, compare the number. The `verify` field on a few sources says, in words, which
// figures could NOT be confirmed that way and why; SOURCES.md (generated) prints the lot as a table.
//
// What is NOT here: figures this app does not model (the FSS contribution, the RAMQ drug premium,
// the seniors' tax credits) — see ENGINE.md §2, where each omission is named.
//
// Erasable TypeScript only (an object literal and `satisfies`): this file is executed by Node
// itself under `npm run sources`, and Node type-strips natively.

const RETRIEVED = '2026-10-06'
const src = (url: string, title: string, extra: { note?: string; verify?: string } = {}): Source => ({ url, title, retrieved: RETRIEVED, ...extra })
const c = <T>(value: T, index: IndexRule, source: Source, round?: number): Cited<T> => ({ value, source, index, ...(round === undefined ? {} : { round }) })

// ── Retraite Québec ──────────────────────────────────────────────────────────────────────────────
const RQ = 'https://www.retraitequebec.gouv.qc.ca'
const LEAFLETS = `${RQ}/sites/default/files/SiteCollectionDocuments/RetraiteQuebec/en/publications/nos-programmes/regime-de-rentes/retraite`
const RRQ_FIGURES = src(`${RQ}/en/programs/quebec-pension-plan/quebec-pension-plan-figures`, 'Québec Pension Plan Figures')
const RRQ_ADDITIONAL = src(`${RQ}/en/programs/quebec-pension-plan/additional-plan`, 'The additional plan')
const RRQ_EARNINGS = src(`${RQ}/en/programs/quebec-pension-plan/work-contributions/pensionable-earnings-contributions`, 'Pensionable earnings and contributions')
const RRQ_CALC = src(
  `${RQ}/en/citizens/retirement-planning/applying-your-retirement-pension/retirement-pension-quebec-pension-plan/calculation-your-retirement-pension`,
  'Calculation of Your Retirement Pension Under the Québec Pension Plan',
)
const RRQ_LEAFLET_65 = src(`${LEAFLETS}/1036-1f-Methode-calcul-rente-2025.pdf`, 'Retirement pension paid as of age 65 and 1 month (1036-1-RRQ, 2025-06)')
const RRQ_LEAFLET_68 = src(`${LEAFLETS}/1036-3a-Calcul-rente-68-ans-2025.pdf`, 'Retirement pension paid as of age 68 and 1 month (1036-3-RRQ, 2025-06)')

// ── Service Canada ───────────────────────────────────────────────────────────────────────────────
const ESDC_Q4 = src(
  'https://www.canada.ca/en/employment-social-development/programs/pensions/pension/statistics/2026-quarterly-october-december.html',
  'Maximum Benefit Amounts and Related Figures - Canada Pension Plan (2026) and Old Age Security (October to December 2026)',
  { note: 'The latest published quarter. The year’s four quarterly maxima were 742.31, 743.05, 751.97 and 762.50 $ (ages 65–74); projection indexes from this level.' },
)
const OAS_DEFER = src('https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/when-start.html', 'Old Age Security - When to start your retirement pension - Canada.ca')
const OAS_REPAY = src('https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/repayment.html', 'Repayment of Old Age Security pension - Canada.ca')
const OAS_ACT = src('https://laws-lois.justice.gc.ca/eng/acts/o-9/FullText.html', 'Old Age Security Act (R.S.C., 1985, c. O-9)')

// ── Canada Revenue Agency / Finance Canada ───────────────────────────────────────────────────────
const CRA = 'https://www.canada.ca/en/revenue-agency/services/tax/individuals'
const CRA_LINES = `${CRA}/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses`
const CRA_RATES = src(`${CRA}/tax-rates-brackets/current-year.html`, 'Current year tax rates and income brackets (2026) - Personal income tax - Canada.ca')
const CRA_INDEX = src(`${CRA}/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html`, 'Indexation adjustment for personal income tax and benefit amounts - Canada.ca')
const FIN_LOWEST = src(
  'https://www.canada.ca/en/department-finance/services/publications/report-impact-reducing-lowest-marginal-personal-income-tax-rate-non-refundable-tax-credits.html',
  'Report on the Impact of Reducing the Lowest Marginal Personal Income Tax Rate on Non-Refundable Tax Credits',
)
const ITA_118 = src('https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-118.html', 'Income Tax Act, section 118')
const CRA_PENSION = src(`${CRA_LINES}/line-31400-pension-income-amount.html`, 'Line 31400 - Pension income amount', { note: 'The page still reads « Tax year: 2025 »; the $2,000 maximum is statutory (ITA 118(3)) and unchanged.' })
const CRA_AGE = src(`${CRA_LINES}/line-30100-amount.html`, 'Line 30100 - Age amount', { note: 'The page still reads « Tax year: 2025 »; the 65-and-over condition is unchanged.' })
const CRA_SPLIT = src(`${CRA}/topics/pension-income-splitting.html`, 'Pension income splitting - Canada.ca')
const FIN_ABATEMENT = src('https://www.canada.ca/en/department-finance/programs/federal-transfers/quebec-abatement.html', 'Quebec Abatement - Canada.ca')
const CRA_EMPLOYMENT = src(`${CRA_LINES}/line-31260-canada-employment-amount.html`, 'Line 31260 - Canada employment amount', { note: 'The 2026 maximum, $1,501, is on the indexation page; this page still reads « Tax year: 2025 ».' })
const CRA_CG = src(`${CRA}/topics/about-your-tax-return/tax-return/completing-a-tax-return/personal-income/line-12700-capital-gains/definitions-capital-gains.html`, 'Definitions for capital gains', {
  note: 'The proposed increase of the inclusion rate to two thirds was cancelled (Prime Minister, 2025-03-21; Finance Canada’s 2026 Report on Federal Tax Expenditures confirms it will not proceed). The page words it « for 2025 ».',
})
const CRA_LIMITS = src(
  'https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html',
  'MP, DB, RRSP, DPSP, ALDA, TFSA limits, YMPE and the YAMPE',
  { note: 'Row 2026: RRSP dollar limit $33,810 (2027: $35,390). Every limit on the page is a multiple of 10.' },
)
const CRA_TFSA = src(`${CRA}/topics/tax-free-savings-account/contributing/before.html`, 'Before you contribute to a TFSA', { note: 'Annual limit 2026: $7,000; « indexed to inflation and rounded to the nearest $500 ».' })
const CRA_RRIF = src(
  'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/completing-slips-summaries/t4rsp-t4rif-information-returns/payments/chart-prescribed-factors.html',
  'Chart - Prescribed factors',
  { note: 'Column « All other RRIFs ». Under 71: 1 ÷ (90 − age).' },
)
const CRA_71 = src(`${CRA}/topics/rrsps-related-plans/rrsp-options-when-you-turn-71.html`, 'RRSP options when you turn 71')
const CRA_PA = src('https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4084/pension-adjustment-guide.html', 'Pension Adjustment Guide', {
  note: '« (9 × benefit earned) − $600 = pension credit » for a defined-benefit provision; « If the result is negative, the pension credit is zero » (the offset has been $600 since 1997).',
})
const CRA_RRSP_FORMULA = src(`${CRA}/topics/rrsps-related-plans/contributing-a-rrsp-prpp/contributions-affect-your-rrsp-prpp-deduction-limit.html`, 'How contributions affect your RRSP/PRPP deduction limit')

const CRA_EI = src(
  'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html',
  'EI premium rates and maximums – Calculate payroll deductions and contributions',
  { note: 'Table for employees in Québec, row 2026: « $68,900 | 1.30 | $895.70 | $1,253.98 » (maximum insurable earnings, employee rate, maximum employee premium, employer maximum).' },
)

// ── Revenu Québec / Finances Québec ──────────────────────────────────────────────────────────────
const QC_QPIP_RATES = src(
  'https://www.quebec.ca/entreprises-et-travailleurs-autonomes/administrer-gerer/embauche-gestion-personnel/assurance-parentale/taux-cotisations',
  'Taux de cotisations au Régime québécois d’assurance parentale (RQAP)',
  { note: 'Salarié, 2026 : « Taux de cotisation : 0,430 % », cotisation maximale 442,90 $ (0,494 % et 484,12 $ en 2025) ; baisse de 13 % le 1er janvier 2026.' },
)
const QC_QPIP_MAX = src(
  'https://www.quebec.ca/entreprises-et-travailleurs-autonomes/administrer-gerer/embauche-gestion-personnel/assurance-parentale/revenu-maximal-assurable',
  'Revenu maximal assurable aux fins du Régime québécois d’assurance parentale (RQAP)',
  { note: '« Le revenu maximal assurable … s’établit à 98 000 $ pour 2025 et à 103 000 $ pour 2026. » (103 000 × 0,430 % = 442,90 $, la cotisation maximale publiée.)' },
)
const QC_PARAMS = src(
  'https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/finances/publications-adm/parametres/AUTFR_RegimeImpot2026.pdf',
  "Paramètres du régime d'imposition des particuliers pour l'année d'imposition 2026",
  { note: 'Finances Québec, novembre 2025 — Tableau 3.' },
)
const QC_RATES = src('https://www.revenuquebec.ca/en/citizens/income-tax-return/completing-your-income-tax-return/income-tax-rates/', 'Income Tax Rates', {
  verify:
    'Les taux (14 / 19 / 24 / 25,75 %) ont été lus sur une copie de l’Internet Archive datée du 2026-09-03, car revenuquebec.ca refuse l’accès automatisé. Les seuils, eux, sont confirmés dans le PDF officiel de Finances Québec (Tableau 3) cité aux autres lignes.',
})
const QC_EXPENDITURES_2020 = src(
  'https://www.budget.finances.gouv.qc.ca/budget/outils/depenses-fiscales/documents/Depenses_fiscales_2020_Description_mesures.pdf',
  'Dépenses fiscales - Édition 2020 : Description des mesures',
  { note: 'Texte officiel, p. C.20 et C.22.' },
)
const QC_FICHE = src('https://www.budget.finances.gouv.qc.ca/budget/outils/depenses-fiscales/fiches/fiche-110111.asp', "Dépenses fiscales — Crédit d'impôt en raison de l'âge", {
  note: 'Édition « Dépenses fiscales 2025 », relue le 2026-10-06 : « converti, au taux de 14 % (15 % avant 2023), en un crédit d’impôt qui est partageable entre les conjoints » ; seuil de réduction 42 955 $ et montant en raison de l’âge 3 986 $ pour 2026.',
})
const QC_WORKERS = src('https://www.budget.finances.gouv.qc.ca/budget/outils/depenses-fiscales/fiches/fiche-110906.asp', 'Dépenses fiscales — Déduction pour les travailleurs', {
  verify:
    'Le taux de 6 % est celui de la Loi sur les impôts, art. 358.0.3 (« le moindre de 1 420 $ et de 6 % de son revenu de travail admissible », guide des mesures fiscales du CFFP, Université de Sherbrooke) ; la fiche officielle l’énonce aussi mais a refusé la lecture automatisée le jour du relevé. Le maximum de 2026 est, lui, lu dans le PDF officiel de Finances Québec.',
})
const QC_LINE_361 = src(
  'https://www.revenuquebec.ca/fr/citoyens/declaration-de-revenus/produire-votre-declaration-de-revenus/comment-remplir-votre-declaration-de-revenus/aide-par-ligne/350-a-398-1-credits-dimpot-non-remboursables/ligne-361/',
  "Ligne 361 - Montant accordé en raison de l'âge ou pour personne vivant seule ou pour revenus de retraite",
  {
    verify:
      'Lu sur une copie de l’Internet Archive datée du 2026-04-24 (texte de l’année d’imposition 2025) : revenuquebec.ca refuse l’accès automatisé. Le seuil d’âge est « né avant le 1er janvier 1961 » pour 2025, soit 65 ans.',
  },
)

// ── The figures ──────────────────────────────────────────────────────────────────────────────────
const BRACKETS_FEDERAL: Bracket[] = [
  { upTo: 58_523, rate: 0.14 },
  { upTo: 117_045, rate: 0.205 },
  { upTo: 181_440, rate: 0.26 },
  { upTo: 258_482, rate: 0.29 },
  { upTo: null, rate: 0.33 },
]
const BRACKETS_QUEBEC: Bracket[] = [
  { upTo: 54_345, rate: 0.14 },
  { upTo: 108_680, rate: 0.19 },
  { upTo: 132_245, rate: 0.24 },
  { upTo: null, rate: 0.2575 },
]

export const P2026 = {
  year: 2026,

  rrq: {
    mga: c(74_600, 'wage', { ...RRQ_FIGURES, note: '« Yearly maximum pensionable earnings, also called maximum pensionable earnings (MPE) | $74 600 ».' }, 100),
    yampe: c(85_000, 'wage', { ...RRQ_FIGURES, note: '« Additional maximum annual pensionable earnings … (YAMPE) | $85 000 » — 114 % of the MPE.' }, 100),
    exemption: c(3_500, 'fixed', { ...RRQ_EARNINGS, note: 'Basic exemption: $3,500 every year from 1996 to 2026.' }),
    rateBase: c(0.053, 'fixed', { ...RRQ_ADDITIONAL, note: 'Row 2026: base plan 5.3 %, first additional 1.0 %, total 6.3 %, second additional 4.0 % (the base rate fell from 5.4 % in 2025).' }),
    rateFirst: c(0.01, 'fixed', RRQ_ADDITIONAL),
    rateSecond: c(0.04, 'fixed', { ...RRQ_ADDITIONAL, note: 'On earnings between the MPE and the YAMPE, from 2024.' }),
    maxPension65: c(1_507.65, 'cpi', { ...RRQ_FIGURES, note: 'CHECK FIGURE (tests only): « At age 65 (100% of the maximum pension) | $1507.65 ». At 60: $964.90; at 72: $2394.15.' }, 0.01),
    maxBasePension65: c(1_441.25, 'cpi', { ...RRQ_FIGURES, note: 'CHECK FIGURE (tests only): « The maximum retirement pension at age 65 for the base plan is $1441.25 ».' }, 0.01),
    indexation: c(0.02, 'none', { ...RRQ_FIGURES, note: '« Indexation rate for benefits as at 1 January 2026 | 2.00% » (Consumer Price Index for Canada). An observation: not projected.' }),
    baseReplacement: c(0.25, 'fixed', { ...RRQ_LEAFLET_65, note: '« the 25% replacement rate offered up to the MPE is used ».' }),
    excludedShare: c(0.15, 'fixed', { ...RRQ_CALC, note: '« up to 15% of your lowest employment earnings will not decrease your pension » — rounded to the nearest whole month (15 % of 564 = 84.6 → 85, in the leaflet).' }),
    firstReplacement: c(0.0833, 'fixed', { ...RRQ_LEAFLET_65, note: '« the 8.33% replacement rate offered up to the MPE is used ».' }),
    secondReplacement: c(0.3333, 'fixed', { ...RRQ_LEAFLET_65, note: '« the 33.33% replacement rate applicable to the earnings between the MPE and the [YAMPE] is used ».' }),
    firstFrom: c(2019, 'fixed', { ...RRQ_LEAFLET_65, note: 'The first additional component counts earnings from 1 January 2019.' }),
    secondFrom: c(2024, 'fixed', { ...RRQ_ADDITIONAL, note: '« Since 2024, a contribution rate of 4% have been added to the portion of earnings between the [MPE] and the new ceiling ».' }),
    phaseIn: c<Record<number, number>>({ 2019: 0.15, 2020: 0.3, 2021: 0.5, 2022: 0.75 }, 'fixed', {
      ...RRQ_LEAFLET_65,
      note: '« The additional adjustment percentages that apply from 2019 to 2022 are 15%, 30%, 50% and 75%, respectively » — 100 % from 2023.',
    }),
    additionalMonths: c(480, 'fixed', { ...RRQ_LEAFLET_65, note: '« based on the best 480 months (40 years). In that case, there are no excluded periods or earnings. »' }),
    earlyBase: c(0.005, 'fixed', { ...RRQ_LEAFLET_65, note: '« Total basic monthly retirement pension × [1 − 12 × (0.5 + 0.1 × ($1367.72 / $1387.08)) / 100] »: 0.5 % per month early at the smallest pensions (stored as a fraction)…' }),
    earlySlope: c(0.001, 'fixed', { ...RRQ_LEAFLET_65, note: '…rising by 0.1 point × (base pension ÷ maximum base pension), to 0.6 % at the maximum (stored as a fraction). Not a flat 0.6 %.' }),
    latePerMonth: c(0.007, 'fixed', { ...RRQ_LEAFLET_65, note: '« increased by 0.7% for each month between the month following the person’s 65th birthday and the beginning of his or her pension, to a maximum of 58.8% ». Stored as a fraction.' }),
    lateMaxMonths: c(84, 'fixed', { ...RRQ_CALC, note: '« up to a maximum of 58.8% for a pension that begins when you turn 72 » — 84 months × 0.7 %.' }),
    lateProtectionFrom: c(2024, 'fixed', {
      ...RRQ_LEAFLET_68,
      note: '« the basic retirement pension under the base plan corresponds to the highest result between two calculations » — at the actual start, and at 65 and 1 month moved forward by the growth of AMPE 5 (since 1 January 2024).',
    }),
    careerStartAge: c(18, 'fixed', { ...RRQ_LEAFLET_65, note: 'The reference period « begins on the first day of the month following the person’s 18th birthday ».' }),
    careerMaxAge: c(72, 'fixed', { ...RRQ_LEAFLET_65, note: '…and ends no later than « the month of the person’s 72nd birthday ».' }),
    normalAge: c(65, 'fixed', { ...RRQ_CALC, note: '« As of age 65, you can receive 100% of your retirement pension ».' }),
    earliestAge: c(60, 'fixed', { ...RRQ_CALC, note: '« you can apply for a lower pension as of age 60 ».' }),
    latestAge: c(72, 'fixed', { ...RRQ_CALC, note: '« It will stop increasing at age 72 ».' }),
  },

  oas: {
    monthly65to74: c(762.5, 'cpi', ESDC_Q4, 0.01),
    monthly75plus: c(838.75, 'cpi', ESDC_Q4, 0.01),
    increaseAt75: c(0.1, 'fixed', { ...OAS_ACT, note: 's. 7.1(5): « the amount of the full monthly pension, as it is increased under subsection (1), is increased by 10% » — it multiplies the deferred amount.' }),
    deferralPerMonth: c(0.006, 'fixed', { ...OAS_DEFER, note: '« payments increase by 0.6% each month (7.2% per year), up to 36% at age 70 ». Stored as a fraction.' }),
    deferralMaxMonths: c(60, 'fixed', OAS_DEFER),
    startAgeMin: c(65, 'fixed', { ...OAS_DEFER, note: '« You can start at age 65 or as late as age 70. »' }),
    startAgeMax: c(70, 'fixed', OAS_DEFER),
    residenceYearsFull: c(40, 'fixed', { ...OAS_ACT, note: 's. 3(1): a full pension needs « an aggregate period of at least forty years » of residence after 18; s. 3(3)–(4): a partial pension is years ÷ 40, whole completed years.' }),
    residenceYearsMinimum: c(10, 'fixed', { ...OAS_ACT, note: 's. 3(2)(b): a partial pension needs at least ten years of residence (twenty if living abroad).' }),
    recoveryThreshold: c(95_323, 'cpi', { ...ESDC_Q4, note: 'Footnote 7: « The OAS pension repayment range in 2026 is for net world income from $95,323 to $155,320 » (for the 2026 income year; the 2025 income year was $93,454).' }, 1),
    recoveryRate: c(0.15, 'fixed', { ...OAS_REPAY, note: '« You must repay 15% of that amount » (net income above the threshold, line 23400).' }),
    gis: {
      single: {
        max: c(1_138.9, 'cpi', { ...ESDC_Q4, note: 'Table 5, « single, widowed or divorced »: maximum monthly amount (the top-up is included).' }, 0.01),
        cutoff: c(23_112, 'cpi', { ...ESDC_Q4, note: 'Table 5: annual income cut-off. It excludes the OAS pension and the employment-income exemption (footnote 6).' }, 1),
        topUpCutoff: c(10_496, 'cpi', { ...ESDC_Q4, note: 'Table 5: annual income cut-off for the top-up.' }, 1),
      },
      spouseOas: {
        max: c(685.56, 'cpi', { ...ESDC_Q4, note: 'Table 5, « spouse receives the full OAS pension »: maximum monthly amount for EACH spouse.' }, 0.01),
        cutoff: c(30_528, 'cpi', { ...ESDC_Q4, note: 'Table 5: the couple’s COMBINED annual income cut-off.' }, 1),
        topUpCutoff: c(8_800, 'cpi', { ...ESDC_Q4, note: 'Table 5: the couple’s combined income cut-off for the top-up.' }, 1),
      },
      spouseNone: {
        max: c(1_138.9, 'cpi', { ...ESDC_Q4, note: 'Table 5, « spouse receives neither OAS nor the Allowance »: the single maximum.' }, 0.01),
        cutoff: c(55_392, 'cpi', { ...ESDC_Q4, note: 'Table 5: the couple’s combined annual income cut-off.' }, 1),
        topUpCutoff: c(20_992, 'cpi', { ...ESDC_Q4, note: 'Table 5: the couple’s combined income cut-off for the top-up.' }, 1),
      },
      topUpStartSingle: c(2_000, 'fixed', {
        ...OAS_ACT,
        note: 's. 12.1(1): the top-up falls with income « in excess of $2,000 » (a single pensioner). s. 12.1(3) adjusts only the amount « A » to the cost of living — never these thresholds — and the published top-up cut-off reconstructs from a $2,000 knee exactly.',
      }),
      topUpStartCouple: c(4_000, 'fixed', {
        ...OAS_ACT,
        note: 's. 12.1(1)(b), (2): for a couple, « in excess of $4,000 » of the combined income. Not indexed either (s. 12.1(3) adjusts only « A »).',
      }),
      baseDivisorSingle: c(24, 'fixed', {
        ...OAS_ACT,
        note: 's. 12: the supplement is the maximum « minus one dollar for each full two dollars of the pensioner’s monthly base income »; s. 12(6)(a): a single pensioner’s monthly base income is « one-twelfth of the income » of the year → $1 per 2 × 12 = 24 annual dollars.',
        verify: 'Dérivé du texte de la Loi par calcul (aucune page canada.ca ne l’énonce en « cents par dollar »). Contre-vérifié par un test contre les seuils publiés des quatre trimestres de 2026 (le revenu limite implicite concorde à quelques dizaines de dollars près).',
      }),
      baseDivisorCouple: c(48, 'fixed', {
        ...OAS_ACT,
        note: 's. 12(6)(c)(ii): for a couple who both receive a pension, the monthly base income is « one twenty-fourth of the aggregate of the incomes » → $1 per 2 × 24 = 48 dollars of the couple’s COMBINED annual income, for each spouse.',
        verify: 'Dérivé du texte de la Loi par calcul, comme le diviseur d’une personne seule ; mêmes contre-vérifications.',
      }),
      topUpDivisorSingle: c(48, 'fixed', {
        ...OAS_ACT,
        note: 's. 12.1(1)(a): the top-up is « A × B − C/4 » with C = « 1/12 of the pensioner’s income … in excess of $2,000 » → it falls $1 per 4 × 12 = 48 annual dollars above its start.',
        verify: 'Dérivé du texte de la Loi par calcul. Contre-vérifié : (seuil du supplément − 2 000 $) ÷ 48 redonne ≈ 177 $, le même supplément maximal pour une personne seule et pour un conjoint sans pension.',
      }),
      topUpDivisorCouple: c(96, 'fixed', {
        ...OAS_ACT,
        note: 's. 12.1(1)(b), (2): C = « 1/24 of the aggregate of the incomes … in excess of $4,000 » → $1 per 4 × 24 = 96 dollars of combined annual income above its start.',
        verify: 'Dérivé du texte de la Loi par calcul. Contre-vérifié : (8 800 − 4 000) ÷ 96 = 50 $, le « A = $50 » de la Loi pour un conjoint qui reçoit la pleine pension.',
      }),
      employmentExemptionFull: c(5_000, 'fixed', { ...OAS_ACT, note: 's. 2, « income », (b.1): the first $5,000 of employment income is exempt; « you can earn up to $5,000 with no reduction ». No 2026 change found.' }),
      employmentExemptionBand: c(10_000, 'fixed', { ...OAS_ACT, note: '…then half of the next $10,000 (to $15,000 of earnings) is exempt — a maximum exemption of $10,000.' }),
    },
  },

  federal: {
    brackets: c(BRACKETS_FEDERAL, 'cpi', { ...CRA_RATES, note: 'Rates 14 / 20.5 / 26 / 29 / 33 %; thresholds indexed 2.0 % for 2026.' }, 1),
    creditRate: c(0.14, 'fixed', { ...FIN_LOWEST, note: '« The credit rate applied to most non-refundable tax credits … is legislatively based on the lowest personal income tax rate (14 per cent in 2026). » Only the first $200 of a donation claim.' }),
    bpaMax: c(16_452, 'cpi', { ...CRA_INDEX, note: 'For net income at or below the start of the 29 % bracket ($181,440).' }, 1),
    bpaMin: c(14_829, 'cpi', { ...CRA_INDEX, note: 'For net income at or above the start of the 33 % bracket ($258,482). Between the two the amount is phased down — see ENGINE.md.' }, 1),
    ageAmount: c(9_208, 'cpi', CRA_INDEX, 1),
    ageThreshold: c(46_432, 'cpi', { ...CRA_INDEX, note: '« Net income threshold for age amount | $46,432 ».' }, 1),
    ageReduction: c(0.15, 'fixed', { ...ITA_118, note: 's. 118(2): the age amount is reduced by « 15% of the amount, if any, by which the individual’s income for the year would exceed » the threshold.' }),
    ageMinAge: c(65, 'fixed', CRA_AGE),
    pensionAmountMax: c(2_000, 'fixed', { ...CRA_PENSION, note: 'ITA 118(3): « the lesser of (a) $2,000, and (b) … the eligible pension income ». Not indexed.' }),
    pensionMinAge: c(65, 'fixed', { ...CRA_PENSION, note: 'RRIF and RRSP-annuity income qualify « if you were 65 or older on December 31 of the year ». RPP lifetime benefits qualify at any age. OAS, CPP/QPP do not qualify.' }),
    employmentAmount: c(1_501, 'cpi', CRA_EMPLOYMENT, 1),
    quebecAbatement: c(0.165, 'fixed', { ...FIN_ABATEMENT, note: '« a reduction of 16.5 percentage points of federal personal income tax for all tax filers in Quebec ». Computed on « basic federal tax » (line 42900), after credits.' }),
    capitalGainsInclusion: c(0.5, 'fixed', CRA_CG),
    splitMaxShare: c(0.5, 'fixed', { ...CRA_SPLIT, note: '« You can allocate up to 50% of your eligible pension income to your spouse or common-law partner. »' }),
  },

  quebec: {
    brackets: c(BRACKETS_QUEBEC, 'cpi', QC_RATES, 5),
    creditRate: c(0.14, 'fixed', QC_FICHE),
    bpa: c(18_952, 'cpi', { ...QC_PARAMS, note: '« – Montant personnel de base 18 571 18 952 » (2025, 2026). No high-income phase-down found.' }, 1),
    ageAmount: c(3_986, 'cpi', { ...QC_PARAMS, note: '« – Montant en raison de l’âge 3 906 3 986 ».' }, 1),
    livingAloneAmount: c(2_172, 'cpi', { ...QC_PARAMS, note: '« – Montant pour personne vivant seule ▪ Montant de base 2 128 2 172 » (the single-parent supplement, 2 681 $, is a different line).' }, 1),
    retirementIncomeAmount: c(3_541, 'cpi', { ...QC_PARAMS, note: '« – Montant pour revenus de retraite 3 470 3 541 ».' }, 1),
    reductionThreshold: c(42_955, 'cpi', { ...QC_PARAMS, note: '« – Seuil de réduction du crédit d’impôt pour personne vivant seule, en raison de l’âge et pour revenus de retraite 42 090 42 955 » — rounded to the nearest $5.' }, 5),
    reductionRate: c(0.1875, 'fixed', {
      ...QC_FICHE,
      note: '« Le taux de cette réduction est de 18,75 % pour chaque dollar de revenu familial du particulier … qui excède le seuil de réduction applicable » — une seule réduction pour l’ensemble de ces montants (édition 2025 ; l’édition 2020 le dit de même).',
    }),
    retirementIncomeMultiple: c(1.25, 'fixed', { ...QC_EXPENDITURES_2020, note: '« … égal au moins élevé du montant maximal des revenus de retraite … et du produit de la multiplication de 1,25 par le montant correspondant à l’ensemble des revenus de retraite admissibles ».' }),
    ageMinAge: c(65, 'fixed', QC_LINE_361),
    splitMinAge: c(65, 'fixed', { ...QC_EXPENDITURES_2020, note: '« l’auteur du fractionnement doit avoir atteint l’âge de 65 ans avant la fin de l’année » ; l’âge du conjoint n’importe pas. La rente du RRQ et la pension de la SV ne sont pas admissibles.' }),
    splitMaxShare: c(0.5, 'fixed', { ...QC_EXPENDITURES_2020, note: '« un montant n’excédant pas 50 % de l’ensemble de ses revenus de retraite admissibles au fractionnement ».' }),
    workerDeductionRate: c(0.06, 'fixed', { ...QC_WORKERS, note: '6 % du revenu de travail admissible (salaire, revenu net d’entreprise, subventions de recherche…), sans réduction selon le revenu.' }),
    workerDeductionMax: c(1_450, 'cpi', { ...QC_PARAMS, note: '« – Montant maximal de la déduction pour les travailleurs 1 420 1 450 » (2025, 2026).' }, 10),
  },

  payroll: {
    eiRate: c(0.013, 'fixed', { ...CRA_EI, note: 'Employee rate for Québec, 2026: 1.30 % (1.31 % in 2025). Held flat in projection: the Commission resets it yearly.' }),
    eiMaxInsurable: c(68_900, 'wage', CRA_EI, 100),
    qpipRate: c(0.0043, 'fixed', QC_QPIP_RATES),
    qpipMaxInsurable: c(103_000, 'wage', QC_QPIP_MAX, 1_000),
  },

  accounts: {
    rrspLimit: c(33_810, 'wage', CRA_LIMITS, 10),
    rrspRate: c(0.18, 'fixed', { ...CRA_RRSP_FORMULA, note: '« The lesser of … 18% of your earned income in the previous year; the annual RRSP limit ».' }),
    tfsaLimit: c(7_000, 'cpi', CRA_TFSA, 500),
    tfsaCumulativeSince2009: c(109_000, 'none', {
      ...CRA_TFSA,
      note: 'Σ of the annual limits 2009–2026 in the page’s history table, for someone 18+ and resident since 2009 with no contributions.',
      verify: 'Total calculé par addition de la table officielle des limites annuelles : aucune page de l’ARC ne l’imprime. Chaque personne doit plutôt lire ses droits réels dans son compte de l’ARC.',
    }),
    rrifFactors: c<Record<number, number>>(
      {
        71: 0.0528, 72: 0.054, 73: 0.0553, 74: 0.0567, 75: 0.0582, 76: 0.0598, 77: 0.0617, 78: 0.0636, 79: 0.0658,
        80: 0.0682, 81: 0.0708, 82: 0.0738, 83: 0.0771, 84: 0.0808, 85: 0.0851, 86: 0.0899, 87: 0.0955, 88: 0.1021,
        89: 0.1099, 90: 0.1192, 91: 0.1306, 92: 0.1449, 93: 0.1634, 94: 0.1879, 95: 0.2,
      },
      'fixed',
      CRA_RRIF,
    ),
    rrifDivisor: c(90, 'fixed', { ...CRA_RRIF, note: '« If the age is 70 years or younger, the prescribed factor is calculated as follows: 1 divided by (90 minus the age). »' }),
    pensionAdjustmentFactor: c(9, 'fixed', CRA_PA),
    pensionAdjustmentOffset: c(600, 'fixed', CRA_PA),
    rrifConversionAge: c(71, 'fixed', { ...CRA_71, note: '« December 31 of the year you turn 71 years old is the last day that you can contribute to your RRSPs. » That year the RRSP must be withdrawn, transferred to a RRIF or used to buy an annuity.' }),
  },
} satisfies YearParams
