import { describe, expect, it } from 'vitest'
import { formatCompactMoney, formatMoney, parseMoney, parseDecimal } from './money'

// Plain, narrow and non-breaking spaces all print as a space: the Intl data uses U+00A0 / U+202F
// between groups and before « $ », and a test full of invisible characters is a test nobody can
// read. Only the VISIBLE shape is asserted.
const visible = (s: string) => s.replace(/[\s  ]/g, ' ')

describe('formatMoney (dollars, cached formatters)', () => {
  it('prints whole dollars by default, in each language\'s convention', () => {
    expect(visible(formatMoney(15000, 'fr'))).toBe('15 000 $')
    expect(formatMoney(15000, 'en')).toBe('$15,000')
  })

  it('prints cents when asked — so a figure can be matched to the statement it came from', () => {
    expect(visible(formatMoney(1507.65, 'fr', { cents: true }))).toBe('1 507,65 $')
    expect(formatMoney(1507.65, 'en', { cents: true })).toBe('$1,507.65')
  })

  it('rounds to the dollar rather than truncating', () => {
    expect(formatMoney(1507.65, 'en')).toBe('$1,508')
  })

  it('answers an empty string for nothing to show (null, undefined, NaN, Infinity)', () => {
    for (const v of [null, undefined, NaN, Infinity]) expect(formatMoney(v, 'fr')).toBe('')
  })

  it('keeps the two shapes in separate caches (whole dollars never leak cents)', () => {
    expect(formatMoney(1.5, 'en', { cents: true })).toBe('$1.50')
    expect(formatMoney(1.5, 'en')).toBe('$2')
  })
})

describe('parseMoney (the comma is a decimal mark in FR-CA)', () => {
  // The bug this rule exists for: « 812,82 » is eight hundred twelve dollars and eighty-two
  // cents, and reading every comma as a thousands separator made it 81 282.
  it.each([
    ['812,82', 812.82],
    ['15,000', 15000],
    ['12,345,678', 12345678],
    ['12,5', 12.5],
    ['0,5', 0.5],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['1507.65', 1507.65],
    ['74600', 74600],
  ])('reads %j as %d', (input, expected) => {
    expect(parseMoney(input)).toBeCloseTo(expected, 2)
  })

  it('tolerates a dollar sign and plain or non-breaking spaces (what the statements print)', () => {
    expect(parseMoney('1 507,65 $')).toBeCloseTo(1507.65, 2)
    expect(parseMoney('$ 74 600')).toBe(74600)
    expect(parseMoney('3 500')).toBe(3500)
  })

  it('answers null for nothing, for words, and for a negative amount', () => {
    for (const bad of ['', '   ', 'abc', '$', '-5', '-0,5']) expect(parseMoney(bad)).toBeNull()
  })

  it('rounds to the cent', () => {
    expect(parseMoney('1.005')).toBeCloseTo(1.01, 2)
    expect(parseMoney('0.126')).toBe(0.13)
  })
})

describe('parseDecimal (the same reading rules, for any typed number)', () => {
  it('reads a negative only when told to', () => {
    expect(parseDecimal('-1,5')).toBeNull()
    expect(parseDecimal('-1,5', { negative: true })).toBe(-1.5)
  })

  it('rounds to the places asked, by the exponent (never by multiplying)', () => {
    expect(parseDecimal('1.005', { places: 2 })).toBe(1.01)
    expect(parseDecimal('12.3456', { places: 2 })).toBe(12.35)
    expect(parseDecimal('12.3456', { places: 3 })).toBe(12.346)
    expect(parseDecimal('7', { places: 0 })).toBe(7)
  })

  it('uses the FR-CA comma rule: a trailing comma pair is the decimal mark, other commas are grouping', () => {
    expect(parseDecimal('5,25')).toBe(5.25)
    expect(parseDecimal('15,000')).toBe(15000)
    expect(parseDecimal('1.234,56')).toBe(1234.56)
  })

  it('empty or junk is nothing, not zero', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('1-2')).toBeNull()
  })

  it('a letter is refused, never dropped: « 12e5 » is not 125 and « 1a2b3 » is not 123', () => {
    for (const typo of ['12e5', '1e3', '1a2b3', '12 ans', '5 k', '１２e５', 'O5', '1 000 CAD']) expect(parseDecimal(typo), typo).toBeNull()
    expect(parseDecimal('12e5', { negative: true })).toBeNull()
  })

  it('but the symbols a person puts around an amount are still ignored: $, %, spaces (plain and non-breaking)', () => {
    expect(parseDecimal('5,25 %')).toBe(5.25)
    expect(parseDecimal('$1 000')).toBe(1000)
    expect(parseDecimal('1 000 $')).toBe(1000)
    expect(parseDecimal('1' + String.fromCharCode(0xa0) + '000')).toBe(1000)
  })
})

describe('formatCompactMoney (the chart axis)', () => {
  const plain = (s: string) => s.split(String.fromCharCode(0xa0)).join(' ').split(String.fromCharCode(0x202f)).join(' ')

  it('shortens thousands and millions, in both languages', () => {
    expect(plain(formatCompactMoney(1_200_000, 'fr'))).toMatch(/^1,2 ?M ?\$$/)
    expect(formatCompactMoney(1_200_000, 'en')).toBe('$1.2M')
    expect(formatCompactMoney(85_000, 'en')).toBe('$85K')
  })

  it('leaves small numbers whole, and nothing as nothing', () => {
    expect(formatCompactMoney(950, 'en')).toBe('$950')
    expect(formatCompactMoney(null, 'fr')).toBe('')
    expect(formatCompactMoney(Number.NaN, 'en')).toBe('')
  })
})
