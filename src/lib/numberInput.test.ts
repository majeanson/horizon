import { describe, expect, it } from 'vitest'
import { emptyValue, readNumber, showNumber, stepFor, stepped, type NumberKind } from './numberInput.ts'

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

describe('the arrow keys on a number box', () => {
  const INF = Number.POSITIVE_INFINITY

  it('a year or an age moves by one, ten with Shift', () => {
    expect(stepped(65, 'int', 1, false, 0, 120)).toBe(66)
    expect(stepped(65, 'int', -1, false, 0, 120)).toBe(64)
    expect(stepped(1978, 'year', 1, true, 1900, 2100)).toBe(1980) // Shift lands on the next decade
  })

  it('money follows the size of the figure and lands on its grid', () => {
    expect(stepFor(812, 'money')).toBe(10)
    expect(stepFor(15000, 'money')).toBe(1000)
    expect(stepFor(400000, 'money')).toBe(10000)
    expect(stepFor(0, 'money')).toBe(1)
    expect(stepped(15340, 'money', 1, false, 0, INF)).toBe(16000)
    expect(stepped(15340, 'money', -1, false, 0, INF)).toBe(15000)
    expect(stepped(16000, 'money', -1, false, 0, INF)).toBe(15000)
    expect(stepped(null, 'money', 1, false, 0, INF)).toBe(1)
  })

  it('a percent moves by a tenth of a point, with no float dust', () => {
    expect(stepped(0.0525, 'percent', 1, false, -INF, INF)).toBe(0.053)
    expect(stepped(0.05, 'percent', 1, false, -INF, INF)).toBe(0.051)
    expect(stepped(0.05, 'percent', -1, false, -INF, INF)).toBe(0.049)
  })

  it('never leaves its range — down to zero for money, up to the cap for an age', () => {
    expect(stepped(0, 'money', -1, false, 0, INF)).toBe(0)
    expect(stepped(120, 'int', 1, false, 0, 120)).toBe(120)
    expect(stepped(0.07, 'percent', 1, true, 0, 0.1)).toBe(0.08)
    expect(stepped(0.095, 'percent', 1, true, 0, 0.1)).toBe(0.1)
  })
})

describe('an emptied box', () => {
  it('is 0 for an amount, a decimal or a percent that accepts 0', () => {
    expect(emptyValue('money', 0, 1e6)).toBe(0)
    expect(emptyValue('percent', Number.NEGATIVE_INFINITY, 0.25)).toBe(0)
    expect(emptyValue('decimal', 0, 60)).toBe(0)
  })
  it('goes back to its figure (null) when 0 is outside the box: a survivor’s share from 30 %, years of coordination from 1 — never a 0 the schema refuses', () => {
    expect(emptyValue('percent', 0.3, 1)).toBeNull()
    expect(emptyValue('decimal', 1, 60)).toBeNull()
    expect(emptyValue('money', 1, 1e6)).toBeNull()
  })
  it('a year or a count goes back to its figure, as it always has', () => {
    expect(emptyValue('year', 1900, 2100)).toBeNull()
    expect(emptyValue('int', 0, 32)).toBeNull()
  })
})
