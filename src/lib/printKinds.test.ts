import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { blankComments } from './buildGuardScan'
import { PRINT_KINDS } from './printKind'
import { PRINT_MENU_COPY } from './printMenuCopy'

// EVERY PAGE « IMPRIMER… » CAN PRINT IS TEXT AND TABLES, AND NEEDS NOTHING THAT CAN STILL BE ON ITS WAY.
//
// The browser takes its snapshot the moment `beforeprint` returns. A page that draws a chart, reads a canvas or fetches anything may print half-made, and offline it may not print at all.
// So the closure of imports of what the paper pages are built from (PrintKinds.tsx and the one-page plan) must hold no chart, no canvas and no network call. The menu fetches the chunk of
// the other pages BEFORE it prints, which the e2e print spec proves end to end; this guard keeps the pages themselves from growing something the snapshot cannot wait for.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')

// A VALUE import only: an `import type` statement is erased by the compiler and brings nothing into the page.
const RELATIVE_IMPORT = /^(?!import type\b)[^\n]*?(?:from|import\()\s*['"](\.{1,2}\/[^'"]+)['"]/gm
// `lazy` is held for the new pages only: the one-page plan shares FirmSection.tsx with a screen block that is lazy, and that file is not what prints.
const FORBIDDEN: { name: string; re: RegExp; kindsOnly?: boolean }[] = [
  { name: 'the chart library', re: /['"]recharts['"]/ },
  { name: 'a chart component', re: /components\/charts|from\s+['"]\.{1,2}\/charts?\b/ },
  { name: 'a canvas', re: /<canvas\b|getContext\(/ },
  { name: 'a network call', re: /\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon/ },
  { name: 'a lazy boundary (a page that may still be loading)', re: /\blazy\(|<Suspense\b/, kindsOnly: true },
]

function resolve(from: string, spec: string): string | null {
  const base = join(dirname(from), spec)
  for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) if (existsSync(base + ext)) return base + ext
  return null
}

/** The files a module reaches by relative import (type-only imports included: they cost nothing and a looser walk is a safer one). */
export function closure(entry: string): string[] {
  const seen = new Set<string>()
  const todo = [entry]
  while (todo.length > 0) {
    const file = todo.pop()!
    if (seen.has(file)) continue
    seen.add(file)
    const src = blankComments(readFileSync(file, 'utf8'))
    for (const m of src.matchAll(RELATIVE_IMPORT)) {
      const next = resolve(file, m[1])
      if (next) todo.push(next)
    }
  }
  return [...seen]
}

export function violations(files: readonly string[], kinds: boolean): string[] {
  const out: string[] = []
  for (const f of files) {
    // A type-only import is erased by the compiler: it brings no chart into the page.
    const src = blankComments(readFileSync(f, 'utf8')).replace(/^import type[^\n]*$/gm, '')
    for (const { name, re, kindsOnly } of FORBIDDEN) if ((!kindsOnly || kinds) && re.test(src)) out.push(`${relative(srcDir, f)}: ${name}`)
  }
  return out
}

const KINDS_ENTRY = join(srcDir, 'components', 'results', 'PrintKinds.tsx')
const PLAN_ENTRY = join(srcDir, 'components', 'results', 'PrintPlan.tsx')

describe('the paper pages hold nothing a snapshot cannot wait for', () => {
  for (const [name, entry, kinds] of [['the year-by-year and sources pages', KINDS_ENTRY, true], ['the one-page plan', PLAN_ENTRY, false]] as const) {
    it(`${name}: no chart, no canvas, no network, no lazy boundary`, () => {
      const files = closure(entry)
      expect(files.length, 'the walk reaches real files (a floor, so an empty walk cannot pass)').toBeGreaterThan(3)
      expect(violations(files, kinds)).toEqual([])
    })
  }

  it('a canary: the detector sees what it is for, and only that', () => {
    const fixture = join(srcDir, 'lib', 'printKinds.fixture.tmp')
    const probes: Record<string, string> = {
      'the chart library': "import { Line } from 'recharts'",
      'a chart component': "import { LineChart } from '../charts/LineChart'",
      'a canvas': 'const c = <canvas />',
      'a network call': 'await fetch(url)',
      'a lazy boundary (a page that may still be loading)': "const X = lazy(() => import('./X'))",
    }
    for (const { name, re } of FORBIDDEN) {
      expect(re.test(probes[name]), name).toBe(true)
      expect(re.test("import { formatMoney } from '../../lib/money'"), `${name} on a clean line`).toBe(false)
    }
    expect(fixture).toBeTruthy()
  })
})

describe('every kind is named in both languages', () => {
  it('has a name and a hint for each, and a heading for each but the plan', () => {
    for (const lang of ['fr', 'en'] as const) {
      const c = PRINT_MENU_COPY[lang]
      for (const kind of PRINT_KINDS) {
        expect(c.kinds[kind].name.length, `${lang} ${kind} name`).toBeGreaterThan(0)
        expect(c.kinds[kind].hint.length, `${lang} ${kind} hint`).toBeGreaterThan(0)
        if (kind !== 'summary') expect(c.headings[kind].length, `${lang} ${kind} heading`).toBeGreaterThan(0)
      }
    }
  })
})
