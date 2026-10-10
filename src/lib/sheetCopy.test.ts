import { describe, expect, it } from 'vitest'
import { EXAMPLES, type ExampleId } from '../engine/golden/examples.ts'
import { retireAt } from '../engine/retireAt.ts'
import { exampleProfile } from './example.ts'
import type { Lang } from '../i18n.ts'
import { assumptionsOf } from './resultsModel.ts'
import { RPG_COPY } from './rpgCopy.ts'
import { MODE_COPY, SHEET_COPY, type SheetWords } from './sheetCopy.ts'
import { sheetModel } from './sheetModel.ts'
import { sheetView, type SheetView } from './sheetView.ts'

// THE TWO SKINS OF THE SHEET SAY THE SAME THING IN DIFFERENT WORDS. Their words have one shape (SheetWords), in two languages each; their views are
// built by one function from one model, so what differs between the skins is words and only words. This holds that to the letter: the same keys and
// arities, nothing empty, no English that is French pasted in, no digit typed in any words (a figure typed in a skin's words is a figure that can
// differ between skins), and — on every example household, in both languages — the same digits in what the two skins show.

const LANGS: Lang[] = ['fr', 'en']
const SKINS = { serious: SHEET_COPY, adventure: RPG_COPY } as const

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

describe('the sheet words, in both skins and both languages', () => {
  it('have one shape: the same keys, and the same number of arguments to every function', () => {
    const reference = shape(SHEET_COPY.fr).sort()
    expect(reference.length).toBeGreaterThan(60)
    for (const lang of LANGS) {
      for (const [skin, copy] of Object.entries(SKINS)) expect(shape(copy[lang]).sort(), `${skin} ${lang}`).toEqual(reference)
    }
  })

  it('say something everywhere, and never type a figure: every digit that reaches the screen comes from the model', () => {
    for (const lang of LANGS) {
      for (const [skin, copy] of Object.entries(SKINS)) {
        for (const [path, text] of texts(copy[lang])) {
          // a word that only hands its figure back (« 56 % » is said by the model) is the one text allowed to be empty of words
          if (text !== '§') expect(text.replace(/§/g, '').trim().length, `${skin} ${lang} ${path}`).toBeGreaterThan(0)
          expect(text, `${skin} ${lang} ${path}`).not.toMatch(/\d/)
        }
      }
    }
  })

  it('English is not French pasted in, and the adventure words are not the serious words pasted in', () => {
    for (const [skin, copy] of Object.entries(SKINS)) {
      const fr = new Map(texts(copy.fr))
      for (const [path, text] of texts(copy.en)) if (text.length > 40) expect(text, `${skin} ${path}`).not.toBe(fr.get(path))
    }
    for (const lang of LANGS) {
      const serious = new Map(texts(SHEET_COPY[lang]))
      const adventure = texts(RPG_COPY[lang])
      const same = adventure.filter(([path, text]) => text.length > 40 && text === serious.get(path))
      // the intro, the stat names and the quests are re-told; a few sentences (a scenario list, a hint) may legitimately agree
      expect(same.length, `${lang} adventure sentences identical to the serious ones`).toBeLessThan(adventure.filter(([, t]) => t.length > 40).length / 3)
    }
  })

  it('keeps a weak figure kind: no words of defeat anywhere in the adventure skin', () => {
    for (const lang of LANGS) {
      for (const [path, text] of texts(RPG_COPY[lang])) expect(text, `${lang} ${path}`).not.toMatch(/game over|perdu|défaite|echec|échec|you lose|defeat|failed|failure/i)
    }
  })

  it('name the two modes in both languages, the same in each skin', () => {
    for (const lang of LANGS) {
      const m = MODE_COPY[lang]
      for (const v of Object.values(m)) expect(v.trim().length).toBeGreaterThan(0)
      expect(m.serious).not.toBe(m.adventure)
    }
  })
})

const TODAY = { year: 2026, month: 10 }
const digits = (view: SheetView): string[] =>
  JSON.stringify(view)
    .replace(/\\u[0-9a-f]{4}/gi, ' ')
    .match(/\d+(?:[.,]\d+)?/g) ?? []

// One model per household, shared by every skin and language: the point of the test is that the model is drawn, not recomputed.
const models = new Map<ExampleId, ReturnType<typeof sheetModel>>()
const viewOf = (id: ExampleId, lang: Lang, words: SheetWords): SheetView => {
  const p = exampleProfile(id)
  let model = models.get(id)
  if (!model) {
    const a = assumptionsOf(p, TODAY)
    model = sheetModel(p, a, retireAt(p.household, a, { stopAtFirstOk: true }).earliestOk)
    models.set(id, model)
  }
  return sheetView(model, lang, words, p.household.persons.map((x) => x.birth.year), p.household.persons.map((x, i) => x.name || String(i)))
}

describe('the two skins show the same figures', () => {
  it('on every example household, in both languages: the same digits in the same order, the same bars, the same figures behind them', () => {
    for (const id of Object.keys(EXAMPLES) as ExampleId[]) {
      for (const lang of LANGS) {
        const serious = viewOf(id, lang, SHEET_COPY[lang])
        const adventure = viewOf(id, lang, RPG_COPY[lang])
        expect(digits(adventure), `${id} ${lang} digits`).toEqual(digits(serious))
        expect(adventure.stats.map((s) => [s.id, s.fill, s.valueNow, s.status]), `${id} ${lang} bars`).toEqual(serious.stats.map((s) => [s.id, s.fill, s.valueNow, s.status]))
        expect(adventure.level.value).toBe(serious.level.value)
        expect(adventure.slots.items.map((s) => [s.kind, s.amountText, s.confirmed])).toEqual(serious.slots.items.map((s) => [s.kind, s.amountText, s.confirmed]))
        expect(adventure.achievements.items.map((x) => [x.id, x.earned])).toEqual(serious.achievements.items.map((x) => [x.id, x.earned]))
        expect(adventure.quests.items.map((x) => x.to)).toEqual(serious.quests.items.map((x) => x.to))
      }
    }
  }, 120_000)

  it('says every stat with a figure and a bar, and the words differ between the skins (the canary: the comparison above can fail)', () => {
    const serious = viewOf('golden', 'fr', SHEET_COPY.fr)
    const adventure = viewOf('golden', 'fr', RPG_COPY.fr)
    expect(serious.stats.map((s) => s.name)).not.toEqual(adventure.stats.map((s) => s.name))
    expect(serious.title).not.toBe(adventure.title)
    // a view with a figure changed is caught by the digits comparison
    const tampered: SheetView = { ...adventure, stats: adventure.stats.map((s, i) => (i === 0 ? { ...s, valueText: s.valueText + '7' } : s)) }
    expect(digits(tampered)).not.toEqual(digits(serious))
    for (const s of serious.stats.filter((x) => x.status === 'ready')) {
      expect(s.valueText.length).toBeGreaterThan(0)
      expect(s.fill).not.toBeNull()
      expect(s.scaleText.length).toBeGreaterThan(0)
    }
  })

  it('says a year with its ages, and a weak stat as room to grow, never as a failure', () => {
    const behind = viewOf('behind', 'fr', RPG_COPY.fr)
    expect(behind.stats.find((s) => s.id === 'resilience')!.detail).toMatch(/place pour grandir/)
    const golden = viewOf('golden', 'fr', SHEET_COPY.fr)
    expect(golden.stats.find((s) => s.id === 'cover')!.detail).toMatch(/\(\d+ \/ \d+ ans\)/)
  })
})
