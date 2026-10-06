import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { project } from '../engine/projection.ts'
import { DEFAULT_SELECTIONS, MAX_SELECTIONS, assumptionsOf, formatSelections, parseSelections, runSelections, scenarioOf, selectionAge, toggleSelection } from './resultsModel.ts'
import type { Profile } from './schema.ts'

const dir = dirname(fileURLToPath(import.meta.url))
const profile = (): Profile => JSON.parse(readFileSync(join(dir, 'fixtures', 'profile.v1.json'), 'utf8'))
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
  it('no parameter means the default pair', () => {
    expect(parseSelections(null)).toEqual([...DEFAULT_SELECTIONS])
  })

  it('reads « plan » and ages, drops what is unreadable or out of range, and de-duplicates', () => {
    expect(parseSelections('plan,60,65')).toEqual(['plan', 60, 65])
    expect(parseSelections('49,71,abc,60,60,6')).toEqual([60])
    expect(parseSelections('')).toEqual([])
  })

  it('never more than four', () => {
    expect(parseSelections('55,56,57,58,59,60')).toEqual([55, 56, 57, 58])
  })

  it('round-trips', () => {
    expect(parseSelections(formatSelections(['plan', 58, 66]))).toEqual(['plan', 58, 66])
  })

  it('a chip toggles; a fifth is refused; the order of the others is kept', () => {
    expect(toggleSelection([60, 65], 62)).toEqual([60, 65, 62])
    expect(toggleSelection([60, 65, 62], 65)).toEqual([60, 62])
    const full = [55, 56, 57, 58]
    expect(toggleSelection(full, 60)).toEqual(full)
    expect(full).toHaveLength(MAX_SELECTIONS)
  })
})
