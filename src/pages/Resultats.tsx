import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { Cluster } from '../components/Layout'
import { NextStep } from '../components/NextStep'
import { PageHead } from '../components/PageHead'
import { PrintPlan } from '../components/results/PrintPlan'
import { SectionNav } from '../components/SectionNav'
import { SubTabs } from '../components/SubTabs'
import { StatusMessage } from '../components/StatusMessage'
import { AnswerView } from '../components/results/views/AnswerView'
import { AdjustView } from '../components/results/views/AdjustView'
import { Skeleton } from '../components/Skeleton'
import { useResultsPage } from '../lib/useResultsPage'

// The two heaviest views ride their own chunks: only the one a reader opens is fetched (the answer is what the page opens with). The service worker precaches both.
const StrategiesView = lazy(() => import('../components/results/views/StrategiesView').then((m) => ({ default: m.StrategiesView })))
const VerifyView = lazy(() => import('../components/results/views/VerifyView').then((m) => ({ default: m.VerifyView })))

// The answer. It comes FIRST on the page — one sentence, the age drawn large, in dates — then what the same answer looks
// like under the three scenarios and a hard market, what would move it most, what would make it more precise, and the
// comparison the person chooses (« my plan », or one age for everyone) as cards and a chart. Behind that, two more
// views: the strategies (when to start the pensions, in which order to draw) and the check (every figure with its
// calculation, the year-by-year table, the sensitivity, the parameters). Nothing is shown until the profile holds
// enough to mean something (profileGaps). Every choice lives in the address (`?v=&ages=&metric=…`), so a view can be
// bookmarked.
export function Resultats() {
  const m = useResultsPage()
  const { pinned, printing, t, r, rc, gaps, setParam, answerPending, view, navLinks, copySummary } = m

  if (gaps.length > 0) {
    return (
      <section className="page-body">
        <PageHead title={r.title} />
        <div className="surface results-gaps">
          <StatusMessage tone="info">{r.gaps.lead}</StatusMessage>
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
    <section className="page-body results-page" ref={pinned}>
      {/* On paper the plan is ONE short page, the same whichever view is open (components/results/PrintPlan.tsx): it replaces the page while the browser prints. */}
      {printing ? (
        <PrintPlan m={m} />
      ) : (
        <>
      <PageHead title={r.title} />
      {/* The three views stay pinned under the top bar while the page scrolls; the map of the open view pins under them from 860 px (usePinOffset measures both). */}
      <div className="results-pin">
        <SubTabs
          ariaLabel={rc.tabs.label}
          value={view}
          onSelect={(v) => setParam('v', v === 'answer' ? null : v)}
          options={[
            { key: 'answer' as const, label: rc.tabs.answer },
            { key: 'adjust' as const, label: rc.tabs.adjust },
            { key: 'strategies' as const, label: rc.tabs.strategies },
            { key: 'verify' as const, label: rc.tabs.verify },
          ]}
        />
      </div>
      {navLinks.length > 0 && <SectionNav links={navLinks} ariaLabel={rc.nav.label} />}


      {/* 1 — what you asked: the answer, compared and dated, what would sharpen it, and what the plan points at. */}
      {view === 'answer' && <AnswerView m={m} />}

      {/* 2 — « Essayer »: what to try — the changes ranked, the saving an age needs, the spending that moves it, a late-life care. Inputs of the plan, not of the future (those live on Hypothèses). */}
      {view === 'adjust' && <AdjustView m={m} />}

      {/* 3 — two decisions: when to start the QPP and the OAS, and in which order to draw the accounts. Once every start is behind the household, nothing to choose. */}
      {view === 'strategies' && (
        <Suspense fallback={<Skeleton count={4} />}>
          <StrategiesView m={m} />
        </Suspense>
      )}

      {/* 4 — « Vérifier »: how firm the answer is, how it was checked, and every figure behind it. */}
      {view === 'verify' && (
        <Suspense fallback={<Skeleton count={4} />}>
          <VerifyView m={m} />
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
        </>
      )}
    </section>
  )
}
