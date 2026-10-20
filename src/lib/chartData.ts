import type { ChartMarker, ChartSeries, SeriesColour } from '../components/charts/types.ts'
import type { AgeResult, Household, YearRow } from '../engine/types.ts'
import { selectionAge, type Selection } from './resultsModel.ts'
import { CONCEPTS, FAMILY_HUE, type ConceptId } from './concepts.ts'

// From the engine's year rows to what the chart draws: which number, in which dollars, for which scenario.
// Pure, so « the chart says what the table says » is a test and not a hope.

/** `netWorth`: everything the household owns at year end · `income`: guaranteed income (work, pensions, RRQ, OAS, GIS) before tax, without drawing on savings. */
export type Metric = 'netWorth' | 'income'

/** `today`: deflated to today's purchasing power (what a reader can feel) · `nominal`: the dollars of each year. */
export type Dollars = 'today' | 'nominal'

// The runs of a COMPARISON (departure ages, strategies) are an ordered set that must stay tellable apart on one line chart, not one concept each: four hues by position.
export const SERIES_COLOURS: readonly SeriesColour[] = ['accent', 'sky', 'sage', 'berry']

/** deep: the family's own ink · mid: the base ink · soft: the deep ink thinned toward the card. Siblings of one family in one chart take different tiers. */
export type Tier = 'deep' | 'mid' | 'soft'
const HUE_SERIES: Record<ReturnType<typeof hueOf>, Record<Tier, SeriesColour>> = {
  sage: { deep: 'sage', mid: 'sage-mid', soft: 'sage-soft' },
  marigold: { deep: 'accent', mid: 'sun', soft: 'accent-soft' },
  sky: { deep: 'sky', mid: 'sky-mid', soft: 'sky-soft' },
  berry: { deep: 'berry', mid: 'berry-mid', soft: 'berry-soft' },
  terracotta: { deep: 'clay', mid: 'coral', soft: 'clay-soft' },
  ink: { deep: 'ink', mid: 'ink', soft: 'ink' },
}
function hueOf(concept: ConceptId) {
  return FAMILY_HUE[CONCEPTS[concept].family]
}
/** The colour a chart gives a concept: its family's hue (lib/concepts.ts), at the tier that tells it from its siblings. */
export const seriesFor = (concept: ConceptId, tier: Tier = 'deep'): SeriesColour => HUE_SERIES[hueOf(concept)][tier]

export function metricValue(row: YearRow, metric: Metric): number {
  if (metric === 'netWorth') return row.household.netWorthEnd
  let sum = 0
  for (const p of Object.values(row.persons)) sum += p.employment + (p.otherIncome ?? 0) + p.db + p.rrq + p.oas + p.allowance + p.gis
  return sum
}

/** The factor that turns a dollar of `year` into a dollar of `todayYear`. */
export const deflator = (year: number, todayYear: number, inflation: number): number => (1 + inflation) ** (year - todayYear)

export function chartSeries(
  runs: readonly { selection: Selection; result: AgeResult }[],
  options: { metric: Metric; dollars: Dollars; todayYear: number; inflation: number; label: (s: Selection) => string },
): ChartSeries[] {
  return runs.map(({ selection, result }, i) => ({
    id: String(selection),
    label: options.label(selection),
    colour: SERIES_COLOURS[i % SERIES_COLOURS.length],
    points: result.rows.map((row) => ({
      x: row.year,
      y: metricValue(row, options.metric) / (options.dollars === 'today' ? deflator(row.year, options.todayYear, options.inflation) : 1),
    })),
  }))
}

/**
 * « Quand arrêter »'s picture (lib/stopWorking.ts `coverage`): the pensions after tax against the spending, each full year of retirement, in today's dollars or each
 * year's. Where the first line rises to meet the second, the pensions carry the spending alone; the gap below it is what the savings pay.
 */
