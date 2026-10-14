import { describe, expect, it } from 'vitest'
import { TFSA_ROOM_COPY } from './tfsaRoomCopy.ts'
import { tfsaRoom, tfsaYearlyLimit } from './tfsaRoom.ts'

// The CRA's room « as of January 1 », less what was deposited since; a withdrawal this year gives its room back only next January.

describe('the room left today', () => {
  it('is the CRA\'s January 1 figure less this year\'s deposits', () => {
    expect(tfsaRoom(4_401.38, 4_000, 7_000).today).toBeCloseTo(401.38, 2)
    expect(tfsaRoom(4_401.38, 0, 7_000).today).toBeCloseTo(4_401.38, 2)
  })

  it('is never negative, and says by how much the deposits are over instead', () => {
    const r = tfsaRoom(4_000, 4_500, 7_000)
    expect(r.today).toBe(0)
    expect(r.overBy).toBe(500)
    expect(tfsaRoom(4_000, 3_000, 7_000).overBy).toBe(0)
  })

  it('next January is what is left plus the yearly limit — and only the limit when the deposits are over', () => {
    expect(tfsaRoom(4_401.38, 4_000, 7_000).nextJanuary).toBeCloseTo(7_401.38, 2)
    expect(tfsaRoom(4_000, 4_500, 7_000).nextJanuary).toBe(7_000)
  })

  it('reads this year\'s limit from the cited parameters (7 000 $ in 2026)', () => {
    expect(tfsaYearlyLimit()).toBe(7_000)
  })
})

describe('the words', () => {
  it('say the figures they are given, in both languages', () => {
    for (const lang of ['fr', 'en'] as const) {
      const c = TFSA_ROOM_COPY[lang]
      expect(c.today('A')).toContain('A')
      expect(c.next('A', 'L')).toContain('A')
      expect(c.next('A', 'L')).toContain('L')
      expect(c.over('A')).toContain('A')
      for (const k of ['summary', 'jan1', 'jan1Hint', 'deposited', 'depositedHint', 'use'] as const) expect(c[k].trim(), `${lang} ${k}`).not.toBe('')
    }
    expect(TFSA_ROOM_COPY.fr.use).not.toBe(TFSA_ROOM_COPY.en.use)
  })
})
