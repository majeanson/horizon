import { describe, expect, it } from 'vitest'
import { addSpouse, removeSpouse, setSpending } from './profileEdit.ts'
import { setSplitRow, startSplit, stopSplit } from './profileLife.ts'
import { defaultProfile, validateProfile } from './schema.ts'
import type { Profile } from './schema.ts'

// THE BUDGET, ENTERED ONE WAY OR THE OTHER: « ensemble » (one figure) or « séparé » (the joint account outside the mortgage, and each person's own spending). Whatever the way, the plan
// reads the same two totals — so the parts must always add up to them, whoever writes the total (the slider, the ledger, a level).

const today = { year: 2026 }
const couple = (): Profile => {
  const p = addSpouse(defaultProfile(today), today)
  return { ...p, household: { ...p.household, spending: { workingToday: 60_000, retiredToday: 50_000 } } }
}
const sums = (p: Profile) => {
  const rows = p.household.spendingSplit!.rows
  return { working: Math.round(rows.reduce((s, r) => s + r.working, 0) * 100) / 100, retired: Math.round(rows.reduce((s, r) => s + r.retired, 0) * 100) / 100 }
}

describe('splitting the budget by account', () => {
  it('starts with everything on the joint account — the total does not move — and only for a couple', () => {
    const p = startSplit(couple())
    expect(p.household.spendingSplit!.rows).toEqual([
      { id: 'joint', working: 60_000, retired: 50_000 },
      { id: 'self', working: 0, retired: 0 },
      { id: 'spouse', working: 0, retired: 0 },
    ])
    expect(p.household.spending).toEqual({ workingToday: 60_000, retiredToday: 50_000 })
    const alone = defaultProfile(today)
    expect(startSplit(alone)).toBe(alone)
    expect(startSplit(p)).toBe(p)
  })

  it('a part typed moves the two totals to the sum of the parts', () => {
    let p = startSplit(couple())
    p = setSplitRow(p, 'joint', { working: 30_400, retired: 30_400 })
    p = setSplitRow(p, 'self', { working: 15_000 })
    p = setSplitRow(p, 'spouse', { working: 15_000, retired: 10_000 })
    expect(p.household.spending).toEqual({ workingToday: 60_400, retiredToday: 40_400 })
    expect(sums(p)).toEqual({ working: 60_400, retired: 40_400 })
  })

  it('a total written from elsewhere is shared out in proportion, and the parts still add up to it to the cent', () => {
    let p = startSplit(couple())
    p = setSplitRow(p, 'joint', { working: 30_000 })
    p = setSplitRow(p, 'self', { working: 20_000 })
    p = setSplitRow(p, 'spouse', { working: 10_000 })
    const slid = setSpending(p, { workingToday: 33_333.33 })
    expect(slid.household.spending.workingToday).toBeCloseTo(33_333.33, 2)
    expect(sums(slid).working).toBeCloseTo(33_333.33, 2)
    expect(slid.household.spendingSplit!.rows.find((r) => r.id === 'joint')!.working).toBeGreaterThan(slid.household.spendingSplit!.rows.find((r) => r.id === 'self')!.working)
    // all zero → all to the joint account
    const zero = setSpending(startSplit({ ...couple(), household: { ...couple().household, spending: { workingToday: 0, retiredToday: 0 } } }), { workingToday: 12_000 })
    expect(zero.household.spendingSplit!.rows.find((r) => r.id === 'joint')!.working).toBe(12_000)
  })

  it('going back to one figure keeps the total; a spouse who leaves takes the split with them but not the money', () => {
    let p = startSplit(couple())
    p = setSplitRow(p, 'self', { working: 5_000 })
    const one = stopSplit(p)
    expect(one.household.spendingSplit).toBeUndefined()
    expect(one.household.spending.workingToday).toBe(65_000)
    const alone = removeSpouse(p)
    expect(alone.household.spendingSplit).toBeUndefined()
    expect(alone.household.spending.workingToday).toBe(65_000)
  })
})

describe('the saved profile', () => {
  it('keeps a split and reads the totals from it, and refuses what makes no sense', () => {
    const p = setSplitRow(setSplitRow(startSplit(couple()), 'self', { working: 5_000 }), 'joint', { working: 20_000, retired: 20_000 })
    const back = validateProfile(JSON.parse(JSON.stringify(p)))
    expect(back.ok && back.profile.household.spendingSplit).toEqual(p.household.spendingSplit)
    // a file whose totals disagree with its parts: the parts win
    const lying = JSON.parse(JSON.stringify(p))
    lying.household.spending = { workingToday: 1, retiredToday: 1 }
    const read = validateProfile(lying)
    expect(read.ok && read.profile.household.spending).toEqual({ workingToday: 25_000, retiredToday: 20_000 })
    // a part for a person who is not there, a repeated part, a negative part
    const alone = JSON.parse(JSON.stringify(validateProfile(defaultProfile(today)).ok ? defaultProfile(today) : {}))
    alone.household.spendingSplit = { rows: [{ id: 'spouse', working: 1, retired: 1 }] }
    expect(validateProfile(alone).ok).toBe(false)
    const twice = JSON.parse(JSON.stringify(p))
    twice.household.spendingSplit.rows.push({ id: 'joint', working: 1, retired: 1 })
    expect(validateProfile(twice).ok).toBe(false)
    const negative = JSON.parse(JSON.stringify(p))
    negative.household.spendingSplit.rows[0].working = -1
    expect(validateProfile(negative).ok).toBe(false)
  })
})
