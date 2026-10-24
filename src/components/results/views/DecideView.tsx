import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Accordion, AccordionItem, type AccordionOpen } from '../../Accordion'
import { BracketFillPanel } from '../BracketFillPanel'
import { BridgePanel } from '../BridgePanel'
import { OrderPanel } from '../OrderPanel'
import { ReverseView } from '../ReverseView'
import { SaveView } from '../SaveView'
import { SpendView } from '../SpendView'
import { SpouseBalancePanel } from '../SpouseBalancePanel'
import { SpouseTimingFold } from '../SpouseTimingPanel'
import { Chip } from '../../Chip'
import { Fold } from '../../Fold'
import { PlanStoryFold } from '../../PlanStoryFold'
import { CARDS_COPY } from '../../../lib/cardsCopy'
import type { ConceptId } from '../../../lib/concepts'
import { SectionHeader } from '../../SectionHeader'
import { SkeletonLines, SkeletonStatus } from '../../Skeleton'
import { SkeletonChips, SkeletonText, SliderSkeleton } from '../../SkeletonShapes'
import { BRACKET_FILL_COPY } from '../../../lib/bracketFillCopy'
import { FUTURE_COPY } from '../../../lib/futureCopy'
import { formatMoney, formatSignedCompactMoney } from '../../../lib/money'
import { MAX_AGE } from '../../../lib/resultsModel'
import { balanceRelevant, fonteRelevant, leverPruned, orderRelevant } from '../../../lib/relevance'
import { REVERSE_COPY } from '../../../lib/reverseCopy'
import { SPOUSE_BALANCE_COPY } from '../../../lib/spouseBalanceCopy'
import { useBracketFill } from '../../../lib/useBracketFill'
import { useParamChoice } from '../../../lib/useParamChoice'
import { STRATS, type Essai, type ResultsModel, type Strat } from '../../../lib/useResultsPage'
import { useSpouseBalance } from '../../../lib/useSpouseBalance'
import { useWithdrawalOrders } from '../../../lib/useWithdrawalOrders'
import type { LeverId } from '../../../engine/levers'

type LeverRow = { id: LeverId; earliest: number | null; yearsGained: number | null; endGain: number | null }
const LEVER_PLACEHOLDERS: LeverRow[] = (['spend10', 'save500', 'returns1', 'pensions70'] as const).map((id) => ({ id, earliest: null, yearsGained: null, endGain: null }))
/** The order the last ranking came out in, in this tab: the next wait for it (the page left and come back to) waits in that order. In memory only. */
let lastLeverOrder: readonly LeverId[] | null = null

/** The four what-ifs under « Essayer un changement »: the card's id (the address of its anchor), the `?essai=` key it answers to and the pip it wears. */
const WHAT_IF = {
  viser: { essai: 'target', concept: 'depart' },
  epargner: { essai: 'save', concept: 'nid' },
  depenser: { essai: 'spend', concept: 'depenses' },
  soins: { essai: 'care', concept: 'coussin' },
} as const satisfies Record<string, { essai: Essai; concept: ConceptId }>
type WhatIf = keyof typeof WHAT_IF

const CareSection = lazy(() => import('./CareSection').then((m) => ({ default: m.CareSection })))

