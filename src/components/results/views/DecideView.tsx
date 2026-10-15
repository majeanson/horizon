import { lazy, Suspense, useState, type ReactNode } from 'react'
import { BracketFillPanel } from '../BracketFillPanel'
import { BridgePanel } from '../BridgePanel'
import { OrderPanel } from '../OrderPanel'
import { SaveView } from '../SaveView'
import { SpendView } from '../SpendView'
import { SpouseBalancePanel } from '../SpouseBalancePanel'
import { Chip } from '../../Chip'
import { Fold } from '../../Fold'
import { SectionHeader } from '../../SectionHeader'
import { Skeleton } from '../../Skeleton'
import { BRACKET_FILL_COPY } from '../../../lib/bracketFillCopy'
import { FUTURE_COPY } from '../../../lib/futureCopy'
import { formatCompactMoney } from '../../../lib/money'
import { MAX_AGE } from '../../../lib/resultsModel'
import { fonteRelevant, leverPruned } from '../../../lib/relevance'
import { SPOUSE_BALANCE_COPY } from '../../../lib/spouseBalanceCopy'
import { useBracketFill } from '../../../lib/useBracketFill'
import { useParamChoice } from '../../../lib/useParamChoice'
import type { Essai, ResultsModel } from '../../../lib/useResultsPage'
import type { LeverId } from '../../../engine/levers'

type LeverRow = { id: LeverId; earliest: number | null; yearsGained: number | null; endGain: number | null }
const LEVER_PLACEHOLDERS: LeverRow[] = (['spend10', 'save500', 'returns1', 'pensions70'] as const).map((id) => ({ id, earliest: null, yearsGained: null, endGain: null }))

const CareSection = lazy(() => import('./CareSection').then((m) => ({ default: m.CareSection })))

