import { describe, expect, it } from 'vitest'

// FR ↔ EN PARITY FOR THE COPY THAT IS NOT IN THE DICTIONARY. i18nParity.test.ts holds the eager dictionaries (`FR` / `EN`); about fifty `lib/*Copy.ts` modules hold the rest — lazily loaded, one per
// feature — and each was held, if at all, by a test of its own (twenty-eight were held by none). This one discovers EVERY module whose name ends in `Copy` and holds each `{ fr, en }` pair
// it exports to the same four rules: the same key paths on both sides; the same kind of leaf; no empty string; and no English sentence that is the French one pasted over it.
// A new copy module is held the day it is added, because it is found, not listed.
//
// A function leaf is rendered with stand-in arguments. Some take an object (`effect(e)`) or a count and cannot be rendered blind: those are compared by key and kind only, and their number is a
// ratchet that may fall, never rise.

type Leaf = string | ((...a: never[]) => unknown)
interface Dict {
  [k: string]: unknown
}

const modules = import.meta.glob('./*Copy.ts', { eager: true }) as Record<string, Record<string, unknown>>

const isDict = (v: unknown): v is Dict => typeof v === 'object' && v !== null
const isPair = (v: unknown): v is { fr: Dict; en: Dict } => isDict(v) && isDict(v.fr) && isDict(v.en) && Object.keys(v).length === 2

interface Pair {
  module: string
  name: string
  fr: Map<string, Leaf>
  en: Map<string, Leaf>
}

function flatten(d: unknown, prefix = '', out = new Map<string, Leaf>()): Map<string, Leaf> {
  if (!isDict(d)) return out
  for (const [k, v] of Object.entries(d)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string' || typeof v === 'function') out.set(key, v as Leaf)
    else flatten(v, key, out)
  }
  return out
}

const pairs: Pair[] = []
for (const [path, mod] of Object.entries(modules)) {
  for (const [name, value] of Object.entries(mod)) if (isPair(value)) pairs.push({ module: path.replace('./', '').replace('.ts', ''), name, fr: flatten(value.fr), en: flatten(value.en) })
}

