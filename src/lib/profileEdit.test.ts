import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { presetOf } from '../engine/assumptionPresets.ts'
import { makeRrqRules } from '../engine/rrqRules.ts'
import { rregopPension } from '../engine/presets.ts'
import { ASSUMED_FIRST_JOB_AGE, fillFromSalary, historyYears, rrqEstimate } from './earnings.ts'
import {
  addChild, addPension, applyPreset, addSpouse, blankPension, hasSpouse, mapPerson, moveInOrder, removeChild, removePension, removeSpouse,
  applyDeferredRule, needsDeferredRule, setAssumptions, setEarning, setLivesAlone, setReturn, setSpending, updatePension,
} from './profileEdit.ts'
import { profileGaps } from './profileGaps.ts'
import { defaultProfile, SCHEMA_VERSION, validateProfile, type Profile } from './schema.ts'

const dir = dirname(fileURLToPath(import.meta.url))
const golden = (): Profile => JSON.parse(readFileSync(join(dir, 'fixtures', `profile.v${SCHEMA_VERSION}.json`), 'utf8'))
const TODAY = { year: 2026 }
const valid = (p: Profile) => expect(validateProfile(p).ok, JSON.stringify(validateProfile(p))).toBe(true)

describe('profile edits are pure, and never produce a profile the validator would refuse', () => {
  it('adding and removing a spouse', () => {
    const solo = defaultProfile(TODAY)
    expect(hasSpouse(solo)).toBe(false)
    const couple = addSpouse(solo, TODAY)
    expect(hasSpouse(couple)).toBe(true)
    expect(couple.household.persons.map((x) => x.id)).toEqual(['self', 'spouse'])
    valid(couple)
    expect(addSpouse(couple, TODAY)).toBe(couple)
    expect(removeSpouse(couple).household.persons.map((x) => x.id)).toEqual(['self'])
    expect(removeSpouse(solo)).toBe(solo)
    expect(solo.household.persons).toHaveLength(1) // the original is untouched
  })

  it('« lives alone »: a couple never does, a person who loses their spouse does again, and the person can untick it', () => {
    const solo = defaultProfile(TODAY)
    expect(solo.household.livesAlone).toBe(true)
    const couple = addSpouse(solo, TODAY)
    expect(couple.household.livesAlone).toBe(false)
    const alone = removeSpouse(couple)
    expect(alone.household.livesAlone).toBe(true)
    const shares = setLivesAlone(alone, false)
    expect(shares.household.livesAlone).toBe(false)
    valid(shares)
    expect(setLivesAlone(shares, false)).toBe(shares) // same object when nothing changes
    // Removing a spouse resets it: ticking it off for a couple would otherwise silently carry over.
    expect(removeSpouse(addSpouse(shares, TODAY)).household.livesAlone).toBe(true)
  })

  it('children: kept sorted, capped at 12, removable by position', () => {
    let p = defaultProfile(TODAY)
    p = addChild(addChild(addChild(p, 2015), 2012), 2019)
    expect(p.children).toEqual([2012, 2015, 2019])
    expect(removeChild(p, 1).children).toEqual([2012, 2019])
    expect(removeChild(p, 9)).toBe(p)
    for (let i = 0; i < 20; i++) p = addChild(p, 2020)
    expect(p.children).toHaveLength(12)
    valid(p)
  })

  it('a person is changed through mapPerson, and an identity change returns the same profile', () => {
    const p = golden()
    expect(mapPerson(p, 'self', (x) => x)).toBe(p)
    const q = mapPerson(p, 'spouse', (x) => ({ ...x, salaryToday: 70_000 }))
    expect(q.household.persons[1].salaryToday).toBe(70_000)
    expect(q.household.persons[0]).toBe(p.household.persons[0])
    expect(p.household.persons[1].salaryToday).toBe(65_000)
  })

  it('spending, assumptions and a single return', () => {
    const p = golden()
    expect(setSpending(p, { retiredToday: 90_000 }).household.spending).toEqual({ workingToday: 88_000, retiredToday: 90_000 })
    expect(setAssumptions(p, { horizonAge: 100 }).assumptions.horizonAge).toBe(100)
    expect(setReturn(p, 'rrsp', 0.06).assumptions.returns).toEqual({ nonReg: 0.045, rrsp: 0.06, tfsa: 0.05 })
  })

  it('the withdrawal order moves one step, and stays a permutation at the ends', () => {
    expect(moveInOrder(['nonReg', 'rrsp', 'tfsa'], 1, -1)).toEqual(['rrsp', 'nonReg', 'tfsa'])
    expect(moveInOrder(['nonReg', 'rrsp', 'tfsa'], 2, 1)).toEqual(['nonReg', 'rrsp', 'tfsa'])
    expect(moveInOrder(['nonReg', 'rrsp', 'tfsa'], 0, -1)).toEqual(['nonReg', 'rrsp', 'tfsa'])
  })

  it('one year of earnings is set, cleared, and unchanged when nothing changes', () => {
    const person = golden().household.persons[0]
    expect(setEarning(person, 2000, 25_000).earningsHistory[2000]).toBe(25_000)
    expect(2001 in setEarning(person, 2001, null).earningsHistory).toBe(false)
    expect(setEarning(person, 2000, person.earningsHistory[2000])).toBe(person)
    expect(setEarning(person, 1990, null)).toBe(person)
  })

  it('employer pensions: add (capped at 8), edit, remove', () => {
    let person = golden().household.persons[1]
    person = addPension(person, rregopPension({ serviceYearsToDate: 5, startAge: 60 }))
    expect(person.pensions).toHaveLength(1)
    person = updatePension(person, 0, (x) => ({ ...x, serviceYearsToDate: 6 }))
    expect(person.pensions[0].serviceYearsToDate).toBe(6)
    expect(updatePension(person, 0, (x) => x)).toBe(person)
    expect(updatePension(person, 4, (x) => ({ ...x, startAge: 1 }))).toBe(person)
    expect(removePension(person, 0).pensions).toHaveLength(0)
    for (let i = 0; i < 12; i++) person = addPension(person, blankPension())
    expect(person.pensions).toHaveLength(8)
    valid({ ...golden(), household: { ...golden().household, persons: [golden().household.persons[0], person] } })
  })

  it('a hand-entered plan starts as a plain final-average plan, with nothing assumed beyond it', () => {
    const p = blankPension()
    expect(p.coordination).toBeNull()
    expect(p.bridge).toBeNull()
    expect(p.unreduced.factor).toBeNull()
  })
})

