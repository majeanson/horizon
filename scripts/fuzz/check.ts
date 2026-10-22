import { project } from '../../src/engine/projection.ts'
import { everyoneAt, retireAt, runScenario } from '../../src/engine/retireAt.ts'
import type { Assumptions, Household, YearRow } from '../../src/engine/types.ts'
import { bookProblems } from '../../src/lib/identities.ts'
import { violations } from '../../src/lib/plausibility.ts'
import type { Expanded } from './spec.ts'

// THE DETERMINISTIC HALF: what the engine must hold for any household that could exist. Nothing here is new law: the books are
// lib/identities.ts, the plausibility rules are lib/plausibility.ts, the monotonic checks are the ones answer.props.test.ts holds the
// example households to. They are re-run here on households those suites have never seen. Each problem is one line, prefixed by its kind.

export interface CheckResult {
  /** Rules of plausibility.ts the household breaks: the generator's fault, not the engine's. The household is not run. */
  implausible: string[]
  /** What the engine got wrong (empty when nothing). */
  problems: string[]
  rows: YearRow[] | null
  earliest: number | null
}

const clone = <T>(x: T): T => structuredClone(x)
const FROM = 18
const earliestOf = (h: Household, a: Assumptions): number => retireAt(h, a, { from: FROM, to: 70, stopAtFirstOk: true }).earliestOk ?? Infinity

export function check(e: Expanded): CheckResult {
  const implausible = violations(e.household, e.children)
  if (implausible.length > 0) return { implausible, problems: [], rows: null, earliest: null }

  const { household: h, assumptions: a } = e
  const problems: string[] = []
  const add = (kind: string, why: string) => problems.push(`${kind}: ${why}`)

  let rows: YearRow[]
  try {
    rows = project(clone(h), clone(a))
  } catch (err) {
    return { implausible, problems: [`throws: ${(err as Error).message}`], rows: null, earliest: null }
  }
  if (rows.length === 0) add('empty', 'the projection has no rows')
  for (const p of bookProblems(rows, a)) add('books', p)

  // asking twice, and through JSON and back, gives the same plan
  const again = project(JSON.parse(JSON.stringify(h)) as Household, JSON.parse(JSON.stringify(a)) as Assumptions)
  if (JSON.stringify(again) !== JSON.stringify(rows)) add('json', 'the plan differs after the household and the assumptions go through JSON and back')

  // the answer is the earliest age that works
  let earliest: number | null = null
  try {
    const full = retireAt(clone(h), clone(a), { from: FROM, to: 70 })
    earliest = full.earliestOk
    if (earliest !== null) {
      for (const r of full.byAge) if (r.age < earliest && r.ok) add('earliest', `age ${r.age} works but the answer says ${earliest}`)
      const quick = retireAt(clone(h), clone(a), { from: FROM, to: 70, stopAtFirstOk: true }).earliestOk
      if (quick !== earliest) add('earliest', `the cheap search says ${quick}, the full one ${earliest}`)
    }
  } catch (err) {
    add('throws', `retireAt: ${(err as Error).message}`)
  }

  // spending 10 % more never makes the answer earlier; $100 000 more in the TFSA never makes it later
  try {
    const base = earliestOf(clone(h), clone(a))
    const spender = clone(h)
    spender.spending = { workingToday: h.spending.workingToday * 1.1, retiredToday: h.spending.retiredToday * 1.1 }
    const spent = earliestOf(spender, clone(a))
    if (spent < base) add('monotone', `spending 10 % more moves the earliest age from ${base} to ${spent}`)
    const richer = clone(h)
    richer.persons[0].accounts.tfsa.balance += 100_000
    const rich = earliestOf(richer, clone(a))
    if (rich > base) add('monotone', `$100 000 more in the TFSA moves the earliest age from ${base} to ${rich}`)
  } catch (err) {
    add('throws', `monotone runs: ${(err as Error).message}`)
  }

  // who is listed first changes nothing about the household's money (without a bracket fill)
  // (the child benefit is paid on the first person only, and a windfall lands with the first person alive: a household that counts the benefit is not symmetric by design)
  if (h.persons.length === 2 && !a.bracketFill && !h.kidsEffects?.benefits) {
    try {
      const swapped = clone(h)
      swapped.persons = [{ ...clone(h.persons[1]), id: 'self' }, { ...clone(h.persons[0]), id: 'spouse' }]
      swapped.flows = (h.flows ?? []).map((f) => ({ ...f, owner: f.owner === 'self' ? 'spouse' : 'self' }))
      const sw = project(swapped, clone(a))
      if (sw.length !== rows.length) add('swap', `${sw.length} rows with the two people swapped, ${rows.length} before`)
      else
        rows.forEach((r, i) => {
          const d = Math.abs(sw[i].household.netWorthEnd - r.household.netWorthEnd)
          if (d > 1 + 1e-6 * Math.abs(r.household.netWorthEnd)) add('swap', `${r.year}: net worth ${r.household.netWorthEnd.toFixed(0)} against ${sw[i].household.netWorthEnd.toFixed(0)} with the two swapped`)
        })
    } catch (err) {
      add('throws', `swap run: ${(err as Error).message}`)
    }
  }

  // a verdict is « ok » exactly when no year has a shortfall (at the household's own age)
  try {
    const r = runScenario(h, a, everyoneAt(h, h.persons[0].retirementAge), h.persons[0].retirementAge)
    if (r.ok !== r.rows.every((x) => x.household.shortfall <= 0)) add('verdict', 'ok disagrees with the rows')
  } catch (err) {
    add('throws', `verdict run: ${(err as Error).message}`)
  }

  return { implausible, problems: problems.slice(0, 12), rows, earliest }
}
