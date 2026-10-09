import { plain } from '../engine/params/cited.ts'
import { TYPICAL_BY_AGE, TYPICAL_BY_WEALTH, TYPICAL_SPENDING_BY_AGE, TYPICAL_SPENDING_BY_HOUSEHOLD, TYPICAL_SPENDING_BY_INCOME, type AgeBand, type Holdings, type Wealth } from '../engine/params/typical.ts'
import type { Household, Person } from '../engine/types.ts'
import { estimateMissing, estimateTfsaRoom } from './estimates.ts'
import { factId, type FactKind, type FactOwner } from './facts.ts'
import type { Profile } from './schema.ts'

// « I DO NOT KNOW MY NUMBERS » — a LEVEL stands in for the figures a person cannot read: modest, average or comfortable. Statistics
// Canada says what households of each age hold (engine/params/typical.ts) and how the households of each net-worth fifth differ; the
// level is the fifth (the second, the middle, the fourth) and the figure is the age's figure moved by how that fifth compares with all
// households. That product is ARITHMETIC of this app's, not a statistic of the agency's — the screens say « estimated », and the figure
// stays unconfirmed until the person reads it off a document. An estimate only ever fills what is blank or what a level filled before:
// a figure the person typed is never replaced, and a confirmed one is never touched.

export type Level = 'modest' | 'average' | 'comfortable'
export const LEVELS: readonly Level[] = ['modest', 'average', 'comfortable']

/** The net-worth fifth each level stands for (the lowest and the highest fifth are left out: their figures are not a plan's centre). */
const FIFTH: Record<Level, Wealth> = { modest: 'second', average: 'middle', comfortable: 'fourth' }

/** The figures a level can supply, one per kind. */
export const LEVEL_KINDS: readonly FactKind[] = ['rrspBalance', 'tfsaBalance', 'nonRegBalance', 'homeValue', 'spendingWorking', 'spendingRetired']

export function ageBandOf(age: number): AgeBand {
  if (age < 35) return 'under35'
  if (age < 45) return '35to44'
  if (age < 55) return '45to54'
  if (age < 65) return '55to64'
  return '65plus'
}

/** Round to a figure a person would say: 500 under 10 000, 1 000 under 100 000, else 5 000. */
export function say(n: number): number {
  const step = n < 10_000 ? 500 : n < 100_000 ? 1_000 : 5_000
  return Math.max(0, Math.round(n / step) * step)
}

const sayBudget = (n: number) => Math.max(0, Math.round(n / 100) * 100)

type HoldingKey = keyof Holdings
const HOLDING_OF: Partial<Record<FactKind, HoldingKey>> = { rrspBalance: 'rrsp', tfsaBalance: 'tfsa', nonRegBalance: 'deposits', homeValue: 'home' }

function holdingFigure(birthYear: number, kind: HoldingKey, level: Level, todayYear: number): number {
  const age = todayYear - birthYear
  const byAge = plain(TYPICAL_BY_AGE)[ageBandOf(age)][kind]
  const fifths = plain(TYPICAL_BY_WEALTH)
  return say((byAge * fifths[FIFTH[level]][kind]) / fifths.all[kind])
}

/** The yearly current spending of a household like this one at this level: working years, then retirement. */
export function spendingFigures(h: Household, level: Level, todayYear: number): { working: number; retired: number } {
  const base = plain(TYPICAL_SPENDING_BY_HOUSEHOLD)
  const kids = (h.children ?? []).some((y) => todayYear - y < 18)
  const alone = h.persons.length === 1
  const typical = alone ? (kids ? base.loneParent : base.alone) : kids ? base.coupleWithChildren : base.couple
  const income = plain(TYPICAL_SPENDING_BY_INCOME)
  const working = sayBudget((typical * income[FIFTH[level]]) / income.all)
  const age = plain(TYPICAL_SPENDING_BY_AGE)
  // What the households of 65 and over spend against those of 55 to 64 (smaller households, a paid-off home): the same drop, applied to this one.
  return { working, retired: sayBudget((working * age.age65plus) / age.age55to64) }
}

