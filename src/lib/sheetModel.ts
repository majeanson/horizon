import { PRESET_KEYS, withPreset, type PresetKey } from '../engine/assumptionPresets.ts'
import { payoffMonths, payoffYear } from '../engine/home.ts'
import { planGlance } from '../engine/ledger.ts'
import { project } from '../engine/projection.ts'
import type { Assumptions, PersonId } from '../engine/types.ts'
import { accuracyOf, factId, factsOf, type Fact, type FactKind } from './facts.ts'
import { profileGaps, type ProfileGap } from './profileGaps.ts'
import type { Profile } from './schema.ts'
import { lastPensionStart, pensionsAfterTax } from './stopWorking.ts'

// THE HOUSEHOLD SHEET'S MODEL — one household, said as a verdict (the earliest age and how sturdy the plan is), two more measures (today · once retired),
// what it holds (investable, pensions, home — apart, because only the first is money to live on), and the figures worth confirming first. A PURE
// function of the profile, the earliest age (the one number that comes from a search run off the page's thread) and, once it is in, how far the answer
// moves if each unconfirmed figure were off (the results page's own ranking). Nothing here is invented: every stat is an engine output (a projection of
// the plan as stated, or the verdict's own earliest age), and each says what it is read from. The bars are a picture of a figure on a scale that is
// stated (`scale`), never a judgement: a short bar is « room to grow ».

export type StatId = 'runway' | 'cover' | 'saving' | 'keep' | 'resilience'

/** `pending`: not worked out yet · `none`: nothing to say (no age works, nobody earns…) · `ready`. */
export type StatStatus = 'pending' | 'none' | 'ready'

export interface SheetStat {
  id: StatId
  status: StatStatus
  /** The figure in its own unit: an age, a share (0 to 1), or a count (of scenarios). */
  value: number | null
  unit: 'age' | 'share' | 'count'
  /** How full the bar is, 0 to 1 (null when there is nothing to draw). */
  fill: number | null
  /** What the full bar stands for, in the stat's own unit: 25 % saved, 10 years of margin, 3 scenarios… */
  scale: number
  /** The figures the stat's sentence is built from. */
  detail: { planned?: number; margin?: number | null; year?: number; spending?: number }
}

export interface SheetPerson {
  id: PersonId
  name: string
  age: number
  retirementAge: number
  retired: boolean
}

export type SlotKind = 'rrsp' | 'tfsa' | 'nonReg' | 'pension' | 'home'
/** Money to live on (the three accounts) · income that arrives by itself (a pension) · the home (a value, not money to spend). */
export type SlotGroup = 'investable' | 'pension' | 'home'
export const SLOT_GROUP: Record<SlotKind, SlotGroup> = { rrsp: 'investable', tfsa: 'investable', nonReg: 'investable', pension: 'pension', home: 'home' }

export interface SheetSlot {
  kind: SlotKind
  owner: PersonId | 'household'
  /** What it holds, today's dollars (a pension: null, it has no balance). */
  amount: number | null
  /** The figure behind it on the profile (lib/facts.ts), so the sheet can lead to the field that changes it; a pension has none. */
  fact: string | null
  /** A pension's own label (« RREGOP »). */
  label: string | null
  /** The age a pension starts (null for anything else). */
  startAge: number | null
  /** Read off a document (true), typed or estimated (false), or not a figure at all (null: a plan pension is described, not confirmed here). */
  confirmed: boolean | null
}

/** Contribution room still unused: not a holding, so it sits beside them. */
export interface SheetRoom {
  owner: PersonId
  kind: 'rrsp' | 'tfsa'
  amount: number
}

/** An unconfirmed figure and how many years the answer moves if it were off by the nudge (lib/useFactImpact.ts). */
export interface SheetMover {
  fact: Fact
  years: number
}

/** `pending`: the ranking is being worked out · `ready` · `none`: nothing to rank (nothing left to confirm, or a household with no age to find). */
export type SharpenStatus = 'pending' | 'ready' | 'none'

export interface SheetModel {
  people: SheetPerson[]
  couple: boolean
  /** The years between the earliest age that works and the later of the planned ages. */
  margin: number | null
  stats: SheetStat[]
  slots: SheetSlot[]
  /** The sum of the three kinds of account, today's dollars (what the shares of the cards are shares of). */
  investable: number
  rooms: SheetRoom[]
  /** True when money sits in the RRSP, the TFSA and outside a registered account. */
  diversified: boolean
  /** Whether the mortgage is paid off before the last person stops working: null when there is no home. */
  mortgageFree: boolean | null
  sharpen: { status: SharpenStatus; remaining: number; movers: SheetMover[] }
  accuracy: { confirmed: number; total: number }
  /** How many of the three scenarios (Prudent, Neutre, Audacieux) the plan as stated holds under, and which. */
  scenarios: Record<PresetKey, boolean>
  gaps: ProfileGap[]
}

