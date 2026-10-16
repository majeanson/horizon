import { describe, expect, it } from 'vitest'
import { knownYear } from './params/index.ts'
import { allowanceMonthly, gisWithAllowanceSpouseMonthly, survivorAllowanceMonthly } from './oas.ts'

// THE PUBLISHED CURVES, READ BETWEEN THEIR POINTS AND PAST THEIR END. The Allowance, the Allowance for the Survivor and the GIS of a pensioner whose spouse gets the Allowance are read from the official tables
// as breakpoints (Tables 4 and 5, a row per $48 of income) and interpolated. The worked examples check the figures AT a few rows; Stryker found that nothing checked the lookup past the last row of the
// table (no test reached that line), nor that the line between two rows is the straight one. Both, and every breakpoint exactly, are held here against an independent calculation.

const R = knownYear(2026).oas
const cents = (x: number) => Math.round(x * 100) / 100

interface Curve {
  name: string
  points: Readonly<Record<number, number>>
  scale: number
  read: (income: number) => number
}
const CURVES: Curve[] = [
  { name: 'the Allowance (Table 4)', points: R.allowanceCurve, scale: R.allowanceMax / R.allowanceCurve[0], read: (i) => allowanceMonthly(i, R) },
  { name: 'the GIS beside the Allowance (Table 4)', points: R.gisAllowanceCurve, scale: R.allowanceMax / R.allowanceCurve[0], read: (i) => gisWithAllowanceSpouseMonthly(i, R) },
  { name: 'the Allowance for the Survivor (Table 5)', points: R.survivorAllowanceCurve, scale: R.survivorAllowanceMax / R.survivorAllowanceCurve[0], read: (i) => survivorAllowanceMonthly(i, R) },
]

for (const c of CURVES) {
  describe(c.name, () => {
    const xs = Object.keys(c.points).map(Number).sort((a, b) => a - b)

    it('has a table to read (a floor)', () => expect(xs.length).toBeGreaterThanOrEqual(5))

    it('at every published breakpoint it is the published figure, to the cent (below the cut-off the Allowance is read, past it nothing is paid)', () => {
      for (const x of xs) {
        const income = x * c.scale
        const expected = cents(c.points[x] * c.scale)
        const got = c.read(income)
        // the Allowance and the Survivor's Allowance are zero at and above their cut-off, whatever the table's last row says; the GIS curve has no cut-off of its own
        if (c.name.startsWith('the Allowance') && income >= R.allowanceCutoff) expect(got, `${x}`).toBe(0)
        else if (c.name.includes('Survivor') && income >= R.survivorAllowanceCutoff) expect(got, `${x}`).toBe(0)
        else expect(got, `${x}`).toBeCloseTo(expected, 2)
      }
    })

    it('between two breakpoints it is the straight line joining them (an independent interpolation)', () => {
      for (let i = 0; i + 1 < xs.length; i += 3) {
        const [a, b] = [xs[i], xs[i + 1]]
        const income = ((a + b) / 2) * c.scale
        const line = cents(((c.points[a] + c.points[b]) / 2) * c.scale)
        const got = c.read(income)
        const cutoff = c.name.includes('Survivor') ? R.survivorAllowanceCutoff : c.name.startsWith('the Allowance') ? R.allowanceCutoff : Infinity
        if (income < cutoff) expect(got, `between ${a} and ${b}`).toBeCloseTo(line, 1)
      }
    })

    it('never rises as income rises, and never goes below nothing', () => {
      let prev = Infinity
      for (let income = 0; income <= xs[xs.length - 1] * c.scale * 1.5; income += 97) {
        const v = c.read(income)
        expect(v, `${income}`).toBeGreaterThanOrEqual(0)
        expect(v, `${income}`).toBeLessThanOrEqual(prev + 0.011)
        prev = v
      }
    })

    it('far past the end of the table it is the table’s last figure (not an error, not a number invented from an index past the end)', () => {
      const last = c.points[xs[xs.length - 1]] * c.scale
      const got = c.read(10_000_000)
      const cutoff = c.name.includes('Survivor') || c.name.startsWith('the Allowance') ? 0 : null
      if (cutoff === 0) expect(got).toBe(0)
      else expect(got).toBeCloseTo(cents(last), 2)
      expect(Number.isFinite(got)).toBe(true)
    })

    it('a negative income is read as nothing (the top of the curve)', () => {
      expect(c.read(-5_000)).toBe(c.read(0))
    })
  })
}
