import { formatCare } from '../../../lib/careModel'
import { MAX_AGE } from '../../../lib/resultsModel'
import type { ResultsModel } from '../../../lib/useResultsPage'
import { CareView } from '../CareView'

// « Et si les dernières années coûtaient plus cher ? » — the one what-if about LIFE rather than the plan, the last of the three under « Décider » (it was the « Avenir » view).
// Loaded on its own, with its words: the care copy and the care model arrive only for a reader who opens it. The fold that holds it (DecideView) carries the title.
export function CareSection({ m }: { m: ResultsModel }) {
  const { profile, assumptions, setParam, firstAge, earliest, care } = m
  return (
    <CareView
      household={profile.household}
      assumptions={assumptions}
      care={care}
      onCare={(c) => setParam('care', c === null ? null : formatCare(c))}
      earliest={earliest}
      age={earliest ?? Math.min(MAX_AGE, Math.max(firstAge, profile.household.persons[0].retirementAge))}
      maxAge={MAX_AGE}
    />
  )
}
