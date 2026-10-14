import type { Flow } from '../engine/types.ts'
import type { Lang } from '../i18n.ts'
import type { Profile } from './schema.ts'

// « DÉPENSES À PRÉVOIR » — the starting points for a dated event (Profil › Événements), and where each figure comes from.
//
// A household's budget has what it spends every month; this is what it does NOT see coming in a budget: the repairs and renovations of a house, the cars it will
// replace, a windfall, a care reserve. Each starting point is a Flow the person can edit, plus a BASIS that says honestly what the figure rests on:
//   · a STATISTIC  — an average read in Statistics Canada's Survey of Household Spending (cited below, with the page and the day it was read);
//   · a RULE       — a common rule of thumb, not an official figure, built on a statistic so the two never count the same dollar twice;
//   · a PLACEHOLDER — a round number to be replaced by the person's own: no statistic exists for it, and the page says so.
// Whatever it rests on, a figure that came from a starting point is an ESTIMATE until the person types another amount or confirms it (`Flow.estimate`, schema v23).
//
// Pure: no React, no clock (the year is an input), no formatting (the words are in lib/lifeCopy.ts).

export type StarterId = 'upkeep' | 'renovation' | 'vehicle' | 'heritage' | 'roof' | 'car' | 'rent' | 'care' | 'project'

/** Every starting point, in the order the page offers them. A saved `Flow.estimate` is one of these ids (or an id a later version knows). */
export const STARTER_IDS: readonly StarterId[] = ['upkeep', 'renovation', 'vehicle', 'heritage', 'roof', 'car', 'rent', 'care', 'project']

export const isStarterId = (id: string): id is StarterId => (STARTER_IDS as readonly string[]).includes(id)

/** A published page a statistic was read on: its title and address in each language, and the day it was read (ISO). */
export interface StatSource {
  title: Readonly<Record<Lang, string>>
  url: Readonly<Record<Lang, string>>
  retrieved: string
}

/**
 * Statistics Canada, Survey of Household Spending 2023, table 11-10-0225-01 « Household spending by household tenure »: the AVERAGE spending of a household a year,
 * Canada, by tenure. Read from the table's CSV on 2026-10-14. The figures are averages of ALL households of the group, those that spent nothing included, which is
 * what makes them a fair yearly allowance for something that happens only now and then (a car is bought every few years, not every year).
 */
export const SHS_TENURE: StatSource = {
  title: {
    fr: 'Statistique Canada, tableau 11-10-0225-01 : Dépenses des ménages selon le mode d’occupation du logement (Enquête sur les dépenses des ménages, 2023)',
    en: 'Statistics Canada, table 11-10-0225-01: Household spending by household tenure (Survey of Household Spending, 2023)',
  },
  url: {
    fr: 'https://www150.statcan.gc.ca/t1/tbl1/fr/tv.action?pid=1110022501',
    en: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110022501',
  },
  retrieved: '2026-10-14',
}

export type Tenure = 'ownerWithMortgage' | 'ownerWithoutMortgage' | 'renter'

/**
 * « Repairs and maintenance for owned living quarters », average a year (vectors v64476761 and v64477034). Labour and materials for repairs and upkeep ONLY:
 * Statistics Canada leaves alterations and improvements out, because it counts them as an asset bought, not an expense. A renter's cell is suppressed (quality
 * flag F), so a renter has no such figure.
 */
export const UPKEEP_PER_YEAR: Readonly<Record<Exclude<Tenure, 'renter'>, number>> = { ownerWithMortgage: 1667, ownerWithoutMortgage: 1139 }

/** « Purchase of automobiles, vans and trucks », average a year (vectors v64476863, v64477136 and v64477409): what a household spends on the vehicles it buys. */
export const VEHICLES_PER_YEAR: Readonly<Record<Tenure, number>> = { ownerWithMortgage: 5573, ownerWithoutMortgage: 3640, renter: 2839 }

/**
 * A house's yearly cost in upkeep AND renovations, as a share of what it is worth: the common Canadian rule of thumb is 1 % to 2 % (more for an old house). This is
 * NOT an official figure — no government publishes it — so the page calls it a rule and gives no link for it. 1 % is the floor of the usual range.
 */
export const HOUSE_COST_SHARE = 0.01