export function stopCoverageSeries(
  coverage: readonly { year: number; pensions: number; spending: number }[],
  options: { dollars: Dollars; todayYear: number; inflation: number; labels: { pensions: string; spending: string } },
): ChartSeries[] {
  const scale = (year: number) => (options.dollars === 'today' ? deflator(year, options.todayYear, options.inflation) : 1)
  return [
    { id: 'pensions', label: options.labels.pensions, colour: seriesFor('rrq'), concept: 'rrq', points: coverage.map((c) => ({ x: c.year, y: c.pensions / scale(c.year) })) },
    { id: 'spending', label: options.labels.spending, colour: seriesFor('depenses'), concept: 'depenses', points: coverage.map((c) => ({ x: c.year, y: c.spending / scale(c.year) })) },
  ]
}

/** One vertical line per scenario at the year its FIRST person stops working. */
export function retirementMarkers(
  household: Household,
  runs: readonly { selection: Selection }[],
  label: (s: Selection) => string,
): ChartMarker[] {
  return runs.map(({ selection }, i) => ({
    x: household.persons[0].birth.year + selectionAge(household, selection),
    label: label(selection),
    colour: SERIES_COLOURS[i % SERIES_COLOURS.length],
  }))
}

/**
 * What the market fan draws its plan from: the household's OWN plan — the « Mon plan » run (the first run only when the plan is not compared) gives both the
 * age axis and the retirement marker. The marker once came from whichever age the comparison listed first (`?ages=60,plan`: « Retraite à 60 » over a plan that stops at 63).
 */
export function fanBasis<R extends { selection: Selection; result: AgeResult }>(household: Household, runs: readonly R[], label: (s: Selection) => string): { rows: AgeResult['rows'] | undefined; markers: ChartMarker[] } {
  const run = runs.find((r) => r.selection === 'plan') ?? runs[0]
  return { rows: run?.result.rows, markers: run === undefined ? [] : retirementMarkers(household, [run], label) }
}

// ── The whole picture, not only the net worth ────────────────────────────────────────────────────────────────────────
// « Détail »: where each year's money comes from (work, pension plan, RRQ, OAS and its supplements, savings drawn) and what
// the accounts hold. Everything is read from the engine's rows, for the household or for one person, so the bars and the
// per-year table can never disagree.

/** The chart's choices: the two single-line measures, or the detail (bars). */
export type ChartMetric = Metric | 'detail'

export const SOURCE_SEGMENTS = ['work', 'db', 'rrq', 'oas', 'nest'] as const
export type SourceSegment = (typeof SOURCE_SEGMENTS)[number]
/** Work and the employer's pension are the work family (berry), the QPP and the OAS the public pensions (sage), what is drawn from savings the nest. */
/** The concept each segment stands for: its colour comes from it, and its legend wears its pip (components/charts). */
export const SOURCE_CONCEPT: Record<SourceSegment, ConceptId> = { work: 'salaire', db: 'employeur', rrq: 'rrq', oas: 'psv', nest: 'nid' }
export const SOURCE_COLOUR: Record<SourceSegment, SeriesColour> = { work: seriesFor(SOURCE_CONCEPT.work), db: seriesFor(SOURCE_CONCEPT.db, 'soft'), rrq: seriesFor(SOURCE_CONCEPT.rrq), oas: seriesFor(SOURCE_CONCEPT.oas, 'soft'), nest: seriesFor(SOURCE_CONCEPT.nest) }

export const BALANCE_SEGMENTS = ['rrsp', 'tfsa', 'nonReg'] as const
export type BalanceSegment = (typeof BALANCE_SEGMENTS)[number]
/** The house's equity: wealth beside the accounts, never drawn on — a segment only for the household, and only when it has a home. */
export type BalanceBarSegment = BalanceSegment | 'rrspLocked' | 'home'
/** `rrspLocked` splits the locked-in part out of the REER bar (the `rrsp` bar is then the free part): a segment only when someone has one. */
/** The REER, the CELI and the locked-in part are the registered accounts (marigold, three tiers); the non-registered money and the house are the household's (sky). */
export const BALANCE_CONCEPT: Record<BalanceBarSegment, ConceptId> = { rrsp: 'reer', rrspLocked: 'verrouille', tfsa: 'celi', nonReg: 'nonEnregistre', home: 'maison' }
export const BALANCE_COLOUR: Record<BalanceBarSegment, SeriesColour> = { rrsp: seriesFor(BALANCE_CONCEPT.rrsp), rrspLocked: seriesFor(BALANCE_CONCEPT.rrspLocked, 'soft'), tfsa: seriesFor(BALANCE_CONCEPT.tfsa, 'mid'), nonReg: seriesFor(BALANCE_CONCEPT.nonReg), home: seriesFor(BALANCE_CONCEPT.home, 'soft') }

