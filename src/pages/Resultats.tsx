import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AccordionMode, type AccordionOpen } from '../components/Accordion'
import { Chip } from '../components/Chip'
import { Cluster } from '../components/Layout'
import { NextStep } from '../components/NextStep'
import { PageHead } from '../components/PageHead'
import { PinStack } from '../components/PinStack'
import { PrintKindView, usePrintRequest } from '../components/results/PrintMenu'
import { SectionNav } from '../components/SectionNav'
import { EmptyState } from '../components/EmptyState'
import { AnswerView } from '../components/results/views/AnswerView'
import { PageSkeleton } from '../components/Skeleton'
import { firstAnswerSeen, markFirstAnswerSeen } from '../lib/firstAnswer'
import { ANSWER_BLOCKS, PROOF_BLOCKS, useResultsPage, type ResultsModel } from '../lib/useResultsPage'
import { useParamChoice } from '../lib/useParamChoice'

// The proof and « Décider » ride their own chunks: the answer is what Résultats paints first, and Décider is fetched when its tab is opened. The service worker
// precaches both.
const DecideView = lazy(() => import('../components/results/views/DecideView').then((m) => ({ default: m.DecideView })))
const ProofView = lazy(() => import('../components/results/views/ProofView').then((m) => ({ default: m.ProofView })))
// The guided tour's bar only exists while `?visite=` is set: nobody who did not ask for it pays for its chunk.
const TourBar = lazy(() => import('../components/results/TourBar').then((m) => ({ default: m.TourBar })))

// TWO TABS, ONE LEVEL EACH (Marc, 2026-10-19: Profil and Hypothèses have no level above their cards). The same state (lib/useResultsPage.ts) serves both:
//   « Résultats » (/resultats) — the answer FIRST (one sentence, the age drawn large, in dates), its cards (the comparison and its chart, what to do this year),
//     then its PROOF under the same map (how firm it is, every figure with its calculation, the year-by-year table, what was checked, the official figures);
//   « Décider » (/decider) — what to try (the changes ranked, the age to aim at, the saving, the spending, a late-life care) and how to carry it out (when to
//     start the pensions, in which order to draw, how far to melt the RRSP).
// Both are READ-ONLY: a figure is changed on Profil, an assumption on Hypothèses. Nothing is shown until the profile holds enough to mean something
// (profileGaps). Every choice lives in the address, so a page can be bookmarked; an old `?v=` address lands where its content lives now.
export function Resultats() {
  return <ResultsPage />
}

export function Decider() {
  return <ResultsPage />
}

