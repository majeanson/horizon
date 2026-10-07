import { describe, expect, it } from 'vitest'
import { citedLeaves, isCited, type Cited } from './cited.ts'
import { KNOWN, SERIES } from './index.ts'
import { RRQ_MGA_HISTORY, RRQ_YAMPE_HISTORY } from './rrqHistory.ts'

// LAW 2: EVERY GOVERNMENT NUMBER IS CITED — as a build gate.
//
// The type of the params tree is the type of a citation (`Cited`), so a bare number cannot hide in
// it. What the type cannot say is whether the citation is a real one: an https URL on an official
// host, a page title, the day it was read, a rule for how the figure moves. This guard says it, for
// every leaf of every year and every historical series, and holds the count of figures that could
// NOT be confirmed against an openable page to a ratchet that only falls.
//
// A secondary source (a bank, an accountant, a news site, a blog) is never a `source.url`: it may
// help FIND the official page, and may appear in a `note` as a labelled cross-check.

// A host is official when it IS one of these, or a subdomain of one. `gc.ca` is the Government of
// Canada (canada.ca, laws-lois.justice.gc.ca, pm.gc.ca); `gouv.qc.ca` is the Government of Québec.
const OFFICIAL = ['canada.ca', 'gc.ca', 'gouv.qc.ca', 'quebec.ca', 'revenuquebec.ca']
const isOfficialHost = (host: string) => OFFICIAL.some((h) => host === h || host.endsWith('.' + h))

// The ratchet: figures whose source carries a `verify` reason. Lower it in the commit that
// confirms one on an openable page; never raise it without writing the reason on the source.
const MAX_UNVERIFIED = 0 // 1 → 0: the TFSA cumulative total, each year re-derived from a real CRA room history. 5 → 1: the four GIS divisors, confirmed against the OAS Benefits Estimator (≤ 1 $/month, whole-dollar rounding). 8 → 5: Quebec brackets (revenuquebec.ca page read in a browser) and the line-361 age rule + worker-deduction rate (TP-1.G 2025-12). 11 → 8: quebec.creditRate and quebec.reductionRate re-read on the fetchable fiche; the two GIS knees confirmed on OAS Act s. 12.1(3) (only « A » is indexed); quebec.workerDeductionRate (the statute's wording, the host's page blocked) joined

const INDEX_RULES = ['cpi', 'wage', 'fixed', 'none']

const all: { where: string; path: string; cited: Cited<unknown> }[] = [
  ...Object.entries(KNOWN).flatMap(([year, tree]) => citedLeaves(tree).map((l) => ({ where: year, ...l }))),
  ...SERIES.map((s) => ({ where: 'series', path: s.name, cited: s.cited })),
]

