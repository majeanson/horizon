import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { Cluster } from '../components/Layout'
import { NextStep } from '../components/NextStep'
import { PageHead } from '../components/PageHead'
import { PinStack } from '../components/PinStack'
import { PrintPlan } from '../components/results/PrintPlan'
import { SectionNav } from '../components/SectionNav'
import { SubTabs } from '../components/SubTabs'
import { EmptyState } from '../components/EmptyState'
import { AnswerView } from '../components/results/views/AnswerView'
import { Skeleton } from '../components/Skeleton'
import { firstAnswerSeen, markFirstAnswerSeen } from '../lib/firstAnswer'
import { useResultsPage } from '../lib/useResultsPage'

// The two other views ride their own chunks: only the one a reader opens is fetched (the answer is what the page opens with). The service worker precaches both.
const DecideView = lazy(() => import('../components/results/views/DecideView').then((m) => ({ default: m.DecideView })))
const ProofView = lazy(() => import('../components/results/views/ProofView').then((m) => ({ default: m.ProofView })))
// The guided tour's bar only exists while `?visite=` is set: nobody who did not ask for it pays for its chunk.
const TourBar = lazy(() => import('../components/results/TourBar').then((m) => ({ default: m.TourBar })))

// The answer. It comes FIRST on the page — one sentence, the age drawn large, in dates — then what the same answer looks
// like under the three scenarios and a hard market, what would move it most, what would make it more precise, and the
// comparison the person chooses (« my plan », or one age for everyone) as cards and a chart. Behind that, two more
// views, ONE level each (no switch inside a view): « Décider » (try a change, then choose when to start the pensions and in which
// order to draw) and « Preuve » (how firm it is, every figure with its calculation, the year-by-year table, the parameters).
// Results are READ-ONLY: a figure is changed on Profil, an assumption on Hypothèses. Nothing is shown until the profile holds
// enough to mean something (profileGaps). Every choice lives in the address (`?v=&ages=&metric=…`), so a view can be
// bookmarked.
export function Resultats() {
  const m = useResultsPage()
  const { printing, t, r, rc, gaps, setParam, answerPending, view, navLinks, copySummary } = m
  // The first answer this device has seen: the map's pips pop one after another for a moment, once (components/SectionNav.tsx `celebrate`).
  const [firstRun] = useState(() => !firstAnswerSeen())
  const [celebrate, setCelebrate] = useState(false)
  const answered = gaps.length === 0 && !answerPending && view === 'answer'
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
        <PageHead title={r.title} />
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
      {/* On paper the plan is ONE short page, the same whichever view is open (components/results/PrintPlan.tsx): it replaces the page while the browser prints. */}
      {printing ? (
        <PrintPlan m={m} />
      ) : (
        <>
      <PageHead title={r.title} />
      {/* The three views and the map of the open view are ONE pinned stack under the top bar (components/PinStack.tsx): one box that rolls away with the bar and comes back with it. */}
      <PinStack>
      <div className="results-pin">
        <SubTabs
          ariaLabel={rc.tabs.label}
          value={view}
          onSelect={(v) => setParam('v', v === 'answer' ? null : v)}
          options={[
            { key: 'answer' as const, label: rc.tabs.answer, concept: 'reponse' as const },
            { key: 'decide' as const, label: rc.tabs.decide, concept: 'decider' as const },
            { key: 'proof' as const, label: rc.tabs.proof, concept: 'preuve' as const },
          ]}
        />
      </div>
      {navLinks.length > 0 && <SectionNav links={navLinks} ariaLabel={rc.nav.label} onPick={m.openBlock} celebrate={celebrate} />}
      </PinStack>


      {/* 1 — what you asked: the answer, compared and dated, what would sharpen it, and what the plan points at. */}
      {view === 'answer' && <AnswerView m={m} />}

      {/* 2 — « Décider »: what to try (the changes ranked, the saving an age needs, the spending that moves it, a late-life care) and how to carry it out (when to start the QPP and the OAS, in which order to draw, how far to melt the RRSP). */}
      {view === 'decide' && (
        <Suspense fallback={<Skeleton count={4} />}>
          <DecideView m={m} />
        </Suspense>
      )}

      {/* 3 — « Preuve »: how firm the answer is, and every figure behind it with its calculation. */}
      {view === 'proof' && (
        <Suspense fallback={<Skeleton count={4} />}>
          <ProofView m={m} />
        </Suspense>
      )}


      {/* Paper is how a plan leaves the device without a network: print.css already makes the page a clean flow. */}
      <Cluster className="no-print">
        {view === 'answer' && !answerPending && gaps.length === 0 && <Chip onClick={copySummary}>{rc.out.copy}</Chip>}
        <Chip icon="printer-bold" onClick={() => window.print()}>
          {rc.out.print}
        </Chip>
      </Cluster>
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
