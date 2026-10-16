import { describe, expect, it } from 'vitest'

// A SENTENCE THAT SAYS « EARLIER » MUST NOT SAY « LATER ». About a dozen copy functions are named for a direction — `earlier`, `gain`, `sooner` (an age that came forward) and `later` (one that went
// back) — and each is printed next to a figure that is a number of years. If a translator swaps the two words, or a template is copied from the wrong sibling, the page tells a reader the
// opposite of what the engine found, with the right number. The key names the direction; here both languages are made to say it, with the right plural, and never its opposite.

type Leaf = string | ((...a: never[]) => unknown)
interface Dict {
  [k: string]: unknown
}
const modules = import.meta.glob('./*Copy.ts', { eager: true }) as Record<string, Record<string, unknown>>
const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null

const found: { where: string; key: string; direction: 'earlier' | 'later'; fr: Leaf; en: Leaf }[] = []
const EARLIER = new Set(['earlier', 'gain', 'sooner'])
const LATER = new Set(['later'])
function walk(fr: unknown, en: unknown, where: string, path: string[]): void {
  if (!isDict(fr) || !isDict(en)) return
  for (const [k, v] of Object.entries(fr)) {
    const w = en[k]
    if (typeof v === 'function' && typeof w === 'function') {
      const direction = EARLIER.has(k) ? 'earlier' : LATER.has(k) ? 'later' : null
      if (direction) found.push({ where: `${where}.${[...path, k].join('.')}`, key: k, direction, fr: v as Leaf, en: w as Leaf })
    } else walk(v, w, where, [...path, k])
  }
}
for (const [file, mod] of Object.entries(modules)) {
  for (const value of Object.values(mod)) if (isDict(value) && isDict(value.fr) && isDict(value.en)) walk(value.fr, value.en, file.replace('./', '').replace('.ts', ''), [])
}

// `module.path` → why a function with this name is not « n years earlier / later ». The reason IS the entry.
const NOT_A_CHANGE_IN_YEARS: Record<string, string> = {
  'resultsCopy.headline.earlier': 'the headline of an age (« À 62 ans, l’argent ne durerait que jusqu’à… »): its first argument is an age, and the sentence is about when the money runs out',
}

/** Say it with `years` (and an age after it, for the sentences that give one). */
const say = (leaf: Leaf, years: number): string | null => {
  try {
    const out = (leaf as (...a: unknown[]) => unknown)(years, 60, 65)
    return typeof out === 'string' ? out : null
  } catch {
    return null
  }
}
const FR_EARLIER = /plus tôt|plus t[oô]t|avant/i
const FR_LATER = /plus tard|après/i
const EN_EARLIER = /earlier|sooner|before/i
const EN_LATER = /later|after/i

describe('the sentences named for a direction say that direction, in both languages', () => {
  it('finds them (a floor, so an empty walk cannot pass)', () => {
    expect(found.length).toBeGreaterThanOrEqual(10)
    expect(found.some((f) => f.direction === 'earlier') && found.some((f) => f.direction === 'later')).toBe(true)
  })

  for (const f of found) {
    it(`${f.where} (${f.direction})`, () => {
      if (f.where in NOT_A_CHANGE_IN_YEARS) return
      for (const years of [1, 2, 5]) {
        const fr = say(f.fr, years)
        const en = say(f.en, years)
        if (fr === null || en === null) return // takes an object, not a number: held by its own module's test
        const [sayFr, notFr, sayEn, notEn] = f.direction === 'earlier' ? [FR_EARLIER, FR_LATER, EN_EARLIER, EN_LATER] : [FR_LATER, FR_EARLIER, EN_LATER, EN_EARLIER]
        expect(fr, `FR ${years}`).toMatch(sayFr)
        expect(en, `EN ${years}`).toMatch(sayEn)
        // the opposite word must not be what it says (a sentence may mention both: « 2 ans plus tôt qu’à votre arrivée » has no « plus tard » — if one does, it must lead with its own direction)
        const lead = (text: string, own: RegExp, other: RegExp) => {
          const a = text.search(own)
          const b = text.search(other)
          return b < 0 || (a >= 0 && a < b)
        }
        expect(lead(fr, sayFr, notFr), `FR ${years}: « ${fr} »`).toBe(true)
        expect(lead(en, sayEn, notEn), `EN ${years}: « ${en} »`).toBe(true)
        expect(fr, 'the number of years is in it').toContain(String(years))
        expect(en, 'the number of years is in it').toContain(String(years))
      }
    })
  }

  // Only the WRONG form next to the number is refused (« 1 ans », « 2 an »): some of these take the years already formatted as a string (« 1 an »), and print what they are given.
  it('French never says « 1 ans » or « 2 an »: the plural follows the number', () => {
    for (const f of found.filter((x) => !(x.where in NOT_A_CHANGE_IN_YEARS))) {
      for (const [n, wrong] of [[1, /\b1 ans\b/], [2, /\b2 an\b/], [5, /\b5 an\b/]] as const) {
        const text = say(f.fr, n)
        if (text !== null) expect(text, `${f.where} (${n})`).not.toMatch(wrong)
      }
    }
  })

  it('English never says « 1 years » or « 2 year »', () => {
    for (const f of found.filter((x) => !(x.where in NOT_A_CHANGE_IN_YEARS))) {
      for (const [n, wrong] of [[1, /\b1 years\b/], [2, /\b2 year\b/], [5, /\b5 year\b/]] as const) {
        const text = say(f.en, n)
        if (text !== null) expect(text, `${f.where} (${n})`).not.toMatch(wrong)
      }
    }
  })

  it('canary: a swapped pair is caught by the same rules', () => {
    const swappedFr = (n: number) => `${n} ans plus tard`
    expect(swappedFr(2)).not.toMatch(FR_EARLIER)
    expect(swappedFr(2)).toMatch(FR_LATER)
  })
})
