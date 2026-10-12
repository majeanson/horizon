import { useEffect, useRef, useState } from 'react'
import { useLang, useT } from '../../../i18n'
import type { AccountKind } from '../../../engine/types'
import { FUTURE_COPY } from '../../../lib/futureCopy'
import { LEVERS_COPY } from '../../../lib/leversCopy'
import { formatMoney } from '../../../lib/money'
import { BRACKET_FILL_COPY } from '../../../lib/bracketFillCopy'
import { fillNudge } from '../../../lib/bracketFillNudge'
import { orderNudge } from '../../../lib/orderNudge'
import { RESULTS_COPY } from '../../../lib/resultsCopy'
import { MAX_AGE } from '../../../lib/resultsModel'
import { useBracketFill } from '../../../lib/useBracketFill'
import { useWithdrawalOrders } from '../../../lib/useWithdrawalOrders'
import type { ResultsModel } from '../../../lib/useResultsPage'
import { Chip } from '../../Chip'
import { Cluster } from '../../Layout'
import { SectionHeader } from '../../SectionHeader'

// « À faire cette année » — what the plan itself points at, at the foot of the answer: the one change that gains most (tried in « Essayer »), and the two
// decisions that have their own home on « Stratégies ». The figure to confirm first is NOT repeated here: « Préciser » just above names it.
/**
 * One sentence when another order of drawing the accounts clearly beats the household's own (lib/orderNudge.ts) — the same six orders, the same ranking and the same sentence
 * as « Dans quel ordre puiser ? » on « Stratégies », said where the answer is read. The six orders are heavy (a search per order), so they are asked only once this block has
 * been scrolled into view: the answer and its chart never wait for them.
 */
function useSeen() {
  const box = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = box.current
    if (seen || !el) return
    if (typeof IntersectionObserver === 'undefined') return setSeen(true)
    const watch = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setSeen(true))
    watch.observe(el)
    return () => watch.disconnect()
  }, [seen])
  return { box, seen }
}

function OrderNudgeLine({ m }: { m: ResultsModel }) {
  const t = useT()
  const { lang } = useLang()
  const o = RESULTS_COPY[lang].orders
  const { profile, assumptions, firstAge, earliest } = m
  const { box, seen } = useSeen()
  // The same age as the table on « Stratégies »: the answer's, or the plan's own when no age works.
  const age = earliest ?? Math.min(MAX_AGE, Math.max(firstAge, profile.household.persons[0].retirementAge))
  const { value } = useWithdrawalOrders(profile.household, assumptions, age, firstAge, seen)
  const nudge = value === null ? null : orderNudge(value)
  const kinds: Record<AccountKind, string> = { nonReg: t.assumptions.returns.nonReg, rrsp: t.assumptions.returns.rrsp, tfsa: t.assumptions.returns.tfsa }
  return (
    <div ref={box} className="order-nudge">
      {value !== null && nudge !== null && (
        <p className="verdict__note" role="status">
          {o.better(value.outcomes[nudge.best].order.map((k) => kinds[k]).join(' → '), value.outcomes[nudge.best].earliestOk, value.outcomes[value.current].earliestOk, formatMoney(nudge.taxSaved, lang))}
        </p>
      )}
    </div>
  )
}

/** The same, for melting down the RRSP (lib/bracketFillNudge.ts): one sentence when a way of drawing it clearly beats the household's own plan. Asked once scrolled into view. */
function FillNudgeLine({ m }: { m: ResultsModel }) {
  const { lang } = useLang()
  const c = BRACKET_FILL_COPY[lang]
  const { profile, assumptions, firstAge, earliest } = m
  const { box, seen } = useSeen()
  const age = earliest ?? Math.min(MAX_AGE, Math.max(firstAge, profile.household.persons[0].retirementAge))
  const { value } = useBracketFill(profile.household, assumptions, age, firstAge, seen)
  const nudge = value === null ? null : fillNudge(value)
  return (
    <div ref={box} className="fill-nudge">
      {value !== null && nudge !== null && (
        <p className="verdict__note" role="status">
          {c.nudge(c.names[value.outcomes[nudge.best].choice ?? 'none'], value.outcomes[nudge.best].earliestOk, value.outcomes[value.current].earliestOk, formatMoney(nudge.taxSaved, lang))}
        </p>
      )}
    </div>
  )
}

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
          <OrderNudgeLine m={m} />
          <FillNudgeLine m={m} />
          <Cluster>
            <Chip icon="caret-down-bold" onClick={() => goTo('strategies', 'ordre')}>
              {rc.orders.title}
            </Chip>
            <Chip icon="caret-down-bold" onClick={() => goTo('strategies', 'fonte')}>
              {BRACKET_FILL_COPY[lang].title}
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
