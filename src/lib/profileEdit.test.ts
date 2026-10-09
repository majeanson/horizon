import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { presetOf } from '../engine/assumptionPresets.ts'
import { rrqPension } from '../engine/rrq.ts'
import { makeRrqRules } from '../engine/rrqRules.ts'
import { rregopPension } from '../engine/presets.ts'
import { ASSUMED_FIRST_JOB_AGE, earningsCeiling, fillFromSalary, historyYears } from './earnings.ts'
import {
  addChild, addPension, applyPreset, addSpouse, blankPension, hasSpouse, mapPerson, removeChild, removePension, removeSpouse,
  applyDeferredRule, isRregopRules, needsDeferredRule, restoreCustom, scenarioOf, setAssumptions, setEarning, setLivesAlone, setReturn, setSpending, updatePension,
} from './profileEdit.ts'
import { migrateProfile } from './migrations.ts'
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
    expect(p.household.children).toEqual([2012, 2015, 2019])
    expect(removeChild(p, 1).household.children).toEqual([2012, 2019])
    expect(removeChild(p, 9)).toBe(p)
    for (let i = 0; i < 20; i++) p = addChild(p, 2020)
    expect(p.household.children).toHaveLength(12)
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
    expect(setReturn(p, 'rrsp', 0.06).assumptions.returns).toEqual({ nonReg: 0.04, rrsp: 0.06, tfsa: 0.045 })
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

  it('fills only the years not typed, deflating today\'s pay, uncapped, from the assumed first-job age', () => {
    const blank = { ...person(), earningsHistory: { 2020: 55_000 } }
    const filled = fillFromSalary(blank, TODAY, 0.03)
    expect(filled[2020]).toBe(55_000) // a typed year is never overwritten
    expect(filled[1999]).toBeUndefined() // before the assumed first job (age 22 → 2000)
    expect(1978 + ASSUMED_FIRST_JOB_AGE).toBe(2000)
    expect(filled[2025]).toBe(Math.round(85_000 / 1.03)) // last year's pay, as it was — nothing cut off
    for (const [year, pay] of Object.entries(filled)) expect(pay, year).toBeLessThanOrEqual(Math.max(55_000, Math.round(85_000 / 1.03 ** (2026 - Number(year)))))
  })

  it('a high salary is estimated as it was (about 116 000 $ last year for 120 000 $ today); the QPP counts each year only up to its ceiling — the additional one from 2024', () => {
    const high = { ...person(), salaryToday: 120_000, earningsHistory: {} }
    const filled = fillFromSalary(high, TODAY, 0.03)
    expect(filled[2025]).toBe(Math.round(120_000 / 1.03))
    expect(filled[2025]).toBeGreaterThan(110_000)
    const ceiling = earningsCeiling(rules)
    expect(rules.yampe(2025)).toBeGreaterThan(rules.mga(2025))
    expect(ceiling(2025)).toBe(rules.yampe(2025)) // 81 200 $ counts for 2025, not 71 300 $
    expect(ceiling(2023)).toBe(rules.mga(2023)) // before 2024 there is no additional ceiling
    // and the engine really does read only that much: a pay far above the ceiling gives the same pension as a pay AT it
    const capped = Object.fromEntries(Object.entries(filled).map(([y, pay]) => [y, Math.min(pay, ceiling(Number(y)))]))
    const pension = (earnings: Record<number, number>) => rrqPension({ birth: high.birth, startAge: 65, earnings }, rules).monthly
    expect(pension(filled)).toBeCloseTo(pension(capped), 6)
  })

  it('does nothing without a salary', () => {
    const none = { ...person(), salaryToday: 0, earningsHistory: {} }
    expect(fillFromSalary(none, TODAY, 0.03)).toEqual({})
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
    // The rules decide, not the label: a renamed RREGOP plan keeps the offer; a hand-entered plan named « RREGOP » never gets it.
    expect(needsDeferredRule(40, { ...saved, label: 'Mon régime' })).toBe(true)
    expect(needsDeferredRule(40, { ...blankPension(), label: 'RREGOP' })).toBe(false)
    expect(needsDeferredRule(40, { ...saved, accrualRate: 0.015 })).toBe(false)
    expect(isRregopRules(rregopPension({ serviceYearsToDate: 3, startAge: 62 }))).toBe(true)
    expect(needsDeferredRule(40, { ...saved, inPay: { annual: 12_000 } })).toBe(false)
  })

  it('adds the plan\'s cited rule and nothing else; every other case returns the SAME object', () => {
    const next = applyDeferredRule(saved)
    expect(next.deferred).toEqual(rregopPension({ serviceYearsToDate: 10, startAge: 60 }).deferred)
    expect({ ...next, deferred: undefined }).toEqual({ ...saved, deferred: undefined })
    expect(applyDeferredRule(next)).toBe(next)
    const mine = { ...blankPension(), label: 'RREGOP' }
    expect(applyDeferredRule(mine)).toBe(mine)
    const renamed = { ...saved, label: 'Mon régime' }
    expect(applyDeferredRule(renamed).deferred).toEqual(rregopPension({ serviceYearsToDate: 10, startAge: 60 }).deferred)
    const paying = { ...saved, inPay: { annual: 12_000 } }
    expect(applyDeferredRule(paying)).toBe(paying)
  })
})

