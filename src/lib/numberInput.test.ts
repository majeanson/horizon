import { describe, expect, it } from 'vitest'
import { readNumber, showNumber, type NumberKind } from './numberInput.ts'

const nbsp = (s: string) => s.replace(new RegExp('[' + String.fromCharCode(0xa0, 0x202f) + ']', 'g'), ' ')

describe('reading what a person typed', () => {
  it('dollars: the FR-CA reading, to the cent, never negative', () => {
    expect(readNumber('1 507,65', 'money', false)).toBe(1507.65)
    expect(readNumber('15,000', 'money', false)).toBe(15000)
    expect(readNumber('$ 85 000', 'money', false)).toBe(85000)
    expect(readNumber('-5', 'money', false)).toBeNull()
    expect(readNumber('abc', 'money', false)).toBeNull()
  })

  it('percent: typed as 5,25, stored as the fraction 0.0525 — with no floating-point tail', () => {
    expect(readNumber('5,25', 'percent', false)).toBe(0.0525)
    expect(readNumber('2', 'percent', false)).toBe(0.02)
    expect(readNumber('0,7', 'percent', false)).toBe(0.007)
    expect(readNumber('7 %', 'percent', false)).toBe(0.07)
  })

  it('percent: a negative return is read only where the field allows one', () => {
    expect(readNumber('-1,5', 'percent', true)).toBe(-0.015)
    expect(readNumber('-1,5', 'percent', false)).toBeNull()
  })

  it('a whole number is a whole number: 65,5 is refused, never rounded', () => {
    expect(readNumber('65', 'int', false)).toBe(65)
    expect(readNumber('65,5', 'int', false)).toBeNull()
    expect(readNumber('1978', 'year', false)).toBe(1978)
    expect(readNumber('19 78', 'year', false)).toBe(1978)
  })

  it('a decimal (years of service) keeps four places, and its comma is always the decimal mark — as the relevé prints « 19,4158 »', () => {
    expect(readNumber('12,5', 'decimal', false)).toBe(12.5)
    expect(readNumber('19,4158', 'decimal', false)).toBe(19.4158)
    expect(readNumber('19.4158', 'decimal', false)).toBe(19.4158)
    expect(readNumber('22,93081', 'decimal', false)).toBe(22.9308)
  })
})

describe('showing a stored number', () => {
  const KINDS: [NumberKind, number][] = [['money', 1507.65], ['money', 85000], ['percent', 0.0525], ['percent', 0.02], ['decimal', 12.5], ['decimal', 19.4158], ['year', 1978], ['int', 65]]

  it.each(KINDS)('%s %d reads back as itself, in both languages', (kind, value) => {
    for (const lang of ['fr', 'en'] as const) expect(readNumber(showNumber(value, kind, lang), kind, true)).toBe(value)
  })

  it('FR groups with spaces and uses the decimal comma; EN with commas and the point', () => {
    expect(nbsp(showNumber(85000, 'money', 'fr'))).toBe('85 000')
    expect(showNumber(1507.65, 'money', 'fr')).toContain(',65')
    expect(showNumber(85000, 'money', 'en')).toBe('85,000')
    expect(showNumber(0.0525, 'percent', 'fr')).toBe('5,25')
    expect(showNumber(0.0525, 'percent', 'en')).toBe('5.25')
  })

  it('a year has no grouping — « 2 026 » would be a bug, not a number', () => {
    expect(showNumber(2026, 'year', 'fr')).toBe('2026')
    expect(showNumber(2026, 'year', 'en')).toBe('2026')
  })

  it('nothing shows as an empty box', () => {
    expect(showNumber(null, 'money', 'fr')).toBe('')
  })
})
