import { PRESET_KEYS, withPreset, type PresetKey } from '../engine/assumptionPresets.ts'
import { payoffMonths, payoffYear } from '../engine/home.ts'
import { planGlance } from '../engine/ledger.ts'
import { project } from '../engine/projection.ts'
import type { Assumptions, PersonId } from '../engine/types.ts'
import { accuracyOf, factId, type FactKind } from './facts.ts'
import { profileGaps, type ProfileGap } from './profileGaps.ts'
import type { Profile } from './schema.ts'
import { lastPensionStart, pensionsAfterTax } from './stopWorking.ts'

// THE CHARACTER SHEET'S MODEL — one household, said as a few stats, what it holds, what is left to do and what is already done. A PURE function
// of the profile and the earliest age (the one number that comes from a search run off the page's thread): the two skins of the sheet (serious
// and « Aventure ») draw THE SAME model, so a figure can never differ between them. Nothing here is invented: every stat is an engine output
// (a projection of the plan as stated, or the verdict's own earliest age), and each says what it is read from. The bars are a picture of a
// figure on a scale that is stated (`scale`), never a judgement: a short bar is « room to grow ».

export type HeroClass = 'retired' | 'pensioned' | 'saver'
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

export interface SheetHero {
  id: PersonId
  name: string
  age: number
  retirementAge: number
  heroClass: HeroClass
}

export type SlotKind = 'rrsp' | 'tfsa' | 'nonReg' | 'pension' | 'home'

export interface SheetSlot {
  kind: SlotKind
  owner: PersonId | 'household'
  /** What it holds, today's dollars (a pension: null, it has no balance). */
  amount: number | null
  /** A pension's own label (« RREGOP »). */
  label: string | null
  /** Read off a document (true), typed or estimated (false), or not a figure at all (null: a plan pension is described, not confirmed here). */
  confirmed: boolean | null
}

export type QuestId = 'complete' | 'confirm' | 'room' | 'plan'
export interface SheetQuest {
  id: QuestId
  /** `complete`: the gaps; `confirm`: how many figures are not yet read off a document; `room`: whose room, which account and how much. */
  gaps?: readonly ProfileGap[]
  remaining?: number
  room?: { owner: PersonId; kind: 'rrsp' | 'tfsa'; amount: number }
}

export type AchievementId = 'holds' | 'confirmed' | 'debtFree' | 'diversified' | 'margin'
export interface SheetAchievement {
  id: AchievementId
  earned: boolean
}

export interface SheetModel {
  heroes: SheetHero[]
  couple: boolean
  /** The years between the earliest age that works and the later of the planned ages; the level is that margin kept between 0 and `LEVEL_MAX`. */
  margin: number | null
  level: number | null
  stats: SheetStat[]
  slots: SheetSlot[]
  quests: SheetQuest[]
  achievements: SheetAchievement[]
  accuracy: { confirmed: number; total: number }
  /** How many of the three scenarios (Prudent, Neutre, Audacieux) the plan as stated holds under, and which. */
  scenarios: Record<PresetKey, boolean>
  gaps: ProfileGap[]
}

export const LEVEL_MAX = 10
/** The scales of the bars: what a full bar stands for. Stated on screen beside each bar. */
export const SCALE = { runway: LEVEL_MAX, cover: 1, saving: 0.25, keep: 1, resilience: PRESET_KEYS.length } as const

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n))

/** The sheet of a profile. `earliest`: the verdict's earliest age (undefined while it is being worked out, null when no age works). */
export function sheetModel(profile: Profile, assumptions: Assumptions, earliest: number | null | undefined): SheetModel {
  const h = profile.household
  const year = assumptions.today.year
  const gaps = profileGaps(profile)
  const couple = h.persons.length === 2
  const confirmedIds = new Set(profile.confirmed)
  const isConfirmed = (owner: PersonId | 'household', kind: FactKind): boolean => confirmedIds.has(factId(owner, kind))
  const accuracy = accuracyOf(profile)

  const heroes: SheetHero[] = h.persons.map((p) => {
    const age = year - p.birth.year
    const retired = p.retirementAge <= age
    return { id: p.id, name: p.name, age, retirementAge: p.retirementAge, heroClass: retired ? 'retired' : p.pensions.length > 0 ? 'pensioned' : 'saver' }
  })
  const plannedMax = Math.max(...h.persons.map((p) => p.retirementAge))
  const everyoneRetired = heroes.every((x) => x.heroClass === 'retired')

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

  // EQUIPMENT — what each person holds, and the home.
  const slots: SheetSlot[] = []
  for (const p of h.persons) {
    const balances: [SlotKind, number, FactKind][] = [
      ['rrsp', p.accounts.rrsp.balance, 'rrspBalance'],
      ['tfsa', p.accounts.tfsa.balance, 'tfsaBalance'],
      ['nonReg', p.accounts.nonReg.balance, 'nonRegBalance'],
    ]
    for (const [kind, amount, fact] of balances) if (amount > 0) slots.push({ kind, owner: p.id, amount, label: null, confirmed: isConfirmed(p.id, fact) })
    for (const d of p.pensions) slots.push({ kind: 'pension', owner: p.id, amount: null, label: d.label, confirmed: null })
  }
  if (h.home) slots.push({ kind: 'home', owner: 'household', amount: Math.max(0, h.home.value - h.home.mortgage.balance), label: null, confirmed: isConfirmed('household', 'homeValue') })

  // QUESTS — what is left to do on the profile itself.
  const quests: SheetQuest[] = []
  if (gaps.length > 0) quests.push({ id: 'complete', gaps })
  const remaining = accuracy.total - accuracy.confirmed
  if (remaining > 0) quests.push({ id: 'confirm', remaining })
  for (const p of h.persons) {
    if (p.accounts.tfsa.room > 0) quests.push({ id: 'room', room: { owner: p.id, kind: 'tfsa', amount: p.accounts.tfsa.room } })
    if (p.accounts.rrsp.room > 0) quests.push({ id: 'room', room: { owner: p.id, kind: 'rrsp', amount: p.accounts.rrsp.room } })
  }
  quests.push({ id: 'plan' })

  // ACHIEVEMENTS — what is already true.
  const mortgageEnd = h.home && h.home.mortgage.balance > 0 ? (() => {
    const months = payoffMonths(h.home.mortgage, year)
    return months === null ? null : payoffYear(year, months)
  })() : year
  const kinds = new Set(slots.filter((s) => s.kind === 'rrsp' || s.kind === 'tfsa' || s.kind === 'nonReg').map((s) => s.kind))
  const achievements: SheetAchievement[] = [
    { id: 'holds', earned: !empty && heldBy === PRESET_KEYS.length },
    { id: 'confirmed', earned: accuracy.total > 0 && accuracy.confirmed === accuracy.total },
    { id: 'debtFree', earned: h.home ? mortgageEnd !== null && mortgageEnd <= lastStop : false },
    { id: 'diversified', earned: kinds.size === 3 },
    { id: 'margin', earned: margin !== null && margin >= 2 },
  ]

  return {
    heroes,
    couple,
    margin,
    level: margin === null ? null : Math.max(0, Math.min(LEVEL_MAX, margin)),
    stats: [runway, cover, saving, keep, resilience],
    slots,
    quests,
    achievements,
    accuracy: { confirmed: accuracy.confirmed, total: accuracy.total },
    scenarios,
    gaps,
  }
}
