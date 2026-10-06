import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { sourceFiles, readScanned } from './buildGuardScan'

// THE FORMATTER RULE: `new Intl.*` is constructed only in the cached-formatter homes.
//
// Constructing an Intl.NumberFormat / DateTimeFormat costs ~100 µs, and the results table
// formats a number per cell per year. In the project this was scaffolded from, an endpoint
// burned 1.8 s of a ~10 ms CPU budget doing exactly this inline — so the rule became a build
// gate: a new shape gets a new CACHED helper in lib/format.ts or lib/money.ts, never an
// inline constructor. `toLocale*String` is the same construction hidden in a convenience
// method, so it is held to a ratchet (zero today: it may never rise).
//
// The engine is held to the stricter rule in engine/purity.test.ts: no Intl at all.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const rootDir = join(srcDir, '..')
const ROOTS = [srcDir, join(rootDir, 'worker')]

// file (repo-relative, /-separated) → where its cache lives. The reason IS the entry.
const ALLOWED = new Map<string, string>([
  ['src/lib/format.ts', 'nf() — one NumberFormat per (lang, shape)'],
  ['src/lib/money.ts', 'currency() — one NumberFormat per (lang, cents)'],
])

interface Site {
  file: string
  line: number
}

function intlConstructions(): Site[] {
  const out: Site[] = []
  for (const root of ROOTS) {
    for (const f of sourceFiles(root)) {
      const src = readScanned(f)
      for (const m of src.matchAll(/new\s+Intl\./g)) {
        out.push({
          file: relative(rootDir, f).split(sep).join('/'),
          line: src.slice(0, m.index).split('\n').length,
        })
      }
    }
  }
  return out
}

describe('the formatter rule (Intl construction only in the cached-formatter homes)', () => {
  const sites = intlConstructions()

  it('found Intl constructions to classify (the scanner still works)', () => {
    expect(sites.length).toBeGreaterThanOrEqual(2)
  })

  it('no Intl construction outside the documented formatter homes', () => {
    const offenders = sites.filter((s) => !ALLOWED.has(s.file)).map((s) => `${s.file}:${s.line}`)
    expect(
      offenders,
      'use the cached helpers in lib/format.ts / lib/money.ts — a new shape gets a new cached helper THERE, never an inline `new Intl.*`',
    ).toEqual([])
  })

  it('every formatter home still constructs (a stale entry exempts the next arrival)', () => {
    const live = new Set(sites.map((s) => s.file))
    const dead = [...ALLOWED.keys()].filter((f) => !live.has(f))
    expect(dead, 'these files no longer construct Intl formatters — drop them from ALLOWED').toEqual([])
  })

  it('toLocale*String call sites do not appear (ratchet: zero, may never rise)', () => {
    let count = 0
    for (const f of sourceFiles(srcDir)) {
      count += [...readScanned(f).matchAll(/\.toLocale(?:Date|Time)?String\(/g)].length
    }
    expect(count, 'use a cached lib/format.ts or lib/money.ts helper').toBeLessThanOrEqual(0)
  })
})
