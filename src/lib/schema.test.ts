import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readProfileJson } from './migrations.ts'
import { SCHEMA_VERSION, blankPerson, defaultProfile, validateProfile, type Profile } from './schema.ts'
import { clearProfile, exportProfileJson, flushProfile, getProfile, getStorageIssue, reloadProfile, replaceProfile, updateProfile } from './store.ts'

const dir = dirname(fileURLToPath(import.meta.url))
const fixture = (): Profile => JSON.parse(readFileSync(join(dir, 'fixtures', 'profile.v1.json'), 'utf8'))
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

describe('validateProfile — the gate every outside file passes through', () => {
  it('accepts the default profile and the golden example', () => {
    expect(validateProfile(defaultProfile({ year: 2026 })).ok).toBe(true)
    expect(validateProfile(fixture()).ok).toBe(true)
  })

  it('round-trips: what is exported is what is imported, field for field', () => {
    const p = fixture()
    const back = readProfileJson(exportProfileJson(p))
    expect(back.ok && back.profile).toEqual(p)
  })

  it('ignores keys it does not know (a newer minor field never breaks an older reader)', () => {
    expect(validateProfile({ ...fixture(), somethingNew: 1 }).ok).toBe(true)
  })

  const BAD: [string, (p: Profile) => unknown, string, string][] = [
    ['a file that is not a profile', () => ({ hello: 'world' }), 'app', 'missing'],
    ['someone else\'s app', (p) => ({ ...p, app: 'other' }), 'app', 'enum'],
    ['a birth month of 13', (p) => set(p, (x) => (x.household.persons[0].birth.month = 13)), 'household.persons[0].birth.month', 'range'],
    ['a fractional retirement age', (p) => set(p, (x) => (x.household.persons[0].retirementAge = 61.5)), 'household.persons[0].retirementAge', 'range'],
    ['an RRQ start age of 59', (p) => set(p, (x) => (x.household.persons[1].rrq.startAge = 59)), 'household.persons[1].rrq.startAge', 'range'],
    ['an OAS start age of 64', (p) => set(p, (x) => (x.household.persons[0].oas.startAge = 64)), 'household.persons[0].oas.startAge', 'range'],
    ['a negative balance', (p) => set(p, (x) => (x.household.persons[0].accounts.rrsp.balance = -1)), 'household.persons[0].accounts.rrsp.balance', 'range'],
    ['a text balance', (p) => set(p, (x) => ((x.household.persons[0].accounts.tfsa as unknown as Record<string, unknown>).balance = '48 000')), 'household.persons[0].accounts.tfsa.balance', 'type'],
    ['NaN where a number goes', (p) => ({ ...clone(p), household: { ...p.household, spending: { workingToday: null, retiredToday: 1 } } }), 'household.spending.workingToday', 'missing'],
    ['a withdrawal order with a repeat', (p) => set(p, (x) => (x.assumptions.withdrawalOrder = ['rrsp', 'rrsp', 'tfsa'])), 'assumptions.withdrawalOrder', 'count'],
    ['a withdrawal order with a stranger', (p) => set(p, (x) => ((x.assumptions.withdrawalOrder as string[])[0] = 'crypto')), 'assumptions.withdrawalOrder[0]', 'enum'],
    ['three people', (p) => set(p, (x) => x.household.persons.push(blankPerson('spouse', { year: 2026 }))), 'household.persons', 'count'],
    ['an earnings year before the RRQ existed', (p) => set(p, (x) => ((x.household.persons[0].earningsHistory as Record<number, number>)[1950] = 100)), 'household.persons[0].earningsHistory.1950', 'count'],
    ['a pension accruing 50 % a year', (p) => set(p, (x) => x.household.persons[0].pensions[0] && (x.household.persons[0].pensions[0].accrualRate = 0.5)), 'household.persons[0].pensions[0].accrualRate', 'range'],
    ['a horizon of 40', (p) => set(p, (x) => (x.assumptions.horizonAge = 40)), 'assumptions.horizonAge', 'range'],
  ]

  it.each(BAD)('rejects %s, and says which field', (_label, mutate, path, problem) => {
    const result = validateProfile(mutate(fixture()))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems).toContainEqual({ path, problem })
  })

  it('reports EVERY problem at once, so a person can fix a file in one pass', () => {
    const p = fixture()
    p.household.persons[0].birth.month = 13
    p.household.persons[1].retirementAge = 12
    p.assumptions.horizonAge = 40
    const result = validateProfile(p)
    expect(result.ok ? 0 : result.problems.length).toBeGreaterThanOrEqual(3)
  })

  it('refuses text that is not JSON, and a file from a NEWER version of the app', () => {
    expect(readProfileJson('{ not json')).toMatchObject({ ok: false, reason: 'json' })
    expect(readProfileJson(JSON.stringify({ ...fixture(), version: SCHEMA_VERSION + 1 }))).toMatchObject({ ok: false, reason: 'newer' })
  })
})

function set(p: Profile, edit: (x: Profile) => unknown): Profile {
  const c = clone(p)
  edit(c)
  return c
}

describe('the store — one profile on this device', () => {
  beforeEach(() => {
    localStorage.clear()
    reloadProfile()
  })
  afterEach(() => {
    localStorage.clear()
    reloadProfile()
  })

  it('starts blank, and an edit is saved to storage once flushed', () => {
    expect(getProfile().household.persons).toHaveLength(1)
    updateProfile((p) => ({ ...p, household: { ...p.household, spending: { workingToday: 5_000, retiredToday: 4_000 } } }))
    flushProfile()
    const saved = JSON.parse(localStorage.getItem('horizon-profile')!)
    expect(saved.household.spending.workingToday).toBe(5_000)
  })

  it('what was saved is what comes back after a reload', () => {
    replaceProfile(fixture())
    reloadProfile()
    expect(getProfile()).toEqual(fixture())
  })

  it('an edit that changes nothing makes no new profile (no render, no write)', () => {
    const before = getProfile()
    updateProfile((p) => p)
    expect(getProfile()).toBe(before)
  })

  it('an unreadable saved profile is kept under another key, never silently erased', () => {
    localStorage.setItem('horizon-profile', '{"app":"horizon","version":1,"household":')
    reloadProfile()
    expect(getStorageIssue()).toBe('unreadable')
    expect(localStorage.getItem('horizon-profile-unreadable')).toBe('{"app":"horizon","version":1,"household":')
    expect(getProfile().household.persons).toHaveLength(1)
  })

  it('« effacer » removes the profile and the unreadable copy, and leaves a blank one', () => {
    replaceProfile(fixture())
    localStorage.setItem('horizon-profile-unreadable', 'x')
    clearProfile()
    expect(localStorage.getItem('horizon-profile')).toBeNull()
    expect(localStorage.getItem('horizon-profile-unreadable')).toBeNull()
    expect(getProfile().household.persons).toHaveLength(1)
    expect(getStorageIssue()).toBeNull()
  })
})