/** What this level says a figure is, or null when it says nothing about it (a figure the household does not have). */
export function levelFigure(p: Profile, kind: FactKind, owner: FactOwner, level: Level, todayYear: number): number | null {
  if (kind === 'spendingWorking' || kind === 'spendingRetired') {
    if (owner !== 'household') return null
    const s = spendingFigures(p.household, level, todayYear)
    return kind === 'spendingWorking' ? s.working : s.retired
  }
  const key = HOLDING_OF[kind]
  if (key === undefined) return null
  if (kind === 'homeValue') {
    if (owner !== 'household' || !p.household.home) return null
    // The home is read at the older person's age: the one whose figures the household's typical owner resembles.
    const oldest = Math.min(...p.household.persons.map((x) => x.birth.year))
    return holdingFigure(oldest, key, level, todayYear)
  }
  const person = p.household.persons.find((x) => x.id === owner)
  return person ? holdingFigure(person.birth.year, key, level, todayYear) : null
}

/** The figure as the profile holds it now, or null when the household has no such figure. */
export function current(p: Profile, kind: FactKind, owner: FactOwner): number | null {
  const person = p.household.persons.find((x) => x.id === owner)
  switch (kind) {
    case 'rrspBalance': return person?.accounts.rrsp.balance ?? null
    case 'tfsaBalance': return person?.accounts.tfsa.balance ?? null
    case 'nonRegBalance': return person?.accounts.nonReg.balance ?? null
    case 'homeValue': return p.household.home?.value ?? null
    case 'spendingWorking': return p.household.spending.workingToday
    case 'spendingRetired': return p.household.spending.retiredToday
    default: return null
  }
}

/** Is this figure open to an estimate: not confirmed, and blank or still what a level put there (never something the person typed)? */
export function isOpen(p: Profile, kind: FactKind, owner: FactOwner, todayYear: number): boolean {
  if (p.confirmed.includes(factId(owner, kind))) return false
  const now = current(p, kind, owner)
  if (now === null) return false
  if (now === 0) return true
  return LEVELS.some((l) => levelFigure(p, kind, owner, l, todayYear) === now)
}

function put(p: Profile, kind: FactKind, owner: FactOwner, value: number): Profile {
  if (kind === 'spendingWorking') return { ...p, household: { ...p.household, spending: { ...p.household.spending, workingToday: value } } }
  if (kind === 'spendingRetired') return { ...p, household: { ...p.household, spending: { ...p.household.spending, retiredToday: value } } }
  if (kind === 'homeValue') return p.household.home ? { ...p, household: { ...p.household, home: { ...p.household.home, value } } } : p
  const persons = p.household.persons.map((x): Person => {
    if (x.id !== owner) return x
    const a = x.accounts
    if (kind === 'rrspBalance') return { ...x, accounts: { ...a, rrsp: { ...a.rrsp, balance: value } } }
    if (kind === 'tfsaBalance') return { ...x, accounts: { ...a, tfsa: { ...a.tfsa, balance: value } } }
    // The cost base follows the balance while the account has no history of its own: no gain is assumed.
    const acb = a.nonReg.acb === 0 || a.nonReg.acb === a.nonReg.balance ? value : a.nonReg.acb
    return { ...x, accounts: { ...a, nonReg: { ...a.nonReg, balance: value, acb } } }
  })
  return { ...p, household: { ...p.household, persons } }
}

interface LevelChange {
  kind: FactKind
  owner: FactOwner
  from: number
  to: number
}

interface Leveled {
  profile: Profile
  /** What the level set, figure by figure. */
  changes: LevelChange[]
  /** The room and earnings the estimate then filled from them (lib/estimates.ts). */
  years: number
  rooms: number
}

/**
 * The profile with `level` standing in for every figure that is open (blank, or a previous level's). The same profile comes back
 * when there is nothing to fill. The TFSA room and the earnings years follow, from the balances and the salary.
 */
