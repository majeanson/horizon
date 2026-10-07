import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { project } from '../engine/projection.ts'
import { MAX_SELECTIONS, assumptionsOf, defaultSelections, formatSelections, parseSelections, runSelections, scenarioOf, selectionAge, toggleSelection, worthAtHorizon } from './resultsModel.ts'
import { SCHEMA_VERSION, type Profile } from './schema.ts'

const dir = dirname(fileURLToPath(import.meta.url))
const profile = (): Profile => JSON.parse(readFileSync(join(dir, 'fixtures', `profile.v${SCHEMA_VERSION}.json`), 'utf8'))
const NONE: readonly never[] = []
const TODAY = { year: 2026, month: 10 }

describe('the profile becomes the engine\'s inputs, exactly', () => {
  it('the stored assumptions plus today are the engine\'s assumptions — the golden ones', () => {
    expect(assumptionsOf(profile(), TODAY)).toEqual(GOLDEN_ASSUMPTIONS)
  })

  it('« my plan » is the profile as it stands; an age sends everyone home at that age', () => {
    expect(scenarioOf(GOLDEN_HOUSEHOLD, 'plan')).toEqual({})
    expect(scenarioOf(GOLDEN_HOUSEHOLD, 62)).toEqual({ retirementAge: { self: 62, spouse: 62 } })
    expect(selectionAge(GOLDEN_HOUSEHOLD, 'plan')).toBe(60)
    expect(selectionAge(GOLDEN_HOUSEHOLD, 64)).toBe(64)
  })

  it('running a selection is running the engine: the rows are the golden projection', () => {
    const [plan] = runSelections(profile(), TODAY, ['plan'])
    expect(plan.result.rows).toEqual(project(GOLDEN_HOUSEHOLD, GOLDEN_ASSUMPTIONS, {}))
  })
})

describe('the chips in the address bar', () => {
  // THE PAGE OPENS ON THE HOUSEHOLD'S OWN PLAN. It used to open on « 60 and 65 » whatever the profile said, so a household
  // planning to retire at 55 saw neither its plan nor its date until it found the « Mon plan » chip.
  it('no parameter means the household\'s own plan beside 65 — or beside 60 when the plan already is 65', () => {
    expect(defaultSelections(GOLDEN_HOUSEHOLD)).toEqual(['plan', 65]) // the golden couple retires at 60 and 62
    const at65 = { ...GOLDEN_HOUSEHOLD, persons: GOLDEN_HOUSEHOLD.persons.map((p) => ({ ...p, retirementAge: 65 })) }
    expect(defaultSelections(at65)).toEqual(['plan', 60]) // two identical cards would compare nothing
    expect(parseSelections(null, defaultSelections(GOLDEN_HOUSEHOLD))).toEqual(['plan', 65])
  })

  it('an address that names nothing readable stays empty: the default is for NO address, not for a bad one', () => {
    expect(parseSelections('', ['plan', 65])).toEqual([])
    expect(parseSelections('abc', ['plan', 65])).toEqual([])
  })

  it('reads « plan » and ages, drops what is unreadable or out of range, and de-duplicates', () => {
    expect(parseSelections('plan,60,65', NONE)).toEqual(['plan', 60, 65])
    expect(parseSelections('49,71,abc,60,60,6', NONE)).toEqual([60])
    expect(parseSelections('', NONE)).toEqual([])
  })

  it('never more than four', () => {
    expect(parseSelections('55,56,57,58,59,60', NONE)).toEqual([55, 56, 57, 58])
  })

  it('round-trips', () => {
    expect(parseSelections(formatSelections(['plan', 58, 66]), NONE)).toEqual(['plan', 58, 66])
  })

  it('a chip toggles; a fifth is refused; the order of the others is kept', () => {
    expect(toggleSelection([60, 65], 62)).toEqual([60, 65, 62])
    expect(toggleSelection([60, 65, 62], 65)).toEqual([60, 62])
    const full = [55, 56, 57, 58]
    expect(toggleSelection(full, 60)).toEqual(full)
    expect(full).toHaveLength(MAX_SELECTIONS)
  })
})

describe('a couple that retires at two different ages', () => {
  it('a split is the first person at one age and the second at another — everything else as in the profile', () => {
    expect(scenarioOf(GOLDEN_HOUSEHOLD, '58-64')).toEqual({ retirementAge: { self: 58, spouse: 64 } })
    expect(selectionAge(GOLDEN_HOUSEHOLD, '58-64')).toBe(58)
  })

  it('running a split is running the engine with those two ages — not « everyone at one of them »', () => {
    const [split] = runSelections(profile(), TODAY, ['58-64'])
    expect(split.result.rows).toEqual(project(GOLDEN_HOUSEHOLD, GOLDEN_ASSUMPTIONS, { retirementAge: { self: 58, spouse: 64 } }))
    expect(split.result.rows).not.toEqual(project(GOLDEN_HOUSEHOLD, GOLDEN_ASSUMPTIONS, { retirementAge: { self: 58, spouse: 58 } }))
    expect(split.result.rows).not.toEqual(project(GOLDEN_HOUSEHOLD, GOLDEN_ASSUMPTIONS, { retirementAge: { self: 64, spouse: 64 } }))
  })

  it('reads splits from the address, drops the unreadable, the out-of-range and the pair that is just one age', () => {
    expect(parseSelections('plan,58-64,60', NONE)).toEqual(['plan', '58-64', 60])
    expect(parseSelections('58-58,49-60,60-71,5-6,58-64-65', NONE)).toEqual([])
    expect(formatSelections(parseSelections('58-64,plan', NONE))).toBe('58-64,plan')
  })

  it('a split counts toward the cap of four, and toggles like any chip', () => {
    expect(toggleSelection(['plan', '58-64'], '58-64')).toEqual(['plan'])
    expect(toggleSelection(['plan', 60, 61, '58-64'], 62)).toEqual(['plan', 60, 61, '58-64'])
  })

  it('on a household of one, a split falls back to everyone at its first age', () => {
    const solo = { ...GOLDEN_HOUSEHOLD, persons: [GOLDEN_HOUSEHOLD.persons[0]] }
    expect(scenarioOf(solo, '58-64')).toEqual({ retirementAge: { self: 58 } })
  })
})

describe('the net worth on a comparison card is in the dollars the page shows', () => {
  it('today\'s dollars: the nominal figure deflated from its own year; nominal: the engine\'s figure as it is', () => {
    const { result } = runSelections(profile(), { year: 2026, month: 10 }, ['plan'])[0]
    const a = { inflation: GOLDEN_ASSUMPTIONS.inflation, today: { year: 2026, month: 10 } }
    const last = result.rows[result.rows.length - 1]
    expect(worthAtHorizon(result, 'nominal', a)).toBe(result.netWorthAtHorizon)
    expect(worthAtHorizon(result, 'today', a)).toBeCloseTo(result.netWorthAtHorizon / (1 + a.inflation) ** (last.year - 2026), 6)
    expect(worthAtHorizon(result, 'today', a)).toBeLessThan(result.netWorthAtHorizon) // 50 years of inflation: the two figures are nowhere near each other
    expect(worthAtHorizon(result, 'today', a)).toBeGreaterThan(0)
  })
})

describe('a household that has already retired', () => {
  it('compares only its own plan: there is no departure age to try', () => {
    expect(defaultSelections(GOLDEN_HOUSEHOLD, true)).toEqual(['plan'])
  })
})
