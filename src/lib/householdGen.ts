import { between, cases, intBetween } from '../engine/testGrid.ts'
import { GOLDEN_ASSUMPTIONS, GOLDEN_TODAY } from '../engine/golden/household.fixture.ts'
import { paramsFor } from '../engine/params/index.ts'
import { rregopPension } from '../engine/presets.ts'
import type { AccountKind, Assumptions, BracketFill, Household, Person, PersonId } from '../engine/types.ts'
import { earningsCeiling } from './plausibility.ts'

// RANDOM HOUSEHOLDS THAT COULD EXIST. The example households are fourteen hand-written lives; the bug that sent couples to half the line at 65 lived in a corner none of
// them reached. This builds households from one seed, by construction inside every rule of plausibility.ts (a test asserts it over hundreds of seeds, so a household that
// broke a rule would be named before any property is read off it), and shrinks a failing one to the smallest that still fails. Same seed, same households, anywhere:
// a failure prints `seed` and `index`, and `describeCase` prints the shrunk household as JSON to paste into a fixture.

export interface GenCase {
  seed: number
  index: number
  household: Household
  children: number[]
  assumptions: Assumptions
}

type Today = { readonly year: number; readonly month: number }
type Rand = () => number

const round = (x: number, to: number) => Math.round(x / to) * to
const pick = <T>(r: Rand, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]
const chance = (r: Rand, p: number) => r() < p

