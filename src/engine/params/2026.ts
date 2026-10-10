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
const src = (url: string, title: string, extra: { note?: string; verify?: string; retrieved?: string } = {}): Source => ({ url, title, retrieved: RETRIEVED, ...extra })
const c = <T>(value: T, index: IndexRule, source: Source, round?: number): Cited<T> => ({ value, source, index, ...(round === undefined ? {} : { round }) })

// ── Retraite Québec ──────────────────────────────────────────────────────────────────────────────
const RQ = 'https://www.retraitequebec.gouv.qc.ca'
const LEAFLETS = `${RQ}/sites/default/files/SiteCollectionDocuments/RetraiteQuebec/en/publications/nos-programmes/regime-de-rentes/retraite`
const RQ_LIF = src(`${RQ}/en/professionals-employers/professionals-involved-pension-plans/liras-lifs/characteristics-lif`, 'Characteristics of an LIF - Retraite Québec', { retrieved: '2026-10-08' })
const RQ_LIF_RATES = src(`${RQ}/en/professionals-employers/professionals-involved-pension-plans/liras-lifs/rates-relating-lif-calculations`, 'Rates relating to LIF calculations', { retrieved: '2026-10-08' })
const RQ_CAPSULE_41 = src(`${RQ}/en/flash-retirement/flash-retirement-capsule-41`, 'Flash Retirement - Capsule 41', { retrieved: '2026-10-08' })
const RRQ_FIGURES = src(`${RQ}/en/programs/quebec-pension-plan/quebec-pension-plan-figures`, 'Québec Pension Plan Figures')
const RRQ_ADDITIONAL = src(`${RQ}/en/programs/quebec-pension-plan/additional-plan`, 'The additional plan')
const RRQ_EARNINGS = src(`${RQ}/en/programs/quebec-pension-plan/work-contributions/pensionable-earnings-contributions`, 'Pensionable earnings and contributions')
const RRQ_CALC = src(
  `${RQ}/en/citizens/retirement-planning/applying-your-retirement-pension/retirement-pension-quebec-pension-plan/calculation-your-retirement-pension`,
  'Calculation of Your Retirement Pension Under the Québec Pension Plan',
)
const RRQ_LEAFLET_65 = src(`${LEAFLETS}/1036-1f-Methode-calcul-rente-2025.pdf`, 'Retirement pension paid as of age 65 and 1 month (1036-1-RRQ, 2025-06)')
const QPP_ACT = src('https://www.legisquebec.gouv.qc.ca/fr/pdf/lc/R-9.pdf', 'Loi sur le régime de rentes du Québec (chapitre R-9)', {
  retrieved: '2026-10-08',
  note: 'The statute, in French (the English edition is its twin); articles 133 to 137.2 set the surviving spouse’s pension. Cited by its PDF edition like the RREGOP statute: the HTML edition (the text actually read, at /fr/…/lc/R-9) carries a word the engine’s purity guard bans. LégisQuébec refuses automated readers; the text was opened in a browser.',
})
const RRQ_SURVIVOR = src('https://www.retraitequebec.gouv.qc.ca/en/citizens/death/surviving-spouse-pension', 'The surviving spouse’s pension - Retraite Québec', { retrieved: '2026-10-08' })
const ESDC_2023Q1 = src(
  'https://www.canada.ca/fr/emploi-developpement-social/programmes/pensions/pension/statistiques/rapport-trimestriel/2023-trimestriel-janvier-mars.html',
  'Montants trimestriels des prestations et données connexes du Régime de pensions du Canada et de la Sécurité de la vieillesse - janvier à mars 2023 - Canada.ca',
  { retrieved: '2026-10-08', note: 'The last edition of Service Canada’s quarterly report to print the QPP’s figures beside the CPP’s — the only official page that prints the surviving spouse’s pension split into its « montant uniforme » and its earnings-related part.' },
)
const RRQ_LEAFLET_68 = src(`${LEAFLETS}/1036-3a-Calcul-rente-68-ans-2025.pdf`, 'Retirement pension paid as of age 68 and 1 month (1036-3-RRQ, 2025-06)')