/** The scales of the bars: what a full bar stands for. Stated on screen beside each bar. */
export const SCALE = { runway: 10, cover: 1, saving: 0.25, keep: 1, resilience: PRESET_KEYS.length } as const
/** How many figures the sheet names as worth confirming first. */
export const MOVERS_SHOWN = 4

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n))

/** The figures not yet read off a document: the list the ranking is run on (the results page ranks the same ones). */
export function unconfirmedFacts(profile: Profile): Fact[] {
  return factsOf(profile).filter((f) => !f.confirmed)
}

/**
 * The sheet of a profile. `earliest`: the verdict's earliest age (undefined while it is being worked out, null when no age works). `swings`: how far the
 * answer moves per unconfirmed figure, by fact id (undefined while it is being worked out).
 */
export function sheetModel(profile: Profile, assumptions: Assumptions, earliest: number | null | undefined, swings?: Record<string, { years: number }>): SheetModel {
  const h = profile.household
  const year = assumptions.today.year
  const gaps = profileGaps(profile)
  const couple = h.persons.length === 2
  const confirmedIds = new Set(profile.confirmed)
  const isConfirmed = (owner: PersonId | 'household', kind: FactKind): boolean => confirmedIds.has(factId(owner, kind))
  const accuracy = accuracyOf(profile)

  const people: SheetPerson[] = h.persons.map((p) => {
    const age = year - p.birth.year
    return { id: p.id, name: p.name, age, retirementAge: p.retirementAge, retired: p.retirementAge <= age }
  })
  const plannedMax = Math.max(...h.persons.map((p) => p.retirementAge))
  const everyoneRetired = people.every((x) => x.retired)

  // The plan as stated, once: its year-by-year rows (the cover and what is kept are read from one year of it), and whether it holds under each scenario.
  const empty = gaps.length > 0
  const rows = empty ? [] : project(h, assumptions)
  const lastStop = Math.max(...h.persons.map((p) => p.birth.year + p.retirementAge))
  const steady = Math.max(lastStop + 1, lastPensionStart(h) + 1)
  const row = rows.find((r) => r.year === steady) ?? rows.filter((r) => r.year > lastStop)[0] ?? rows[rows.length - 1]
  const scenarios = Object.fromEntries(PRESET_KEYS.map((k) => [k, empty ? false : planGlance(h, withPreset(assumptions, k)).ok])) as Record<PresetKey, boolean>
  const heldBy = PRESET_KEYS.filter((k) => scenarios[k]).length

  // RUNWAY — the verdict's earliest age against the later planned age.
  const margin = earliest === undefined || earliest === null || everyoneRetired ? null : plannedMax - earliest
  const runway: SheetStat = {
    id: 'runway',
    status: empty || everyoneRetired ? 'none' : earliest === undefined ? 'pending' : earliest === null ? 'none' : 'ready',
    value: earliest ?? null,
    unit: 'age',
    fill: margin === null ? (earliest === null && !empty && !everyoneRetired ? 0 : null) : clamp01(margin / SCALE.runway),
    scale: SCALE.runway,
    detail: { planned: plannedMax, margin },
  }

  // COVER — the share of the year's spending the pensions pay by themselves, after tax, in the first full year every pension is in pay.
  const coverShare = row && row.household.spending > 0 ? Math.max(0, pensionsAfterTax(row)) / row.household.spending : null
  const cover: SheetStat = {
    id: 'cover',
    status: coverShare === null ? 'none' : 'ready',
    value: coverShare,
    unit: 'share',
    fill: coverShare === null ? null : clamp01(coverShare / SCALE.cover),
    scale: SCALE.cover,
    detail: { year: row?.year, spending: row?.household.spending },
  }

  // SAVING — what the people who still work put aside a year (their own contributions and an employer's), against their pay.
  const earners = h.persons.filter((p) => p.salaryToday > 0 && p.retirementAge > year - p.birth.year)
  const pay = earners.reduce((s, p) => s + p.salaryToday, 0)
  const put = earners.reduce((s, p) => s + p.accounts.rrsp.annualContribution + (p.accounts.rrsp.employerContribution ?? 0) + p.accounts.tfsa.annualContribution + p.accounts.nonReg.annualContribution, 0)
  const rate = pay > 0 ? put / pay : null
  const saving: SheetStat = { id: 'saving', status: rate === null ? 'none' : 'ready', value: rate, unit: 'share', fill: rate === null ? null : clamp01(rate / SCALE.saving), scale: SCALE.saving, detail: {} }

  // KEEP — what is left of the money received after the income tax and the OAS recovery, in that same year.
  const net = row ? Object.values(row.persons).reduce((s, p) => s + (p?.netIncome ?? 0), 0) : 0
  const taxRate = row && net > 0 ? row.household.tax / net : null
  const kept = taxRate === null ? null : clamp01(1 - taxRate)
  const keep: SheetStat = { id: 'keep', status: kept === null ? 'none' : 'ready', value: kept, unit: 'share', fill: kept, scale: SCALE.keep, detail: { year: row?.year } }

  // RESILIENCE — under how many of the three scenarios the plan as stated lasts to its horizon.
  const resilience: SheetStat = { id: 'resilience', status: empty ? 'none' : 'ready', value: empty ? null : heldBy, unit: 'count', fill: empty ? null : heldBy / SCALE.resilience, scale: SCALE.resilience, detail: {} }

  // WHAT IT HOLDS — each person's accounts and pensions, then the home.
  const slots: SheetSlot[] = []
  for (const p of h.persons) {
    const balances: [SlotKind, number, FactKind][] = [
      ['rrsp', p.accounts.rrsp.balance, 'rrspBalance'],
      ['tfsa', p.accounts.tfsa.balance, 'tfsaBalance'],
      ['nonReg', p.accounts.nonReg.balance, 'nonRegBalance'],
    ]
    for (const [kind, amount, fact] of balances) if (amount > 0) slots.push({ kind, owner: p.id, amount, fact: factId(p.id, fact), label: null, startAge: null, confirmed: isConfirmed(p.id, fact) })
    for (const d of p.pensions) slots.push({ kind: 'pension', owner: p.id, amount: null, fact: null, label: d.label, startAge: d.startAge, confirmed: null })
  }
  if (h.home) slots.push({ kind: 'home', owner: 'household', amount: Math.max(0, h.home.value - h.home.mortgage.balance), fact: factId('household', 'homeValue'), label: null, startAge: null, confirmed: isConfirmed('household', 'homeValue') })

  const rooms: SheetRoom[] = []
  for (const p of h.persons) {
    if (p.accounts.tfsa.room > 0) rooms.push({ owner: p.id, kind: 'tfsa', amount: p.accounts.tfsa.room })
    if (p.accounts.rrsp.room > 0) rooms.push({ owner: p.id, kind: 'rrsp', amount: p.accounts.rrsp.room })
  }

  const mortgageEnd = h.home && h.home.mortgage.balance > 0 ? (() => {
    const months = payoffMonths(h.home.mortgage, year)
    return months === null ? null : payoffYear(year, months)
  })() : year
  const kinds = new Set(slots.filter((s) => SLOT_GROUP[s.kind] === 'investable').map((s) => s.kind))

  // WHAT WOULD SHARPEN THE ANSWER — the unconfirmed figures, the ones that move the answer most first.
  const unconfirmed = unconfirmedFacts(profile)
  const status: SharpenStatus = empty || everyoneRetired || unconfirmed.length === 0 ? 'none' : swings === undefined ? 'pending' : 'ready'
  const movers: SheetMover[] =
    status === 'ready' && swings !== undefined
      ? unconfirmed
          .map((fact) => ({ fact, years: swings[fact.id]?.years ?? 0 }))
          .filter((m) => m.years > 0)
          .sort((a, b) => b.years - a.years)
          .slice(0, MOVERS_SHOWN)
      : []

  return {
    people,
    couple,
    margin,
    stats: [runway, cover, saving, keep, resilience],
    slots,
    investable: slots.filter((s) => SLOT_GROUP[s.kind] === 'investable').reduce((sum, s) => sum + (s.amount ?? 0), 0),
    rooms,
    diversified: kinds.size === 3,
    mortgageFree: h.home ? mortgageEnd !== null && mortgageEnd <= lastStop : null,
    sharpen: { status, remaining: unconfirmed.length, movers },
    accuracy: { confirmed: accuracy.confirmed, total: accuracy.total },
    scenarios,
    gaps,
  }
}