describe('« Personnalisé » is kept while a ready-made scenario is on', () => {
  const mine = () => setReturn(setAssumptions(applyPreset(golden(), 'neutral'), { inflation: 0.031 }), 'rrsp', 0.07) // hand-typed: matches no preset

  it('a hand-typed scenario is kept aside when a ready-made one replaces it, and nothing is kept when a preset replaces a preset', () => {
    const p = mine()
    expect(presetOf(p.assumptions)).toBeNull()
    const prudent = applyPreset(p, 'prudent')
    expect(presetOf(prudent.assumptions)).toBe('prudent')
    expect(prudent.customScenario).toEqual(scenarioOf(p.assumptions))
    valid(prudent)
    // preset → preset keeps what was kept (and keeps nothing new)
    expect(applyPreset(prudent, 'bold').customScenario).toEqual(prudent.customScenario)
    expect(applyPreset(applyPreset(golden(), 'prudent'), 'bold').customScenario).toBeNull()
  })

  it('restoreCustom takes the kept figures back, copies them, keeps the rest of the assumptions, and is a no-op when none is kept or they are in use', () => {
    const p = mine()
    const away = applyPreset(p, 'bold')
    const back = restoreCustom(away)
    expect(scenarioOf(back.assumptions)).toEqual(scenarioOf(p.assumptions))
    expect(back.assumptions.withdrawalOrder).toEqual(p.assumptions.withdrawalOrder)
    expect(back.assumptions.returns).not.toBe(back.customScenario!.returns) // a copy: editing one never edits the other
    valid(back)
    expect(restoreCustom(back)).toBe(back) // already in use
    expect(restoreCustom(golden())).toEqual(golden()) // none kept
    // the round trip survives going away again: still kept, and a preset in between changes nothing about it
    expect(applyPreset(back, 'prudent').customScenario).toEqual(scenarioOf(p.assumptions))
  })

  it('what is kept is saved with the profile: it survives a validate round trip, and a bad figure is refused', () => {
    const away = applyPreset(mine(), 'prudent')
    const read = validateProfile(JSON.parse(JSON.stringify(away)))
    expect(read.ok && read.profile.customScenario).toEqual(away.customScenario)
    const bad = JSON.parse(JSON.stringify(away))
    bad.customScenario.inflation = 9
    const refused = validateProfile(bad)
    expect(!refused.ok && refused.problems.map((x) => x.path)).toContain('customScenario.inflation')
  })

  it('a version-6 file opens with nothing kept', () => {
    const old = JSON.parse(readFileSync(join(dir, 'fixtures', 'profile.v6.json'), 'utf8'))
    const read = migrateProfile(old)
    expect(read.ok && read.profile.customScenario).toBeNull()
  })
})
