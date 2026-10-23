import { describe, expect, it } from 'vitest'
import { stopLines, type StopLineWords } from './stopLines'
import type { StopWorking } from './stopWorking'

const words: StopLineWords = {
  share: (p, y) => `share ${p} ${y}`,
  shareNone: (y) => `none ${y}`,
  shareAll: (p, y) => `all ${p} ${y}`,
  coversFrom: (y) => `covers ${y}`,
  coversAll: (c, a) => `covers ${c} all ${a}`,
  neverCovers: 'never',
}
const at = (y: number) => String(y)
const pct = (n: number) => `${Math.round(n * 100)}%`
const base: StopWorking = { years: [], pensionsCoverFrom: null, firstYear: 2050, pensionShare: 0.2, pensionsStarted: true, allStarted: null, coverage: [] }

describe('stopLines', () => {
  it('puts the lines in the order of their years', () => {
    expect(stopLines({ ...base, allStarted: { year: 2065, share: 0.9 }, pensionsCoverFrom: 2060 }, words, at, pct)).toEqual(['share 20% 2050', 'covers 2060', 'all 90% 2065'])
  })
  it('merges « covers alone from 2064 » and « 100 % once all have started, in 2065 » into one line', () => {
    expect(stopLines({ ...base, allStarted: { year: 2065, share: 1.02 }, pensionsCoverFrom: 2064 }, words, at, pct)).toEqual(['share 20% 2050', 'covers 2064 all 2065'])
  })
  it('keeps both when the pensions only reach the spending after all of them have started', () => {
    expect(stopLines({ ...base, allStarted: { year: 2062, share: 0.9 }, pensionsCoverFrom: 2070 }, words, at, pct)).toEqual(['share 20% 2050', 'all 90% 2062', 'covers 2070'])
  })
  it('says no pension has started, and that the pensions never cover alone, last', () => {
    expect(stopLines({ ...base, pensionsStarted: false }, words, at, pct)).toEqual(['none 2050', 'never'])
  })
})