function ResultsPage() {
  const m = useResultsPage()
  usePrintRequest(m)
  const { printing, t, r, rc, gaps, answerPending, view, navLinks, copySummary } = m
  const deciding = view === 'decide'
  const title = deciding ? t.nav.decide : r.title
  const subtitle = deciding ? rc.decide.pageSub : rc.subtitle
  // The first answer this device has seen: the map's pips pop one after another for a moment, once (components/SectionNav.tsx `celebrate`).
  const [firstRun] = useState(() => !firstAnswerSeen())
  const [celebrate, setCelebrate] = useState(false)
  const answered = gaps.length === 0 && !answerPending && !deciding
  useEffect(() => {
    if (!firstRun || !answered) return
    markFirstAnswerSeen()
    setCelebrate(true)
    const timer = setTimeout(() => setCelebrate(false), 2800)
    return () => clearTimeout(timer)
  }, [firstRun, answered])

  if (gaps.length > 0) {
    return (
      <section className="page-body">
        <PageHead title={title} subtitle={subtitle} />
        <div className="surface results-gaps">
          <EmptyState tone="calm" icon="chart-line-up-bold">
            {r.gaps.lead}
          </EmptyState>
          <ul>
            {gaps.map((g) => (
              <li key={g}>{r.gaps[g]}</li>
            ))}
          </ul>
          <Link className="btn btn--primary btn--sm" to="/profil">
            {r.gaps.toProfile}
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="page-body results-page">
      {/* On paper the plan is ONE short page (components/results/PrintPlan.tsx, or the page the « Imprimer… » menu chose): it replaces the page while the browser prints. */}
      {printing ? (
        <PrintKindView m={m} />
      ) : (
        <>
          <PageHead title={title} subtitle={subtitle} />
          {/* The map of the page and its « tout ouvrir / fermer » icon: one pinned box under the top bar (components/PinStack.tsx), rolling away with the bar. */}
          <PinStack>
            {navLinks.length > 0 && <SectionNav links={navLinks} ariaLabel={rc.nav.label} onPick={m.openBlock} celebrate={celebrate} end={deciding ? <DecideMode m={m} /> : <ResultsMode />} />}
          </PinStack>

          {deciding ? (
            <Suspense fallback={<PageSkeleton head={false} />}>
              <DecideView m={m} />
            </Suspense>
          ) : (
            <>
              {/* The answer, compared and dated, and what the plan points at this year. */}
              <AnswerView m={m} />
              {/* Its proof: how firm it is, and every figure behind it with its calculation. */}
              <Suspense fallback={<PageSkeleton head={false} />}>
                <ProofView m={m} />
              </Suspense>
            </>
          )}

          {/* Paper is how a plan leaves the device without a network: « Imprimer… » lives on Ma fiche and in the settings (components/PrintChip.tsx). */}
          {!deciding && !answerPending && (
            <Cluster className="no-print">
              <Chip onClick={copySummary}>{rc.out.copy}</Chip>
            </Cluster>
          )}
          <NextStep to="/hypotheses" label={t.next.adjustAssumptions}>
            <p>{t.next.resultsHint}</p>
          </NextStep>
          {m.tour > 0 && (
            <Suspense fallback={null}>
              <TourBar m={m} />
            </Suspense>
          )}
        </>
      )}
    </section>
  )
}

/** « Tout ouvrir / Tout fermer » on Résultats: the answer's cards (open unless `?cartes=` closed them) and the proof's blocks (closed unless `?bloc=` opened one,
 *  « tout » every one) answer to the one icon — closed together while anything is open, opened together once everything is shut. */
function ResultsMode() {
  const [cartes, setCartes] = useParamChoice<string>('cartes', [...ANSWER_BLOCKS, 'all', 'none'], 'verdict')
  const [bloc, setBloc] = useParamChoice<string>('bloc', [...PROOF_BLOCKS, 'tout', 'none'], 'none')
  const anyOpen = cartes !== 'none' || bloc !== 'none'
  const open: AccordionOpen = cartes === 'all' && bloc === 'tout' ? 'all' : anyOpen ? 'some' : null
  return (
    <AccordionMode
      open={open}
      onOpen={(next) => {
        setCartes(next === 'all' ? 'all' : 'none')
        setBloc(next === 'all' ? 'tout' : 'none')
      }}
    />
  )
}

/** On Décider « tout » is three things the one icon turns on together: every strategy open, the ones that change little for this household too (`?tout=1`, which is what says « all »), every what-if card (`?essai=all`) and « Ce qui change le plus » (`?leviers=`). Closing puts all three away. */
function DecideMode({ m }: { m: ResultsModel }) {
  const [tout, setTout] = useParamChoice('tout', ['off', '1'] as const, 'off')
  const all = tout === '1'
  // Anything open — the first strategy, open by default (`strat` undefined), one chosen, or a what-if — makes the icon « Tout fermer ».
  const anyOpen = all || m.leversOpen || m.strat !== null || m.essai !== null || m.essaiAll
  return (
    <AccordionMode
      open={all ? 'all' : anyOpen ? 'some' : null}
      onOpen={(next) => {
        if (next === 'all') {
          setTout('1')
          m.setParam('essai', 'all')
          m.setLeversOpen(true)
        } else {
          setTout('off')
          m.setLeversOpen(false)
          m.setStrat(null)
          m.setEssai(null)
        }
      }}
    />
  )
}
