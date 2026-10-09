import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { FR, type InfoEntry } from '../i18n'
import { EN } from '../i18n.en'
import { blankComments, sourceFiles } from './buildGuardScan'

// « OÙ TROUVER CE CHIFFRE » MUST NEVER SEND A PERSON NOWHERE.
//
// Every number the person has to type has an ⓘ, and the ⓘ is only worth having if it is TRUE: it names a place that
// exists, in the document's own words, with a link that goes to an official page. So this test holds, for every
// entry of `info` in BOTH languages:
//   · it is used — a note nobody can open is dead copy that will quietly go stale (and an id used in code but
//     missing from the dictionary is already a compile error);
//   · it says WHERE the figure is;
//   · its link, when it has one, is https on an official host — never a blog, never a search result;
//   · an entry WITHOUT a link, or WITHOUT the document's own wording, is named below WITH THE REASON. The lists
//     may only shrink: a stale entry (one that now has what it was excused from) fails, so an excuse cannot
//     outlive the gap it covered.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')

const OFFICIAL_HOSTS = new Set([
  'www.canada.ca',
  'www.retraitequebec.gouv.qc.ca',
  'www.rrq.gouv.qc.ca',
  'www.revenuquebec.ca',
  'www.quebec.ca',
  'www.legisquebec.gouv.qc.ca',
  // Public institutions that publish the reference an ASSUMPTION is anchored on (the inflation target, life tables).
  'www.bankofcanada.ca',
  'www.banqueducanada.ca',
  'www150.statcan.gc.ca',
])

// A professional body is not the government. Its link is allowed ONLY for the assumptions it publishes guidelines for,
// and the entry must say so (`reference: true`, which makes the link read « pas une page gouvernementale »).
const REFERENCE_HOSTS: Record<string, readonly string[]> = { 'institutpf.org': ['returns'] }
const ASSUMPTION = 'an assumption about the future, not a figure printed on a statement: the note names the reference it is anchored on'

const OWN_STATEMENTS = 'the figure lives on the person’s own statements, which no official page reproduces'
const NO_PRINTED_FIGURE = 'a choice or an estimate: no document prints the figure, so there is no wording to quote'

const ALLOWED_NO_URL: Record<string, string> = {
  survivorSpending: 'a share the household chooses — no official page sets what a survivor spends',
  salary: OWN_STATEMENTS,
  rrspBalance: OWN_STATEMENTS,
  tfsaBalance: OWN_STATEMENTS,
  nonRegBalance: OWN_STATEMENTS,
  spendingWorking: OWN_STATEMENTS,
  spendingRetired: OWN_STATEMENTS,
}

const ALLOWED_NO_LABEL: Record<string, string> = {
  survivorSpending: 'a choice, not a printed figure',
  rrqStartAge: NO_PRINTED_FIGURE,
  oasStartAge: NO_PRINTED_FIGURE,
  oasResidence: 'the estimator asks a yes / no question (« only lived in Canada since 18 »), not a number of years, so there is no printed figure to quote; the ⓘ describes the question instead',
  salary: OWN_STATEMENTS,
  rrspBalance: OWN_STATEMENTS,
  tfsaBalance: OWN_STATEMENTS,
  nonRegBalance: OWN_STATEMENTS,
  spendingWorking: OWN_STATEMENTS,
  spendingRetired: OWN_STATEMENTS,
  inflation: ASSUMPTION,
  wageGrowth: ASSUMPTION,
  returns: ASSUMPTION,
  horizonAge: ASSUMPTION,
  dbRules: 'each plan words its own booklet: nothing single to quote',
}

const dictionaries = [
  ['FR', FR.info],
  ['EN', EN.info],
] as const

const ids = Object.keys(FR.info)

// Every .tsx under components/ and pages/: where an ⓘ is wired.
function usedLiterals(): Set<string> {
  const used = new Set<string>()
  const files = sourceFiles(srcDir).filter((f) => f.endsWith('.tsx'))
  for (const f of files) {
    const src = blankComments(readFileSync(f, 'utf8'))
    for (const id of ids) if (new RegExp(`['"]${id}['"]`).test(src)) used.add(id)
  }
  return used
}

