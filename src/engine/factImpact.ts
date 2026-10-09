import { MIN_TRY_AGE, everyoneAt, retireAt, runScenario } from './retireAt.ts'
import type { Assumptions, Household, PersonId } from './types.ts'

// « WHICH FIGURE, IF I WERE WRONG ABOUT IT, WOULD MOVE THE ANSWER MOST? » — one typed number nudged 15 % each way (the years of
// residence by three), everything else as the plan stands, and the earliest retirement age that works asked again. The swing is
// how many years the answer moves; it ranks the figures a person has not read off a document yet, so the ones worth finding
// come first. Not a margin of error (nobody said 15 % is how wrong a figure is) — a way to rank. The same plain search as
// everywhere else (`retireAt`'s « works »), so a swing is an answer's own movement, never a model of its own. Because it only
// RANKS, each nudged plan is searched by a short walk from the answer (earlier while it still works, later until it does) instead
// of from the first age tried: two or three projections a nudge instead of a dozen.

/** The figures that can be nudged: the same names as `FactKind` (lib/facts.ts, which checks it). */
export const IMPACT_KINDS = [
  'salary',
  'earnings',
  'residence',
  'rrspBalance',
  'rrspRoom',
  'rrspLocked',
  'tfsaBalance',
  'tfsaRoom',
  'nonRegBalance',
  'nonRegAcb',
  'pension',
  'spendingWorking',
  'spendingRetired',
  'homeValue',
  'mortgage',
] as const
export type ImpactKind = (typeof IMPACT_KINDS)[number]

/** How far a figure is nudged each way (a share), and the years of residence. */
export const NUDGE = 0.15
export const NUDGE_RESIDENCE_YEARS = 3

/** Past the oldest age the search tries, « no age works » counts as one more year, so a figure that tips the plan over the edge ranks high. */
const NO_AGE = 71

type Owner = PersonId | 'household'

/** `dir` −1 / +1 is the direction of the nudge on the typed FIGURE (smaller / larger), not whether it helps. */
function nudged(h: Household, thisYear: number, owner: Owner, kind: ImpactKind, dir: -1 | 1): Household {
  const f = 1 + NUDGE * dir
  const person = (change: (p: Household['persons'][number]) => Household['persons'][number]): Household => ({
    ...h,
    persons: h.persons.map((p) => (p.id === owner ? change(p) : p)),
  })
  const account = (kindOf: 'rrsp' | 'tfsa' | 'nonReg', change: (a: never) => object): Household =>
    person((p) => ({ ...p, accounts: { ...p.accounts, [kindOf]: { ...p.accounts[kindOf], ...change(p.accounts[kindOf] as never) } } }))
  switch (kind) {
    case 'salary':
      return person((p) => ({ ...p, salaryToday: p.salaryToday * f }))
    case 'earnings':
      return person((p) => ({ ...p, earningsHistory: Object.fromEntries(Object.entries(p.earningsHistory).map(([y, v]) => [y, v * f])) }))
    case 'residence':
      // The year residence began, moved by three: never before the person turned 18, never after this year.
      return person((p) => ({ ...p, oas: { ...p.oas, residentSince: Math.min(thisYear, Math.max(p.birth.year + 18, p.oas.residentSince + NUDGE_RESIDENCE_YEARS * dir)) } }))
    case 'rrspBalance':
      return account('rrsp', (a: { balance: number; lockedIn?: number }) => ({ balance: a.balance * f, ...(a.lockedIn === undefined ? {} : { lockedIn: Math.min(a.lockedIn, a.balance * f) }) }))
    case 'rrspRoom':
      return account('rrsp', (a: { room: number }) => ({ room: a.room * f }))
    case 'rrspLocked':
      return account('rrsp', (a: { balance: number; lockedIn?: number }) => ({ lockedIn: Math.min(a.balance, (a.lockedIn ?? 0) * f) }))
    case 'tfsaBalance':
      return account('tfsa', (a: { balance: number }) => ({ balance: a.balance * f }))
    case 'tfsaRoom':
      return account('tfsa', (a: { room: number }) => ({ room: a.room * f }))
    case 'nonRegBalance':
      return account('nonReg', (a: { balance: number; acb: number }) => ({ balance: a.balance * f, acb: Math.min(a.acb, a.balance * f) }))
    case 'nonRegAcb':
      return account('nonReg', (a: { balance: number; acb: number }) => ({ acb: Math.min(a.balance, a.acb * f) }))
    case 'pension':
      return person((p) => ({
        ...p,
        pensions: p.pensions.map((d) => (d.inPay ? { ...d, inPay: { ...d.inPay, annual: d.inPay.annual * f, ...(d.inPay.after65 === undefined ? {} : { after65: d.inPay.after65 * f }) } } : { ...d, serviceYearsToDate: d.serviceYearsToDate * f })),
      }))
    case 'spendingWorking':
      return { ...h, spending: { ...h.spending, workingToday: h.spending.workingToday * f } }
    case 'spendingRetired':
      return { ...h, spending: { ...h.spending, retiredToday: h.spending.retiredToday * f } }
    case 'homeValue':
      return h.home ? { ...h, home: { ...h.home, value: h.home.value * f } } : h
    case 'mortgage':
      return h.home ? { ...h, home: { ...h.home, mortgage: { ...h.home.mortgage, balance: h.home.mortgage.balance * f } } } : h
  }
}

export interface FactSwing {
  /** The earliest age that works with the figure nudged down / up (null: none up to 70). */
  down: number | null
  up: number | null
  /** The most the answer moves either way, in years (« no age » counts as 71). */
  years: number
}

/**
 * Each requested figure's swing against the answer as the plan stands. `facts` are `{ id, owner, kind }` as the profile lists them;
 * the result is keyed by `id`. A figure the household does not carry (no home, no pension) cannot be nudged and swings 0.
 */
export function factSwings(h: Household, a: Assumptions, facts: readonly { id: string; owner: Owner; kind: ImpactKind }[]): { base: number | null; swings: Record<string, FactSwing> } {
  const base = retireAt(h, a, { stopAtFirstOk: true }).earliestOk
  const oldest = Math.max(0, ...h.persons.map((p) => a.today.year - p.birth.year))
  const lowest = Math.max(MIN_TRY_AGE, oldest)
  const earliest = (hh: Household): number | null => {
    const works = (age: number) => runScenario(hh, a, everyoneAt(hh, age), age).ok
    if (base === null) return retireAt(hh, a, { stopAtFirstOk: true }).earliestOk
    let age = base
    if (works(age)) {
      while (age - 1 >= lowest && works(age - 1)) age--
      return age
    }
    while (age < 70) if (works(++age)) return age
    return null
  }
  const n = (x: number | null) => x ?? NO_AGE
  const swings: Record<string, FactSwing> = {}
  for (const f of facts) {
    const down = earliest(nudged(h, a.today.year, f.owner, f.kind, -1))
    const up = earliest(nudged(h, a.today.year, f.owner, f.kind, 1))
    swings[f.id] = { down, up, years: Math.max(Math.abs(n(down) - n(base)), Math.abs(n(up) - n(base))) }
  }
  return { base, swings }
}