// The « decide » view of the results page (« Décider ») — what to DO about the answer, in two steps on one flat page, no switch inside it:
//   1 · « Essayer un changement » — the changes ranked by the years they gain, and three what-ifs (the saving an age needs, the spending that moves it, a late-life care)
//       that open one at a time under the list (an accordion kept in the address, `?essai=`; each runs its projections only while open).
//   2 · « Choisir comment » — when to start the QPP and the OAS, in which order to draw the accounts, how far to melt the RRSP, whether to even out two RRSPs: the strategies, read ONE AT A
//       TIME (components/Accordion.tsx; the address keeps which, `?strat=`). A strategy that changes little for this household (lib/relevance.ts) closes to its title and one line saying so.
// None of it edits an assumption (those live on Hypothèses) or a fact (Profil): a try is a try, and what is kept is said where it is kept. It reads the page's state through the one model object (lib/useResultsPage.ts).
export function DecideView({ m }: { m: ResultsModel }) {
  const { lang, rc, profile, state, retiredNow, assumptions, setParam, firstAge, earliest, nowOk, lc, levers, saveAge, spend, essai, essaiAll, setEssai, names } = m
  const age = earliest ?? Math.min(MAX_AGE, Math.max(firstAge, profile.household.persons[0].retirementAge))
  const bf = BRACKET_FILL_COPY[lang]
  const sb = SPOUSE_BALANCE_COPY[lang]
  // One what-if: a card, open when the address says so (`?essai=`, or every one with `?essai=all`). The body is mounted only then, so a closed one costs no projection.
  const cc = CARDS_COPY[lang].closed
  const tryFold = (id: WhatIf, title: string, body: ReactNode) => (
    <AccordionItem id={id} title={title} summary={cc[id]} concept={WHAT_IF[id].concept} nav={false} className="results-section try-fold">
      {body}
    </AccordionItem>
  )
  // WHAT CHANGES LITTLE FOR THIS HOUSEHOLD FOLDS, never disappears (lib/relevance.ts). A search that has not answered prunes nothing, and `?tout=1` opens everything.
  const [tout] = useParamChoice('tout', ['off', '1'] as const, 'off')
  const showAll = tout === '1'
  // The ONE comparison behind each strategy, asked here: the view reads it to decide whether the block is worth opening, and the panel draws it.
  const isCouple = profile.household.persons.length > 1
  const fill = useBracketFill(profile.household, assumptions, firstAge)
  const orders = useWithdrawalOrders(profile.household, assumptions, age, firstAge)
  const balance = useSpouseBalance(profile.household, assumptions, age, firstAge)
  const fontePruned = fill.value !== null && !fonteRelevant(fill.value)
  const ordrePruned = orders.value !== null && !orderRelevant(orders.value)
  const equilibrePruned = isCouple && balance.value !== null && !balanceRelevant(balance.value.balance)
  // The rows are keyed by their PLACE, not their change: when the ranking lands, each row's content changes where it stands and nothing moves (a ranked list keyed by
  // change jumped its rows past each other, 141 px, on arrival). While it runs the names wait as ghosts, so no order is shown that is not the ranking's.
  const rows: LeverRow[] =
    levers?.levers ?? (lastLeverOrder === null ? LEVER_PLACEHOLDERS : lastLeverOrder.map((id) => LEVER_PLACEHOLDERS.find((p) => p.id === id) ?? LEVER_PLACEHOLDERS[0]))
  useEffect(() => {
    if (levers !== undefined) lastLeverOrder = levers.levers.map((l) => l.id)
  }, [levers])
  // The top lever always stays out; the ones that move neither the age nor the nest go under one fold at the end of the list.
  const quiet = levers === undefined ? [] : rows.filter((l, i) => i > 0 && leverPruned(l))
  // The strategies this household has (no pensions block once every start is behind it, no balance for one person), one open at a time: the address's, else the first.
  const stratIds: Strat[] = STRATS.filter((s) => (s === 'rentes' ? state.pensionsOpen : s === 'equilibre' ? isCouple : true))
  const stratOpen: AccordionOpen = showAll ? 'all' : m.strat === undefined ? (stratIds[0] ?? null) : m.strat !== null && stratIds.includes(m.strat) ? m.strat : null
  // The what-ifs this household has, and which are open: every one under « Tout ouvrir » (`?essai=all`), else the address's.
  const whatIfIds = (Object.keys(WHAT_IF) as WhatIf[]).filter((id) => !retiredNow || id === 'epargner' || id === 'soins')
  const whatIfOpen: AccordionOpen = essaiAll ? 'all' : essai === null ? null : (whatIfIds.find((id) => WHAT_IF[id].essai === essai) ?? null)
  const leverRow = (l: LeverRow, place: number) => (
    <li key={place} className={levers === undefined ? 'skeleton-as-levers__item' : 'levers__item'}>
      {/* The name is the door: a ranked change nobody can act on is a rumour. Two open their what-if just below; the other two live where they are set. */}
      {levers === undefined ? (
        <SkeletonChips labels={[lc.names[l.id]]} />
      ) : l.id === 'spend10' ? (
        <Chip onClick={() => m.goTo('decide', 'depenser')}>{lc.names[l.id]}</Chip>
      ) : l.id === 'save500' ? (
        <Chip onClick={() => m.goTo('decide', 'epargner')}>{lc.names[l.id]}</Chip>
      ) : l.id === 'returns1' ? (
        <Chip to="/hypotheses">{lc.names[l.id]}</Chip>
      ) : (
        <Chip onClick={() => m.goTo('decide', 'rentes')}>{lc.names[l.id]}</Chip>
      )}
      <span className={(levers === undefined ? 'skeleton-as-mono' : 'mono') + ' levers__result'}>
        {/* While the levers are worked out, the result waits as its two lines (the years gained, what is left at the end), so the card is already its size. */}
        {levers === undefined ? (
          <>
            {l === rows[0] && <SkeletonStatus />}
            <SkeletonLines widths={[60]} />
            <span className="levers__end">
              <SkeletonLines widths={[70]} />
            </span>
          </>
        ) : l.earliest === null
            ? lc.none
            : l.yearsGained === null
              ? lc.found(l.earliest)
              : l.yearsGained > 0
                ? lc.gain(l.yearsGained, l.earliest)
                : l.yearsGained === 0
                  ? lc.same(l.earliest)
                  : lc.later(-l.yearsGained, l.earliest)}
        {levers !== undefined && l.endGain !== null && Math.abs(l.endGain) >= 1000 && (
          <span className="levers__end">{lc.end(formatSignedCompactMoney(l.endGain, lang))}</span>
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
          {/* A household that has already stopped has no age left to move, so the levers below that rank « retire sooner » are not offered to it: this is its way to see how much it can spend and what helps the money last. */}
          {retiredNow && <PlanStoryFold profile={profile} retired />}
          {!retiredNow && (
            // The changes a household could make, each tried alone and ranked by the years it gains. A card like every other on the page, open on arrival
            // (`?leviers=none` shuts it): « Tout fermer » must reach it, or it reads as the one card that will not close.
            <Accordion ids={['ajuster']} open={showAll ? 'all' : m.leversOpen ? 'ajuster' : null} onOpen={(id) => m.setLeversOpen(id !== null)}>
              <AccordionItem id="ajuster" title={lc.title} summary={cc.ajuster} concept="essayer" nav={false} className="results-section">
                <div className="verdict__range ajuster__levers">
                  <ul className="levers__list">{(showAll ? rows : rows.filter((l) => !quiet.includes(l))).map(leverRow)}</ul>
                  {!showAll && quiet.length > 0 && (
                    <Fold summary={rc.decide.leversFold}>
                      <ul className="levers__list">{quiet.map(leverRow)}</ul>
                    </Fold>
                  )}
                  <p className="verdict__note">{lc.hint}</p>
                </div>
              </AccordionItem>
            </Accordion>
          )}
          {/* The plan asked the other way round: an age to aim at, and what it would take to stop then. It shares the age (`?age=`) with « Combien épargner ? ». */}
          <Accordion ids={whatIfIds} open={whatIfOpen} onOpen={(id) => setEssai(id === null ? null : WHAT_IF[id as WhatIf].essai)}>
          {!retiredNow &&
            tryFold(
              'viser',
              REVERSE_COPY[lang].title,
              <ReverseView household={profile.household} assumptions={assumptions} age={saveAge} onAge={(a) => setParam('age', String(a))} minAge={firstAge} maxAge={MAX_AGE} expectWorks={earliest !== null && saveAge >= earliest} />,
            )}
          {tryFold(
            'epargner',
            rc.questions.tabs.save,
            <SaveView household={profile.household} assumptions={assumptions} age={saveAge} onAge={(a) => setParam('age', String(a))} minAge={firstAge} maxAge={MAX_AGE} expectNothing={earliest !== null && saveAge >= earliest} />,
          )}
          {!retiredNow &&
            tryFold(
              'depenser',
              rc.questions.tabs.spend,
              <SpendView household={profile.household} assumptions={assumptions} spend={spend} onSpend={(v) => setParam('spend', v === null ? null : String(v))} earliest={earliest} now={nowOk} maxAge={MAX_AGE} />,
            )}
          {/* The one what-if about LIFE rather than the plan: the last years costing more (a care). */}
          {tryFold(
            'soins',
            FUTURE_COPY[lang].care.title,
            <Suspense fallback={<CareSkeleton m={m} />}>
              <CareSection m={m} />
            </Suspense>,
          )}
          </Accordion>
        </section>

        {/* The strategies, one open at a time, under their own heading — the second step is said on the page, not only in this comment. A strategy pruned on an ANSWERED
            search (nothing worth a sentence for this household) closes to its title and the line that says so; its machinery mounts only when opened. « Tout ouvrir »
            (the map row) opens every block, pruned or not. */}
        <section id="choisir" className="results-section" aria-label={rc.decide.chooseTitle}>
        <SectionHeader title={rc.decide.chooseTitle} subtitle={rc.decide.chooseHint} concept="decider" />
        <Accordion ids={stratIds} open={stratOpen} onOpen={(id) => m.setStrat(id as Strat | null)}>
          {state.pensionsOpen && (
            <AccordionItem id="rentes" title={rc.pensions.title} subtitle={rc.pensions.hint} concept="rrq" className="results-section">
              <BridgePanel household={profile.household} assumptions={assumptions} names={names} />
              {/* A couple: the two start ages tried together, scored by the worse of both-alive and an early death. */}
              {isCouple && <SpouseTimingFold household={profile.household} assumptions={assumptions} names={names} />}
            </AccordionItem>
          )}
          {/* The age is the answer's; when no age works, the plan's own. Never the « Combien épargner ? » box from another view. */}
          <AccordionItem id="ordre" title={rc.orders.title} concept="ordre" className="results-section" summary={ordrePruned ? rc.decide.ordreSame : cc.ordre}>
            <OrderPanel orders={orders} />
          </AccordionItem>
          <AccordionItem id="fonte" title={bf.title} concept="fonte" className="results-section" summary={fontePruned ? rc.decide.fonteSame : cc.fonte}>
            {panel}
          </AccordionItem>
          {/* A couple only: a one-person household has no second RRSP to even out against. */}
          {isCouple && (
            <AccordionItem id="equilibre" title={sb.title} concept="reer" className="results-section" summary={equilibrePruned ? rc.decide.equilibreSame : cc.equilibre}>
              <SpouseBalancePanel household={profile.household} age={age} names={names} balance={balance} />
            </AccordionItem>
          )}
        </Accordion>
        </section>
      </section>
    </>
  )
}

/** « Et si les dernières années coûtaient plus cher ? » while its chunk arrives: the what-if's own controls and sentences (its words ride with this view), each as a ghost
 *  of itself — three sliders by their real labels, the reference chips, the notes, the answer, the door — so the card opens at the size it will have. */
function CareSkeleton({ m }: { m: ResultsModel }) {
  const { lang, t, earliest, firstAge, profile } = m
  const c = FUTURE_COPY[lang].care
  const money = (n: number) => formatMoney(n, lang)
  const age = earliest ?? Math.min(MAX_AGE, Math.max(firstAge, profile.household.persons[0].retirementAge))
  return (
    <div className="surface answer">
      <SkeletonStatus />
      <SliderSkeleton label={c.amount} />
      <SkeletonChips labels={Object.values(c.refs).map((name) => c.refChip(name, money(60000)))} />
      <p className="skeleton-as-field-row__hint">
        <SkeletonText>{`${c.refNote(2025, money(2100))} ${c.refSource} ${c.hint.slice(0, 60)}`}</SkeletonText>
      </p>
      <SliderSkeleton label={c.fromAge} />
      <SliderSkeleton label={c.years} />
      <p className="skeleton-as-field-row__hint">
        <SkeletonText>{t.common.howToRead}</SkeletonText>
      </p>
      <p className="skeleton-as-answer__note">
        <SkeletonText>{c.starts(c.age(85))}</SkeletonText>
      </p>
      <p className="skeleton-as-answer__note">
        <SkeletonText>{c.total(money(240000), 4)}</SkeletonText>
      </p>
      <p className="skeleton-as-answer__big">
        <SkeletonText>{c.same(age)}</SkeletonText>
      </p>
      <p className="skeleton-as-answer__note">
        <SkeletonText>{c.holds(age)}</SkeletonText>
      </p>
      <SkeletonChips labels={[c.keep]} />
      <p className="skeleton-as-answer__note">
        <SkeletonText>{c.caveat}</SkeletonText>
      </p>
    </div>
  )
}