/** `year`: the sums of each year (the default) · `month`: the same sums over twelve — « how much a month », which is how a household lives with money. */
export type Per = 'year' | 'month'

interface Scale {
  dollars: Dollars
  todayYear: number
  inflation: number
  /** Absent: a year. Only the flows (what comes in, what goes out) are divided; what the accounts hold at year end never is. */
  per?: Per
}
const scaleOf = (row: YearRow, s: Scale): number => (s.dollars === 'today' ? deflator(row.year, s.todayYear, s.inflation) : 1)
/** The divisor of a flow: the deflator, and twelve for a month. */
const flowScale = (row: YearRow, s: Scale): number => scaleOf(row, s) * (s.per === 'month' ? 12 : 1)
const peopleOf = (row: YearRow, who: string | null) => Object.entries(row.persons).filter(([id]) => who === null || id === who).map(([, p]) => p)

/** Does any year of these rows carry dated income (a rent, a part of the household's plan that is neither work nor pension)? The work bar then says so. */
export const hasDatedIncome = (rows: readonly YearRow[]): boolean => rows.some((r) => Object.values(r.persons).some((p) => (p.otherIncome ?? 0) > 0))

/** One bar per year: the sources of the year's money, for the household (`who` null) or one person. `need` (spending + tax) is the household's only. */
export function sourceBars(rows: readonly YearRow[], who: string | null, s: Scale): ({ x: number; need: number } & Record<SourceSegment, number>)[] {
  return rows.map((row) => {
    const k = flowScale(row, s)
    let work = 0, db = 0, rrq = 0, oas = 0, nest = 0
    for (const p of peopleOf(row, who)) {
      // Dated income (a rent…) rides in the work bar, which says so in its label when there is some (hasDatedIncome).
      work += p.employment + (p.otherIncome ?? 0)
      db += p.db
      rrq += p.rrq
      oas += p.oas + p.allowance + p.gis
      nest += p.withdrawals.rrsp + p.withdrawals.tfsa + p.withdrawals.nonReg
    }
    return { x: row.year, need: who === null ? (row.household.spending + row.household.tax) / k : 0, work: work / k, db: db / k, rrq: rrq / k, oas: oas / k, nest: nest / k }
  })
}

/**
 * The longest run of years, between two years that DO have a bar, in which one person's sources are all empty — what a reader takes for missing data when the
 * household is paid by the other person's accounts (a pension deferred to 70, a draw that starts with the spouse's). Two years or more; null when none.
 */
export function idleStretch(bars: readonly ({ x: number } & Record<SourceSegment, number>)[]): { from: number; to: number } | null {
  const empty = (b: (typeof bars)[number]) => SOURCE_SEGMENTS.every((s) => b[s] < 0.5)
  let best: { from: number; to: number } | null = null
  let start = -1
  bars.forEach((b, i) => {
    if (empty(b)) {
      if (start < 0 && i > 0 && !empty(bars[i - 1])) start = i
      return
    }
    if (start >= 0) {
      if (i - start >= 2 && (best === null || i - start > best.to - best.from + 1)) best = { from: bars[start].x, to: bars[i - 1].x }
      start = -1
    }
  })
  return best
}

/**
 * In a couple whose plans end in different years, who goes first: the person is alive through the year they reach their plan's age (their own « jusqu'à quel âge », else the
 * scenario's), and then their accounts pass to the other. The per-person bars of the first end there and the other's JUMP the year after — wanted, and said on the page.
 * Null for one person, or two plans that end in the same year.
 */
