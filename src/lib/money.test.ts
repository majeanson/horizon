import { describe, expect, it } from 'vitest'
import { formatMoney, parseMoney } from './money'

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
