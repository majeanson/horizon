import { readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// FRENCH PUNCTUATION NEVER STARTS A LINE.
//
// « 1 000 $ », « 0,6 % », « Pour qui ? » and « Dépenses : » each hold a space the French language puts BEFORE the sign.
// A plain space there is a line-break opportunity, and on a 360 px phone the copy wrapped with a lone « ? » or « $ » at
// the head of a line (the UI review, 2026-10-08: not one non-breaking space in 300 strings). The rule, in one line: in a
// copy file, a space before « : » is U+00A0, a space before « ; ? ! % $ » or inside « … » is U+202F (the narrow one), and
// a `${…}` hole is not text. English copy has no space before any of them at all, so the same scan holds it too.
//
// Scanned: the string and template literals of the copy files (never comments, never the holes of a template).
// Canary: the detector is pinned against a fixture holding the violation and its look-alikes.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')

const COPY_FILES = ['i18n.ts', 'i18n.en.ts', 'lib/resultsCopy.ts', 'lib/onboardCopy.ts', 'lib/guideCopy.ts', 'lib/levelsCopy.ts', 'lib/homeCopy.ts', 'lib/situationCopy.ts', 'lib/bridgeCopy.ts', 'lib/ledgerCopy.ts', 'lib/marketCopy.ts', 'lib/exampleCopy.ts', 'lib/leversCopy.ts', 'lib/paramLabels.ts', 'lib/lifeCopy.ts', 'lib/liveCopy.ts', 'lib/plansCopy.ts', 'lib/glossaryCopy.ts', 'lib/documentsCopy.ts', 'lib/entryCopy.ts']

/** A plain space before a sign that French binds to the word, or a plain space inside « … ». (An English « $500 » puts
 *  the sign BEFORE the number: a « $ » followed by a digit is not the French trailing sign.) */
const BREAKABLE = / [:;?!%»]|« | \$(?!\d)/

/** The TEXT of every string / template literal in a source (comments skipped, template holes cut out), with its line. */
export function literalTexts(src: string): { line: number; text: string }[] {
  const out: { line: number; text: string }[] = []
  const lineOf = (at: number) => src.slice(0, at).split('\n').length
  let i = 0
  while (i < src.length) {
    const ch = src[i]
    if (ch === '/' && src[i + 1] === '/') {
      const end = src.indexOf('\n', i)
      i = end === -1 ? src.length : end
      continue
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2)
      i = end === -1 ? src.length : end + 2
      continue
    }
    if (ch === "'" || ch === '"') {
      const start = i
      let j = i + 1
      while (j < src.length && src[j] !== ch && src[j] !== '\n') {
        if (src[j] === '\\') j++
        j++
      }
      out.push({ line: lineOf(start), text: src.slice(start + 1, j) })
      i = j + 1
      continue
    }
    if (ch === '`') {
      const start = i
      let text = ''
      i++
      while (i < src.length && src[i] !== '`') {
        if (src[i] === '\\') {
          text += src[i] + src[i + 1]
          i += 2
          continue
        }
        if (src[i] === '$' && src[i + 1] === '{') {
          let depth = 0
          let j = i
          for (; j < src.length; j++) {
            if (src[j] === '{') depth++
            else if (src[j] === '}' && --depth === 0) break
          }
          text += '\u0000' // the hole: never text, and never a space either
          i = j + 1
          continue
        }
        text += src[i]
        i++
      }
      out.push({ line: lineOf(start), text })
      i++
      continue
    }
    i++
  }
  return out
}

function breakable(file: string): string[] {
  const src = readFileSync(join(srcDir, file), 'utf8')
  return literalTexts(src)
    .filter((l) => BREAKABLE.test(l.text))
    .map((l) => `${file}:${l.line} ${JSON.stringify(l.text.slice(0, 60))}`)
}

describe('French punctuation never starts a line', () => {
  it('the detector sees a breakable space and none of its look-alikes (canary)', () => {
    const fixture = [
      `const a = 'Pour qui ?'`, // ← 1: a plain space before « ? »
      `const b = 'Pour qui ?'`, // the narrow no-break space
      `const c = 'Dépenses : 1 000 $'`, // U+00A0 before « : », U+202F before « $ »
      `const d = \`À \${amount} par année\``, // a hole before a word: not a space before a sign
      `const e = 'https://x.y/tv.action?pid=1' // a URL's « ? » has no space before it`,
      `/* a comment : with a space */ const f = 'ok'`,
      `const g = \`\${pct} %\``, // ← 7: a plain space before « % » after a hole
      `const h = 'Save $500 more a month'`, // English: the sign before the number
      `const i = 'Soit 1 000 $ par mois'`, // ← 9: the French trailing sign, with a plain space
    ].join('\n')
    const hits = literalTexts(fixture).filter((l) => BREAKABLE.test(l.text)).map((l) => l.line)
    expect(hits).toEqual([1, 7, 9])
  })

  it('reads real copy (a floor, so a scan that finds no literal cannot pass)', () => {
    expect(literalTexts(readFileSync(join(srcDir, 'i18n.ts'), 'utf8')).length).toBeGreaterThan(200)
  })

  for (const file of COPY_FILES) {
    it(`${relative(srcDir, join(srcDir, file))} binds its signs to their words`, () => {
      expect(breakable(file), 'put U+00A0 before « : » and U+202F before « ; ? ! % $ » and inside « … » (scripts: none — the Write tool keeps the characters)').toEqual([])
    })
  }
})