// The « decide » view of the results page (« Décider ») — what to DO about the answer, in two steps on one flat page, no switch inside it:
//   1 · « Essayer un changement » — the changes ranked by the years they gain, and three what-ifs (the saving an age needs, the spending that moves it, a late-life care)
//       that open one at a time under the list (an accordion kept in the address, `?essai=`; each runs its projections only while open).
//   2 · « Choisir comment » — when to start the QPP and the OAS, in which order to draw the accounts, how far to melt the RRSP. Once every start is behind the household, nothing to choose.
// None of it edits an assumption (those live on Hypothèses) or a fact (Profil): a try is a try, and what is kept is said where it is kept. It reads the page's state through the one model object (lib/useResultsPage.ts).
export function DecideView({ m }: { m: ResultsModel }) {
  const { lang, rc, profile, state, retiredNow, assumptions, setParam, firstAge, earliest, nowOk, lc, levers, saveAge, spend, essai, setEssai, names } = m
  const age = earliest ?? Math.min(MAX_AGE, Math.max(firstAge, profile.household.persons[0].retirementAge))
  const bf = BRACKET_FILL_COPY[lang]
  const sb = SPOUSE_BALANCE_COPY[lang]
  // One what-if: a fold open when the address says so. The body is mounted only then, so a closed one costs no projection.
  const tryFold = (key: Essai, id: string, title: string, body: ReactNode) => (
    <Fold id={id} className="results-section try-fold" open={essai === key} onToggle={(open) => setEssai(open ? key : null)} mountOnOpen summary={title}>
      {body}
    </Fold>
  )
  // WHAT CHANGES LITTLE FOR THIS HOUSEHOLD FOLDS, never disappears (lib/relevance.ts). A search that has not answered prunes nothing, and `?tout=1` opens everything.
  const [tout, setTout] = useParamChoice('tout', ['off', '1'] as const, 'off')
  const showAll = tout === '1'
  // The ONE comparison of the RRSP's melting on this view: the section reads it to decide whether it is worth the page, and the panel draws it.
  const fill = useBracketFill(profile.household, assumptions, firstAge)
  const [fonteOpen, setFonteOpen] = useState(false)
  const fontePruned = fill.value !== null && !fonteRelevant(fill.value)
  const rows: LeverRow[] = levers?.levers ?? LEVER_PLACEHOLDERS
  // The top lever always stays out; the ones that move neither the age nor the nest go under one fold at the end of the list.
  const quiet = levers === undefined ? [] : rows.filter((l, i) => i > 0 && leverPruned(l))
  const anyPruned = fontePruned || (!retiredNow && quiet.length > 0)
  const leverRow = (l: LeverRow) => (
    <li key={l.id} className="levers__item">
      {/* The name is the door: a ranked change nobody can act on is a rumour. Two open their what-if just below; the other two live where they are set. */}
      {l.id === 'spend10' ? (
        <Chip onClick={() => m.goTo('decide', 'depenser')}>{lc.names[l.id]}</Chip>
      ) : l.id === 'save500' ? (
        <Chip onClick={() => m.goTo('decide', 'epargner')}>{lc.names[l.id]}</Chip>
      ) : l.id === 'returns1' ? (
        <Chip to="/hypotheses">{lc.names[l.id]}</Chip>
      ) : (
        <Chip onClick={() => m.goTo('decide', 'rentes')}>{lc.names[l.id]}</Chip>
      )}
      <span className="mono levers__result">
        {levers === undefined
          ? lc.pending
          : l.earliest === null
            ? lc.none
            : l.yearsGained === null
              ? lc.found(l.earliest)
              : l.yearsGained > 0
                ? lc.gain(l.yearsGained, l.earliest)
                : l.yearsGained === 0
                  ? lc.same(l.earliest)
                  : lc.later(-l.yearsGained, l.earliest)}
        {levers !== undefined && l.endGain !== null && Math.abs(l.endGain) >= 1000 && (
          <span className="levers__end">{lc.end((l.endGain > 0 ? '+' : '−') + formatCompactMoney(Math.abs(l.endGain), lang))}</span>
        )}
      </span>
    </li>
  )
  const panel = <BracketFillPanel household={profile.household} fill={fill} />
  return (
    <>
      <section className="arc" aria-label={rc.tabs.decide}>
        <section id="essayer" className="results-section" aria-label={rc.decide.tryTitle}>
          <SectionHeader title={rc.decide.tryTitle} subtitle={rc.decide.tryHint} concept="essayer" />
          {anyPruned && (
            <Chip onClick={() => setTout(showAll ? 'off' : '1')}>{showAll ? rc.decide.showLess : rc.decide.showAll}</Chip>
          )}
          {!retiredNow && (
            <div id="ajuster" className="surface">
              {/* The changes a household could make, each tried alone and ranked by the years it gains. */}
              <div className="verdict__range ajuster__levers">
                <p className="verdict__range-title">{lc.title}</p>
                <ul className="levers__list">{(showAll ? rows : rows.filter((l) => !quiet.includes(l))).map(leverRow)}</ul>
                {!showAll && quiet.length > 0 && (
                  <Fold summary={rc.decide.leversFold}>
                    <ul className="levers__list">{quiet.map(leverRow)}</ul>
                  </Fold>
                )}
                <p className="verdict__note">{lc.hint}</p>
              </div>
            </div>
          )}
          {tryFold(
            'save',
            'epargner',
            rc.questions.tabs.save,
            <SaveView household={profile.household} assumptions={assumptions} age={saveAge} onAge={(a) => setParam('age', String(a))} minAge={firstAge} maxAge={MAX_AGE} />,
          )}
          {!retiredNow &&
            tryFold(
              'spend',
              'depenser',
              rc.questions.tabs.spend,
              <SpendView household={profile.household} assumptions={assumptions} spend={spend} onSpend={(v) => setParam('spend', v === null ? null : String(v))} earliest={earliest} now={nowOk} maxAge={MAX_AGE} />,
            )}
          {/* The one what-if about LIFE rather than the plan: the last years costing more (a care). */}
          {tryFold(
            'care',
            'soins',
            FUTURE_COPY[lang].care.title,
            <Suspense fallback={<Skeleton count={3} />}>
              <CareSection m={m} />
            </Suspense>,
          )}
        </section>

        {state.pensionsOpen && (
          <section id="rentes" className="results-section" aria-label={rc.pensions.title}>
            <SectionHeader title={rc.pensions.title} subtitle={rc.pensions.hint} concept="rrq" />
            <BridgePanel household={profile.household} assumptions={assumptions} names={names} />
          </section>
        )}
        <section id="ordre" className="results-section" aria-label={rc.orders.title}>
          <SectionHeader title={rc.orders.title} concept="ordre" />
          {/* The age is the answer's; when no age works, the plan's own. Never the « Combien épargner ? » box from another view. */}
          <OrderPanel household={profile.household} assumptions={assumptions} age={age} firstAge={firstAge} />
        </section>
        <section id="fonte" className="results-section" aria-label={bf.title}>
          <SectionHeader title={bf.title} concept="fonte" />
          {/* Pruned only on an ANSWERED search that found nothing worth a sentence: the line says what the section means for this household and stays on the page; the machinery folds. */}
          {fontePruned && !showAll ? (
            <>
              <p className="answer__note">{rc.decide.fonteSame}</p>
              <Fold summary={rc.decide.fonteFold} open={fonteOpen} onToggle={setFonteOpen} mountOnOpen>
                {panel}
              </Fold>
            </>
          ) : (
            panel
          )}
        </section>
        {/* A couple only: a one-person household has no second RRSP to even out against. */}
        {profile.household.persons.length > 1 && (
          <section id="equilibre" className="results-section" aria-label={sb.title}>
            <SectionHeader title={sb.title} concept="reer" />
            <SpouseBalancePanel household={profile.household} assumptions={assumptions} age={age} firstAge={firstAge} names={names} />
          </section>
        )}
      </section>
    </>
  )
}