// ── Service Canada ───────────────────────────────────────────────────────────────────────────────
const ESDC_Q4 = src(
  'https://www.canada.ca/en/employment-social-development/programs/pensions/pension/statistics/2026-quarterly-october-december.html',
  'Maximum Benefit Amounts and Related Figures - Canada Pension Plan (2026) and Old Age Security (October to December 2026)',
  { note: 'The latest published quarter. The year’s four quarterly maxima were 742.31, 743.05, 751.97 and 762.50 $ (ages 65–74); projection indexes from this level.' },
)
const OGP_TABLE4 = src(
  'https://ouvert.canada.ca/data/dataset/dfa4daf1-669e-4514-82cd-982f27707ed0',
  'Old Age Security (OAS) - Table of Benefit Amounts by marital status and income level (Table 4 — GIS and Allowance for a couple, October to December 2026)',
  { note: 'Open Government Portal, the table behind the Service Canada « How much you could receive » pages: one row per 48 $ of combined income, the Allowance and the GIS of the pensioner spouse.' },
)
const OAS_SURVIVOR = src(
  'https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/guaranteed-income-supplement/allowance-survivor/benefit-amount.html',
  'Allowance for the Survivor - How much you could receive - Canada.ca',
  { retrieved: '2026-10-08' },
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

// ── What the state pays for a child (read 2026-10-09) ───────────────────────────────────────────────
const CRA_CCB = src(
  'https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-much.html',
  'How much you can get - Canada child benefit (CCB) - Canada.ca',
  {
    retrieved: '2026-10-09',
    note: 'Payments July 2026 to June 2027, from the 2025 adjusted family net income: 8 157 $ a year under 6, 6 883 $ aged 6 to 17; nothing taken off up to 38 237 $; from there to 82 847 $, 7 % of the income over 38 237 $ (one child), 13,5 % (two), 19 % (three), 23 % (four or more); above 82 847 $, 3 123 $ + 3,2 % (one), 6 022 $ + 5,7 % (two), 8 476 $ + 8 % (three), 10 260 $ + 9,5 % (four or more) of the income over 82 847 $. The page\'s eight worked examples are held to the cent in childBenefits.test.ts.',
  },
)
const RQ_FAMILY_ALLOWANCE = src(
  'https://www.retraitequebec.gouv.qc.ca/en/citizens/children/family-allowance',
  'Family Allowance - Retraite Québec',
  {
    retrieved: '2026-10-09',
    note: '2026: maximum 3 068 $ and minimum 1 221 $ per child; a single-parent family adds 1 077 $ (at the maximum) and 430 $ (at the minimum); indexed 2,05 % on 2026-01-01. « Two-parent family: 60 000 $ or less 3 068 $, 107 000 $ or more 1 221 $ — single-parent family: 44 000 $ or less 4 145 $, 107 000 $ or more 1 651 $ » (the page prints the thresholds to the nearest 1 000 $). Family income is the one of the return filed for the previous year.',
  },
)
const RQ_FAMILY_ALLOWANCE_TABLE = src(
  'https://www.retraitequebec.gouv.qc.ca/en/citizens/children/amounts-family-allowance-payments-based-family-income',
  'Amounts of Family Allowance payments based on family income - Retraite Québec',
  {
    retrieved: '2026-10-09',
    note: 'The table of payments by family income (the 2025 amounts). Every row is the maximum less 4 % of the family income over the threshold, never under the minimum, with the single-parent supplement paid once: 1 child, two parents, 100 000 $: 3 006 − 4 % × (100 000 − 59 369) = 1 381 $; 2 children, one parent, 80 000 $: 7 067 − 4 % × (80 000 − 43 280) = 5 598 $; 2 children, two parents, 150 000 $: the floor, 2 × 1 196 = 2 392 $.',
  },
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
  note: 'Page « Taux d’imposition », lue sur revenuquebec.ca le 2026-10-06 : 2026 — 54 345 $ ou moins 14 % ; au-delà de 54 345 $ jusqu’à 108 680 $ 19 % ; au-delà de 108 680 $ jusqu’à 132 245 $ 24 % ; au-delà de 132 245 $ 25,75 %.',
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
  note: 'Guide TP-1.G (2025-12), ligne 201 : « égale à 6 % de votre revenu de travail admissible. Le maximum est de 1 420 $ » (2025) ; la fiche officielle l’énonce aussi.',
})
const QC_LINE_361 = src(
  'https://www.revenuquebec.ca/fr/citoyens/declaration-de-revenus/produire-votre-declaration-de-revenus/comment-remplir-votre-declaration-de-revenus/aide-par-ligne/350-a-398-1-credits-dimpot-non-remboursables/ligne-361/',
  "Ligne 361 - Montant accordé en raison de l'âge ou pour personne vivant seule ou pour revenus de retraite",
  {
    note: 'Guide TP-1.G (2025-12), ligne 361 : « Vous pouvez inscrire un montant en raison de votre âge si vous êtes né(e) avant le 1er janvier 1961 » (65 ans en 2025).',
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
    excludedShare: c(0.15, 'fixed', { ...RRQ_CALC, note: '« up to 15% of your lowest employment earnings will not decrease your pension » — rounded UP to a whole month (15 % of 564 = 84.6 → 85, in the leaflet; s. 116.4 of the QPP Act, R-9: « counting any fraction of a month as a whole month »).' }),
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
    survivorBaseShareUnder65: c(0.375, 'fixed', { ...QPP_ACT, note: 'Art. 133 a) et 136 : « 37,5% du montant établi conformément à l’article 137 » — the deceased’s BASE component, unadjusted for the age it started (art. 137 1°: « sans tenir compte … des ajustements prévus à l’article 120.1 »).' }),
    survivorBaseShare65: c(0.6, 'fixed', { ...QPP_ACT, note: 'Art. 134 a) : « 60% du montant établi conformément à l’article 137 » for a survivor aged 65 or over with no retirement pension of their own.' }),
    survivorAdditionalShare: c(0.5, 'fixed', { ...QPP_ACT, note: 'Art. 133 b)–c), 134 b)–c), 136 b)–c), 136.1 b)–c) : « 50% du montant établi conformément à l’article 137.1 » and « … 137.2 » — the two additional components, at every age and whether or not the survivor has a pension of their own.' }),
    survivorOwnPensionOffset: c(0.4, 'fixed', { ...QPP_ACT, note: 'Art. 136.1 a) 2° : « (a × 60%) − (d × 40%) = F », d being the survivor’s own base retirement pension; the survivor gets the greater of that and 37,5 % of the deceased’s base, never more than the year’s maximum base pension less their own (« c − d »). Under 65 (art. 136) the cap is « [b + (c − d)] – e », b the flat-rate portion.' }),
    survivorFlatRate45to64: c(610.43, 'cpi', { ...ESDC_2023Q1, note: 'The flat-rate portion of a 45–64 survivor’s pension — the Act’s 312,33 $ (art. 133, 2nd para.) « ajusté conformément à l’article 119 » since 1994. The report prints it: « RRQ, prestations de survivant 45 à 64 ans | Montant uniforme 558,71 $ » (January–March 2023); indexed by the QPP’s January rates — 4,4 % (2024), 2,6 % (2025), 2,00 % (2026), each printed by Retraite Québec — to the cent: 583,29 → 598,46 → 610,43. Cross-check: Retraite Québec’s three under-65 maxima for 2026 differ only by this portion, (1 173,58 − 719,50) ÷ (312,33 − 80) = 1,9545 = (1 129,95 − 719,50) ÷ (290 − 80), hence 312,33 × 1,9545 = 610,45 — two cents apart (verified/survivor.verified.test.ts, survivor.test.ts).' }, 0.01),
    survivorFlatRateUnder45: c(156.35, 'cpi', { ...ESDC_2023Q1, note: 'The flat-rate portion for a survivor under 45 without a dependent child (the Act’s 80 $, indexed): « moins de 45 ans, non invalide, sans enfant | Montant uniforme 143,10 $ » (January–March 2023), indexed 4,4 % · 2,6 % · 2,00 %: 149,40 → 153,28 → 156,35. The 290 $ with-children amount (518,78 $ in 2023) is not modelled: Horizon’s children only have birth years.' }, 0.01),
    survivorMaxUnder65: c(1_173.58, 'cpi', { ...RRQ_SURVIVOR, note: 'CHECK FIGURE (tests only): « Between 45 and 65, all situations | $1,173.58 » a month, for benefits beginning in 2026.' }, 0.01),
    survivorMax65: c(881.48, 'cpi', { ...RRQ_SURVIVOR, note: 'CHECK FIGURE (tests only): « 65 or over, not receiving a retirement pension | $881.48 » a month, for benefits beginning in 2026.' }, 0.01),
    deathBenefit: c(2_500, 'fixed', { ...RRQ_FIGURES, note: '« Maximum amount for single payment — Maximum amount for death benefit | $2500 » (2026); the 2024 edition says « lump-sum ». Not indexed: the same 2 500 $ in 2024 and 2026. A single payment the month after a contributor’s death, taxable income of the estate or of the person who receives it — in Horizon, the survivor’s, the year after the death.' }, 1),
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
    allowanceMax: c(1_448.06, 'cpi', { ...ESDC_Q4, note: 'Table 5, « Allowance »: maximum monthly amount (the OAS pension, the GIS and the top-up together).' }, 0.01),
    allowanceCutoff: c(42_768, 'cpi', { ...ESDC_Q4, note: 'Table 5, « Allowance »: the couple’s COMBINED annual income cut-off. It excludes the OAS pension and the employment-income exemption (footnote 6).' }, 1),
    allowanceCurve: c<Record<number, number>>(
      { 0: 1_448.06, 4_192: 1_185.06, 8_928: 840.07, 12_192: 636.07, 42_720: 0.57, 42_768: 0 },
      'fixed',
      { ...OGP_TABLE4, note: 'Breakpoints fitted to the table’s « Allowance » column (941 rows) to within $1 a month at every row’s lower income edge: $1 off per $16 of income while the OAS part and the top-up fall, then per $48. Checked row by row in verified/oas.verified.test.ts.' },
    ),
    survivorAllowanceMax: c(1_726.18, 'cpi', { ...OAS_SURVIVOR, note: '« Maximum monthly payment amount: $1,726.18 » (October to December 2026), for a surviving spouse aged 60 to 64.' }, 0.01),
    survivorAllowanceCutoff: c(31_152, 'cpi', { ...OAS_SURVIVOR, note: '« Your annual net income must be less than $31,152 » (October to December 2026): the survivor’s OWN income, counted as the GIS counts it.' }, 1),
    survivorAllowanceCurve: c<Record<number, number>>(
      { 0: 1_726.18, 2_016: 1_601.01, 10_464: 897.01, 10_496: 895.77, 10_512: 892.77, 12_192: 787.77, 12_240: 787.27, 31_128: 0.27, 31_152: 0 },
      'fixed',
      { ...OGP_TABLE4, note: 'Table 5 (« Allowance for the Survivor », 1 220 rows) fitted as breakpoints to within $1 a month at every row’s lower edge: $3 per $48 while the OAS part falls alone; then $1 per $12 while the top-up falls with it — the table steps twice per $48 there (−$1 after $32, −$3 after $16 more), so that zone’s two ends sit on its midline, 0,83 $ above the edges; $3 per $48 again to the pension’s end; then $1 per $24 (the single GIS slope) to the cut-off. Checked row by row in verified/oas.verified.test.ts.' },
    ),
    gisAllowanceCurve: c<Record<number, number>>(
      { 0: 685.56, 4_176: 684.56, 8_880: 635.57, 12_288: 634.57, 30_144: 262.92, 42_720: 262.92, 42_768: 262.92 },
      'fixed',
      { ...OGP_TABLE4, note: 'The same table’s « GIS » column: the supplement of a pensioner whose spouse receives the Allowance, to within $1 a month at every row’s lower edge. Above the cut-off the Allowance is gone and the pensioner’s own category applies.' },
    ),
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
        note: 's. 12: the supplement is the maximum « minus one dollar for each full two dollars of the pensioner’s monthly base income »; s. 12(6)(a): a single pensioner’s monthly base income is « one-twelfth of the income » of the year → $1 per 2 × 12 = 24 annual dollars. Confirmé le 2026-10-06 contre l’Estimateur des prestations de la SV (Service Canada) : écart ≤ 1 $/mois (arrondi au dollar entier).',
      }),
      baseDivisorCouple: c(48, 'fixed', {
        ...OAS_ACT,
        note: 's. 12(6)(c)(ii): for a couple who both receive a pension, the monthly base income is « one twenty-fourth of the aggregate of the incomes » → $1 per 2 × 24 = 48 dollars of the couple’s COMBINED annual income, for each spouse. Confirmé le 2026-10-06 contre l’Estimateur des prestations de la SV (Service Canada) : écart ≤ 1 $/mois (arrondi au dollar entier).',
      }),
      topUpDivisorSingle: c(48, 'fixed', {
        ...OAS_ACT,
        note: 's. 12.1(1)(a): the top-up is « A × B − C/4 » with C = « 1/12 of the pensioner’s income … in excess of $2,000 » → it falls $1 per 4 × 12 = 48 annual dollars above its start. Confirmé le 2026-10-06 contre l’Estimateur des prestations de la SV (Service Canada) : écart ≤ 1 $/mois (arrondi au dollar entier).',
      }),
      topUpDivisorCouple: c(96, 'fixed', {
        ...OAS_ACT,
        note: 's. 12.1(1)(b), (2): C = « 1/24 of the aggregate of the incomes … in excess of $4,000 » → $1 per 4 × 24 = 96 dollars of combined annual income above its start. Confirmé le 2026-10-06 contre l’Estimateur des prestations de la SV (Service Canada) : écart ≤ 1 $/mois (arrondi au dollar entier).',
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

  childBenefits: {
    ccb: {
      maxUnder6: c(8_157, 'cpi', CRA_CCB, 1),
      max6to17: c(6_883, 'cpi', CRA_CCB, 1),
      threshold1: c(38_237, 'cpi', CRA_CCB, 1),
      threshold2: c(82_847, 'cpi', CRA_CCB, 1),
      midRate: c([0.07, 0.135, 0.19, 0.23], 'fixed', CRA_CCB),
      topRate: c([0.032, 0.057, 0.08, 0.095], 'fixed', CRA_CCB),
      topFixedOne: c(3_123, 'cpi', CRA_CCB, 1),
      topFixedTwo: c(6_022, 'cpi', CRA_CCB, 1),
      topFixedThree: c(8_476, 'cpi', CRA_CCB, 1),
      topFixedFourPlus: c(10_260, 'cpi', CRA_CCB, 1),
    },
    familyAllowance: {
      max: c(3_068, 'cpi', RQ_FAMILY_ALLOWANCE, 1),
      min: c(1_221, 'cpi', RQ_FAMILY_ALLOWANCE, 1),
      supplementMax: c(1_077, 'cpi', RQ_FAMILY_ALLOWANCE, 1),
      supplementMin: c(430, 'cpi', RQ_FAMILY_ALLOWANCE, 1),
      reductionRate: c(0.04, 'fixed', RQ_FAMILY_ALLOWANCE_TABLE),
      thresholdCouple: c(60_000, 'cpi', { ...RQ_FAMILY_ALLOWANCE, note: '« Two-parent family: $60 000 or less » — the maximum is paid up to this family income (the page prints it to the nearest 1 000 $; the exact figure, a few hundred dollars higher, moves a payment by under 16 $ a year).' }, 100),
      thresholdSingle: c(44_000, 'cpi', { ...RQ_FAMILY_ALLOWANCE, note: '« Single-parent family: $44 000 or less » — the maximum plus the supplement is paid up to this family income (printed to the nearest 1 000 $).' }, 100),
    },
  },

  accounts: {
    rrspLimit: c(33_810, 'wage', CRA_LIMITS, 10),
    rrspRate: c(0.18, 'fixed', { ...CRA_RRSP_FORMULA, note: '« The lesser of … 18% of your earned income in the previous year; the annual RRSP limit ».' }),
    tfsaLimit: c(7_000, 'cpi', CRA_TFSA, 500),
    tfsaCumulativeSince2009: c(109_000, 'none', {
      ...CRA_TFSA,
      note: 'Σ of the annual limits 2009–2026 in the page’s history table, for someone 18+ and resident since 2009 with no contributions. 2010–2026 re-derived on 2026-10-06 from a real CRA account’s room history and calculator (room next year = room − contributions + withdrawals + that year’s limit): 5,000 ×3 [2010–12], 5,500 ×2 [2013–14], 10,000 [2015], 5,500 ×3 [2016–18], 6,000 ×4 [2019–22], 6,500 [2023], 7,000 ×3 [2024–26]; 2009 (5,000) is read on the CRA’s limits table (2009–2012 $5,000 · 2013–2014 $5,500 · 2015 $10,000 · 2016–2018 $5,500 · 2019–2022 $6,000 · 2023 $6,500 · 2024–2025 $7,000), and the table sums to 102,000 + the 2026 limit 7,000.',
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
    lifPrescribedRate: c(0.0625, 'fixed', { ...RQ_LIF_RATES, note: 'Prescribed rate for persons under 55: 6.25 % for 2026 (6 % for 2025). Reset yearly by Retraite Québec; held flat in projection. « Upper limit of the life income = (Prescribed rate) × (LIF balance on 31 December or 1 January) ».' }),
    lifFreeAge: c(55, 'fixed', { ...RQ_LIF, note: 'Since 1 January 2025, from 55 « the person can withdraw all or part of the balance, in one or more instalments, regardless of the life income established or paid for the year »; under 55 the upper limit applies. The minimum is the RRIF minimum (« The minimum is $0 the year in which the LIF is opened »).' }),
    lifUnlockAge: c(65, 'fixed', { ...RQ_CAPSULE_41, note: 'Refund of a locked-in balance: « The person is aged 65 or over and the total of the locked-in amounts does not exceed 40% of the maximum pensionable earnings (MPE) … that is, $29 840 in 2026. »' }),
    lifUnlockShareOfMga: c(0.4, 'fixed', { ...RQ_CAPSULE_41, note: 'The same rule: 40 % of the MPE (MGA) of the year of the request — $29 840 for 2026.' }),
    rrifConversionAge: c(71, 'fixed', { ...CRA_71, note: '« December 31 of the year you turn 71 years old is the last day that you can contribute to your RRSPs. » That year the RRSP must be withdrawn, transferred to a RRIF or used to buy an annuity.' }),
  },
} satisfies YearParams
