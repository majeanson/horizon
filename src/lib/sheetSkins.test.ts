import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { blankComments } from './buildGuardScan.ts'

// THE SHEET'S DRAWING DRAWS, IT DOES NOT COMPUTE. It reads the sheet view (lib/sheetView.ts), where every figure is already text: a component that
// formatted a number itself — or did arithmetic on a figure, or read the model's raw numbers — could show a figure the view does not. So the drawing
// files may not format money, percentages or ages, round, or reach into the engine; they may only lay out what the view hands them.
//
// Planted (2026-10-10): a `formatMoney` call and a `Math.round` added to a skin each turn this red, and the comment-only mention stays green.

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'components', 'sheet')
const SKINS = ['SheetSerious.tsx', 'StatBar.tsx']

/** What a drawing file must not contain: a formatter, a rounding, a conversion of a number to text, an engine import. */
export const FORBIDDEN = /\b(formatMoney|formatCompactMoney|formatPct|formatDecimal|formatYear|formatYearAge|Intl|toLocaleString|toFixed|Math\.(round|floor|ceil)|parseFloat|Number\()|from '(\.\.\/)+engine/

function violations(source: string): string[] {
  return blankComments(source)
    .split('\n')
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => FORBIDDEN.test(line))
    .map(({ line, n }) => `${n}: ${line.trim()}`)
}

describe('the sheet drawing formats no figure of its own', () => {
  for (const file of SKINS) {
    it(`${file} draws what the view hands it`, () => {
      expect(violations(readFileSync(join(root, file), 'utf8')), 'a figure is formatted in lib/sheetView.ts, once').toEqual([])
    })
  }

  it('the detector sees a formatter, a rounding and an engine import, and not a comment that names one', () => {
    expect(violations("const x = formatMoney(n, lang)\n")).toHaveLength(1)
    expect(violations("const w = Math.round(fill * 100)\n")).toHaveLength(1)
    expect(violations("import { project } from '../../engine/projection'\n")).toHaveLength(1)
    expect(violations("// formatMoney lives in the view\n/* Math.round too */\nconst ok = 1\n")).toEqual([])
  })

  it('the sheet draws the view built from its own words', () => {
    const serious = readFileSync(join(root, 'SheetSerious.tsx'), 'utf8')
    expect(serious).toMatch(/sheetView\(model, lang, SHEET_COPY\[lang\]/)
  })
})
