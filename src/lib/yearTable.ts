import type { YearRow } from '../engine/types.ts'

// THE YEAR-BY-YEAR TABLE, ONCE. The table on the results page and the spreadsheet it exports (lib/yearCsv.ts) say the same numbers because they are the same
// numbers: this is the one place a row of the engine becomes a row of the table — which columns exist, which year falls short, what a dollar of that year is in
// the dollars shown. The page only formats; the file only rounds. A test holds the model to the engine's rows and to the charts' bars (yearTable.test.ts).

/** The locked-in part of the household's REER at the end of the year (0 for most households). */
export const lockedOf = (row: YearRow): number => Object.values(row.persons).reduce((s, p) => s + p.rrspLockedEnd, 0)

interface YearTableRow {
  year: number
  /** Each person's age that year, in household order. */
  ages: number[]
  /** The year lies beyond what the parameters were read for: projected by their index rules. */
  projected: boolean
  /** The plan could not pay all of this year's spending. */
  short: boolean
  // Every figure below is already in the dollars shown (the year's own, or today's): the engine's figure divided by `factor(year)`.
  income: number
  tax: number
  spending: number
  /** What the year could not pay (0 when it is paid). */
  shortfall: number
  netWorth: number
  rrspLocked: number
  /** The mortgage payments of the year. */
  mortgage: number
  homeEquity: number
}

interface YearTableModel {
  rows: YearTableRow[]
  /** A column that would be empty in every year is left out: the home's two only when the plan has a home… */
  hasHome: boolean
  /** …the locked-in REER only when someone has a locked part… */
  hasLocked: boolean
  /** …and « à combler » only when some year falls short. */
  hasShortfall: boolean
  /** The first year that falls short, null when none does. */
  firstShortYear: number | null
}

/** @param factor what a dollar of `year` is divided by to be in the dollars shown (the chart's deflator for today's dollars; 1 for the year's own). */
export function yearTableModel(rows: readonly YearRow[], factor: (year: number) => number = () => 1): YearTableModel {
  const out = rows.map((row): YearTableRow => {
    const k = factor(row.year)
    const h = row.household
    return {
      year: row.year,
      ages: Object.values(row.persons).map((p) => p.age),
      projected: row.projected === true,
      short: h.shortfall > 0,
      income: h.grossIncome / k,
      tax: h.tax / k,
      spending: h.spending / k,
      shortfall: h.shortfall / k,
      netWorth: h.netWorthEnd / k,
      rrspLocked: lockedOf(row) / k,
      mortgage: h.mortgagePayment / k,
      homeEquity: (h.homeValueEnd - h.mortgageBalanceEnd) / k,
    }
  })
  return {
    rows: out,
    hasHome: rows.some((r) => r.household.homeValueEnd > 0),
    hasLocked: rows.some((r) => lockedOf(r) > 0),
    hasShortfall: rows.some((r) => r.household.shortfall > 0),
    firstShortYear: rows.find((r) => r.household.shortfall > 0)?.year ?? null,
  }
}