describe('profileGaps — what a result cannot be trusted without', () => {
  it('an empty profile lacks income and spending', () => {
    expect(profileGaps(defaultProfile(TODAY))).toEqual(['income', 'spending'])
  })

  it('a salary, a pension, a typed year or any savings counts as income', () => {
    const base = setSpending(defaultProfile(TODAY), { retiredToday: 50_000 })
    expect(profileGaps(base)).toEqual(['income'])
    expect(profileGaps(mapPerson(base, 'self', (x) => ({ ...x, salaryToday: 1 })))).toEqual([])
    expect(profileGaps(mapPerson(base, 'self', (x) => setEarning(x, 2000, 1)))).toEqual([])
    expect(profileGaps(mapPerson(base, 'self', (x) => ({ ...x, accounts: { ...x.accounts, tfsa: { ...x.accounts.tfsa, balance: 1 } } })))).toEqual([])
    expect(profileGaps(mapPerson(base, 'self', (x) => addPension(x, blankPension())))).toEqual([])
  })

  it('the golden household has none', () => {
    expect(profileGaps(golden())).toEqual([])
  })
})

describe('earnings helpers', () => {
  const rules = makeRrqRules({ inflation: 0.02, wageGrowth: 0.03 })
  const person = () => golden().household.persons[0] // born 1978, 85 000 $ today

  it('the years a history could hold run from 18 (or 1966) to last year', () => {
    expect(historyYears(person(), 2025)[0]).toBe(1996)
    expect(historyYears(person(), 2025).at(-1)).toBe(2025)
    expect(historyYears({ ...person(), birth: { year: 1940, month: 1 } }, 2025)[0]).toBe(1966)
  })

  it('fills only the years not typed, deflating today\'s pay, capped at the MGA, from the assumed first-job age', () => {
    const blank = { ...person(), earningsHistory: { 2020: 55_000 } }
    const filled = fillFromSalary(blank, TODAY, 0.03, rules.mga)
    expect(filled[2020]).toBe(55_000) // a typed year is never overwritten
    expect(filled[1999]).toBeUndefined() // before the assumed first job (age 22 → 2000)
    expect(1978 + ASSUMED_FIRST_JOB_AGE).toBe(2000)
    expect(filled[2025]).toBe(Math.round(Math.min(85_000 / 1.03, rules.mga(2025))))
    for (const [year, pay] of Object.entries(filled)) expect(pay, year).toBeLessThanOrEqual(Math.max(55_000, rules.mga(Number(year))))
  })

  it('does nothing without a salary', () => {
    const none = { ...person(), salaryToday: 0, earningsHistory: {} }
    expect(fillFromSalary(none, TODAY, 0.03, rules.mga)).toEqual({})
  })

  it('the RRQ estimate rises with the start age, as the relevé’s projected amount does', () => {
    const p = person()
    const at60 = rrqEstimate(p, TODAY, 60, rules)
    const at65 = rrqEstimate(p, TODAY, 65, rules)
    const at70 = rrqEstimate(p, TODAY, 70, rules)
    expect(at60).toBeGreaterThan(0)
    expect(at65).toBeGreaterThan(at60)
    expect(at70).toBeGreaterThan(at65)
    // The relevé's projected amount ignores the person's own retirement plan: it keeps earning until the pension starts.
    expect(rrqEstimate({ ...p, retirementAge: 55 }, TODAY, 65, rules)).toBe(at65)
    // …and a person with no current salary gets only what their typed history earned.
    expect(rrqEstimate({ ...p, salaryToday: 0 }, TODAY, 65, rules)).toBeLessThan(at65)
  })
})

