import { describe, expect, it } from 'vitest'
import { EXAMPLES, type ExampleId } from '../engine/golden/examples.ts'
import { retireAt } from '../engine/retireAt.ts'
import { exampleProfile } from './example.ts'
import type { Lang } from '../i18n.ts'
import { assumptionsOf } from './resultsModel.ts'
import { SHEET_COPY } from './sheetCopy.ts'
import { sheetModel, unconfirmedFacts } from './sheetModel.ts'
import { sheetView, type SheetView } from './sheetView.ts'

// THE SHEET'S WORDS, in both languages. They have one shape (SheetWords): the same keys and arities in French and English, nothing empty, no English that
// is French pasted in, and no digit typed in any words — every figure that reaches the screen comes from the model, formatted once in lib/sheetView.ts.

const LANGS: Lang[] = ['fr', 'en']

/** Every text of a words object, with the path it lives at; a function is called with placeholders so its own text shows without any figure. */
function texts(words: unknown, path = ''): [string, string][] {
  if (typeof words === 'string') return [[path, words]]
  if (typeof words === 'function') {
    const f = words as (...a: string[]) => unknown
    const out = f('§', '§', '§')
    return Array.isArray(out) ? out.map((x, i): [string, string] => [`${path}()[${i}]`, String(x)]) : [[`${path}()`, String(out)]]
  }
  if (words && typeof words === 'object') return Object.entries(words).flatMap(([k, v]) => texts(v, path ? `${path}.${k}` : k))
  return []
}
/** The paths of a words object, each with the number of arguments a function takes. */
function shape(words: unknown, path = ''): string[] {
  if (typeof words === 'string') return [path]
  if (typeof words === 'function') return [`${path}/${(words as (...a: unknown[]) => unknown).length}`]
  if (words && typeof words === 'object') return Object.entries(words).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k))
  return []
}

describe('the sheet words, in both languages', () => {
  it('have one shape: the same keys, and the same number of arguments to every function', () => {
    const reference = shape(SHEET_COPY.fr).sort()
    expect(reference.length).toBeGreaterThan(55)
    for (const lang of LANGS) expect(shape(SHEET_COPY[lang]).sort(), lang).toEqual(reference)
  })

  it('say something everywhere, and never type a figure: every digit that reaches the screen comes from the model', () => {
    for (const lang of LANGS) {
      for (const [path, text] of texts(SHEET_COPY[lang])) {
        // a word that only hands its figure back (« 56 % » is said by the model) is the one text allowed to be empty of words
        if (text !== '§') expect(text.replace(/§/g, '').trim().length, `${lang} ${path}`).toBeGreaterThan(0)
        expect(text, `${lang} ${path}`).not.toMatch(/\d/)
      }
    }
  })

  it('English is not French pasted in', () => {
    const fr = new Map(texts(SHEET_COPY.fr))
    for (const [path, text] of texts(SHEET_COPY.en)) if (text.length > 40) expect(text, path).not.toBe(fr.get(path))
  })

  it('name the sheet in both languages, for the link on the settings page', () => {
    for (const lang of LANGS) expect(SHEET_COPY[lang].open.trim().length).toBeGreaterThan(0)
  })
})

const TODAY = { year: 2026, month: 10 }
const digits = (view: SheetView): string[] =>
  JSON.stringify(view)
    .replace(/\\u[0-9a-f]{4}/gi, ' ')
    .match(/\d/g) ?? [] // digit by digit: the grouping of a figure (« 30 000 », « 30,000 ») is the language's, the digits are the model's

// One model per household, shared by every language: the point of the test is that the model is drawn, not recomputed.
const models = new Map<ExampleId, ReturnType<typeof sheetModel>>()
const viewOf = (id: ExampleId, lang: Lang): SheetView => {
  const p = exampleProfile(id)
  let model = models.get(id)
  if (!model) {
    const a = assumptionsOf(p, TODAY)
    model = sheetModel(p, a, retireAt(p.household, a, { stopAtFirstOk: true }).earliestOk)
    models.set(id, model)
  }
  return sheetView(model, lang, SHEET_COPY[lang], p.household.persons.map((x) => x.birth.year), p.household.persons.map((x, i) => x.name || String(i)))
}

const statsOf = (v: SheetView) => [...v.verdict.stats, ...v.groups.flatMap((g) => g.stats)]

