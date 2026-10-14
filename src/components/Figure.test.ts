import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { agesLedger } from '../engine/ledger.ts'
import { GOLDEN_ASSUMPTIONS as A, GOLDEN_HOUSEHOLD as H } from '../engine/golden/household.fixture.ts'
import { oasTrace, rrqTrace, type Trace } from '../engine/trace.ts'
import { LangContext, type Lang } from '../i18n.ts'
import { blankComments, sourceFiles } from '../lib/buildGuardScan.ts'
import { Figure } from './Figure.tsx'

// A computed figure opens its provenance in place: the formula with this household's numbers, each input as a door, and the official page.
// The surfaces that use it are listed below and GROW BY COMMIT: a surface that adopts Figure is added here, and one listed that no longer uses it fails.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Where Figure is used today (a component file name, without its extension). Add the surface in the same commit that adopts Figure. */
const FIGURE_SURFACES = ['LedgerPanel'] as const

const render = (trace: Trace, lang: Lang = 'fr') =>
  renderToStaticMarkup(createElement(MemoryRouter, null, createElement(LangContext.Provider, { value: { lang, setLang: () => {} } }, createElement(Figure, { trace, after: 'par mois' }))))

const small: Trace = {
  labelKey: 'oas',
  value: 400,
  today: 300,
  start: { year: 2043, month: 4 },
  parts: [
    { labelKey: 'oasFull', value: 800, kind: 'money', op: 'mul' },
    { labelKey: 'oasResidence', value: 0.5, kind: 'pct', op: 'mul' },
  ],
  inputs: [{ labelKey: 'oasStart', value: 65, kind: 'age', door: 'person:self' }, { labelKey: 'earnings', kind: 'money', door: 'self:earnings' }],
  source: { title: 'Old Age Security - When to start your retirement pension - Canada.ca', url: 'https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/when-start.html' },
}

describe('Figure', () => {
  it('is a button holding the value, closed at first, that controls its note', () => {
    const html = render(small)
    expect(html).toMatch(/<button[^>]*class="figure"[^>]*aria-expanded="false"[^>]*aria-controls="/)
    expect(html).toMatch(/class="figure"[^>]*>300[^<]*\$<\/button>/)
    expect(html).toMatch(/class="figure-note" role="note" hidden=""/)
    expect(html).not.toContain('autofocus')
  })

  it('the note holds the formula with this household’s numbers, and each input as a door to its field', () => {
    const html = render(small)
    expect(html).toContain('pension complète')
    expect(html).toMatch(/pension complète 800,00[^×]*\$ × résidence 50,0[^=]*% =/)
    expect(html).toContain('href="/profil?person=self"')
    expect(html).toContain('href="/profil?fact=self%3Aearnings"')
  })

  it('names the official page only when the trace has one — in the reader’s language', () => {
    const withSource = render(small, 'en')
    expect(withSource).toContain('href="https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/when-start.html"')
    expect(withSource).toContain('official page')
    const without = render({ ...small, source: undefined })
    expect(without).not.toContain('href="https')
    expect(without).not.toContain('page officielle')
    expect(without).toContain('href="/profil?person=self"')
  })

  it('writes the real ledger’s pensions: formula, and the doors to the profile', () => {
    const l = agesLedger(H, A)[0]
    for (const t of [rrqTrace(l), oasTrace(l)]) {
      const html = render(t)
      expect(html).toContain(' × ')
      expect(html).toContain('/profil?person=self')
      expect(html).toMatch(/href="https:\/\/[^"]+"/)
    }
  })

  it('is used exactly where FIGURE_SURFACES says', () => {
    const using = sourceFiles(srcDir)
      .filter((f) => /<Figure[\s>]/.test(blankComments(readFileSync(f, 'utf8'))) && !/[\\/](Figure|DevKit)\.tsx$/.test(f))
      .map((f) => f.replace(/^.*[\\/]/, '').replace(/\.tsx$/, ''))
      .sort()
    expect(using).toEqual([...FIGURE_SURFACES].sort())
  })
})
