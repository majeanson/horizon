import { citedLeaves } from '../src/engine/params/cited.ts'
import { KNOWN } from '../src/engine/params/index.ts'

// THE FIGURE WATCH — the parts of `npm run figures:check` that need no network, so a unit test can hold them (scripts/figureWatch.test.mjs, against saved snippets of the real pages).
// docs/figure-diff-job.md says why: `sources:check` notices a page that is GONE, not a number that MOVED on a page still there.
//
// A watch is a figure's path in the year's params and a function that reads that figure's number out of the page's text. The URL is never repeated here: it is the figure's own `source.url`, so a
// figure re-cited elsewhere is watched at its new address. The job only reports: moving a figure is a human decision (the new number may belong to next year's params file).

export const WATCH_YEAR = 2026

/** A page's visible text: tags and scripts gone, the non-breaking spaces of a French number made plain, runs of white space one space. */
export function pageText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
    .replace(/[  ]/g, ' ')
    .replace(/\s+/g, ' ')
}

/** « 8,157 » or « 762.50 » (English print) → a number. */
export function englishNumber(s: string): number {
  return Number(s.replace(/,/g, ''))
}

/** « 2 242,20 » (French print: spaces group, a comma is the decimal) → a number. */
export function frenchNumber(s: string): number {
  return Number(s.replace(/\s/g, '').replace(',', '.'))
}

export interface Watch {
  /** The figure's path in the year's params. */
  path: string
  /** What the page prints now, or null when the sentence the extractor reads is no longer there (« unchecked », never « unchanged »). */
  extract: (text: string) => number | null
}

const first = (text: string, re: RegExp, parse: (s: string) => number): number | null => {
  const m = re.exec(text)
  return m ? parse(m[1]) : null
}

export const WATCHES: readonly Watch[] = [
  // CRA, « How much you can get — Canada child benefit »: each July.
  { path: 'childBenefits.ccb.maxUnder6', extract: (t) => first(t, /under 6 years of age: \$([\d,]+(?:\.\d+)?) per year/i, englishNumber) },
  { path: 'childBenefits.ccb.max6to17', extract: (t) => first(t, /6 to 17 years of age: \$([\d,]+(?:\.\d+)?) per year/i, englishNumber) },
  { path: 'childBenefits.ccb.threshold1', extract: (t) => first(t, /Less than \$([\d,]+(?:\.\d+)?) You get the maximum benefit amount/i, englishNumber) },
  // ESDC, « Maximum Benefit Amounts and Related Figures », the latest quarter: each quarter.
  { path: 'oas.monthly65to74', extract: (t) => first(t, /Old Age Security pension \(age 65 to 74\)(?: Footnote \d+(?: ,)?)* \$([\d,]+\.\d+)/i, englishNumber) },
  { path: 'oas.monthly75plus', extract: (t) => first(t, /Old Age Security pension \(age 75 and over\)(?: Footnote \d+(?: ,)?)* \$([\d,]+\.\d+)/i, englishNumber) },
  // The CHSLD fees page of a Santé Québec institution: each 1 January.
  { path: 'longTermCare.chsldPrivateRoom', extract: (t) => first(t, /Chambre privée ([\d ]+,\d\d) \$\/mois/i, frenchNumber) },
  { path: 'longTermCare.chsldSemiPrivateRoom', extract: (t) => first(t, /Chambre semi-privée ([\d ]+,\d\d) \$\/mois/i, frenchNumber) },
  { path: 'longTermCare.chsldWard', extract: (t) => first(t, /Salle ([\d ]+,\d\d) \$\/mois/i, frenchNumber) },
]

export interface WatchedFigure extends Watch {
  /** What the params hold. */
  held: number
  url: string
}

/** The watch list resolved against the params: each figure's held value and the page it cites. A watch whose path is not a cited number is an error (a renamed figure must not silently stop being watched). */
export function watched(year = WATCH_YEAR): WatchedFigure[] {
  const leaves = new Map(citedLeaves(KNOWN[year]).map((l) => [l.path, l.cited]))
  return WATCHES.map((w) => {
    const cited = leaves.get(w.path)
    if (cited === undefined || typeof cited.value !== 'number') throw new Error(`figure watch: ${w.path} is not a cited number in the ${year} params`)
    return { ...w, held: cited.value, url: cited.source.url }
  })
}

export type Verdict = 'same' | 'CHANGED' | 'unchecked'

export function compare(held: number, printed: number | null): Verdict {
  if (printed === null || !Number.isFinite(printed)) return 'unchecked'
  return Math.abs(printed - held) < 0.005 ? 'same' : 'CHANGED'
}

/**
 * The page ESDC will publish for the quarter AFTER the one cited (`…/2026-quarterly-october-december.html` → `…/2027-quarterly-january-march.html`), or null when the URL is not of that shape.
 * Its existence is the signal that the OAS and GIS figures moved: the cited page never changes, the next one simply appears.
 */
export function nextQuarterUrl(url: string): string | null {
  const quarters = ['january-march', 'april-june', 'july-september', 'october-december']
  const m = /(\d{4})-quarterly-(january-march|april-june|july-september|october-december)\.html$/.exec(url)
  if (m === null) return null
  const i = quarters.indexOf(m[2])
  const [year, next] = i === 3 ? [Number(m[1]) + 1, 0] : [Number(m[1]), i + 1]
  return url.replace(m[0], `${year}-quarterly-${quarters[next]}.html`)
}
