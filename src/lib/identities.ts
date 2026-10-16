import type { Assumptions, YearRow } from '../engine/types.ts'
import { SOURCE_SEGMENTS, balanceBars, expenseBars, sourceBars } from './chartData.ts'

// THE IDENTITIES EVERY PROJECTION MUST HOLD, whoever the household is and whatever settings it runs under. They were written inside one test (optionMatrix.invariants.test.ts, over
// the fourteen examples); the random-household suites need the very same rules, so they live here once: a function that returns what is wrong (empty when nothing is), which a test
// turns into `expect(problems).toEqual([])` with the case's name on every line.

const OUT = ['living', 'children', 'events', 'mortgage', 'tax', 'deductions', 'saved'] as const
const NEED = ['living', 'children', 'events', 'mortgage', 'tax', 'unmet'] as const
const sum = (o: Record<string, number>, keys: readonly string[]) => keys.reduce((s, k) => s + o[k], 0)
const near = (x: number, y: number, digits: number) => Math.abs(x - y) < 10 ** -digits / 2

/** What is wrong with these rows (one line per problem): the two flow charts, the books, the accounts, the years. */
export function bookProblems(rows: readonly YearRow[], a: Assumptions): string[] {
  const out: string[] = []
  const scale = { dollars: 'nominal' as const, todayYear: a.today.year, inflation: a.inflation }
  const sources = sourceBars(rows, null, scale)
  const spent = expenseBars(rows, scale)
  const balances = balanceBars(rows, null, scale)
  rows.forEach((row, i) => {
    const bad = (what: string) => out.push(`${row.year}: ${what}`)
    // what comes in is what goes out, and the dashed need line is the budget plus tax
    const inflow = sum(sources[i], SOURCE_SEGMENTS)
    const outflow = sum(spent[i], OUT)
    if (!near(inflow, outflow, 1)) bad(`sources ${inflow.toFixed(2)} ≠ uses ${outflow.toFixed(2)}`)
    const need = sum(spent[i], NEED)
    if (!near(sources[i].need, need, 1)) bad(`the need line ${sources[i].need.toFixed(2)} ≠ budget + tax ${need.toFixed(2)}`)
    for (const [pid, p] of Object.entries(row.persons)) {
      if (!p) continue
      const figures: [string, number][] = [
        ['netIncome', p.netIncome], ['federalTax', p.federalTax], ['quebecTax', p.quebecTax], ['oasRecovery', p.oasRecovery], ['rrifMinimum', p.rrifMinimum], ['gis', p.gis],
        ['rrspOut', p.withdrawals.rrsp], ['tfsaOut', p.withdrawals.tfsa], ['nonRegOut', p.withdrawals.nonReg], ['rrspEnd', p.balancesEnd.rrsp], ['tfsaEnd', p.balancesEnd.tfsa], ['nonRegEnd', p.balancesEnd.nonReg],
      ]
      for (const [name, x] of figures) if (!Number.isFinite(x)) bad(`${pid} ${name} is ${x}`)
      if (p.withdrawals.rrsp + 0.005 < p.rrifMinimum) bad(`${pid} drew ${p.withdrawals.rrsp} from the RRSP, below the forced minimum ${p.rrifMinimum}`)
      for (const [name, x] of [['rrsp', p.balancesEnd.rrsp], ['tfsa', p.balancesEnd.tfsa], ['nonReg', p.balancesEnd.nonReg]] as const) if (x < -0.005) bad(`${pid} ${name} is below nothing (${x})`)
      if (p.gis < 0) bad(`${pid} GIS is negative (${p.gis})`)
      if (p.oasRecovery < 0) bad(`${pid} OAS recovery is negative (${p.oasRecovery})`)
    }
    if (row.household.shortfall < 0) bad(`shortfall is negative (${row.household.shortfall})`)
    if (row.household.tax < 0) bad(`tax is negative (${row.household.tax})`)
    // the accounts the chart stacks are the net worth the row reports (the home is the only thing the bars add)
    const stacked = balances[i].rrsp + balances[i].rrspLocked + balances[i].tfsa + balances[i].nonReg
    if (!near(stacked, row.household.netWorthEnd, 0)) bad(`the stacked accounts ${stacked.toFixed(2)} ≠ net worth ${row.household.netWorthEnd.toFixed(2)}`)
    if (i > 0 && row.year - rows[i - 1].year !== 1) bad(`the year follows ${rows[i - 1].year}`)
  })
  return out
}
