import { describe, expect, it } from 'vitest'
import { citedLeaves } from '../engine/params/cited.ts'
import { KNOWN } from '../engine/params/index.ts'
import { knownYears, paramRows } from './paramsView.ts'

describe('the parameters panel shows exactly what the engine reads', () => {
  it('one row per cited figure of each known year, none invented, none dropped', () => {
    for (const year of knownYears()) {
      expect(paramRows(year).map((r) => r.path)).toEqual(citedLeaves(KNOWN[year]).map((l) => l.path))
    }
  })

  it('every row names its page, over https, and the day it was read', () => {
    for (const row of paramRows(knownYears()[0])) {
      expect(row.url, row.path).toMatch(/^https:\/\//)
      expect(row.title, row.path).not.toBe('')
      expect(row.retrieved, row.path).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('an unconfirmed figure carries its reason, a confirmed one carries none', () => {
    const rows = paramRows(knownYears()[0])
    expect(rows.some((r) => r.verify)).toBe(true)
    expect(rows.some((r) => !r.verify)).toBe(true)
  })

  it('a year with no published figures has no rows', () => {
    expect(paramRows(1900)).toEqual([])
  })
})
