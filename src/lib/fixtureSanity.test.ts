import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GOLDEN_HOUSEHOLD, GOLDEN_TODAY } from '../engine/golden/household.fixture.ts'
import { paramsFor } from '../engine/params/index.ts'
import { RRQ_MGA_HISTORY, RRQ_YAMPE_HISTORY } from '../engine/params/rrqHistory.ts'
import type { Household } from '../engine/types.ts'
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
const P = paramsFor(TODAY.year, { inflation: 0.02, wageGrowth: 0.03 })

/** The ceiling a relevé counts a year's earnings up to: the additional one from 2024, the MGA before. */
const ceiling = (year: number): number | undefined => RRQ_YAMPE_HISTORY.value[year] ?? RRQ_MGA_HISTORY.value[year]

function violations(h: Household, children: readonly number[] = []): string[] {
  const out: string[] = []
  const add = (rule: string, who: string, why: string) => out.push(`${rule}: ${who} — ${why}`)
  const age = (birthYear: number) => TODAY.year - birthYear

  if (h.persons.length === 2 && h.livesAlone) add('couple-lives-alone', 'household', 'two adults cannot live alone')
  if (h.persons.length === 2) {
    const gap = Math.abs(h.persons[0].birth.year - h.persons[1].birth.year)
    if (gap > 20) add('age-gap', 'household', `${gap} years between the spouses`)
  }

  for (const p of h.persons) {
    const who = p.id
    const a = age(p.birth.year)
    if (a < 18 || a > 100) add('age', who, `${a} years old`)
    if (p.retirementAge < 50 || p.retirementAge > 75) add('retirement-age', who, `retires at ${p.retirementAge}`)
    if (p.rrq.startAge < 60 || p.rrq.startAge > 72) add('rrq-start', who, `QPP at ${p.rrq.startAge}`)
    if (p.oas.startAge < 65 || p.oas.startAge > 70) add('oas-start', who, `OAS at ${p.oas.startAge}`)
    if (p.oas.residentSince < p.birth.year + 18) add('residence', who, `resident since ${p.oas.residentSince}, before turning 18`)
    if (p.oas.residentSince > TODAY.year) add('residence', who, `resident since ${p.oas.residentSince}, in the future`)

    // The earnings history is the relevé's: past years only, from the 18th birthday, never above that year's ceiling.
    const years = Object.keys(p.earningsHistory).map(Number)
    for (const y of years) {
      const e = p.earningsHistory[y]
      if (y < p.birth.year + 18) add('earnings-year', who, `${y} is before the 18th birthday`)
      if (y >= TODAY.year) add('earnings-year', who, `${y} has not ended`)
      if (e < 0) add('earnings-negative', who, `${y}: ${e}`)
      const c = ceiling(y)
      if (c !== undefined && e > c) add('earnings-over-ceiling', who, `${y}: ${e} is above that year's ceiling ${c}`)
    }
    const working = p.salaryToday > 0 && p.retirementAge > a
    if (working && years.length > 0) {
      const last = Math.max(...years)
      const e = p.earningsHistory[last]
      const cap = ceiling(last) ?? Infinity
      const expected = Math.min(p.salaryToday, cap)
      if (last < TODAY.year - 2) add('earnings-stale', who, `the history ends in ${last}`)
      else if (e < 0.85 * expected) add('earnings-vs-salary', who, `${last} earned ${e} against a salary of ${p.salaryToday} today (ceiling ${cap})`)
      else if (e > 1.15 * p.salaryToday) add('earnings-vs-salary', who, `${last} earned ${e}, well above today's ${p.salaryToday}`)
    }

    const { rrsp, tfsa, nonReg } = p.accounts
    for (const [name, balance] of [['rrsp', rrsp.balance], ['tfsa', tfsa.balance], ['nonReg', nonReg.balance]] as const) {
      if (balance < 0) add('balance-negative', who, `${name} ${balance}`)
    }
    if (tfsa.room > P.accounts.tfsaCumulativeSince2009) add('tfsa-room', who, `${tfsa.room} of room is more than every limit since 2009 added together (${P.accounts.tfsaCumulativeSince2009})`)
    if (tfsa.annualContribution > P.accounts.tfsaLimit) add('tfsa-contribution', who, `${tfsa.annualContribution} a year is above the ${P.accounts.tfsaLimit} limit`)
    if (rrsp.annualContribution > P.accounts.rrspLimit) add('rrsp-contribution', who, `${rrsp.annualContribution} a year is above the ${P.accounts.rrspLimit} limit`)
    if (p.salaryToday > 0 && rrsp.annualContribution > P.accounts.rrspRate * p.salaryToday + rrsp.room) {
      add('rrsp-contribution', who, `${rrsp.annualContribution} a year is more than 18 % of the salary plus all the room`)
    }
    const earnedEver = years.reduce((s, y) => s + p.earningsHistory[y], 0) + p.salaryToday
    if (rrsp.room > P.accounts.rrspRate * earnedEver) add('rrsp-room', who, `${rrsp.room} of room is more than 18 % of everything ever earned`)
    if (nonReg.acb < 0 || nonReg.acb > Math.max(2 * nonReg.balance, 1000)) add('nonreg-acb', who, `cost base ${nonReg.acb} against a balance of ${nonReg.balance}`)

    for (const d of p.pensions) {
      if (d.inPay) continue
      if (d.serviceYearsToDate > a - 18) add('db-service', who, `${d.serviceYearsToDate} years of service at ${a}`)
      const toRetirement = Math.max(0, p.retirementAge - a)
      if (d.maxServiceYears !== null && d.serviceYearsToDate + toRetirement * d.serviceRatePerYear > d.maxServiceYears + 20) add('db-service', who, 'more service than the plan allows even for a full career')
      if (d.startAge < d.earliestAge) add('db-start', who, `starts at ${d.startAge}, before the earliest age ${d.earliestAge}`)
    }
  }

  const gross = h.persons.reduce((s, p) => s + (p.retirementAge > age(p.birth.year) ? p.salaryToday : 0), 0)
  const saved = h.persons.reduce((s, p) => s + p.accounts.rrsp.annualContribution + p.accounts.tfsa.annualContribution + p.accounts.nonReg.annualContribution, 0)
  if (gross > 0 && h.spending.workingToday + saved > 0.95 * gross) add('spending-vs-income', 'household', `spends ${h.spending.workingToday} and saves ${saved} on ${gross} gross`)
  if (h.spending.workingToday > 0 && (h.spending.retiredToday > 1.3 * h.spending.workingToday || h.spending.retiredToday < 0.5 * h.spending.workingToday)) {
    add('retired-spending', 'household', `${h.spending.retiredToday} retired against ${h.spending.workingToday} working`)
  }

  const oldestParent = Math.min(...h.persons.map((p) => p.birth.year))
  for (const c of children) {
    if (c > TODAY.year) add('child', 'household', `born in ${c}, in the future`)
    if (c < oldestParent + 14) add('child', 'household', `born in ${c}, before the oldest parent turned 14`)
  }
  return out
}