// Each model is a search and four projections: a slow CI runner needs more than the default five seconds for the first of each household.
describe('the sheet shows the same figures in both languages', { timeout: 120_000 }, () => {
  it('on every example household: the same digits in the same order, the same bars, the same figures behind them', () => {
    for (const id of Object.keys(EXAMPLES) as ExampleId[]) {
      const fr = viewOf(id, 'fr')
      const en = viewOf(id, 'en')
      expect(digits(en), `${id} digits`).toEqual(digits(fr))
      expect(statsOf(en).map((s) => [s.id, s.fill, s.valueNow, s.status]), `${id} bars`).toEqual(statsOf(fr).map((s) => [s.id, s.fill, s.valueNow, s.status]))
      const slots = (v: SheetView) => v.holdings.groups.flatMap((g) => g.items.map((s) => [g.id, s.kind, s.to, s.confirmed]))
      expect(slots(en)).toEqual(slots(fr))
      expect(en.holdings.rooms.map((r) => r.to)).toEqual(fr.holdings.rooms.map((r) => r.to))
      expect(en.sharpen?.items.map((m) => [m.key, m.to])).toEqual(fr.sharpen?.items.map((m) => [m.key, m.to]))
    }
  }, 120_000)

  it('puts the verdict first: the earliest age and how sturdy the plan is, then today, then once retired', () => {
    const golden = viewOf('golden', 'fr')
    expect(golden.verdict.stats.map((s) => s.id)).toEqual(['runway', 'resilience'])
    expect(golden.groups.map((g) => [g.id, g.stats.map((s) => s.id)])).toEqual([
      ['today', ['saving']],
      ['retirement', ['cover', 'keep']],
    ])
  })

  it('says every ready stat with a figure, a bar and what a full bar stands for', () => {
    for (const s of statsOf(viewOf('golden', 'fr')).filter((x) => x.status === 'ready')) {
      expect(s.valueText.length).toBeGreaterThan(0)
      expect(s.fill).not.toBeNull()
      expect(s.scaleText.length).toBeGreaterThan(0)
    }
  })

  it('says a year with its ages, and keeps what is held apart: a total of the money to live on, the pensions and the home outside it', () => {
    const golden = viewOf('golden', 'fr')
    expect(statsOf(golden).find((s) => s.id === 'cover')!.detail).toMatch(/\(\d+ \/ \d+ ans\)/)
    const [investable, ...rest] = golden.holdings.groups
    expect(investable.id).toBe('investable')
    expect(investable.totalText).toMatch(/^Total\s:/)
    for (const s of investable.items) {
      expect(s.shareText).toMatch(/ du total$/)
      expect(s.to).toMatch(/^\/profil\?fact=/)
    }
    for (const g of rest) {
      expect(g.totalText).toBeNull()
      for (const s of g.items) expect(s.shareText, g.id).toBeNull()
    }
    expect(golden.holdings.groups.find((g) => g.id === 'pension')!.items.every((s) => /^Débute à /.test(s.extra))).toBe(true)
  })

  it('ranks the figures worth confirming, the biggest swing first, each leading to its field — and says when it is still working', () => {
    const p = exampleProfile('average')
    const a = assumptionsOf(p, TODAY)
    const earliest = retireAt(p.household, a, { stopAtFirstOk: true }).earliestOk
    const open = unconfirmedFacts(p)
    const swings = Object.fromEntries(open.map((f, i) => [f.id, { years: i % 3 }]))
    const view = sheetView(sheetModel(p, a, earliest, swings), 'fr', SHEET_COPY.fr, [1980, 1982], ['A', 'B'])
    expect(view.sharpen!.status).toBe('ready')
    expect(view.sharpen!.items.length).toBeGreaterThan(0)
    expect(view.sharpen!.items.length).toBeLessThanOrEqual(4)
    expect(view.sharpen!.items.map((m) => m.swingText)).toEqual([...view.sharpen!.items.map((m) => m.swingText)].sort().reverse())
    for (const m of view.sharpen!.items) expect(m.to).toMatch(/^\/profil\?fact=/)
    const pending = sheetView(sheetModel(p, a, earliest, undefined), 'fr', SHEET_COPY.fr, [1980, 1982], ['A', 'B'])
    expect(pending.sharpen!.status).toBe('pending')
    expect(pending.sharpen!.items).toEqual([])
  })
})
