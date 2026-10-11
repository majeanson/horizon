import { useLang } from '../../../i18n'
import { FUTURE_COPY } from '../../../lib/futureCopy'
import { LEVERS_COPY } from '../../../lib/leversCopy'
import { RESULTS_COPY } from '../../../lib/resultsCopy'
import type { ResultsModel } from '../../../lib/useResultsPage'
import { Chip } from '../../Chip'
import { Cluster } from '../../Layout'
import { SectionHeader } from '../../SectionHeader'

// « À faire cette année » — what the plan itself points at, at the foot of the answer: the one change that gains most (tried in « Essayer »), and the two
// decisions that have their own home on « Stratégies ». The figure to confirm first is NOT repeated here: « Préciser » just above names it.
export function YearSection({ m }: { m: ResultsModel }) {
  const { lang } = useLang()
  const f = FUTURE_COPY[lang]
  const lc = LEVERS_COPY[lang]
  const rc = RESULTS_COPY[lang]
  const { retiredNow, bestLever: lever, state, goTo } = m
  return (
    <section id="annee" className="results-section" aria-label={f.year.title}>
      <SectionHeader title={f.year.title} subtitle={f.year.hint} />
      <div className="surface future-year">
        {!retiredNow && (
          <div className="verdict__range">
            <p className="verdict__range-title">{f.year.leverTitle}</p>
            <p>{lever === undefined ? f.year.leverPending : lever === null ? f.year.leverNone : `${lc.names[lever.id]} — ${lc.gain(lever.yearsGained, lever.earliest)}`}</p>
            <Cluster>
              <Chip icon="caret-down-bold" onClick={() => goTo('adjust', 'ajuster')}>
                {rc.nav.ajuster}
              </Chip>
            </Cluster>
          </div>
        )}
        <div className="verdict__range">
          <p className="verdict__range-title">{f.year.moreTitle}</p>
          <Cluster>
            <Chip icon="caret-down-bold" onClick={() => goTo('strategies', 'ordre')}>
              {rc.orders.title}
            </Chip>
            {state.pensionsOpen && (
              <Chip icon="caret-down-bold" onClick={() => goTo('strategies', 'rentes')}>
                {f.year.pensions}
              </Chip>
            )}
          </Cluster>
        </div>
      </div>
    </section>
  )
}
