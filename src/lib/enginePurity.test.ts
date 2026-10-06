import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { blankComments } from './buildGuardScan'

// LAW 1: ENGINE PURITY, as a build gate.
//
// src/engine/ is plain TypeScript that computes a retirement from a household and some
// assumptions. For its numbers to be trusted — and re-runnable by anyone, in a browser, in Node,
// in a Web Worker, in a test — it may depend on NOTHING that varies between those places:
//   · no React and no DOM (`window`, `document`, `navigator`, `localStorage`);
//   · no clock and no randomness (`Date`, `Math.random`, timers): « today » is an INPUT, so the
//     same household and the same assumptions always give the same retirement;
//   · no network (`fetch` …) and no number formatting (`Intl`): presentation belongs to the UI;
//   · no Node (`node:*`, `process`) — a pure module runs in a browser too;
//   · no import from outside src/engine/, so nothing can reach the app through the back door;
//   · only EXPLICIT `.ts` import specifiers, and only erasable TypeScript (no `enum`): the params
//     files are also executed by Node itself (npm run sources), which type-strips natively.
//
// Test files are exempt from the identifier bans (a test may read the clock to check a
// retrieval date) but not from the rule that an engine import stays inside the engine.

// The guard lives in src/lib with the other guards, NOT in src/engine: a guard that scanned its own
// folder would have to exempt itself (it reads the shared scanner from lib/ and carries fixtures
// that look like violations), and an exemption is exactly the thing a guard exists to refuse.
const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const engineDir = join(srcDir, 'engine')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return walk(p)
    return /\.tsx?$/.test(name) ? [p] : []
  })
}

// Identifier → why it is banned. A word-boundary match on COMMENT-BLANKED source.
const BANNED: ReadonlyArray<readonly [name: string, re: RegExp]> = [
  ['window', /\bwindow\b/],
  ['document', /\bdocument\b/],
  ['navigator', /\bnavigator\b/],
  ['localStorage', /\blocalStorage\b/],
  ['sessionStorage', /\bsessionStorage\b/],
  ['indexedDB', /\bindexedDB\b/],
  ['fetch', /(?<![.\w])fetch\s*\(/],
  ['XMLHttpRequest', /\bXMLHttpRequest\b/],
  ['Intl', /\bIntl\b/],
  ['Date', /\bDate\b/],
  ['Math.random', /\bMath\.random\b/],
  ['setTimeout', /\bsetTimeout\b/],
  ['setInterval', /\bsetInterval\b/],
  ['performance', /\bperformance\b/],
  ['process', /\bprocess\b/],
  ['console', /\bconsole\b/],
  ['require', /(?<![.\w])require\s*\(/],
  ['enum', /\benum\b/],
]

interface Site {
  file: string
  line: number
  what: string
}

const lineOf = (s: string, i: number) => s.slice(0, i).split('\n').length

export function purityViolations(file: string, rawSource: string, isTest: boolean): Site[] {
  const out: Site[] = []
  const src = blankComments(rawSource)
  const rel = relative(srcDir, file).split(sep).join('/')

  if (!isTest) {
    for (const [what, re] of BANNED) {
      for (const m of src.matchAll(new RegExp(re.source, 'g'))) out.push({ file: rel, line: lineOf(src, m.index ?? 0), what })
    }
  }

  // Imports: `from '…'` and bare `import '…'`, and dynamic `import('…')`.
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
    const spec = m[1]
    const line = lineOf(src, m.index ?? 0)
    if (spec.startsWith('.')) {
      const target = resolve(dirname(file), spec)
      if (relative(engineDir, target).startsWith('..')) out.push({ file: rel, line, what: `import escapes src/engine: ${spec}` })
      if (!/\.ts$/.test(spec)) out.push({ file: rel, line, what: `relative import without an explicit .ts: ${spec}` })
    } else if (!isTest || !/^vitest/.test(spec)) {
      if (!isTest) out.push({ file: rel, line, what: `package import: ${spec}` })
    }
  }
  return out
}

describe('law 1: the engine is pure', () => {
  // The canary — the detector pinned against a fixture of every banned shape and the look-alikes
  // that must pass.
  it('the detector sees every banned shape and none of its look-alikes', () => {
    const fixture = [
      `const t = new Date()`, // 1
      `const r = Math.random()`, // 2
      `window.alert(1)`, // 3
      `await fetch('/x')`, // 4
      `new Intl.NumberFormat()`, // 5
      `import { x } from 'react'`, // 6  package import
      `import { y } from '../../lib/format.ts'`, // 7  escapes (params/ → src/lib)
      `import { z } from './sibling'`, // 8  no .ts
      `enum Kind { A }`, // 9
      `const updated = 1; const candidate = 2; const refetch = 3; const dateOfBirth = 4`, // clean
      `// Date and window in a comment are fine`, // clean (blanked)
    ].join('\n')
    const file = join(engineDir, 'params', 'fixture.ts')
    const lines = purityViolations(file, fixture, false).map((v) => v.line)
    expect([...new Set(lines)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  const files = walk(engineDir)

  it('scans a real tree (a floor, so an empty walk cannot pass)', () => {
    expect(files.length).toBeGreaterThanOrEqual(10)
  })

  it('no engine source touches the DOM, the clock, randomness, the network, Intl, Node or an enum', () => {
    const offenders = files
      .filter((f) => !/\.test\.tsx?$/.test(f))
      .flatMap((f) => purityViolations(f, readFileSync(f, 'utf8'), false))
      .map((v) => `${v.file}:${v.line} ${v.what}`)
    expect(offenders, 'src/engine is plain TypeScript: time is an input, presentation belongs to the UI (CLAUDE.md, law 1)').toEqual([])
  })

  it('no engine file — test or not — imports from outside src/engine or without an explicit .ts', () => {
    const offenders = files
      .filter((f) => /\.test\.tsx?$/.test(f))
      .flatMap((f) => purityViolations(f, readFileSync(f, 'utf8'), true))
      .map((v) => `${v.file}:${v.line} ${v.what}`)
    expect(offenders).toEqual([])
  })

  it('every engine source is .ts, never .tsx — there is no markup in a calculation', () => {
    expect(files.filter((f) => f.endsWith('.tsx'))).toEqual([])
  })
})