describe('law 2: every figure is cited', () => {
  it('walks a real tree (a floor, so an empty walk cannot pass)', () => {
    expect(all.length).toBeGreaterThanOrEqual(80)
  })

  // The canary: the detector pinned against shapes that must be refused.
  it('refuses a bare number, a citation without a source url, and one on an unofficial host', () => {
    expect(isCited(74_600)).toBe(false)
    expect(isCited({ value: 1, index: 'cpi' })).toBe(false)
    expect(isCited({ value: 1, index: 'cpi', source: { url: 'https://example.com', title: 't', retrieved: '2026-01-01' } })).toBe(true)
    expect(isOfficialHost('www.canada.ca')).toBe(true)
    expect(isOfficialHost('www.retraitequebec.gouv.qc.ca')).toBe(true)
    expect(isOfficialHost('www.revenuquebec.ca')).toBe(true)
    expect(isOfficialHost('laws-lois.justice.gc.ca')).toBe(true)
    expect(isOfficialHost('cdn-contenu.quebec.ca')).toBe(true)
    for (const bad of ['www.rcgt.com', 'canada.ca.evil.com', 'notcanada.ca', 'web.archive.org', 'www.wealthsimple.com']) {
      expect(isOfficialHost(bad), bad).toBe(false)
    }
  })

  it('every leaf points at an https page on an official government host', () => {
    const bad = all
      .filter(({ cited }) => {
        try {
          const u = new URL(cited.source.url)
          return u.protocol !== 'https:' || !isOfficialHost(u.hostname)
        } catch {
          return true
        }
      })
      .map((l) => `${l.where} ${l.path}: ${l.cited.source.url}`)
    expect(bad, 'a figure must be cited to an official page; a secondary source belongs in a `note`, labelled as a cross-check').toEqual([])
  })

  it('every leaf names the page it was read on (a real title, not the URL, not empty)', () => {
    const bad = all.filter(({ cited: c }) => c.source.title.trim().length < 3 || c.source.title === c.source.url || c.source.title !== c.source.title.trim()).map((l) => `${l.where} ${l.path}`)
    expect(bad).toEqual([])
  })

  it('every leaf says the day it was read — a real date, not in the future', () => {
    const today = new Date().toISOString().slice(0, 10)
    const bad = all
      .filter(({ cited: c }) => {
        const d = c.source.retrieved
        return !/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d)) || d > today || d < '2026-01-01'
      })
      .map((l) => `${l.where} ${l.path}: ${l.cited.source.retrieved}`)
    expect(bad).toEqual([])
  })

  it('every leaf says how it moves into a year no page covers, and a moving figure says how it is rounded', () => {
    const noIndex = all.filter(({ cited: c }) => !INDEX_RULES.includes(c.index)).map((l) => `${l.where} ${l.path}`)
    expect(noIndex).toEqual([])
    // Official rounding is DATA: a CPI- or wage-indexed figure without a `round` would be projected
    // to a dozen decimals — a bracket at 58 523.4471 — which no official page would ever print.
    const unrounded = all.filter(({ cited: c }) => (c.index === 'cpi' || c.index === 'wage') && c.round === undefined).map((l) => `${l.where} ${l.path}`)
    expect(unrounded).toEqual([])
  })

  it('no value is NaN, negative where a magnitude is expected, or an empty table', () => {
    const bad: string[] = []
    for (const { where, path, cited: c } of all) {
      const v = c.value
      if (typeof v === 'number' && (!Number.isFinite(v) || v < 0)) bad.push(`${where} ${path}: ${v}`)
      if (typeof v === 'object' && v !== null && Object.keys(v).length === 0) bad.push(`${where} ${path}: empty`)
    }
    expect(bad).toEqual([])
  })

  it('a note or a verify reason, when present, is real text', () => {
    const bad = all.filter(({ cited: c }) => (c.source.note !== undefined && c.source.note.trim().length < 8) || (c.source.verify !== undefined && c.source.verify.trim().length < 30)).map((l) => `${l.where} ${l.path}`)
    expect(bad, 'a `verify` must SAY why the figure is unconfirmed — a bare flag is worse than none').toEqual([])
  })

  it(`holds the unconfirmed figures to a ratchet (≤ ${MAX_UNVERIFIED}, may only fall)`, () => {
    const unverified = all.filter(({ cited: c }) => c.source.verify !== undefined).map((l) => `${l.where} ${l.path}`)
    expect(unverified.length, `unconfirmed figures: ${unverified.join(', ')}`).toBeLessThanOrEqual(MAX_UNVERIFIED)
  })

  it('every scale is strictly increasing, ends open, and has rates that never fall', () => {
    for (const { where, path, cited: c } of all) {
      if (!Array.isArray(c.value) || !c.value.every((b) => typeof b === 'object' && b !== null && 'rate' in b)) continue
      const b = c.value as { upTo: number | null; rate: number }[]
      expect(b[b.length - 1].upTo, `${where} ${path} must end open`).toBeNull()
      for (let i = 1; i < b.length; i++) {
        expect(b[i].rate, `${path} rates`).toBeGreaterThan(b[i - 1].rate)
        if (i < b.length - 1) expect(b[i].upTo as number, `${path} thresholds`).toBeGreaterThan(b[i - 1].upTo as number)
      }
    }
  })
})

describe('the RRQ ceilings\' history tables', () => {
  const mga = RRQ_MGA_HISTORY.value
  const years = Object.keys(mga).map(Number)

  it('runs 1966 to 2026 with no gap — a career is counted month by month from 18', () => {
    expect(Math.min(...years)).toBe(1966)
    expect(Math.max(...years)).toBe(2026)
    expect(years).toHaveLength(2026 - 1966 + 1)
  })

  it('never falls from one year to the next (a ceiling has only ever risen or held)', () => {
    for (let y = 1967; y <= 2026; y++) expect(mga[y], `MGA ${y}`).toBeGreaterThanOrEqual(mga[y - 1])
  })

  it('every ceiling is a multiple of 100 $, as the official table prints them', () => {
    for (const y of years) expect(mga[y] % 100, `MGA ${y}`).toBe(0)
  })

  it('the additional maximum exists from 2024 and exceeds the ceiling in every year', () => {
    const yampe = RRQ_YAMPE_HISTORY.value
    expect(Object.keys(yampe).map(Number)).toEqual([2024, 2025, 2026])
    for (const y of [2024, 2025, 2026]) expect(yampe[y]).toBeGreaterThan(mga[y])
  })

  it('agrees with the 2026 parameters (two pages of Retraite Québec, one figure)', () => {
    expect(mga[2026]).toBe(KNOWN[2026].rrq.mga.value)
    expect(RRQ_YAMPE_HISTORY.value[2026]).toBe(KNOWN[2026].rrq.yampe.value)
  })
})
