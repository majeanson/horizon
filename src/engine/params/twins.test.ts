import { describe, expect, it } from 'vitest'
import { citedLeaves } from './cited.ts'
import { KNOWN, SERIES } from './index.ts'
import { TWINS, pageFor, type PageLang } from './twins.ts'

// EVERY CITED PAGE IS READABLE IN BOTH LANGUAGES — or says honestly that it is not.
//
// Horizon is bilingual, and « chaque chiffre vient d'une page officielle » means little to someone who cannot read that
// page. `twins.ts` lists, for each cited page, the language it is written in and its twin in the other one. This holds the
// table to the params, fail-closed: a page cited without an entry fails the build (so a new source has to decide, in writing,
// where its other-language edition is — or why there is none), a twin must be an official host and really the OTHER language,
// and an entry for a page nobody cites any more is stale.

const OFFICIAL = ['canada.ca', 'gc.ca', 'gouv.qc.ca', 'quebec.ca', 'revenuquebec.ca']
const official = (url: string): boolean => {
  const host = new URL(url).hostname
  return OFFICIAL.some((h) => host === h || host.endsWith('.' + h))
}

// What an address says about its language: /fr/ and /fra/ (and the Finances Québec AUTFR edition) are French; /en/ and /eng/
// (and AUTEN) are English. An address with none of these (a fiche, a quebec.ca page) says nothing, and is not judged by it.
const says = (url: string, lang: PageLang): boolean => (lang === 'fr' ? /\/(fr|fra)\/|AUTFR/.test(url) : /\/(en|eng)\/|AUTEN/.test(url))

function citedUrls(): Set<string> {
  const out = new Set<string>()
  for (const tree of Object.values(KNOWN)) for (const { cited } of citedLeaves(tree)) out.add(cited.source.url)
  for (const s of SERIES) out.add(s.cited.source.url)
  return out
}

describe('every cited page is readable in both languages, or says why not', () => {
  // The canary: the language detector pinned against each family of address in the table.
  it('the address reader tells French from English by the agencies\' own conventions', () => {
    expect(says('https://www.canada.ca/fr/services/x.html', 'fr')).toBe(true)
    expect(says('https://www.canada.ca/en/services/x.html', 'fr')).toBe(false)
    expect(says('https://laws-lois.justice.gc.ca/fra/lois/o-9/TexteComplet.html', 'fr')).toBe(true)
    expect(says('https://laws-lois.justice.gc.ca/eng/acts/o-9/FullText.html', 'en')).toBe(true)
    expect(says('https://cdn-contenu.quebec.ca/x/AUTFR_RegimeImpot2026.pdf', 'fr')).toBe(true)
    expect(says('https://cdn-contenu.quebec.ca/x/AUTEN_IncomeTax2026.pdf', 'en')).toBe(true)
    expect(says('https://www.budget.finances.gouv.qc.ca/budget/outils/depenses-fiscales/fiches/fiche-110111.asp', 'fr')).toBe(false) // says nothing
  })

  const cited = citedUrls()

  it('the scan reads real citations (a floor, so an empty tree cannot pass)', () => {
    expect(cited.size).toBeGreaterThanOrEqual(30)
  })

  it('every cited page has an entry: a new source must say where its other-language edition is, or why there is none', () => {
    expect([...cited].filter((u) => !TWINS[u])).toEqual([])
  })

  it('no entry outlives its citation (a stale entry reads as permission)', () => {
    expect(Object.keys(TWINS).filter((u) => !cited.has(u))).toEqual([])
  })

  it('a page with no twin says why; a page with one does not need to', () => {
    for (const [url, e] of Object.entries(TWINS)) {
      if (e.twin === null) expect(e.why, url).toMatch(/\S{3,}/)
      else expect(e.why, url).toBeUndefined()
    }
  })

  it('every twin is an official https page that is not the page itself, and it is really in the OTHER language', () => {
    for (const [url, e] of Object.entries(TWINS)) {
      expect(official(url), `${url} is cited from a non-official host`).toBe(true)
      if (!e.twin) continue
      expect(e.twin.url, url).toMatch(/^https:\/\//)
      expect(e.twin.url, `${url} is its own twin`).not.toBe(url)
      expect(official(e.twin.url), `${e.twin.url} is not an official host`).toBe(true)
      expect(e.twin.title.trim(), `${e.twin.url} has no title`).not.toBe('')
      const other: PageLang = e.lang === 'en' ? 'fr' : 'en'
      expect(says(url, other), `${url} is marked ${e.lang} but its address says ${other}`).toBe(false)
      expect(says(e.twin.url, other), `${e.twin.url} is meant to be the ${other} edition but its address does not say so`).toBe(true)
      expect(says(e.twin.url, e.lang), `${e.twin.url} says ${e.lang}, the language it is the twin OF`).toBe(false)
    }
  })

  it('most of what is cited has a twin (the pages without one are the exception, each with its reason)', () => {
    const without = Object.values(TWINS).filter((e) => e.twin === null).length
    expect(without, 'too many cited pages are readable in one language only').toBeLessThanOrEqual(8)
  })

  it('pageFor gives each reader their language, and is honest when there is none', () => {
    const [url, e] = Object.entries(TWINS).find(([, x]) => x.lang === 'en' && x.twin)!
    expect(pageFor({ url, title: 'T' }, 'en')).toEqual({ url, title: 'T', pageLang: 'en', inReaderLanguage: true })
    expect(pageFor({ url, title: 'T' }, 'fr')).toEqual({ url: e.twin!.url, title: e.twin!.title, pageLang: 'fr', inReaderLanguage: true })
    const [alone] = Object.entries(TWINS).find(([, x]) => x.lang === 'fr' && !x.twin)!
    expect(pageFor({ url: alone, title: 'T' }, 'en')).toEqual({ url: alone, title: 'T', pageLang: 'fr', inReaderLanguage: false })
    expect(pageFor({ url: alone, title: 'T' }, 'fr').inReaderLanguage).toBe(true)
    // An address nobody listed is treated as English with no twin — and the test above fails the build for it.
    expect(pageFor({ url: 'https://www.canada.ca/unlisted', title: 'T' }, 'fr')).toMatchObject({ pageLang: 'en', inReaderLanguage: false })
  })
})