/** What a leaf says with stand-in arguments, or null when it cannot be rendered blind (it throws, or prints a missing argument). */
function render(v: Leaf): string | null {
  if (typeof v === 'string') return v
  try {
    const out = (v as (...a: unknown[]) => unknown)(2, 'x', 'y')
    if (typeof out !== 'string') return null
    return /undefined|NaN|\[object/.test(out) ? null : out
  } catch {
    return null
  }
}

// `module.key` → why an identical long string is right on both sides (a proper noun, a URL, an official French title that is not translated). The reason IS the entry.
const SAME_ON_PURPOSE: Record<string, string> = {
}

// `module.key` → why the FIRST argument is not allowed to be 0 (it names a month, a count that starts at one…): the edge check then starts at 1. The reason IS the entry.
const FIRST_ARGUMENT_STARTS_AT_ONE: Record<string, string> = {
  'resultsCopy.out.summaryMade': '(month, year): a month is 1 to 12',
  'resultsCopy.out.printedOn': '(month, year): a month is 1 to 12',
}

/** How many function leaves could not be rendered blind, today (see above). A new one is a decision: give it an object-argument test of its own, then raise this by the one. */
const KNOWN_UNRENDERABLE = 23

describe('every copy module is found, and holds a French and an English side', () => {
  it('finds the modules (a floor, so an empty glob cannot pass)', () => {
    expect(Object.keys(modules).length).toBeGreaterThan(40)
    expect(pairs.length).toBeGreaterThan(40)
  })

  it('every module exports at least one { fr, en } pair, or is one of the few that exports something else', () => {
    const none = Object.entries(modules).filter(([, m]) => !Object.values(m).some(isPair)).map(([p]) => p)
    // these export a function or a table that is not a pair of dictionaries (a builder, an id list): named, so a module that FORGOT its English cannot hide among them
    expect(none).toEqual(none.filter((p) => p in OTHER_SHAPES))
  })

  it('and each of those still exports something other than a pair (a stale entry reads as permission)', () => {
    for (const p of Object.keys(OTHER_SHAPES)) {
      expect(modules[p], `${p} is not a copy module`).toBeDefined()
      expect(Object.values(modules[p]).some(isPair), `${p} now has a pair: hold it to the rules`).toBe(false)
    }
  })
})

const OTHER_SHAPES: Record<string, string> = {
  './saveCopy.ts': 'a function that saves the profile to a file (« Sauvegarder une copie »), not text: « copy » here is a copy of the data',
}

for (const p of pairs) {
  describe(`${p.module} · ${p.name}`, () => {
    it('has the same key paths on both sides', () => {
      expect([...p.fr.keys()].filter((k) => !p.en.has(k)), 'in FR, missing from EN').toEqual([])
      expect([...p.en.keys()].filter((k) => !p.fr.has(k)), 'in EN, missing from FR').toEqual([])
    })

    it('has the same kind of leaf (string / function) at every key', () => {
      expect([...p.fr].filter(([k, v]) => p.en.has(k) && typeof v !== typeof p.en.get(k)).map(([k]) => k)).toEqual([])
    })

    it('has no empty string on either side', () => {
      const empty = [...p.fr, ...p.en].filter(([, v]) => typeof v === 'string' && v.trim() === '').map(([k]) => k)
      expect(empty, 'an empty translation renders as a blank in the UI').toEqual([])
    })

    it('has no long English string identical to its French sibling (a French string pasted into EN)', () => {
      const same = [...p.fr]
        .filter(([k, v]) => {
          const e = p.en.get(k)
          if (e === undefined || SAME_ON_PURPOSE[`${p.module}.${k}`]) return false
          const a = render(v)
          const b = render(e)
          return a !== null && a === b && a.trim().split(/\s+/).length > 3
        })
        .map(([k]) => k)
      expect(same, 'untranslated — translate it, or add `module.key` to SAME_ON_PURPOSE with the reason').toEqual([])
    })
  })
}

// A SENTENCE THAT PRINTS A NUMBER PRINTS THE NUMBER IT IS GIVEN. A template that types its figure (« à 65 ans » where the age is an argument) reads right for the one value its author had in
// mind and wrong for every other; one that breaks at zero or one (« 0 ans », « undefined ») is wrong at the edge. Held for every function leaf that takes a number: where the stand-in 2 shows up
// in the sentence, 77 must show up when 77 is given; and 0, 1 and 2 must each give a sentence with no missing argument in it.
describe('every sentence that takes a number says it', () => {
  it('is exercised on hundreds of sentences (a floor: a walk that tests nothing must not pass)', () => {
    const printing = pairs.flatMap((p) => [...p.fr.values(), ...p.en.values()]).filter((v) => typeof v === 'function' && /\b2\b/.test(render(v) ?? '')).length
    expect(printing).toBeGreaterThan(450)
  })

  // The three stand-ins are three DIFFERENT numbers, so each argument can be followed into the sentence: where 2, 3 or 4 shows, 77, 88 or 99 must show in the same place when those are given.
  const say = (f: (...a: unknown[]) => unknown, a: number, b: number, c: number): string | null => {
    const out = f(a, b, c, c, c, c)
    return typeof out === 'string' ? out : null
  }
  /** `n` as a whole number in the text (not inside a longer one). */
  const has = (text: string, n: number) => new RegExp('(^|[^0-9])' + n + '([^0-9]|$)').test(text)
  const broken = (s: string | null) => s === null || s.trim() === '' || /undefined|NaN|\[object|Infinity/.test(s)

  /** Which of the first three arguments a sentence prints (0, 1, 2 for the 2nd, 3rd, 4th stand-in), or null when it cannot be rendered with numbers. */
  const printedArguments = (v: Leaf | undefined): number[] | null => {
    if (typeof v !== 'function') return null
    try {
      const base = say(v as (...a: unknown[]) => unknown, 2, 3, 4)
      if (broken(base)) return null
      return [2, 3, 4].map((n, i) => (has(base!, n) ? i : -1)).filter((i) => i >= 0)
    } catch {
      return null
    }
  }

  for (const p of pairs) {
    it(`${p.module}: French and English print the same arguments (a number typed into one side prints on one side only)`, () => {
      const wrong: string[] = []
      for (const [key, fr] of p.fr) {
        const a = printedArguments(fr)
        const b = printedArguments(p.en.get(key))
        if (a !== null && b !== null && a.join() !== b.join()) wrong.push(`${key}: FR prints arguments [${a}] and EN [${b}]`)
      }
      expect(wrong).toEqual([])
    })
  }

  for (const p of pairs) {
    for (const [lang, leaves] of [['fr', p.fr], ['en', p.en]] as const) {
      it(`${p.module} (${lang})`, () => {
        const wrong: string[] = []
        for (const [key, leaf] of leaves) {
          if (typeof leaf !== 'function') continue
          const f = leaf as (...a: unknown[]) => unknown
          let base: string | null
          try {
            base = say(f, 2, 3, 4)
          } catch {
            continue // not a number-taking function (it wants an object): the ratchet below counts it
          }
          if (broken(base)) continue
          const followed = [2, 3, 4].map((n, i) => (has(base!, n) ? i : -1)).filter((i) => i >= 0)
          if (followed.length === 0) continue
          try {
            const big = say(f, 77, 88, 99)
            for (const i of followed) {
              const given = [77, 88, 99][i]
              if (big === null || !has(big, given)) wrong.push(`${key}: argument ${i + 1} is printed for ${[2, 3, 4][i]} (« ${base} ») but not for ${given} (« ${big} »)`)
            }
            const edges: [number, number, number][] = [[0, 0, 0], [1, 1, 1], [0, 1, 2]]
            for (const args of edges) {
              if (args[0] === 0 && `${p.module}.${key}` in FIRST_ARGUMENT_STARTS_AT_ONE) continue
              const s = say(f, ...args)
              if (broken(s)) wrong.push(`${key}(${args.join(', ')}) → « ${s} »`)
            }
          } catch (e) {
            wrong.push(`${key} throws for some number: ${(e as Error).message}`)
          }
        }
        expect(wrong).toEqual([])
      })
    }
  }
})

describe('the guard’s own books', () => {
  it('every SAME_ON_PURPOSE entry still names a live, identical pair (a stale entry reads as permission)', () => {
    const stale = Object.keys(SAME_ON_PURPOSE).filter((key) => {
      const p = pairs.find((x) => key.startsWith(`${x.module}.`))
      const k = key.slice((p?.module.length ?? 0) + 1)
      const a = p?.fr.get(k)
      const b = p?.en.get(k)
      return a === undefined || b === undefined || render(a) !== render(b)
    })
    expect(stale).toEqual([])
  })

  it('the function leaves that cannot be rendered blind are no more than the known few (a ratchet: lower it in the commit that earns it)', () => {
    const blind = pairs.flatMap((p) => [...p.fr].filter(([, v]) => typeof v === 'function' && render(v) === null).map(([k]) => `${p.module}.${k}`))
    expect(blind.length, `${blind.length} function leaves are not rendered by this guard:\n${blind.join('\n')}`).toBeLessThanOrEqual(KNOWN_UNRENDERABLE)
  })

  it('canary: a pair with a missing key, a swapped kind, an empty string and a pasted sentence is caught by the same rules', () => {
    const fr = flatten({ a: 'Bonjour tout le monde ici', b: 'x', c: () => 'y', d: 'plein' })
    const en = flatten({ a: 'Bonjour tout le monde ici', b: () => 'x', c: 'z', e: '' })
    expect([...fr.keys()].filter((k) => !en.has(k))).toEqual(['d'])
    expect([...fr].filter(([k, v]) => en.has(k) && typeof v !== typeof en.get(k)).map(([k]) => k)).toEqual(['b', 'c'])
    expect([...en].filter(([, v]) => typeof v === 'string' && v.trim() === '').map(([k]) => k)).toEqual(['e'])
    expect(render(fr.get('a')!) === render(en.get('a')!) && render(fr.get('a')!)!.split(/\s+/).length > 3).toBe(true)
  })
})