/** Cars are counted until the oldest person's 80th year: the household average includes people who drive less as they age, and the person can move the end. */
export const VEHICLE_UNTIL_AGE = 80

/** What a figure rests on. */
export type Basis =
  | { kind: 'statistic'; tenure: Tenure; figure: number; source: StatSource }
  /** `share` × the home's value, less `upkeep` (the statistic already counted by the upkeep starting point): the two never count the same dollar twice. */
  | { kind: 'rule'; share: number; homeValue: number; upkeep: number; source: StatSource }
  | { kind: 'placeholder' }

export interface Starter {
  id: StarterId
  /** The event as it would be added: an estimate (`estimate` = `id`), in today's dollars. */
  flow: Flow
  basis: Basis
}

const roundTo100 = (n: number): number => Math.round(n / 100) * 100

/** Which group of households this one is in: an owner (with or without a mortgage still to pay), or — with no home entered — a renter. */
export function tenureOf(p: Profile): Tenure {
  const home = p.household.home
  if (!home || home.value <= 0) return 'renter'
  return home.mortgage.balance > 0 ? 'ownerWithMortgage' : 'ownerWithoutMortgage'
}

/**
 * The starting points that apply to this household, in the order the page offers them, each as an estimate in today's dollars. `labels` is the name each event
 * is added under (the words belong to lib/lifeCopy.ts). The house's two (upkeep, renovations) exist only for a household that owns a home; the house's
 * years end the year before it is sold, or at the horizon.
 */
export function plannedStarters(p: Profile, now: number, labels: Readonly<Record<StarterId, string>>): Starter[] {
  const births = p.household.persons.map((x) => x.birth.year)
  const oldestBirth = Math.min(...births)
  const horizonEnd = oldestBirth + p.assumptions.horizonAge
  const tenure = tenureOf(p)
  const home = p.household.home

  // An event as it would be added: named by `labels`, an estimate of its own id, and — for a windfall — in one year only.
  const event = (id: StarterId, kind: Flow['kind'], amount: number, fromYear: number, toYear: number, taxable = false): Flow => ({
    label: labels[id],
    kind,
    amount,
    fromYear,
    toYear: kind === 'windfall' ? fromYear : Math.max(fromYear, toYear),
    owner: 'self',
    taxable,
    estimate: id,
  })
  const placeholder = (id: StarterId, flow: Flow): Starter => ({ id, flow, basis: { kind: 'placeholder' } })

  const out: Starter[] = []

  if (home && tenure !== 'renter') {
    // The house is kept to the year before it is sold (the first person's age), or for life.
    const houseLast = home.sale ? births[0] + home.sale.age - 1 : horizonEnd
    const last = Math.min(horizonEnd, houseLast)
    const upkeep = UPKEEP_PER_YEAR[tenure]
    out.push({ id: 'upkeep', flow: event('upkeep', 'expense', upkeep, now, last), basis: { kind: 'statistic', tenure, figure: upkeep, source: SHS_TENURE } })
    // The rule's total, less the upkeep above: at least 0 (a very modest house is already covered by the statistic).
    const reserve = Math.max(0, roundTo100(HOUSE_COST_SHARE * home.value - upkeep))
    out.push({ id: 'renovation', flow: event('renovation', 'expense', reserve, now, last), basis: { kind: 'rule', share: HOUSE_COST_SHARE, homeValue: home.value, upkeep, source: SHS_TENURE } })
  }

  const vehicles = VEHICLES_PER_YEAR[tenure]
  out.push({ id: 'vehicle', flow: event('vehicle', 'expense', vehicles, now, Math.min(horizonEnd, oldestBirth + VEHICLE_UNTIL_AGE)), basis: { kind: 'statistic', tenure, figure: vehicles, source: SHS_TENURE } })

  out.push(
    placeholder('heritage', event('heritage', 'windfall', 100000, now + 10, now + 10)),
    placeholder('roof', event('roof', 'expense', 25000, now + 3, now + 3)),
    placeholder('car', event('car', 'expense', 35000, now + 2, now + 2)),
    placeholder('rent', event('rent', 'income', 12000, now + 5, horizonEnd, true)),
    placeholder('care', event('care', 'expense', 30000, oldestBirth + 85, horizonEnd)),
    placeholder('project', event('project', 'expense', 10000, now + 2, now + 2)),
  )
  return out
}
