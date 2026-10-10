import { describe, expect, it } from 'vitest'
import { patchChildSpending, setChildSpending } from './profileLife.ts'
import { defaultProfile } from './schema.ts'

// WHAT A CHILD COSTS, edited one part at a time: changing the flat amount must not wipe the amounts by age, and the reverse.

const p0 = defaultProfile({ year: 2026 })
const bands: [number, number, number, number] = [24_600, 26_000, 28_600, 28_400]

describe('patchChildSpending', () => {
  it('starts from nothing: a flat amount alone, with the default leaving age', () => {
    expect(patchChildSpending(p0, { perChild: 6_000 }).household.childSpending).toEqual({ perChild: 6_000, untilAge: 23 })
  })

  it('changing one part leaves the others: the amounts by age survive a new flat amount and a new leaving age, and the reverse', () => {
    const a = patchChildSpending(p0, { byAge: bands })
    expect(a.household.childSpending).toEqual({ perChild: 0, untilAge: 23, byAge: bands })
    const b = patchChildSpending(a, { perChild: 5_000 })
    expect(b.household.childSpending).toEqual({ perChild: 5_000, untilAge: 23, byAge: bands })
    const c = patchChildSpending(b, { untilAge: 20 })
    expect(c.household.childSpending).toEqual({ perChild: 5_000, untilAge: 20, byAge: bands })
    expect(patchChildSpending(c, { byAge: null }).household.childSpending).toEqual({ perChild: 5_000, untilAge: 20 })
  })

  it('a child that costs nothing at all is not counted: no flat amount and no bands is null', () => {
    const a = patchChildSpending(p0, { perChild: 6_000 })
    expect(patchChildSpending(a, { perChild: 0 }).household.childSpending ?? null).toBeNull()
    const b = patchChildSpending(p0, { byAge: bands })
    expect(patchChildSpending(b, { byAge: null }).household.childSpending ?? null).toBeNull()
  })

  it('returns the same profile when nothing changes', () => {
    const a = patchChildSpending(p0, { byAge: bands })
    expect(patchChildSpending(a, { byAge: [...bands] as [number, number, number, number] })).toBe(a)
    expect(patchChildSpending(a, { perChild: 0 })).toBe(a)
    expect(setChildSpending(a, a.household.childSpending ?? null)).toBe(a)
  })
})

describe('patchKidsEffects and addChildCounted', () => {
  it('counts one part at a time; nothing counted is null', async () => {
    const { patchKidsEffects } = await import('./profileLife.ts')
    const a = patchKidsEffects(p0, { benefits: true })
    expect(a.household.kidsEffects).toEqual({ benefits: true, qppExclusion: false, leave: null })
    const b = patchKidsEffects(a, { qppExclusion: true })
    expect(b.household.kidsEffects).toEqual({ benefits: true, qppExclusion: true, leave: null })
    expect(patchKidsEffects(patchKidsEffects(b, { benefits: false }), { qppExclusion: false }).household.kidsEffects ?? null).toBeNull()
    expect(patchKidsEffects(a, { benefits: true })).toBe(a)
  })

  it('a first child counts the benefits; a household that already chose keeps its choice', async () => {
    const { addChildCounted, patchKidsEffects } = await import('./profileLife.ts')
    expect(addChildCounted(p0, 2028).household.kidsEffects).toEqual({ benefits: true, qppExclusion: false, leave: null })
    const off = patchKidsEffects(patchKidsEffects(p0, { qppExclusion: true }), { benefits: false })
    expect(addChildCounted(off, 2028).household.kidsEffects).toEqual({ benefits: false, qppExclusion: true, leave: null })
  })
})
