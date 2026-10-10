import { KNOWN, paramsFor } from '../engine/params/index.ts'
import { everyoneAt, retireAt, runScenario, worksNow } from '../engine/retireAt.ts'
import type { Assumptions, Flow, Household } from '../engine/types.ts'

// « And if the last years cost more? » — the model behind the care what-if on Résultats (components/results/CareView.tsx), kept out
// of the view and the worker so both read ONE definition. A late-life care cost is nothing new for the engine: it is a dated EXPENSE
// flow (engine/lifeEvents.ts), started at an age instead of a year. The what-if adds that flow to a COPY of the household and asks the
// two questions the page already asks of every change: the earliest age that then works, and what the plan leaves at the horizon.

export interface Care {
  /** Today's dollars a year, on top of the budget. */
  amount: number
  /** The age of the OLDEST person when it starts. */
  fromAge: number
  /** How many years it lasts. */
  years: number
}

export const CARE_AMOUNT_MIN = 5_000
export const CARE_AMOUNT_MAX = 150_000
export const CARE_AMOUNT_STEP = 1_000
export const CARE_FROM_MIN = 65
export const CARE_FROM_MAX = 100
export const CARE_YEARS_MIN = 1
export const CARE_YEARS_MAX = 25

/** What the sliders start on: the same figure and age as the starter chip on Profil (« Soins en fin de vie »), so the two agree. */
export const CARE_START: Care = { amount: 30_000, fromAge: 85, years: 10 }

/** The oldest person's birth year: the care starts when THEY reach `fromAge`, as the starter chip counts it. */
export const oldestBirthYear = (h: Household): number => Math.min(...h.persons.map((p) => p.birth.year))

/** The care as the dated expense the engine reads. */
export function careFlow(h: Household, care: Care, label: string): Flow {
  const fromYear = Math.min(2150, oldestBirthYear(h) + care.fromAge)
  return { label, kind: 'expense', amount: care.amount, fromYear, toYear: Math.min(2150, fromYear + Math.max(1, care.years) - 1), owner: 'self', taxable: false }
}

/** The household as it would be with that care (a copy; the household itself is untouched). */
export const withCare = (h: Household, care: Care, label = 'care'): Household => ({ ...h, flows: [...(h.flows ?? []), careFlow(h, care, label)] })

export interface CareAnswer {
  /** The earliest age at which the plan lasts with the care; null when no age up to 70 does. */
  earliest: number | null
  /** « Dès maintenant »: stopping today works with the care. */
  now: boolean
  /** The age the two runs below were read at. */
  age: number
  /** At that age, with the care: does the plan last, and when does the money first fall short. */
  ok: boolean
  firstShortfallYear: number | null
  /** The household's net worth at the horizon, today's dollars, with the care and without it (the RRSP counted before its tax, as everywhere). */
  worthWith: number
  worthWithout: number
}

/** Net worth at the horizon in today's dollars. */
function worthToday(h: Household, a: Assumptions, age: number): { ok: boolean; firstShortfallYear: number | null; worth: number } {
  const run = runScenario(h, a, everyoneAt(h, age), age)
  const last = run.rows[run.rows.length - 1]
  return { ok: run.ok, firstShortfallYear: run.firstShortfallYear, worth: run.netWorthAtHorizon / Math.pow(1 + a.inflation, last.year - a.today.year) }
}

/** The plan with the care: the earliest age that works, and — at `age`, the one the verdict reads — what is left at the horizon, with and without it. */
export function careAnswer(household: Household, assumptions: Assumptions, care: Care, age: number): CareAnswer {
  const h = withCare(household, care)
  const earliest = retireAt(h, assumptions, { stopAtFirstOk: true }).earliestOk
  const withCareRun = worthToday(h, assumptions, age)
  const without = worthToday(household, assumptions, age)
  return { earliest, now: worksNow(h, assumptions, earliest), age, ok: withCareRun.ok, firstShortfallYear: withCareRun.firstShortfallYear, worthWith: withCareRun.worth, worthWithout: without.worth }
}

export type CareReferenceKey = 'privateRoom' | 'semiPrivate' | 'ward'

/** A public CHSLD's ceiling, as a reference for the sliders: what the government sets a MONTH, and the same over a year (today's dollars). */
export interface CareReference {
  key: CareReferenceKey
  monthly: number
  yearly: number
}

/** The three CHSLD ceilings of the plan's year (cited in engine/params: longTermCare). A ceiling: the RAMQ sets what a person pays from their income. */
export function chsldReferences(a: Assumptions): CareReference[] {
  const L = paramsFor(a.today.year, { inflation: a.inflation, wageGrowth: a.wageGrowth }).longTermCare
  const row = (key: CareReferenceKey, monthly: number): CareReference => ({ key, monthly, yearly: Math.round(monthly * 12) })
  return [row('privateRoom', L.chsldPrivateRoom), row('semiPrivate', L.chsldSemiPrivateRoom), row('ward', L.chsldWard)]
}

/** The page the ceilings were read on (the latest known year's citation), for the link under them. */
export function chsldSource(): { url: string; title: string; year: number } {
  const year = Math.max(...Object.keys(KNOWN).map(Number))
  const { url, title } = KNOWN[year].longTermCare.chsldPrivateRoom.source
  return { url, title, year }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/**
 * `?care=amount,fromAge,years` → a care the sliders can hold (whole dollars, whole years, each inside its reach: a reference figure such as a
 * CHSLD's ceiling is kept exactly, not rounded to the slider's step), or null for anything unreadable. A part left out takes the starting figure.
 */
export function parseCare(text: string | null): Care | null {
  if (text === null || text === '') return null
  const parts = text.split(',')
  if (parts.length > 3) return null
  const nums = parts.map((p) => (p.trim() === '' ? null : Number(p)))
  if (nums.some((n) => n !== null && !Number.isFinite(n))) return null
  const [amount, fromAge, years] = nums
  return {
    amount: clamp(Math.round(amount ?? CARE_START.amount), CARE_AMOUNT_MIN, CARE_AMOUNT_MAX),
    fromAge: clamp(Math.round(fromAge ?? CARE_START.fromAge), CARE_FROM_MIN, CARE_FROM_MAX),
    years: clamp(Math.round(years ?? CARE_START.years), CARE_YEARS_MIN, CARE_YEARS_MAX),
  }
}

/** The address form of a care (the inverse of `parseCare`). */
export const formatCare = (c: Care): string => `${c.amount},${c.fromAge},${c.years}`

export const sameCare = (a: Care, b: Care): boolean => a.amount === b.amount && a.fromAge === b.fromAge && a.years === b.years
