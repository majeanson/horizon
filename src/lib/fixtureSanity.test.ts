import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GOLDEN_HOUSEHOLD, GOLDEN_TODAY } from '../engine/golden/household.fixture.ts'

import { violations } from './plausibility.ts'
import type { Household } from '../engine/types.ts'
import { EXAMPLE_IDS } from '../engine/golden/examples.ts'
import { exampleProfile } from './example.ts'

// A HOUSEHOLD THE ENGINE CAN RUN IS NOT THEREFORE A HOUSEHOLD THAT COULD EXIST.
//
// The golden couple, the « Charger l'exemple » profile and every saved-profile fixture are the numbers a first-time
// visitor sees and the numbers the tests pin. This guard holds them to what life allows, against the cited 2026
// figures: an earnings history that ends 25 % under today's salary is a raise nobody got; a TFSA with more room
// than the law ever granted, or a household that spends more than it earns, would make every verdict built on
// it a verdict about nobody.
//
// A fixture that breaks a rule is named in ALLOWED below WITH THE REASON; an excuse that no longer has anything to
// excuse fails (the lists only shrink). A canary pins the detector against a household built to break every rule.

const TODAY = GOLDEN_TODAY
const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
// EVERY version on disk (it read v1 to v5 only, so v6 to v25 were never held to anything): the set is discovered, not listed, so a new fixture is held the day it is added.
const VERSIONS = readdirSync(dir).map((n) => /^profile\.v(\d+)\.json$/.exec(n)?.[1]).filter((v): v is string => v !== undefined).map(Number).sort((a, b) => a - b)
const FIXTURES = VERSIONS.map((v) => {
  const j = JSON.parse(readFileSync(join(dir, `profile.v${v}.json`), 'utf8')) as { household: Household; children: number[] }
  return { name: `profile.v${v}.json`, household: j.household, children: j.children ?? [] }
})

const FROZEN =
  'a frozen file from an earlier release: it pins that release\'s MIGRATION, and its numbers are what that release wrote — correcting them would make the file a lie about the release'

/** fixture → the rules it is excused from, and why. Only the older files; the latest one and the golden couple are held to all of them. */
const ALLOWED: Record<string, Record<string, string>> = {
  'profile.v1.json': { 'earnings-vs-salary': FROZEN, 'retired-spending': FROZEN },
  'profile.v2.json': { 'earnings-vs-salary': FROZEN, 'retired-spending': FROZEN },
  'profile.v3.json': { 'earnings-vs-salary': FROZEN, 'retired-spending': FROZEN },
  'profile.v4.json': { 'earnings-vs-salary': FROZEN, 'retired-spending': FROZEN },
}

const SOURCES = [
  { name: 'the golden household', household: GOLDEN_HOUSEHOLD, children: [2012, 2015] },
  ...EXAMPLE_IDS.map((id) => ({ name: `the « ${id} » example`, household: exampleProfile(id).household, children: exampleProfile(id).household.children ?? [] })),
  ...FIXTURES,
]

describe('every example household is one that could exist', () => {
  for (const s of SOURCES) {
    it(`${s.name} breaks no plausibility rule it has not been excused from`, () => {
      const excused = new Set(Object.keys(ALLOWED[s.name] ?? {}))
      const unexcused = violations(s.household, s.children).filter((v) => !excused.has(v.split(':')[0]))
      expect(unexcused).toEqual([])
    })
  }

  it('an excuse is only kept while it still excuses something (the list only shrinks)', () => {
    for (const [name, rules] of Object.entries(ALLOWED)) {
      const s = SOURCES.find((x) => x.name === name)
      expect(s, `${name} is not a fixture`).toBeDefined()
      const found = new Set(violations(s!.household, s!.children).map((v) => v.split(':')[0]))
      for (const rule of Object.keys(rules)) expect(found.has(rule), `${name} no longer breaks « ${rule} »: drop the excuse`).toBe(true)
    }
  })

  it('the latest fixture is the golden couple (the e2e seed and the engine tests read the same people)', () => {
    const latest = FIXTURES[FIXTURES.length - 1]
    expect(latest.household.persons.map((p) => p.earningsHistory)).toEqual(GOLDEN_HOUSEHOLD.persons.map((p) => p.earningsHistory))
  })
})

