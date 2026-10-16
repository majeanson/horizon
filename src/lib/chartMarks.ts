import type { ChartMarker } from '../components/charts/types.ts'

// SMALL DECISIONS THE CHARTS MAKE ABOUT THEIR OWN LABELS, WITHOUT A SCREEN. Which pension-start lines a picture shows (one shared line when both start together, none outside the years on
// screen) and what ages stand under a year on the axis were decided inside the panels; here they are plain functions, held by lib/chartMarks.test.ts.

type Mark = Pick<ChartMarker, 'x' | 'label'> & { colour: 'accent'; named: true }

/**
 * One marker per start age; when both pensions start the same year they share one line and one label (« QPP + OAS »). A start outside the years on screen is not drawn.
 * `at` turns an age into the picture's x (a year for the lines, the age itself for the bars).
 */
export function startMarkers(starts: { rrq: number; oas: number }, inWindow: (age: number) => boolean, labels: { rrq: string; oas: string }, at: (age: number) => number): Mark[] {
  const mark = (x: number, label: string): Mark => ({ x, label, colour: 'accent', named: true })
  const { rrq: q, oas: o } = starts
  if (q === o) return inWindow(q) ? [mark(at(q), `${labels.rrq} + ${labels.oas}`)] : []
  return [...(inWindow(q) ? [mark(at(q), labels.rrq)] : []), ...(inWindow(o) ? [mark(at(o), labels.oas)] : [])]
}

/** What stands under a year on the axis: the ages of the people that year, « 62 / 58 » for a couple, one number for a person alone. */
export function agesByYear(rows: readonly { year: number; persons: Readonly<Record<string, { age: number } | undefined>> }[]): Map<number, string> {
  const map = new Map<number, string>()
  for (const row of rows) {
    map.set(
      row.year,
      Object.values(row.persons)
        .filter((p): p is { age: number } => p !== undefined)
        .map((p) => p.age)
        .join(' / '),
    )
  }
  return map
}
