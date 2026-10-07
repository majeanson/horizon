import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { migrateProfile } from './migrations.ts'
import { inPayPension } from './profileEdit.ts'
import { MAX_IN_PAY_ANNUAL } from './schema.ts'

// A pension already in pay survives a save → load, an out-of-range amount is refused, and a file without one still opens.

const base = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'profile.v3.json'), 'utf8'))
const withInPay = (annual: unknown) => {
  const j = structuredClone(base)
  j.household.persons[0].pensions = [{ ...inPayPension(), inPay: { annual } }]
  return j
}

describe('the pension in pay in a saved profile', () => {
  it('round-trips through the validator', () => {
    const r = migrateProfile(withInPay(24_000))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.profile.household.persons[0].pensions[0].inPay).toEqual({ annual: 24_000 })
  })

  it('refuses a figure beyond what the page lets a person type', () => {
    const r = migrateProfile(withInPay(MAX_IN_PAY_ANNUAL + 1))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problems.some((p) => p.path.endsWith('inPay.annual') && p.problem === 'range')).toBe(true)
  })

  it('a pension without it stays « still to be calculated »', () => {
    const r = migrateProfile(base)
    expect(r.ok).toBe(true)
    if (r.ok) for (const person of r.profile.household.persons) for (const p of person.pensions) expect(p.inPay).toBeUndefined()
  })
})

describe('the figure after 65', () => {
  const withAfter = (after65: unknown) => {
    const j = structuredClone(base)
    j.household.persons[0].pensions = [{ ...inPayPension(), inPay: { annual: 30_000, after65 } }]
    return j
  }

  it('round-trips and is optional', () => {
    const r = migrateProfile(withAfter(20_000))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.profile.household.persons[0].pensions[0].inPay).toEqual({ annual: 30_000, after65: 20_000 })
    const none = migrateProfile(withAfter(undefined))
    expect(none.ok).toBe(true)
    if (none.ok) expect(none.profile.household.persons[0].pensions[0].inPay).toEqual({ annual: 30_000 })
  })

  it('is held to the same cap as the amount', () => {
    const r = migrateProfile(withAfter(MAX_IN_PAY_ANNUAL + 1))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.problems.some((p) => p.path.endsWith('inPay.after65') && p.problem === 'range')).toBe(true)
  })
})
