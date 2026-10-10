import type { LeverId } from '../../engine/levers'
import type { Assumptions, Household } from '../../engine/types'
import { useLang } from '../../i18n'
import type { Care } from '../../lib/careModel'
import { FUTURE_COPY } from '../../lib/futureCopy'
import { LEVERS_COPY } from '../../lib/leversCopy'
import { RESULTS_COPY } from '../../lib/resultsCopy'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'
import { SectionHeader } from '../SectionHeader'
import { CareView } from './CareView'

// « Préparer l'avenir » — what could happen that the plan does not yet say (a late-life care cost), and what the plan itself points at for
// this year. Nothing here is a new calculation: the care is a what-if on the dated expenses, the lever and the figure to confirm are the
// ones « Ajuster » and « Préciser le calcul » already work out, said once more in the order a person would act on them; the decisions that
// have their own home (the order of the accounts, when to start the pensions) are a link, not a copy.

export interface FutureMover {
  id: string
  name: string
  /** How many years the answer moves if the figure were off. */
  years: number
}

export function FutureView({
  household,
  assumptions,
  care,
  onCare,
  earliest,
  age,
  maxAge,
  retiredNow,
  lever,
  movers,
  moversPending,
  pensionsOpen,
  onGo,
}: {
  household: Household
  assumptions: Assumptions
  care: Care
  onCare: (care: Care | null) => void
  earliest: number | null
  age: number
  maxAge: number
  retiredNow: boolean
  /** The change that brings the age forward most: undefined while the levers are worked out, null when none does. */
  lever: { id: LeverId; yearsGained: number; earliest: number } | null | undefined
  movers: readonly FutureMover[]
  moversPending: boolean
  pensionsOpen: boolean
  /** A link to a section of another view. */
  onGo: (view: 'adjust' | 'strategies', id: string) => void
}) {
  const { lang } = useLang()
  const f = FUTURE_COPY[lang]
  const lc = LEVERS_COPY[lang]
  const rc = RESULTS_COPY[lang]

  return (
    <section className="arc" aria-label={rc.tabs.future}>
      <section id="soins" className="results-section" aria-label={f.care.title}>
        <SectionHeader title={f.care.title} />
        <CareView household={household} assumptions={assumptions} care={care} onCare={onCare} earliest={earliest} age={age} maxAge={maxAge} />
      </section>

      <section id="annee" className="results-section" aria-label={f.year.title}>
        <SectionHeader title={f.year.title} subtitle={f.year.hint} />
        <div className="surface future-year">
          {!retiredNow && (
            <div className="verdict__range">
              <p className="verdict__range-title">{f.year.leverTitle}</p>
              <p>
                {lever === undefined ? f.year.leverPending : lever === null ? f.year.leverNone : `${lc.names[lever.id]} — ${lc.gain(lever.yearsGained, lever.earliest)}`}
              </p>
              <Cluster>
                <Chip icon="caret-down-bold" onClick={() => onGo('adjust', 'ajuster')}>
                  {rc.nav.ajuster}
                </Chip>
              </Cluster>
            </div>
          )}
          {!retiredNow && (
            <div className="verdict__range">
              <p className="verdict__range-title">{f.year.confirmTitle}</p>
              {moversPending ? (
                <p>{f.year.confirmPending}</p>
              ) : movers.length === 0 ? (
                <p>{f.year.confirmNone}</p>
              ) : (
                <ul className="levers__list">
                  {movers.slice(0, 2).map((m) => (
                    <li key={m.id} className="levers__item">
                      <span>{m.name}</span>{' '}
                      <span className="mono">{rc.refine.swing(m.years)}</span> <Chip to={`/profil?fact=${encodeURIComponent(m.id)}`}>{rc.refine.find}</Chip>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="verdict__range">
            <p className="verdict__range-title">{f.year.moreTitle}</p>
            <Cluster>
              <Chip icon="caret-down-bold" onClick={() => onGo('strategies', 'ordre')}>
                {rc.orders.title}
              </Chip>
              {pensionsOpen && (
                <Chip icon="caret-down-bold" onClick={() => onGo('strategies', 'rentes')}>
                  {f.year.pensions}
                </Chip>
              )}
            </Cluster>
          </div>
        </div>
      </section>
    </section>
  )
}
