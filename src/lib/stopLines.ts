import type { StopWorking } from './stopWorking.ts'

// THE LINES OF « EN DATES » AFTER THE PEOPLE'S OWN YEARS: what the pensions cover in the first full year, once all of them are in pay, and from when they cover the
// spending by themselves. They used to be printed in a fixed order, so « once all your pensions have started, in 2065 » came BEFORE « from 2064, your pensions alone
// cover your spending » — true both, and read as a bug. Now they come in the order of their years, and the two that say the same thing (the pensions cover the
// spending by themselves, and they cover all of it once every one is in pay) are ONE line.

export interface StopLineWords {
  share: (pct: string, year: string) => string
  shareNone: (year: string) => string
  shareAll: (pct: string, year: string) => string
  coversFrom: (year: string) => string
  /** The pensions cover the spending alone from `covers`, and every one of them is in pay by `all`. */
  coversAll: (covers: string, all: string) => string
  neverCovers: string
}

export function stopLines(stop: StopWorking, w: StopLineWords, at: (year: number) => string, pct: (n: number) => string): string[] {
  const dated: { year: number; text: string }[] = [{ year: stop.firstYear, text: stop.pensionsStarted ? w.share(pct(stop.pensionShare), at(stop.firstYear)) : w.shareNone(at(stop.firstYear)) }]
  const all = stop.allStarted
  const covers = stop.pensionsCoverFrom
  if (all !== null && covers !== null && covers <= all.year && all.share >= 0.995) dated.push({ year: covers, text: w.coversAll(at(covers), at(all.year)) })
  else {
    if (all !== null) dated.push({ year: all.year, text: w.shareAll(pct(all.share), at(all.year)) })
    if (covers !== null) dated.push({ year: covers, text: w.coversFrom(at(covers)) })
  }
  dated.sort((a, b) => a.year - b.year)
  return [...dated.map((d) => d.text), ...(covers === null ? [w.neverCovers] : [])]
}
