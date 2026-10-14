import { describe, expect, it } from 'vitest'
import { retirementState } from '../engine/ledger'
import { answerRequest } from './answerRequest'
import { exampleProfile } from './example'
import { MIN_AGE } from './resultsModel'

// The question put to the answer worker, from a profile and a month. Pinned on two example households at a fixed « now », with the
// numbers the two hand-written derivations (the results page's and the live answer's) gave before they became this one.
const NOW = { year: 2026, month: 1 }

describe('answerRequest', () => {
  it('a working couple (golden, born 1978 and 1981): the oldest person’s age is the first age tried', () => {
    const profile = exampleProfile('golden')
    const r = answerRequest(profile, NOW)
    expect(r.firstAge).toBe(48)
    expect(r.youngest).toBe(45)
    expect(r.everyoneRetired).toBe(false)
    expect(r.assumptions.today).toEqual(NOW)
    expect(r.household).toBe(profile.household)
  })

  it('a retired couple (born 1958 and 1960): everybody has stopped, the ages are theirs', () => {
    const profile = exampleProfile('retired')
    const r = answerRequest(profile, NOW)
    expect(r.firstAge).toBe(68)
    expect(r.youngest).toBe(66)
    expect(r.everyoneRetired).toBe(true)
    expect(r.everyoneRetired).toBe(retirementState(profile.household, r.assumptions).everyoneRetired)
  })

  it('firstAge is clamped to the page’s range on both sides', () => {
    const profile = exampleProfile('golden')
    const old = answerRequest(profile, { year: 2060, month: 1 })
    expect(old.firstAge).toBe(70)
    expect(old.youngest).toBe(79)
    const kids = { ...profile, household: { ...profile.household, persons: profile.household.persons.map((p) => ({ ...p, birth: { ...p.birth, year: 2010 } })) } }
    const young = answerRequest(kids, NOW)
    expect(young.firstAge).toBe(MIN_AGE)
  })
})