const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const FIXTURES = [1, 2, 3, 4, 5].map((v) => {
  const j = JSON.parse(readFileSync(join(dir, `profile.v${v}.json`), 'utf8')) as { household: Household; children: number[] }
  return { name: `profile.v${v}.json`, household: j.household, children: j.children }
})

const FROZEN =
  'a frozen file from an earlier release: it pins that release\'s MIGRATION, and its numbers are what that release wrote — correcting them would make the file a lie about the release'

/** fixture → the rules it is excused from, and why. Only the older files; the latest one and the golden couple are held to all of them. */
const ALLOWED: Record<string, Record<string, string>> = {
  'profile.v1.json': { 'earnings-vs-salary': FROZEN },
  'profile.v2.json': { 'earnings-vs-salary': FROZEN },
  'profile.v3.json': { 'earnings-vs-salary': FROZEN },
  'profile.v4.json': { 'earnings-vs-salary': FROZEN },
}

const SOURCES = [
  { name: 'the golden household', household: GOLDEN_HOUSEHOLD, children: [2012, 2015] },
  { name: 'the example profile', household: exampleProfile().household, children: exampleProfile().children },
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
          rrsp: { balance: -1, room: 9_999_999, annualContribution: 99_999 },
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
    'earnings-over-ceiling', 'earnings-vs-salary', 'balance-negative', 'tfsa-room', 'tfsa-contribution', 'rrsp-contribution', 'rrsp-room',
    'nonreg-acb', 'db-service', 'db-start', 'spending-vs-income', 'retired-spending', 'child',
  ])('rule « %s » fires', (rule) => {
    expect(found.has(rule), `${rule} did not fire on the broken household`).toBe(true)
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
