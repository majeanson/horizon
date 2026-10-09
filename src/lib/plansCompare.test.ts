import { describe, expect, it } from 'vitest'
import { EXAMPLES } from '../engine/golden/examples.ts'
import { comparePlans } from './plansCompare.ts'

describe('comparePlans', () => {
  const q = (name: string, key: 'average' | 'behind' | 'heir') => ({ name, household: EXAMPLES[key].household, assumptions: EXAMPLES[key].assumptions })

  it('answers every plan, in the order asked, with its own earliest age', () => {
    const r = comparePlans([q('a', 'average'), q('b', 'behind'), q('c', 'heir')])
    expect(r.map((x) => x.name)).toEqual(['a', 'b', 'c'])
    expect(r[0].earliest).not.toBeNull()
    // « behind » is the example that cannot retire when it hoped to; it may have no age or a later one than the average household.
    expect(r[1].earliest === null || r[1].earliest >= (r[0].earliest ?? 0)).toBe(true)
  })
  it('a plan with an age states what that age can fund; a plan with none states nothing', () => {
    for (const a of comparePlans([q('a', 'average'), q('b', 'behind')])) {
      if (a.earliest === null) expect(a.comfort).toBeUndefined()
      else expect(a.comfort === null || a.comfort > 0).toBe(true)
    }
  })
  it('the same plan twice gives the same answer twice', () => {
    const [x, y] = comparePlans([q('x', 'average'), q('y', 'average')])
    expect({ ...x, name: '' }).toEqual({ ...y, name: '' })
  })
})