describe('applying a ready-made scenario', () => {
  it('lays the preset over the assumptions, keeps spending and the rest, stays valid, and is a no-op the second time', () => {
    const p = golden()
    const bold = applyPreset(p, 'bold')
    expect(presetOf(bold.assumptions)).toBe('bold')
    expect(bold.household).toBe(p.household)
    expect(bold.assumptions.withdrawalOrder).toEqual(p.assumptions.withdrawalOrder)
    valid(bold)
    expect(applyPreset(bold, 'bold')).toBe(bold)
    expect(presetOf(setReturn(bold, 'rrsp', 0.07).assumptions)).toBeNull()
  })
})

describe('the deferred rule on a RREGOP pension saved without it', () => {
  const saved = (() => {
    const { deferred: _drop, ...old } = rregopPension({ serviceYearsToDate: 10, startAge: 60 })
    return old
  })()

  it('is offered only to a RREGOP pension, not in pay, without the rule, whose person leaves before the plan\'s earliest age', () => {
    expect(needsDeferredRule(40, saved)).toBe(true)
    expect(needsDeferredRule(55, saved)).toBe(false)
    expect(needsDeferredRule(40, rregopPension({ serviceYearsToDate: 10, startAge: 60 }))).toBe(false)
    expect(needsDeferredRule(40, { ...saved, label: 'Mon régime' })).toBe(false)
    expect(needsDeferredRule(40, { ...saved, inPay: { annual: 12_000 } })).toBe(false)
  })

  it('adds the plan\'s cited rule and nothing else; every other case returns the SAME object', () => {
    const next = applyDeferredRule(saved)
    expect(next.deferred).toEqual(rregopPension({ serviceYearsToDate: 10, startAge: 60 }).deferred)
    expect({ ...next, deferred: undefined }).toEqual({ ...saved, deferred: undefined })
    expect(applyDeferredRule(next)).toBe(next)
    const mine = { ...saved, label: 'Mon régime' }
    expect(applyDeferredRule(mine)).toBe(mine)
    const paying = { ...saved, inPay: { annual: 12_000 } }
    expect(applyDeferredRule(paying)).toBe(paying)
  })
})
