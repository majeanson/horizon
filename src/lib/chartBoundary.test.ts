import { readFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { blankComments, sourceFiles } from './buildGuardScan'

// THE CHART LIBRARY HAS ONE DOOR.
//
// Recharts is the biggest dependency in the app and the likeliest to be replaced one day. That stays a one-folder
// job only if nothing outside `components/charts/` ever names it: everything else draws through <LineChart> and the
// `ChartSeries` it takes. It also rides in its own lazy chunk (vite.config.ts), and an import from a page that loads
// on the first screen would drag it into the door — so this boundary and the bundle budget are the same promise.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const DOOR = ['components', 'charts'].join(sep) + sep

const IMPORT = /from\s+['"]recharts['"]|import\(\s*['"]recharts['"]\s*\)|require\(\s*['"]recharts['"]\s*\)/

describe('only components/charts/ imports the chart library', () => {
  const files = sourceFiles(srcDir)
  const importers = files.filter((f) => IMPORT.test(blankComments(readFileSync(f, 'utf8'))))

  it('walks a real source tree (a floor, so an empty walk cannot pass)', () => {
    expect(files.length).toBeGreaterThan(40)
  })

  it('the door itself does import it — otherwise this guard guards nothing', () => {
    expect(importers.map((f) => relative(srcDir, f)).some((f) => f.startsWith(DOOR))).toBe(true)
  })

  it('nothing outside the door does', () => {
    const outside = importers.map((f) => relative(srcDir, f)).filter((f) => !f.startsWith(DOOR))
    expect(outside, 'import the chart through components/charts, never the library').toEqual([])
  })

  it('a canary: the detector sees every spelling of an import', () => {
    for (const s of ["import { Line } from 'recharts'", 'import { Line } from "recharts"', "const m = await import('recharts')", "const m = require('recharts')"]) {
      expect(IMPORT.test(s), s).toBe(true)
    }
    expect(IMPORT.test("import { x } from './recharts-notes'")).toBe(false)
  })
})