describe('the detector is pinned: a household built to break every rule is caught', () => {
  const bad: Household = {
    livesAlone: true,
    persons: [
      {
        ...GOLDEN_HOUSEHOLD.persons[0],
        birth: { year: 2015, month: 1 },
        retirementAge: 40,
        rrq: { startAge: 50 },
        oas: { startAge: 60, residentSince: 2010 },
        earningsHistory: { 2000: 10_000, 2005: -5, 2010: 999_999, 2030: 5_000 },
        accounts: {
          rrsp: { balance: -1, room: 9_999_999, annualContribution: 99_999, lockedIn: 5 },
          tfsa: { balance: 0, room: 999_999, annualContribution: 99_999 },
          nonReg: { balance: 100, acb: 10_000, annualContribution: 0 },
        },
        pensions: [{ ...GOLDEN_HOUSEHOLD.persons[0].pensions[0], serviceYearsToDate: 30, startAge: 40 }],
      },
      { ...GOLDEN_HOUSEHOLD.persons[1], birth: { year: 1940, month: 1 }, salaryToday: 85_000, retirementAge: 80, earningsHistory: { 2025: 20_000 } },
    ],
    spending: { workingToday: 200_000, retiredToday: 400_000 },
  }
  const found = new Set(violations(bad, [1990, 2040]).map((v) => v.split(':')[0]))

  it.each([
    'couple-lives-alone', 'age-gap', 'age', 'retirement-age', 'rrq-start', 'oas-start', 'residence', 'earnings-year', 'earnings-negative',
    'earnings-over-ceiling', 'earnings-vs-salary', 'balance-negative', 'tfsa-room', 'tfsa-contribution', 'rrsp-contribution', 'rrsp-room', 'rrsp-locked',
    'nonreg-acb', 'db-service', 'db-start', 'spending-vs-income', 'retired-spending', 'child',
  ])('rule « %s » fires', (rule) => {
    expect(found.has(rule), `${rule} did not fire on the broken household`).toBe(true)
  })

  it('a child still to come is allowed only as a plan: a stated cost, within ten years, a parent who can still have one', () => {
    const withCost = (h: Household) => ({ ...h, childSpending: { perChild: 9_000, untilAge: 23 } })
    // Two people born in 1990: a birth three years from now is within what a 36-year-old can plan.
    const g: Household = { ...GOLDEN_HOUSEHOLD, persons: GOLDEN_HOUSEHOLD.persons.map((p) => ({ ...p, birth: { year: 1990, month: 1 } })) }
    const youngest = 1990
    const rule = (h: Household, kids: number[]) => violations(h, kids).filter((v) => v.startsWith('child'))
    expect(rule(withCost(g), [TODAY.year + 2])).toEqual([])
    expect(rule(g, [TODAY.year + 2]).join()).toMatch(/no cost stated/)
    expect(rule(withCost(g), [TODAY.year + 11]).join()).toMatch(/more than ten years ahead/)
    expect(rule(withCost(g), [youngest + 46]).join()).toMatch(/younger parent/)
  })

  it('the old golden couple (a retired budget 14 % above the working one) would have been caught', () => {
    expect(violations({ ...GOLDEN_HOUSEHOLD, spending: { workingToday: 88_000, retiredToday: 100_000 } }).some((v) => v.startsWith('retired-spending'))).toBe(true)
    expect(violations(GOLDEN_HOUSEHOLD, [2012, 2015]).some((v) => v.startsWith('retired-spending'))).toBe(false)
  })

  it('the old golden couple (a 2025 history 18 % under the salary) would have been caught', () => {
    const [self, spouse] = GOLDEN_HOUSEHOLD.persons
    const old: Household = {
      ...GOLDEN_HOUSEHOLD,
      persons: [
        { ...self, earningsHistory: { ...self.earningsHistory, 2025: 66_539 } },
        { ...spouse, earningsHistory: { ...spouse.earningsHistory, 2025: 54_000 } },
      ],
    }
    expect(violations(old).some((v) => v.startsWith('earnings-vs-salary'))).toBe(true)
  })
})
