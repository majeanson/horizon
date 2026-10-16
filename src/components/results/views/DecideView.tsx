import { lazy, Suspense, type ReactNode } from 'react'
import { Accordion, AccordionItem, type AccordionOpen } from '../../Accordion'
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
import { balanceRelevant, fonteRelevant, leverPruned, orderRelevant } from '../../../lib/relevance'
import { SPOUSE_BALANCE_COPY } from '../../../lib/spouseBalanceCopy'
import { useBracketFill } from '../../../lib/useBracketFill'
import { useParamChoice } from '../../../lib/useParamChoice'
import { STRATS, type Essai, type ResultsModel, type Strat } from '../../../lib/useResultsPage'
import { useSpouseBalance } from '../../../lib/useSpouseBalance'
import { useWithdrawalOrders } from '../../../lib/useWithdrawalOrders'
import type { LeverId } from '../../../engine/levers'

type LeverRow = { id: LeverId; earliest: number | null; yearsGained: number | null; endGain: number | null }
const LEVER_PLACEHOLDERS: LeverRow[] = (['spend10', 'save500', 'returns1', 'pensions70'] as const).map((id) => ({ id, earliest: null, yearsGained: null, endGain: null }))

const CareSection = lazy(() => import('./CareSection').then((m) => ({ default: m.CareSection })))

// The « decide » view of the results page (« Décider ») — what to DO about the answer, in two steps on one flat page, no switch inside it:
//   1 · « Essayer un changement » — the changes ranked by the years they gain, and three what-ifs (the saving an age needs, the spending that moves it, a late-life care)
//       that open one at a time under the list (an accordion kept in the address, `?essai=`; each runs its projections only while open).
//   2 · « Choisir comment » — when to start the QPP and the OAS, in which order to draw the accounts, how far to melt the RRSP, whether to even out two RRSPs: the strategies, read ONE AT A
//       TIME (components/Accordion.tsx; the address keeps which, `?strat=`). A strategy that changes little for this household (lib/relevance.ts) closes to its title and one line saying so.
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
  // The ONE comparison behind each strategy, asked here: the view reads it to decide whether the block is worth opening, and the panel draws it.
  const isCouple = profile.household.persons.length > 1
  const fill = useBracketFill(profile.household, assumptions, firstAge)
  const orders = useWithdrawalOrders(profile.household, assumptions, age, firstAge)
  const balance = useSpouseBalance(profile.household, assumptions, age, firstAge)
  const fontePruned = fill.value !== null && !fonteRelevant(fill.value)
  const ordrePruned = orders.value !== null && !orderRelevant(orders.value)
  const equilibrePruned = isCouple && balance.value !== null && !balanceRelevant(balance.value.balance)
  const rows: LeverRow[] = levers?.levers ?? LEVER_PLACEHOLDERS
  // The top lever always stays out; the ones that move neither the age nor the nest go under one fold at the end of the list.
  const quiet = levers === undefined ? [] : rows.filter((l, i) => i > 0 && leverPruned(l))
  const anyPruned = fontePruned || ordrePruned || equilibrePruned || (!retiredNow && quiet.length > 0)
  // The strategies this household has (no pensions block once every start is behind it, no balance for one person), one open at a time: the address's, else the first.
  const stratIds: Strat[] = STRATS.filter((s) => (s === 'rentes' ? state.pensionsOpen : s === 'equilibre' ? isCouple : true))
  const stratOpen: AccordionOpen = showAll ? 'all' : m.strat === undefined ? (stratIds[0] ?? null) : m.strat !== null && stratIds.includes(m.strat) ? m.strat : null
  const firstPruned = stratIds.find((s) => (s === 'ordre' && ordrePruned) || (s === 'fonte' && fontePruned) || (s === 'equilibre' && equilibrePruned)) ?? null
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
            <Chip
              onClick={() => {
                const open = !showAll
                setTout(open ? '1' : 'off')
                // What this opens may be far down the page: for most households no lever is quiet, so the only thing that unfolds is a strategy that
                // changed little, screens under this chip on a phone — a tap that changes nothing in sight read as a tap that did nothing (2026-10-15).
                // Land on the first thing it opened; closing never moves the page.
                if (open && quiet.length === 0 && firstPruned !== null) m.scrollTo(firstPruned)
              }}
            >
              {showAll ? rc.decide.showLess : rc.decide.showAll}
            </Chip>
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

        {/* The strategies, one open at a time. A strategy pruned on an ANSWERED search (nothing worth a sentence for this household) closes to its title and
            the line that says so; its machinery mounts only when opened. « Tout montrer » opens every block, pruned or not. */}
        <Accordion ids={stratIds} open={stratOpen} onOpen={(id) => m.setStrat(id as Strat | null)}>
          {state.pensionsOpen && (
            <AccordionItem id="rentes" title={rc.pensions.title} subtitle={rc.pensions.hint} concept="rrq" className="results-section">
              <BridgePanel household={profile.household} assumptions={assumptions} names={names} />
            </AccordionItem>
          )}
          {/* The age is the answer's; when no age works, the plan's own. Never the « Combien épargner ? » box from another view. */}
          <AccordionItem id="ordre" title={rc.orders.title} concept="ordre" className="results-section" summary={ordrePruned ? rc.decide.ordreSame : undefined}>
            <OrderPanel orders={orders} />
          </AccordionItem>
          <AccordionItem id="fonte" title={bf.title} concept="fonte" className="results-section" summary={fontePruned ? rc.decide.fonteSame : undefined}>
            {panel}
          </AccordionItem>
          {/* A couple only: a one-person household has no second RRSP to even out against. */}
          {isCouple && (
            <AccordionItem id="equilibre" title={sb.title} concept="reer" className="results-section" summary={equilibrePruned ? rc.decide.equilibreSame : undefined}>
              <SpouseBalancePanel household={profile.household} age={age} names={names} balance={balance} />
            </AccordionItem>
          )}
        </Accordion>
      </section>
    </>
  )
}