export function applyLevel(p: Profile, level: Level, today: { year: number }): Leveled {
  const changes: LevelChange[] = []
  let out = p
  const owners: FactOwner[] = [...p.household.persons.map((x) => x.id), 'household']
  for (const owner of owners) {
    for (const kind of LEVEL_KINDS) {
      if (!isOpen(out, kind, owner, today.year)) continue
      const to = levelFigure(out, kind, owner, level, today.year)
      const from = current(out, kind, owner)
      if (to === null || from === null || to === from) continue
      out = put(out, kind, owner, to)
      changes.push({ kind, owner, from, to })
    }
  }
  const e = estimateMissing(out, today)
  return { profile: e.profile, changes, years: e.years, rooms: e.rooms }
}

/** The level every estimated figure of this profile matches, or null: nothing estimated yet, a typed figure in the way, or two levels mixed. */
export function levelOf(p: Profile, todayYear: number): Level | null {
  const owners: FactOwner[] = [...p.household.persons.map((x) => x.id), 'household']
  const seen = new Set<Level>()
  for (const owner of owners) {
    for (const kind of LEVEL_KINDS) {
      const now = current(p, kind, owner)
      if (now === null || now === 0 || p.confirmed.includes(factId(owner, kind))) continue
      const match = LEVELS.find((l) => levelFigure(p, kind, owner, l, todayYear) === now)
      if (match !== undefined) seen.add(match)
    }
  }
  return seen.size === 1 ? [...seen][0] : null
}

/**
 * ONE figure from a level — what the « Je ne sais pas » helper under a field does. Unlike applyLevel it touches nothing else, except that
 * a TFSA balance brings its blank room with it (the room is what is left of the limits since 18, less the balance).
 */
export function setFigure(p: Profile, kind: FactKind, owner: FactOwner, level: Level, today: { year: number }): Profile {
  if (p.confirmed.includes(factId(owner, kind))) return p
  const to = levelFigure(p, kind, owner, level, today.year)
  if (to === null || to === current(p, kind, owner)) return p
  const out = put(p, kind, owner, to)
  if (kind !== 'tfsaBalance') return out
  const person = out.household.persons.find((x) => x.id === owner)
  if (!person || person.accounts.tfsa.room !== 0) return out
  const room = estimateTfsaRoom(person.birth.year, to, today.year)
  return put2Room(out, owner, room)
}

function put2Room(p: Profile, owner: FactOwner, room: number): Profile {
  const persons = p.household.persons.map((x): Person => (x.id === owner ? { ...x, accounts: { ...x.accounts, tfsa: { ...x.accounts.tfsa, room } } } : x))
  return { ...p, household: { ...p.household, persons } }
}

/**
 * Is a level worth OFFERING: a figure is open AND the profile is mostly blank (someone with no balance at all, or no budget yet) or already stands on a
 * level? A typed 0 cannot be told from a blank — a household that has no non-registered account must not be asked, for ever, about the standard of
 * living of one that has — so a profile that has entered its figures never sees the picker or the range, whatever zeros it holds.
 */
export function needsLevel(p: Profile, todayYear: number): boolean {
  if (!hasOpenFigures(p, todayYear)) return false
  if (levelOf(p, todayYear) !== null) return true
  const noBudget = p.household.spending.workingToday === 0 || p.household.spending.retiredToday === 0
  const someoneBlank = p.household.persons.some((x) => x.accounts.rrsp.balance === 0 && x.accounts.tfsa.balance === 0 && x.accounts.nonReg.balance === 0)
  return noBudget || someoneBlank
}

/** Does this profile have a figure a level could fill? (The range on the results page, and the chips, only show when it does.) */
export function hasOpenFigures(p: Profile, todayYear: number): boolean {
  const owners: FactOwner[] = [...p.household.persons.map((x) => x.id), 'household']
  return owners.some((owner) => LEVEL_KINDS.some((kind) => isOpen(p, kind, owner, todayYear) && levelFigure(p, kind, owner, 'average', todayYear) !== null))
}
