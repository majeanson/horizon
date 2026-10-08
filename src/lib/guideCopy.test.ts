import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { FR } from '../i18n.ts'
import { EN } from '../i18n.en.ts'
import { DOC_IDS, factsOf } from './facts.ts'
import { GUIDE_COPY } from './guideCopy.ts'
import { addHome, updateHome } from './profileEdit.ts'
import { SCHEMA_VERSION, type Profile } from './schema.ts'

// THE WORDS OF « RENDRE MON PROFIL EXACT »: every figure and every document has a name in both languages, no string is empty,
// the two languages say the same things (same keys, functions that return text), and a document that points at a page points
// at one that exists — the page is the ⓘ's, already held to official hosts by fieldInfoCopy.test.ts.

const dir = dirname(fileURLToPath(import.meta.url))
const golden = (): Profile => JSON.parse(readFileSync(join(dir, 'fixtures', `profile.v${SCHEMA_VERSION}.json`), 'utf8'))
const maximal = (): Profile => updateHome(addHome(golden()), (h) => ({ ...h, mortgage: { ...h.mortgage, balance: 1 } }))

const walk = (o: unknown, path: string, out: [string, unknown][] = []): [string, unknown][] => {
  if (o !== null && typeof o === 'object') for (const [k, v] of Object.entries(o)) walk(v, `${path}.${k}`, out)
  else out.push([path, o])
  return out
}
const shape = (o: unknown): string[] => walk(o, '').map(([p, v]) => `${p}:${typeof v}`)

describe('the guide copy', () => {
  it('French and English have the same keys', () => {
    expect(shape(GUIDE_COPY.en)).toEqual(shape(GUIDE_COPY.fr))
    expect(Object.keys(GUIDE_COPY.en.kind).sort()).toEqual(Object.keys(GUIDE_COPY.fr.kind).sort())
  })

  it('every figure a household can have is named, and every document is described, in both languages', () => {
    const kinds = new Set(factsOf(maximal()).map((f) => f.kind))
    for (const lang of ['fr', 'en'] as const) {
      const c = GUIDE_COPY[lang]
      for (const k of kinds) expect(c.kind[k], `${lang} ${k}`).toBeTruthy()
      for (const d of DOC_IDS) for (const field of ['name', 'what', 'how'] as const) expect(c.docs[d][field], `${lang} ${d}.${field}`).toBeTruthy()
    }
  })

  it('no string is empty, and every function returns text', () => {
    for (const lang of ['fr', 'en'] as const) {
      for (const [path, v] of walk(GUIDE_COPY[lang], lang)) {
        if (typeof v === 'string') expect(v.trim(), path).not.toBe('')
        if (typeof v === 'function') {
          const said = (v as (...a: unknown[]) => unknown)('x', 3, 2)
          expect(typeof said, path).toBe('string')
          expect((said as string).trim(), path).not.toBe('')
        }
      }
    }
  })

  it('the figures that have no ⓘ say where they are themselves, and a document that links to a page links to a real one', () => {
    for (const lang of ['fr', 'en'] as const) {
      const c = GUIDE_COPY[lang]
      const dict = lang === 'fr' ? FR : EN
      for (const f of factsOf(maximal())) if (f.info === null) expect(c.where[f.kind], `${lang} ${f.kind}`).toBeTruthy()
      for (const d of DOC_IDS) {
        const link = c.docs[d].link
        if (link !== null) expect(dict.info[link].url, `${lang} ${d} → ${link}`).toMatch(/^https:\/\//)
      }
    }
  })
})
