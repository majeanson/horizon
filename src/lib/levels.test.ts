import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ageBandOf, applyLevel, hasOpenFigures, isOpen, levelFigure, levelOf, LEVELS, needsLevel, retiredShare, say, spendingFigures } from './levels.ts'
import { setFact } from './profileEdit.ts'
import { defaultProfile } from './schema.ts'
import { SCHEMA_VERSION, type Profile } from './schema.ts'

// « I DO NOT KNOW MY NUMBERS »: what a level fills, what it never touches, and that the three levels are ordered.

const dir = dirname(fileURLToPath(import.meta.url))
const golden = (): Profile => JSON.parse(readFileSync(join(dir, 'fixtures', `profile.v${SCHEMA_VERSION}.json`), 'utf8'))
const TODAY = { year: 2026 }

/** A person of 52 who knows none of their figures. */
const blank = (): Profile => {
  const p = defaultProfile(TODAY)
  return { ...p, household: { ...p.household, persons: [{ ...p.household.persons[0], birth: { year: 1974, month: 3 }, salaryToday: 80_000 }] } }
}

describe('the age bands', () => {
  it('cut at 35, 45, 55 and 65 — the cuts of the agency\'s table', () => {
    expect([34, 35, 44, 45, 54, 55, 64, 65, 90].map(ageBandOf)).toEqual(['under35', '35to44', '35to44', '45to54', '45to54', '55to64', '55to64', '65plus', '65plus'])
  })
  it('say a figure as a person would', () => {
    expect([say(12_345), say(7_260), say(46_800), say(123_456)]).toEqual([12_000, 7_500, 47_000, 125_000])
  })
})

describe('the levels', () => {
  it('are ordered for every figure, at every age: modest under average under comfortable', () => {
    const p = blank()
    for (const birth of [1995, 1985, 1975, 1965, 1950]) {
      const q = { ...p, household: { ...p.household, home: { value: 0, mortgage: { balance: 0, rate: 0.05, monthlyPayment: 0 }, sale: null }, persons: [{ ...p.household.persons[0], birth: { year: birth, month: 1 } }] } }
      for (const kind of ['rrspBalance', 'tfsaBalance', 'nonRegBalance', 'spendingWorking', 'spendingRetired', 'homeValue'] as const) {
        const owner = kind === 'spendingWorking' || kind === 'spendingRetired' || kind === 'homeValue' ? 'household' : 'self'
        const [lo, mid, hi] = LEVELS.map((l) => levelFigure(q, kind, owner, l, TODAY.year)!)
        expect(lo, `${kind} ${birth}`).toBeLessThan(mid)
        expect(mid, `${kind} ${birth}`).toBeLessThan(hi)
      }
    }
  })

  it('give a 52-year-old\'s RRSP from the 55-to-64 median moved by the net-worth fifth (72 600 × 16 100 / 60 000, × 40 000 / 60 000, × 105 100 / 60 000)', () => {
    // 52 is in the 45-to-54 band: 72 600 × 0,2683 = 19 480 → 19 000 · × 0,6667 = 48 400 → 48 000 · × 1,7517 = 127 170 → 125 000
    const p = blank()
    expect(LEVELS.map((l) => levelFigure(p, 'rrspBalance', 'self', l, TODAY.year))).toEqual([19_000, 48_000, 125_000])
  })

  it('size the budget by the kind of household, and retirement by what the 65-and-over spend against the 55-to-64', () => {
    const p = blank()
    const alone = spendingFigures(p.household, 'average', TODAY.year)
    const couple = spendingFigures({ ...p.household, persons: [p.household.persons[0], { ...p.household.persons[0], id: 'spouse' }] }, 'average', TODAY.year)
    expect(alone.working).toBe(Math.round((44_074 * 71_570) / 76_146 / 100) * 100)
    expect(couple.working).toBeGreaterThan(alone.working)
    expect(alone.retired / alone.working).toBeCloseTo(52_446 / 76_902, 2)
    const kids = spendingFigures({ ...p.household, persons: [p.household.persons[0], { ...p.household.persons[0], id: 'spouse' }], children: [2020] }, 'average', TODAY.year)
    expect(kids.working).toBeGreaterThan(couple.working)
  })
})