export function survivorJump(household: Household, defaultHorizon: number): { goneId: string; otherId: string; lastYear: number } | null {
  if (household.persons.length !== 2) return null
  const lastYear = (p: Household['persons'][number]) => p.birth.year + (p.horizonAge ?? defaultHorizon)
  const [a, b] = household.persons
  if (lastYear(a) === lastYear(b)) return null
  const [gone, other] = lastYear(a) < lastYear(b) ? [a, b] : [b, a]
  return { goneId: gone.id, otherId: other.id, lastYear: lastYear(gone) }
}

export const EXPENSE_SEGMENTS = ['living', 'children', 'events', 'mortgage', 'tax', 'deductions', 'saved', 'unmet'] as const
export type ExpenseSegment = (typeof EXPENSE_SEGMENTS)[number]
/** `unmet`: what the plan needed and could not pay — drawn only in a plan that runs out. */
/** The budget, the tax and what could not be paid are the money that leaves (terracotta, three tiers); the children, the events and the mortgage the household's (sky); the deductions come off the pay (berry); what is saved goes to the accounts (marigold). */
export const EXPENSE_CONCEPT: Record<ExpenseSegment, ConceptId> = { living: 'budget', children: 'enfants', events: 'evenements', mortgage: 'hypotheque', tax: 'impot', deductions: 'salaire', saved: 'reer', unmet: 'depenses' }
export const EXPENSE_COLOUR: Record<ExpenseSegment, SeriesColour> = { living: seriesFor('budget', 'soft'), children: seriesFor('enfants'), events: seriesFor('evenements', 'soft'), mortgage: seriesFor('hypotheque', 'mid'), tax: seriesFor('impot', 'mid'), deductions: seriesFor('salaire'), saved: seriesFor('reer'), unmet: seriesFor('depenses') }

/**
 * One bar per year: where the household's money goes. `living` is the budget less the mortgage, the children and the dated expenses (care, a roof…), which are drawn apart so they can be seen, `mortgage` the
 * payments, `tax` the income tax and the OAS recovery, `deductions` what comes off the pay (QPP, EI, QPIP, a plan's own contributions), `saved` what is put into the
 * accounts, `unmet` the part of the budget the plan could not pay. The household's: the budget is not a person's. Together the first five are exactly what the sources
 * bars bring in (the engine's cash identity), which is the test that the two charts agree.
 */
export function expenseBars(rows: readonly YearRow[], s: Scale): ({ x: number } & Record<ExpenseSegment, number>)[] {
  return rows.map((row) => {
    const k = flowScale(row, s)
    let deductions = 0
    let saved = 0
    for (const p of Object.values(row.persons)) {
      deductions += p.rrqContribution + p.payrollContribution + p.pensionContribution
      saved += p.contributions.rrsp + p.contributions.tfsa + p.contributions.nonReg
    }
    const unmet = row.household.shortfall
    const paid = row.household.spending - unmet
    const mortgage = Math.min(row.household.mortgagePayment, paid)
    // The children and the dated expenses ride inside the budget: drawn apart, never more than what is left of it.
    const children = Math.min(row.household.childCost ?? 0, paid - mortgage)
    const events = Math.min(row.household.eventCost ?? 0, paid - mortgage - children)
    return { x: row.year, living: (paid - mortgage - children - events) / k, children: children / k, events: events / k, mortgage: mortgage / k, tax: row.household.tax / k, deductions: deductions / k, saved: saved / k, unmet: unmet / k }
  })
}

/** One bar per year: what each kind of account holds at year end. */
export function balanceBars(rows: readonly YearRow[], who: string | null, s: Scale): ({ x: number } & Record<BalanceBarSegment, number>)[] {
  return rows.map((row) => {
    const k = scaleOf(row, s)
    // The home belongs to the household, not to a person: it is in the household's bars only.
    const out = { x: row.year, rrsp: 0, rrspLocked: 0, tfsa: 0, nonReg: 0, home: who === null ? (row.household.homeValueEnd - row.household.mortgageBalanceEnd) / k : 0 }
    for (const p of peopleOf(row, who)) {
      for (const a of BALANCE_SEGMENTS) out[a] += p.balancesEnd[a] / k
      // the locked part is shown on its own: the REER bar is what is left of it
      out.rrspLocked += p.rrspLockedEnd / k
      out.rrsp -= p.rrspLockedEnd / k
    }
    return out
  })
}
