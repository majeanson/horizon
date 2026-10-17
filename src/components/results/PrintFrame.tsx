import { longDate } from '../../lib/months'
import type { ResultsModel } from '../../lib/useResultsPage'

// The head and the foot every printed page carries, whichever kind it is (lib/printKind.ts): what it is, whose it is and when it was made — and, at the foot, that it is an
// estimate and which year's government figures it stands on. One home for both, so a new kind of page cannot drift from the plan's own.

export function PrintHead({ m, title }: { m: ResultsModel; title: string }) {
  const { rc, names, month, year } = m
  return (
    <header className="print-head">
      <p className="print-head__title">{title}</p>
      <p>
        {rc.out.printedOn(month, year)} · {names.join(' · ')}
      </p>
    </header>
  )
}

export function PrintFoot({ m }: { m: ResultsModel }) {
  const { rc, lang, vintage } = m
  return (
    <p className="print-foot">
      {rc.out.printFoot} {rc.out.vintage(vintage.year, longDate(vintage.newestRead, lang))}
    </p>
  )
}