describe('applying a level', () => {
  it('fills what is blank, marks nothing confirmed, and says each change', () => {
    const e = applyLevel(blank(), 'average', TODAY)
    const a = e.profile.household.persons[0].accounts
    expect(a.rrsp.balance).toBe(48_000)
    expect(a.rrsp.balance).toBeGreaterThan(0)
    expect(a.tfsa.balance).toBeGreaterThan(0)
    expect(a.nonReg.balance).toBeGreaterThan(0)
    expect(a.nonReg.acb).toBe(a.nonReg.balance)
    expect(e.profile.household.spending.workingToday).toBeGreaterThan(0)
    expect(e.profile.household.spending.retiredToday).toBeLessThan(e.profile.household.spending.workingToday)
    expect(e.profile.confirmed).toEqual([])
    expect(e.changes.map((c) => c.kind).sort()).toEqual(['nonRegBalance', 'rrspBalance', 'spendingRetired', 'spendingWorking', 'tfsaBalance'])
    expect(e.rooms).toBe(1) // the TFSA room follows the balance
  })

  it('never replaces a figure the person typed, nor one they confirmed', () => {
    const p = blank()
    const typed = { ...p, household: { ...p.household, persons: [{ ...p.household.persons[0], accounts: { ...p.household.persons[0].accounts, rrsp: { ...p.household.persons[0].accounts.rrsp, balance: 61_234 } } }] } }
    const e = applyLevel(typed, 'comfortable', TODAY)
    expect(e.profile.household.persons[0].accounts.rrsp.balance).toBe(61_234)
    expect(e.changes.some((c) => c.kind === 'rrspBalance')).toBe(false)
    const confirmed = setFact(blank(), 'self:tfsaBalance', true)
    expect(applyLevel(confirmed, 'comfortable', TODAY).profile.household.persons[0].accounts.tfsa.balance).toBe(0)
  })

  it('lets a person change their mind: another level replaces what the last one filled', () => {
    const once = applyLevel(blank(), 'modest', TODAY).profile
    const twice = applyLevel(once, 'comfortable', TODAY).profile
    expect(twice.household.persons[0].accounts.rrsp.balance).toBe(levelFigure(blank(), 'rrspBalance', 'self', 'comfortable', TODAY.year))
    expect(isOpen(twice, 'rrspBalance', 'self', TODAY.year)).toBe(true)
    expect(applyLevel(twice, 'comfortable', TODAY).changes).toEqual([])
  })

  it('returns the same profile when there is nothing to fill, and asks nothing of the committed household', () => {
    const g = golden()
    expect(hasOpenFigures(g, TODAY.year)).toBe(false)
    expect(applyLevel(g, 'average', TODAY).profile).toBe(g)
    expect(hasOpenFigures(blank(), TODAY.year)).toBe(true)
  })

  it('reads each person of a couple at their own age', () => {
    const p = blank()
    const old = { ...p.household.persons[0], id: 'spouse' as const, birth: { year: 1958, month: 1 } }
    const e = applyLevel({ ...p, household: { ...p.household, livesAlone: false, persons: [p.household.persons[0], old] } }, 'average', TODAY)
    const [young, older] = e.profile.household.persons
    expect(older.accounts.tfsa.balance).toBeGreaterThan(young.accounts.tfsa.balance)
  })
})

describe('which level the estimated figures stand at', () => {
  it('names the level that filled them, none before, none once a figure is typed over it', () => {
    const p = blank()
    expect(levelOf(p, TODAY.year)).toBeNull()
    for (const level of LEVELS) expect(levelOf(applyLevel(p, level, TODAY).profile, TODAY.year), level).toBe(level)
    const typed = applyLevel(p, 'average', TODAY).profile
    const mixed = { ...typed, household: { ...typed.household, persons: [{ ...typed.household.persons[0], accounts: { ...typed.household.persons[0].accounts, rrsp: { ...typed.household.persons[0].accounts.rrsp, balance: 61_234 } } }] } }
    expect(levelOf(mixed, TODAY.year)).toBe('average') // the typed one matches no level and is left out; the others still say « average »
  })
})

describe('when a level is worth offering', () => {
  it('for a blank profile and one standing on a level; never for one whose figures are entered, whatever zeros it holds', () => {
    const g = golden()
    expect(needsLevel(g, TODAY.year)).toBe(false)
    expect(needsLevel(blank(), TODAY.year)).toBe(true)
    // a household with a budget and a registered account has no non-registered one: a real zero, not a blank
    const entered = applyLevel(blank(), 'average', TODAY).profile
    const typedOver = { ...entered, household: { ...entered.household, persons: [{ ...entered.household.persons[0], accounts: { ...entered.household.persons[0].accounts, rrsp: { ...entered.household.persons[0].accounts.rrsp, balance: 61_234 }, tfsa: { ...entered.household.persons[0].accounts.tfsa, balance: 22_222 }, nonReg: { ...entered.household.persons[0].accounts.nonReg, balance: 0, acb: 0 } } }] } }
    expect(hasOpenFigures(typedOver, TODAY.year)).toBe(true) // the zero is open …
    expect(needsLevel(typedOver, TODAY.year)).toBe(true) // … and the budget still stands on the level
    const withBudget = { ...typedOver, household: { ...typedOver.household, spending: { workingToday: 52_000, retiredToday: 40_000 } } }
    expect(needsLevel(withBudget, TODAY.year)).toBe(false)
  })
})

describe('the retirement budget basis', () => {
  it('observed is the ratio Statistics Canada saw; cautious never goes under 80 % of the working budget', () => {
    expect(retiredShare('observed')).toBeCloseTo(52_446 / 76_902, 6)
    expect(retiredShare('cautious')).toBe(0.8)
  })

  it('changes the retirement budget and nothing else', () => {
    const h = blank().household
    for (const level of LEVELS) {
      const observed = spendingFigures(h, level, TODAY.year, 'observed')
      const cautious = spendingFigures(h, level, TODAY.year, 'cautious')
      expect(cautious.working, level).toBe(observed.working)
      expect(cautious.retired, level).toBeGreaterThan(observed.retired)
      expect(cautious.retired / cautious.working, level).toBeCloseTo(0.8, 2)
    }
  })

  it('a figure filled under one basis stays « estimated » under the other, and the other basis replaces it', () => {
    const observed = applyLevel(blank(), 'average', TODAY, 'observed').profile
    expect(isOpen(observed, 'spendingRetired', 'household', TODAY.year)).toBe(true)
    const cautious = applyLevel(observed, 'average', TODAY, 'cautious')
    expect(cautious.changes.map((c) => c.kind)).toEqual(['spendingRetired'])
    expect(cautious.profile.household.spending.retiredToday).toBe(spendingFigures(blank().household, 'average', TODAY.year, 'cautious').retired)
    expect(levelOf(cautious.profile, TODAY.year)).toBe('average')
  })
})