describe('« où trouver ce chiffre » — the ⓘ copy', () => {
  it('walks a real dictionary (a floor, so an empty walk cannot pass)', () => {
    expect(ids.length).toBeGreaterThanOrEqual(15)
  })

  it('every entry is used by a field — no dead note', () => {
    const used = usedLiterals()
    expect(ids.filter((id) => !used.has(id)), 'info entries no field opens').toEqual([])
  })

  for (const [name, info] of dictionaries) {
    describe(name, () => {
      it('every entry says where the figure is, and what to do about it', () => {
        for (const [id, e] of Object.entries(info)) {
          expect(e.where.trim().length, `${id}.where`).toBeGreaterThan(20)
          expect(e.note.trim().length, `${id}.note`).toBeGreaterThan(0)
        }
      })

      it('every link is https on an official host, with no fragment-less junk', () => {
        for (const [id, e] of Object.entries(info)) {
          if (!e.url) continue
          const u = new URL(e.url)
          expect(u.protocol, `${id}`).toBe('https:')
          const isReference = REFERENCE_HOSTS[u.hostname]?.includes(id) === true
          expect(OFFICIAL_HOSTS.has(u.hostname) || isReference, `${id}: ${u.hostname} is not an official host`).toBe(true)
          expect(Boolean((e as InfoEntry).reference), `${id}: a non-government link must say so (reference: true), and only it may`).toBe(isReference)
        }
      })

      it('a missing link is excused by name, and the excuse is still true', () => {
        for (const [id, e] of Object.entries(info)) {
          if (!e.url) expect(ALLOWED_NO_URL[id], `${id} has no link and no reason`).toBeDefined()
        }
        const stale = Object.keys(ALLOWED_NO_URL).filter((id) => (info as Record<string, { url: string }>)[id]?.url)
        expect(stale, 'excused from a link it now has').toEqual([])
      })

      it('missing wording is excused by name, and the excuse is still true', () => {
        for (const [id, e] of Object.entries(info)) {
          if (!e.label) expect(ALLOWED_NO_LABEL[id], `${id} quotes no wording and has no reason`).toBeDefined()
        }
        const stale = Object.keys(ALLOWED_NO_LABEL).filter((id) => (info as Record<string, { label: string }>)[id]?.label)
        expect(stale, 'excused from wording it now has').toEqual([])
      })
    })
  }

  it('the two languages agree on WHICH entries have a link and which have wording', () => {
    for (const id of ids) {
      const fr = (FR.info as Record<string, { url: string; label: string }>)[id]
      const en = (EN.info as Record<string, { url: string; label: string }>)[id]
      expect(Boolean(en.url), `${id}: link`).toBe(Boolean(fr.url))
      expect(Boolean(en.label), `${id}: wording`).toBe(Boolean(fr.label))
    }
  })

  // A FRENCH reader sent to an English page (or the reverse) is the quietest way for a « où trouver ce chiffre » note to fail:
  // the link works, the page is real, and the person cannot read it. The French note for wage growth linked the English
  // Retraite Québec page — and said so in its own text — while the French edition was one link away.
  // The agencies say their language in the address: /fr/ · /fra/ and /en/ · /eng/. An address that says neither is not judged.
  it('every link goes to a page in ITS dictionary\'s language: no /en/ page in the French notes, no /fr/ page in the English ones', () => {
    const frenchWord = /\/(fr|fra)\//
    const englishWord = /\/(en|eng)\//
    for (const [id, e] of Object.entries(FR.info as Record<string, { url: string }>)) if (e.url) expect(englishWord.test(e.url), `FR ${id} links an English page: ${e.url}`).toBe(false)
    for (const [id, e] of Object.entries(EN.info as Record<string, { url: string }>)) if (e.url) expect(frenchWord.test(e.url), `EN ${id} links a French page: ${e.url}`).toBe(false)
    for (const l of FR.assumptions.presets.links) expect(englishWord.test(l.url), `FR preset link ${l.url}`).toBe(false)
    for (const l of EN.assumptions.presets.links) expect(frenchWord.test(l.url), `EN preset link ${l.url}`).toBe(false)
    // …and the detector sees both families of address.
    expect(englishWord.test('https://www.canada.ca/en/x')).toBe(true)
    expect(englishWord.test('https://laws-lois.justice.gc.ca/eng/acts/x')).toBe(true)
    expect(frenchWord.test('https://www150.statcan.gc.ca/t1/tbl1/fr/tv.action')).toBe(true)
    expect(frenchWord.test('https://laws-lois.justice.gc.ca/fra/lois/x')).toBe(true)
  })

  it('the scenario picker’s source links are https, on a government or a named reference host, and the same pages in both languages', () => {
    const hosts = (links: readonly { url: string }[]) => links.map((l) => new URL(l.url).hostname)
    for (const links of [FR.assumptions.presets.links, EN.assumptions.presets.links]) {
      for (const l of links) {
        const u = new URL(l.url)
        expect(u.protocol).toBe('https:')
        expect(OFFICIAL_HOSTS.has(u.hostname) || u.hostname in REFERENCE_HOSTS, u.hostname).toBe(true)
      }
    }
    expect(hosts(EN.assumptions.presets.links).map((h) => h.replace('banqueducanada', 'bankofcanada'))).toEqual(
      hosts(FR.assumptions.presets.links).map((h) => h.replace('banqueducanada', 'bankofcanada')),
    )
  })

  it('every excuse names an entry that exists', () => {
    for (const id of [...Object.keys(ALLOWED_NO_URL), ...Object.keys(ALLOWED_NO_LABEL)]) expect(ids, id).toContain(id)
  })
})
