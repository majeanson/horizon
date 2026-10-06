import { describe, expect, it } from 'vitest'
import { FR } from '../i18n'
import { EN } from '../i18n.en'

// FR ↔ EN parity at RUNTIME, the half `typeof FR` cannot see.
//
// The compile-time contract (`EN: typeof FR`) guarantees that EN has every key FR has, with the
// same shape. It cannot tell a translated string from a French string pasted into the English
// file to make the compiler stop complaining — which is exactly how an English reader ends up
// looking at « Où trouver ce chiffre » in the middle of an English page. This test walks both
// dictionaries and fails on:
//   · a key path present on one side only (belt and braces: the compiler already says so, but a
//     `// @ts-expect-error` somewhere would silence it);
//   · a leaf of a different kind (a string on one side, a function on the other);
//   · an EN leaf IDENTICAL to its FR sibling when it is long enough (> 3 words) to be prose —
//     short ones (« Horizon », « OK ») are names and may legitimately match.
//
// Functions (`(n) => …`) are rendered with stand-in arguments so their output can be compared
// the same way a plain string is.

type Leaf = string | ((...a: never[]) => string)
interface Dict {
  [k: string]: Leaf | Dict
}

function flatten(d: Dict, prefix = '', out = new Map<string, Leaf>()): Map<string, Leaf> {
  for (const [k, v] of Object.entries(d)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string' || typeof v === 'function') out.set(key, v)
    else flatten(v, key, out)
  }
  return out
}

function render(v: Leaf): string {
  return typeof v === 'function' ? (v as (...a: unknown[]) => string)(2, 'x', 'y') : v
}

// key path → why an identical long string is right on both sides (a proper noun, a URL, an
// official French title that is not translated). The reason IS the entry.
const SAME_ON_PURPOSE: Record<string, string> = {}

const fr = flatten(FR as unknown as Dict)
const en = flatten(EN as unknown as Dict)

describe('FR ↔ EN parity (runtime)', () => {
  it('walks a real dictionary (a floor, so an empty walk cannot pass)', () => {
    expect(fr.size).toBeGreaterThan(10)
  })

  it('has the same key paths on both sides', () => {
    expect([...fr.keys()].filter((k) => !en.has(k)), 'in FR, missing from EN').toEqual([])
    expect([...en.keys()].filter((k) => !fr.has(k)), 'in EN, missing from FR').toEqual([])
  })

  it('has the same kind of leaf (string / function) at every key', () => {
    const bad = [...fr].filter(([k, v]) => en.has(k) && typeof v !== typeof en.get(k)).map(([k]) => k)
    expect(bad).toEqual([])
  })

  it('has no empty string on either side — except an ⓘ entry\'s label or url, where empty means « none »', () => {
    // info.<id>.label / .url are '' when no document prints the figure or no official page exists. That is data, not a
    // missing translation, and fieldInfoCopy.test.ts holds every such blank to a named reason (a ratchet that only falls).
    const none = /^info\.[A-Za-z0-9]+\.(label|url)$/
    const empty = [...fr, ...en].filter(([k, v]) => !none.test(k) && render(v).trim() === '').map(([k]) => k)
    expect(empty, 'an empty translation renders as a blank in the UI').toEqual([])
  })

  it('has no long EN string identical to its FR sibling (a French string pasted into EN)', () => {
    const same = [...fr]
      .filter(([k, v]) => {
        const e = en.get(k)
        if (e === undefined || SAME_ON_PURPOSE[k]) return false
        const text = render(v)
        return text === render(e) && text.trim().split(/\s+/).length > 3
      })
      .map(([k]) => k)
    expect(same, 'untranslated — translate it, or add the key to SAME_ON_PURPOSE with the reason').toEqual([])
  })

  it('every SAME_ON_PURPOSE entry still names a live, identical pair (a stale entry reads as permission)', () => {
    const stale = Object.keys(SAME_ON_PURPOSE).filter((k) => !fr.has(k) || render(fr.get(k)!) !== render(en.get(k)!))
    expect(stale).toEqual([])
  })
})
