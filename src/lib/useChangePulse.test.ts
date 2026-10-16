import { describe, expect, it } from 'vitest'
import { pulseDir } from './useChangePulse.ts'

describe('which way an answer moved', () => {
  it('a smaller age is earlier, a larger one later', () => {
    expect(pulseDir(62, 60)).toBe('earlier')
    expect(pulseDir(60, 63)).toBe('later')
  })

  it('no change, or no figure on either side, says nothing', () => {
    expect(pulseDir(60, 60)).toBeNull()
    expect(pulseDir(null, 60)).toBeNull()
    expect(pulseDir(60, null)).toBeNull()
  })
})
