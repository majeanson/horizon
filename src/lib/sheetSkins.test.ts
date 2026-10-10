import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { blankComments } from './buildGuardScan.ts'

// THE SKINS OF THE SHEET DRAW, THEY DO NOT COMPUTE. Both skins read the sheet view (lib/sheetView.ts), where every figure is already text: a skin that
// formatted a number itself — or did arithmetic on a figure, or read the model's raw numbers — could show a figure the other skin does not. So the skin
// files may not format money, percentages or ages, round, or reach into the engine; they may only lay out what the view hands them.
//
// Planted (2026-10-10): a `formatMoney` call and a `Math.round` added to a skin each turn this red, and the comment-only mention stays green.

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'components', 'sheet')
const SKINS = ['SheetSerious.tsx', 'SheetRpg.tsx', 'StatBar.tsx']

/** What a drawing file must not contain: a formatter, a rounding, a conversion of a number to text, an engine import. */
export const FORBIDDEN = /\b(formatMoney|formatCompactMoney|formatPct|formatDecimal|formatYear|formatYearAge|Intl|toLocaleString|toFixed|Math\.(round|floor|ceil)|parseFloat|Number\()|from '(\.\.\/)+engine/

function violations(source: string): string[] {
  return blankComments(source)
    .split('\n')
    .map((line, i) => ({ line, n: i + 1 }))
    .filter(({ line }) => FORBIDDEN.test(line))
    .map(({ line, n }) => `${n}: ${line.trim()}`)
}

describe('the sheet skins format no figure of their own', () => {
  for (const file of SKINS) {
    it(`${file} draws what the view hands it`, () => {
      expect(violations(readFileSync(join(root, file), 'utf8')), 'a figure is formatted in lib/sheetView.ts, once, for both skins').toEqual([])
    })
  }

  it('the detector sees a formatter, a rounding and an engine import, and not a comment that names one', () => {
    expect(violations("const x = formatMoney(n, lang)\n")).toHaveLength(1)
    expect(violations("const w = Math.round(fill * 100)\n")).toHaveLength(1)
    expect(violations("import { project } from '../../engine/projection'\n")).toHaveLength(1)
    expect(violations("// formatMoney lives in the view\n/* Math.round too */\nconst ok = 1\n")).toEqual([])
  })

  it('both skins draw the SAME view builder, and each only its own words', () => {
    const serious = readFileSync(join(root, 'SheetSerious.tsx'), 'utf8')
    const rpg = readFileSync(join(root, 'SheetRpg.tsx'), 'utf8')
    expect(serious).toMatch(/sheetView\(model, lang, SHEET_COPY\[lang\]/)
    expect(rpg).toMatch(/sheetView\(model, lang, RPG_COPY\[lang\]/)
    expect(serious).not.toMatch(/RPG_COPY/)
    expect(rpg).not.toMatch(/SHEET_COPY/)
  })

  it('the adventure skin is loaded on demand: the page lazy-imports it and the serious one is static', () => {
    const page = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'pages', 'Fiche.tsx'), 'utf8')
    expect(page).toMatch(/lazy\(\(\) => import\('\.\.\/components\/sheet\/SheetRpg'\)/)
    expect(page).toMatch(/import \{ SheetSerious \} from/)
    expect(page).not.toMatch(/import \{ SheetRpg \} from/)
  })
})