function shuffled<T>(r: Rand, xs: readonly T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** The relevé: from the 21st birthday (or 35 years back) to last year, ending at about today's salary, never above a year's ceiling. */
function earningsOf(r: Rand, birthYear: number, salary: number, today: Today): Record<number, number> {
  const last = today.year - 1
  const first = Math.max(birthYear + 21, last - 34)
  const out: Record<number, number> = {}
  const growth = between(r, 0.02, 0.035)
  const target = salary * between(r, 0.92, 1)
  for (let y = last; y >= first; y--) {
    const pay = target / (1 + growth) ** (last - y)
    out[y] = Math.round(Math.min(pay, earningsCeiling(y) ?? Infinity))
  }
  return out
}

function personOf(r: Rand, id: PersonId, birthYear: number, today: Today): Person {
  const P = paramsFor(today.year, { inflation: 0.02, wageGrowth: 0.03 })
  const age = today.year - birthYear
  // Mostly someone who still works; someone past 60 may already be retired (no pay, a history, accounts to live on).
  const retired = age >= 60 && chance(r, 0.25)
  const retirementAge = retired ? intBetween(r, Math.max(50, age - 8), age) : intBetween(r, Math.max(age + 1, 50), 70)
  const salary = retired ? 0 : round(between(r, 28_000, 190_000), 1000)
  const earningsHistory = earningsOf(r, birthYear, retired ? between(r, 30_000, 90_000) : salary, today)
  const earnedEver = Object.values(earningsHistory).reduce((s, e) => s + e, 0) + salary

  const scale = Math.max(0, Math.min(1, (age - 28) / 36)) // balances grow with age
  const rrspBalance = round(between(r, 0, 1) ** 1.6 * 1_400_000 * (0.2 + scale), 500)
  const rrspRoom = round(between(r, 0, Math.min(0.18 * earnedEver, 120_000)), 100)
  const rrspContribution = retired ? 0 : round(Math.min(P.accounts.rrspLimit, between(r, 0, 0.12) * salary, 0.18 * salary + rrspRoom), 100)
  const tfsaBalance = round(between(r, 0, 1) ** 1.5 * 450_000 * (0.2 + scale), 500)
  const tfsaRoom = round(between(r, 0, P.accounts.tfsaCumulativeSince2009), 100)
  const tfsaContribution = retired ? 0 : round(Math.min(P.accounts.tfsaLimit, between(r, 0, 0.08) * salary), 100)
  const nonRegBalance = chance(r, 0.6) ? round(between(r, 0, 1) ** 2 * 400_000 * (0.2 + scale), 500) : 0
  const acb = round(Math.min(nonRegBalance * between(r, 0.4, 1), Math.max(2 * nonRegBalance, 1000)), 500)

  const pensions =
    !retired && age >= 30 && chance(r, 0.2)
      ? (() => {
          const service = Math.min(age - 18, intBetween(r, 1, Math.max(1, Math.min(age - 19, 30))))
          const plan = rregopPension({ serviceYearsToDate: service, startAge: 60 })
          return [{ ...plan, startAge: Math.max(plan.earliestAge, intBetween(r, 55, 65)) }]
        })()
      : []

  const person: Person = {
    id,
    name: id,
    birth: { year: birthYear, month: intBetween(r, 1, 12) },
    retirementAge,
    salaryToday: salary,
    earningsHistory,
    rrq: { startAge: pick(r, [60, 62, 65, 65, 65, 67, 70, 72]) },
    oas: { startAge: pick(r, [65, 65, 65, 67, 70]), residentSince: chance(r, 0.85) ? birthYear + intBetween(r, 18, 22) : Math.min(today.year, birthYear + intBetween(r, 23, 40)) },
    accounts: {
      rrsp: { balance: rrspBalance, room: rrspRoom, annualContribution: rrspContribution, lockedIn: chance(r, 0.15) ? round(rrspBalance * between(r, 0, 0.6), 500) : 0 },
      tfsa: { balance: tfsaBalance, room: tfsaRoom, annualContribution: tfsaContribution },
      nonReg: { balance: nonRegBalance, acb, annualContribution: 0 },
    },
    pensions,
  }
  if (chance(r, 0.2)) person.horizonAge = intBetween(r, Math.max(age + 5, 80), 100)
  return person
}

export function genHousehold(r: Rand, today: Today = GOLDEN_TODAY): { household: Household; children: number[] } {
  const couple = chance(r, 0.7)
  const firstBirth = today.year - intBetween(r, 30, 64)
  const persons: Person[] = [personOf(r, 'self', firstBirth, today)]
  if (couple) {
    const gap = intBetween(r, -12, 12)
    persons.push(personOf(r, 'spouse', Math.min(today.year - 30, Math.max(today.year - 64, firstBirth + gap)), today))
  }

  const age = (p: Person) => today.year - p.birth.year
  const gross = persons.reduce((s, p) => s + (p.retirementAge > age(p) ? p.salaryToday : 0), 0)
  const saved = persons.reduce((s, p) => s + p.accounts.rrsp.annualContribution + p.accounts.tfsa.annualContribution, 0)
  const working = gross > 0 ? Math.max(24_000, Math.min(gross * between(r, 0.3, 0.62), 0.9 * gross - saved)) : between(r, 30_000, 80_000)
  const workingToday = round(working, 500)
  const retiredToday = round(workingToday * between(r, 0.6, 1), 500)

  const youngest = Math.max(...persons.map((p) => p.birth.year))
  const oldest = Math.min(...persons.map((p) => p.birth.year))
  const children: number[] = []
  const kids = chance(r, 0.4) ? intBetween(r, 1, 3) : 0
  for (let i = 0; i < kids; i++) children.push(intBetween(r, oldest + 22, today.year))
  const toCome = kids > 0 && today.year - youngest <= 38 && chance(r, 0.2)
  if (toCome) children.push(today.year + intBetween(r, 1, 4))

  const household: Household = { livesAlone: !couple, persons, spending: { workingToday, retiredToday } }
  if (children.length > 0) {
    household.children = children.sort((a, b) => a - b)
    household.childSpending = { perChild: round(between(r, 4_000, 12_000), 500), untilAge: 23 }
  }
  if (chance(r, 0.25)) {
    const value = round(between(r, 250_000, 1_000_000), 5000)
    const balance = round(value * between(r, 0, 0.6), 1000)
    household.home = {
      value,
      mortgage: { balance, rate: between(r, 0.03, 0.06), monthlyPayment: balance === 0 ? 0 : round(balance / 200, 50) },
      sale: chance(r, 0.3) ? { age: intBetween(r, 65, 80), replacementCost: round(value * between(r, 0, 0.8), 5000) } : null,
    }
  }
  return { household, children: [...children] }
}

export function genAssumptions(r: Rand, today: Today = GOLDEN_TODAY): Assumptions {
  const inflation = round(between(r, 0.015, 0.03), 0.001)
  return {
    ...GOLDEN_ASSUMPTIONS,
    today,
    inflation,
    wageGrowth: round(inflation + between(r, 0, 0.012), 0.001),
    returns: { nonReg: round(between(r, 0.025, 0.055), 0.001), rrsp: round(between(r, 0.03, 0.065), 0.001), tfsa: round(between(r, 0.03, 0.065), 0.001) },
    horizonAge: intBetween(r, 88, 100),
    survivorSpending: round(between(r, 0.55, 0.85), 0.05),
    withdrawalOrder: shuffled(r, ['nonReg', 'rrsp', 'tfsa'] as AccountKind[]),
    pensionSplitting: chance(r, 0.7),
    drawTogether: chance(r, 0.25),
    surplusToRrsp: chance(r, 0.4),
    bracketFill: pick<BracketFill | null>(r, [null, null, 'bracket1', 'oas']),
  }
}

/** `n` plausible households with assumptions, from one seed. Their `index` and the `seed` are what a failure reports. */
export function genCases(seed: number, n: number, today: Today = GOLDEN_TODAY): GenCase[] {
  return cases(seed, n, (r, index) => {
    const { household, children } = genHousehold(r, today)
    return { seed, index, household, children, assumptions: genAssumptions(r, today) }
  })
}

/** Simpler households that differ from this one by one cut — what a shrinker tries, simplest first. */
function cuts(h: Household): Household[] {
  const out: Household[] = []
  if (h.persons.length === 2) {
    for (const drop of [1, 0]) out.push({ ...h, livesAlone: true, persons: [{ ...h.persons[1 - drop], id: 'self' }] })
  }
  if (h.home) out.push({ ...h, home: undefined })
  if (h.children?.length) out.push({ ...h, children: [], childSpending: null })
  h.persons.forEach((p, i) => {
    const swap = (q: Person): Household => ({ ...h, persons: h.persons.map((x, j) => (j === i ? q : x)) })
    if (p.pensions.length > 0) out.push(swap({ ...p, pensions: [] }))
    if (p.horizonAge != null) out.push(swap({ ...p, horizonAge: null }))
    if ((p.accounts.rrsp.lockedIn ?? 0) > 0) out.push(swap({ ...p, accounts: { ...p.accounts, rrsp: { ...p.accounts.rrsp, lockedIn: 0 } } }))
    if (p.accounts.nonReg.balance > 0) out.push(swap({ ...p, accounts: { ...p.accounts, nonReg: { balance: 0, acb: 0, annualContribution: 0 } } }))
    if (p.accounts.tfsa.balance > 0) out.push(swap({ ...p, accounts: { ...p.accounts, tfsa: { ...p.accounts.tfsa, balance: 0 } } }))
    if (p.birth.month !== 6) out.push(swap({ ...p, birth: { ...p.birth, month: 6 } }))
    if (p.rrq.startAge !== 65) out.push(swap({ ...p, rrq: { ...p.rrq, startAge: 65 } }))
    if (p.oas.startAge !== 65) out.push(swap({ ...p, oas: { ...p.oas, startAge: 65 } }))
  })
  return out
}

/**
 * The smallest household (by cuts, greedily) for which `fails` still holds. Not an exhaustive shrink — a person reading a failure wants the household with the noise
 * removed: one person if one is enough, no home, no pension, the middle of the year. Each candidate is re-checked, so a cut that hides the bug is never kept.
 */
export function shrinkHousehold(h: Household, fails: (h: Household) => boolean, budget = 60): Household {
  let current = h
  let spent = 0
  for (let progressed = true; progressed && spent < budget; ) {
    progressed = false
    for (const candidate of cuts(current)) {
      spent++
      if (spent > budget) break
      if (fails(candidate)) {
        current = candidate
        progressed = true
        break
      }
    }
  }
  return current
}

/** What a failing property prints: where to find the case again, and the household to paste into a fixture. */
export function describeCase(c: Pick<GenCase, 'seed' | 'index'>, household: Household): string {
  return `seed ${c.seed}, case ${c.index} — reproduce with genCases(${c.seed}, ${c.index + 1})[${c.index}]\n${JSON.stringify(household)}`
}

