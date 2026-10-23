import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compare, englishNumber, frenchNumber, nextQuarterUrl, pageText, watched, WATCHES } from './figureWatch.ts'

// THE FIGURE WATCH, held without a network. Each extractor is run against a saved excerpt of the page it reads (scripts/fixtures/figures), so a layout change on the page fails HERE on the day
// someone refreshes the fixture, not silently in the weekly run; and the number it reads is held to what the params hold today, so a figure re-read without its fixture (or the reverse) fails too.

const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'figures')
const fixture = (name) => pageText(readFileSync(join(dir, name), 'utf8'))
// the page and the number AS THE PAGE PRINTS IT (the plant below swaps this very text for another figure)
const FIXTURE_OF = {
  'childBenefits.ccb.maxUnder6': ['ccb.html', '$8,157 per year'],
  'childBenefits.ccb.max6to17': ['ccb.html', '$6,883 per year'],
  'childBenefits.ccb.threshold1': ['ccb.html', 'Less than $38,237'],
  'oas.monthly65to74': ['oas.html', '$762.50'],
  'oas.monthly75plus': ['oas.html', '$838.75'],
  'longTermCare.chsldPrivateRoom': ['chsld.html', '2 242,20'],
  'longTermCare.chsldSemiPrivateRoom': ['chsld.html', '1 872,90'],
  'longTermCare.chsldWard': ['chsld.html', '1 395,30'],
}

describe('every watched figure', () => {
  const list = watched()
  it('has a fixture, and every fixture entry is watched (a new watch is held the day it is added)', () => {
    expect(list.map((w) => w.path).sort()).toEqual(Object.keys(FIXTURE_OF).sort())
  })

  for (const w of list) {
    it(`${w.path}: the extractor reads what the params hold from the saved page`, () => {
      const printed = w.extract(fixture(FIXTURE_OF[w.path][0]))
      expect(printed).not.toBeNull()
      expect(compare(w.held, printed)).toBe('same')
    })

    it(`${w.path}: a moved number is CHANGED, a vanished sentence is unchecked (planted)`, () => {
      const [file, printedAs] = FIXTURE_OF[w.path]
      const text = fixture(file)
      expect(text, `${w.path}: the number is on the fixture as the page prints it`).toContain(printedAs)
      const moved = text.replace(printedAs, printedAs.replace(/\d/g, '9'))
      expect(moved).not.toBe(text)
      expect(compare(w.held, w.extract(moved))).toBe('CHANGED')
      expect(compare(w.held, w.extract('a page that no longer carries the sentence'))).toBe('unchecked')
    })
  }
})

describe('reading a number', () => {
  it('English print: a comma groups, a point is the decimal', () => {
    expect(englishNumber('8,157')).toBe(8157)
    expect(englishNumber('762.50')).toBe(762.5)
  })
  it('French print: a space groups, a comma is the decimal', () => {
    expect(frenchNumber('2 242,20')).toBe(2242.2)
    expect(frenchNumber('1395,30')).toBe(1395.3)
  })
  it('a page text has no tags, scripts or non-breaking spaces', () => {
    expect(pageText('<p>a&nbsp;b</p><script>x()</script><p>c d</p>')).toBe(' a b c d ')
  })
})

describe('the next OAS quarter', () => {
  const base = 'https://www.canada.ca/en/employment-social-development/programs/pensions/pension/statistics/'
  it('the quarter after the cited one, rolling the year after the last', () => {
    expect(nextQuarterUrl(base + '2026-quarterly-october-december.html')).toBe(base + '2027-quarterly-january-march.html')
    expect(nextQuarterUrl(base + '2026-quarterly-april-june.html')).toBe(base + '2026-quarterly-july-september.html')
  })
  it('a URL of another shape has no next quarter', () => {
    expect(nextQuarterUrl('https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit/how-much.html')).toBeNull()
  })
  it('the cited OAS page is of the shape the probe reads (a re-cite to another page must not silently end the probe)', () => {
    const oas = watched().find((w) => w.path === 'oas.monthly65to74')
    expect(nextQuarterUrl(oas.url)).not.toBeNull()
  })
})

it('the list is data: every watch names a path and a reader', () => {
  for (const w of WATCHES) {
    expect(typeof w.path).toBe('string')
    expect(typeof w.extract).toBe('function')
  }
})
