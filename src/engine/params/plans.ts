import type { Cited, IndexRule, Source } from './cited.ts'

// The rules of the employer pension plans this app can PRE-FILL — each one read off the plan's own official
// page. Today that is RREGOP (Régime de retraite des employés du gouvernement et des organismes publics),
// the Québec public-sector plan: the largest defined-benefit plan a Québec household is likely to belong to.
//
// A plan's rules are not a tax year's figures — they change by legislation, not by indexation — so they live
// beside the yearly params rather than inside them, are cited the same way, and appear in SOURCES.md under
// « Séries historiques ». Any OTHER plan is entered by the person from their own booklet (DbPension in types.ts);
// nothing here is a default for a plan this file does not name.

const RETRIEVED = '2026-10-06'
const RG = 'https://www.retraitequebec.gouv.qc.ca/en/publications/public-sector-pension-plans/rregop'
const src = (url: string, title: string, note?: string): Source => ({ url, title, retrieved: RETRIEVED, ...(note ? { note } : {}) })
const c = <T>(value: T, source: Source, index: IndexRule = 'fixed'): Cited<T> => ({ value, source, index })

const RREGOP_PAGE = src(RG, 'RREGOP')
const RREGOP_WHEN = src(
  'https://www.retraitequebec.gouv.qc.ca/en/your-first-paycheck-retirement/quebec-public-service-education-health-social-services-sectors/when-can-you-receive-your-pension-rregop-how-much-will-you-receive',
  'When can you receive your pension under RREGOP and how much will you receive?',
)
const R10 = src('https://www.legisquebec.gouv.qc.ca/en/pdf/cs/R-10.pdf', 'Act respecting the Government and Public Employees Retirement Plan (chapter R-10)', 'Updated to August 12, 2026.')

export const PLAN_RREGOP = {
  accrualRate: c(0.02, { ...RREGOP_PAGE, note: '« Years of service credited for calculation purposes (maximum 40) × Pension accrual rate (2%) × Average pensionable salary of the 5 best-paid years of service = Pension ».' }),
  maxServiceYears: c(40, { ...R10, note: 's. 34.2: « the employee’s years of credited service taken into account must not exceed 40 ».' }),
  averagingYears: c(5, { ...RREGOP_WHEN, note: '« the average salary of the five years during which you earned the most money. Those five years do not need to be consecutive. »' }),
  coordinationRate: c(0.007, { ...RREGOP_PAGE, note: '« number of years of service since 1 January 1966 (maximum 35 years) used to calculate your basic pension × QPP annual pension integration rate (0.7%) × the lesser of your average pensionable salary for your last 5 years of service and your average maximum pensionable earnings (MPE) for your last 5 years of service ».' }),
  coordinationFromAge: c(65, { ...R10, note: 's. 39: « From the month following the sixty-fifth birthday of a pensioner … the pension is reduced by the amount obtained by multiplying … 0.7% … ». It applies even if the RRQ pension is taken at 60.' }),
  coordinationMaxYears: c(35, { ...RREGOP_PAGE, note: '« maximum 35 years » of service since 1 January 1966; « after 35 years of service, you accrue 2% of average salary for each year that is added, without a reduction of 0.7% being applied as of age 65 ».' }),
  earliestAge: c(55, { ...R10, note: 's. 33(3) / 38: a pension is available from age 55, reduced.' }),
  unreducedAge: c(61, { ...RREGOP_PAGE, note: '« You are at least age 61 » — one of three routes to a pension without reduction (statute s. 33(1)).' }),
  unreducedServiceYears: c(35, { ...RREGOP_PAGE, note: '« You have at least 35 years of service credited for eligibility purposes » (statute s. 33(2), no minimum age stated).' }),
  factorMinAge: c(60, { ...RREGOP_PAGE, note: '« You are at least age 60 and you meet the 90 factor requirement (age + years of service credited for eligibility purposes) » (statute s. 33(2.1)).' }),
  factorTotal: c(90, RREGOP_PAGE),
  earlyReductionPerYear: c(0.06, { ...R10, note: 's. 38: reduced « by 1/2 of 1% per month » between the date the pension is granted and the nearest date it would have been granted without reduction = 0.5 % a month, 6 % a year. Example of Jacques (59, unreduced at 61): 24 months × 0.5 % = 12 %. Before 1 July 2020 the penalty was 4 % a year (estimator help page, not traced in the statute).' }),
  deferredToAge: c(65, { ...RREGOP_PAGE, note: '« La fin d’emploi avant l’admissibilité à une rente » (édition française de la page) : rente différée payable à 65 ans sans réduction ; à 55 ans ou entre 55 et 65 ans, « une réduction de 0,5 % par mois (6 % par année) compris de la date de prise d’effet de votre rente à la date de votre 65e anniversaire s’appliquera de façon permanente ».' }),
  deferredIndexationShare: c(1, { ...RREGOP_PAGE, note: 'Même section : cette rente « sera indexée (réajustée) pleinement du 1er janvier suivant la date de fin de votre participation au régime au 1er janvier de l’année où vous commencerez à la recevoir » — le taux entier de l’indice des rentes, sans réduction.' }),
  deferredIndexationMinus: c(0, { ...RREGOP_PAGE, note: 'Pleine indexation : aucun retranchement au taux de l’indice des rentes (voir deferredIndexationShare).' }),
  indexationShare: c(0.5, { ...RREGOP_PAGE, note: 'For service since 1 January 2000: « the more advantageous of … 50% of the rate of increase of the Pension Index, the rate of increase of the Pension Index minus 3% » (statute s. 77(3)).' }),
  indexationMinus: c(0.03, { ...RREGOP_PAGE, note: 'Service from 1 July 1982 to 31 December 1999 is indexed at the rate minus 3 % and service before 1 July 1982 at the full rate: the engine applies the post-1999 rule to the whole pension (ENGINE.md §2).' }),
}
