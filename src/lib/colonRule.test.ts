import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { readScanned, sourceFiles } from './buildGuardScan'

// THE COLON RULE: a component never spells the colon between a label and its value; it reads `t.common.colon` (FR « libellé : valeur », U+00A0 before the
// colon; EN « label: value »). Nine components hard-coded the French one, so English screens — and screen readers, through the aria-labels of the slider's
// « Less / More » buttons, the ⓘ links, the strategy marks — said « Prudent : holds » and « Less : Spending » (the 2026-10-20 cloud review of the results).
// Copy files are held by frenchSpacing.test.ts; this holds the components and pages, where the colon is code's to place, never text to type.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const rootDir = join(srcDir, '..')
const ROOTS = [join(srcDir, 'components'), join(srcDir, 'pages')]

// file (repo-relative) → why its colon is its own. The reason IS the entry.
const ALLOWED = new Map<string, string>([])

// A no-break space (U+00A0 / U+202F) before a colon: in a component that is only ever French copy typed in place (code spaces with U+0020).
// `} : ${` and `} :</`: the colon spelled between a hole and the next one, or before a closing tag, in a template or in JSX text. `{' '}:`: the JSX spelling.
const HARD_COLON = /[  ]:|\} : \$\{|\} :<\/|\{['"][  ]['"]\}:/g

interface Site {
  file: string
  line: number
}

function hardColons(): Site[] {
  const out: Site[] = []
  for (const root of ROOTS) {
    for (const f of sourceFiles(root)) {
      if (!f.endsWith('.tsx')) continue
      const src = readScanned(f)
      for (const m of src.matchAll(HARD_COLON)) out.push({ file: relative(rootDir, f).split(sep).join('/'), line: src.slice(0, m.index).split('\n').length })
    }
  }
  return out
}

describe('the colon rule (a component reads t.common.colon, never types one)', () => {
  it('the detector sees every spelling and none of its look-alikes', () => {
    const fixture = [
      'aria-label={`${t.common.less} : ${label}`}', // 1 ← U+00A0
      'title={`${a} : ${b}`}', // 2 ← a plain space between two holes
      '<strong>{c.guide.document} :</strong>', // 3 ← JSX text before a closing tag
      "{name}{' '}: {value}", // 4 ← the JSX spelling
      "{name}{' '}: {value}", // 5
      '<p>{c.importance} : {v}</p>', // 6 ← U+202F
      'const x = ok ? a : b', // a ternary
      'const y = ok ? { a: 1 } : { b: 2 }', // a ternary of objects
      'title={`${a}${t.common.colon} ${b}`}', // the rule kept
      'const z = `${ok ? 1 : 2}`', // a ternary inside a hole
    ].join('\n')
    expect([...fixture.matchAll(HARD_COLON)].map((m) => fixture.slice(0, m.index).split('\n').length)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('walked the components (the scanner still works)', () => {
    expect(ROOTS.flatMap((r) => sourceFiles(r)).filter((f) => f.endsWith('.tsx')).length).toBeGreaterThan(100)
  })

  it('no component spells a colon between a label and its value', () => {
    const offenders = hardColons().filter((s) => !ALLOWED.has(s.file)).map((s) => `${s.file}:${s.line}`)
    expect(offenders, 'write `{label}{t.common.colon} {value}` (FR « libellé : valeur », EN « label: value ») — the colon is the language’s, not the component’s').toEqual([])
  })

  it('every ALLOWED entry still has a colon to excuse (no stale exceptions)', () => {
    const files = new Set(hardColons().map((s) => s.file))
    expect([...ALLOWED.keys()].filter((f) => !files.has(f))).toEqual([])
  })
})
