import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { everyoneAt, runScenario } from '../engine/retireAt.ts'
import { yearCsv, type YearCsvHeads } from './yearCsv.ts'

const heads: YearCsvHeads = { year: 'Année', ages: 'Âges', income: 'Revenu', tax: 'Impôt', spending: 'Dépenses', shortfall: 'Manque', netWorth: 'Valeur nette' }
const result = runScenario(GOLDEN_HOUSEHOLD, GOLDEN_ASSUMPTIONS, everyoneAt(GOLDEN_HOUSEHOLD, 62), 62)

describe('the per-year spreadsheet', () => {
  const csv = yearCsv(result, heads, 'fr')
  const lines = csv.replace('﻿', '').trimEnd().split('\r\n')

  it('has one header and one line per year, behind a BOM', () => {
    expect(csv.startsWith('﻿')).toBe(true)
    expect(lines).toHaveLength(result.rows.length + 1)
    expect(lines[0]).toBe('Année;Âges;Revenu;Impôt;Dépenses;Manque;Valeur nette')
  })

  it('prints whole dollars that match the table, with no separators inside a figure', () => {
    const row = result.rows[0]
    const cells = lines[1].split(';')
    expect(cells[0]).toBe(String(row.year))
    expect(Number(cells[6])).toBe(Math.round(row.household.netWorthEnd))
    expect(cells.every((c) => !/[\s$]/.test(c.replace(' / ', '')))).toBe(true)
  })

  it('uses a comma in English and quotes a field that holds the separator', () => {
    expect(yearCsv(result, { ...heads, year: 'Year, AD' }, 'en').split('\r\n')[0]).toContain('"Year, AD",')
  })
})
