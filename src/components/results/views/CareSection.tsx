import { useLang } from '../../../i18n'
import { formatCare } from '../../../lib/careModel'
import { FUTURE_COPY } from '../../../lib/futureCopy'
import { MAX_AGE } from '../../../lib/resultsModel'
import type { ResultsModel } from '../../../lib/useResultsPage'
import { CareView } from '../CareView'
import { SectionHeader } from '../../SectionHeader'

// « Et si les dernières années coûtaient plus cher ? » — the one what-if about LIFE rather than the plan, at the foot of « Essayer » (it was the « Avenir » view).
// Loaded on its own, with its words: the care copy and the care model arrive only for a reader who gets this far.
export function CareSection({ m }: { m: ResultsModel }) {
  const { lang } = useLang()
  const f = FUTURE_COPY[lang]
  const { profile, assumptions, setParam, firstAge, earliest, care } = m
  return (
    <section id="soins" className="results-section" aria-label={f.care.title}>
      <SectionHeader title={f.care.title} />
      <CareView
        household={profile.household}
        assumptions={assumptions}
        care={care}
        onCare={(c) => setParam('care', c === null ? null : formatCare(c))}
        earliest={earliest}
        age={earliest ?? Math.min(MAX_AGE, Math.max(firstAge, profile.household.persons[0].retirementAge))}
        maxAge={MAX_AGE}
      />
    </section>
  )
}
