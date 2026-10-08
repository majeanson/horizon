import { describe, expect, it } from 'vitest'
import { earningsFromPaste, parseAmount, parseEarningsPaste } from './pasteEarnings.ts'

// A PASTED RELEVÉ: whatever layout the copy arrives in, the years and amounts come out, and what could not be read is counted, not guessed.

describe('parseAmount', () => {
  it.each([
    ['52 300 $', 52300],
    ['52 300,50 $', 52300.5],
    ['52 300,50 $', 52300.5],
    ['52,300.50', 52300.5],
    ['52.300,50', 52300.5],
    ['1,234,567', 1234567],
    ['52,300', 52300],
    ['52,3', 52.3],
    ['0', 0],
    ['$ 1 234', 1234],
  ])('%s → %s', (text, dollars) => expect(parseAmount(text)).toBeCloseTo(dollars, 2))
  it('text that is not an amount is null', () => {
    expect(parseAmount('Année')).toBeNull()
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('$')).toBeNull()
  })
})

describe('parseEarningsPaste', () => {
  it('a copied table (tabs): one column of amounts', () => {
    const r = parseEarningsPaste('Année\tGains\n2019\t52 300 $\n2020\t54 100,50 $\n2021\t0 $', 2025)
    expect(r.rows).toEqual([
      { year: 2019, amounts: [52300] },
      { year: 2020, amounts: [54100.5] },
      { year: 2021, amounts: [0] },
    ])
    expect(r.skipped).toBe(1) // the heading
    expect(r.columns).toBe(1)
  })

  it('several columns, split on tabs, on « $ » or on wide gaps; the columns are counted', () => {
    const tabs = parseEarningsPaste('2020\t60 000 $\t58 700 $', 2025)
    const dollars = parseEarningsPaste('2020 60 000 $ 58 700 $', 2025)
    const gaps = parseEarningsPaste('2020   60 000   58 700', 2025)
    for (const r of [tabs, dollars, gaps]) expect(r.rows).toEqual([{ year: 2020, amounts: [60000, 58700] }])
    expect(tabs.columns).toBe(2)
  })

  it('a year after the last full year, before the plan began, or a bare number is not a row; a repeated year keeps the last line', () => {
    const r = parseEarningsPaste('2026 50 000\n1950 10 000\nTotal 123 456\n2019 40 000\n2019 41 000', 2025)
    expect(r.rows).toEqual([{ year: 2019, amounts: [41000] }])
    expect(r.skipped).toBe(3)
  })

  it('rows come out oldest first whatever the order pasted; a year inside a longer number is not a year', () => {
    const r = parseEarningsPaste('2021 3 000\n2019 1 000\n20200 99', 2025)
    expect(r.rows.map((x) => x.year)).toEqual([2019, 2021])
  })

  it('empty or text-only input reads nothing and says so', () => {
    expect(parseEarningsPaste('', 2025)).toEqual({ rows: [], skipped: 0, columns: 0 })
    const r = parseEarningsPaste('Relevé de participation\nVoici vos gains', 2025)
    expect(r.rows).toEqual([])
    expect(r.skipped).toBe(2)
  })
})

describe('earningsFromPaste', () => {
  it('takes the chosen column, rounds to the dollar, leaves out rows without it', () => {
    const rows = [
      { year: 2019, amounts: [100.4, 90] },
      { year: 2020, amounts: [200] },
    ]
    expect(earningsFromPaste(rows, 0)).toEqual({ 2019: 100, 2020: 200 })
    expect(earningsFromPaste(rows, 1)).toEqual({ 2019: 90 })
  })
})
