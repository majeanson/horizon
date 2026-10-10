import { Link } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { Cluster } from '../components/Layout'
import { NextStep } from '../components/NextStep'
import { PageHead } from '../components/PageHead'
import { ParamsPanel } from '../components/results/ParamsPanel'
import { SectionHeader } from '../components/SectionHeader'
import { SectionNav } from '../components/SectionNav'
import { SubTabs } from '../components/SubTabs'
import { YearTables } from '../components/results/YearTables'
import { StatusMessage } from '../components/StatusMessage'
import { AnswerView } from '../components/results/views/AnswerView'
import { AdjustView } from '../components/results/views/AdjustView'
import { StrategiesView } from '../components/results/views/StrategiesView'
import { FutureSection } from '../components/results/views/FutureSection'
import { VerifyView } from '../components/results/views/VerifyView'
import { useResultsPage } from '../lib/useResultsPage'

// The answer. It comes FIRST on the page — one sentence, the age drawn large, in dates — then what the same answer looks
// like under the three scenarios and a hard market, what would move it most, what would make it more precise, and the
// comparison the person chooses (« my plan », or one age for everyone) as cards and a chart. Behind that, two more
// views: the strategies (when to start the pensions, in which order to draw) and the check (every figure with its
// calculation, the year-by-year table, the sensitivity, the parameters). Nothing is shown until the profile holds
// enough to mean something (profileGaps). Every choice lives in the address (`?v=&ages=&metric=…`), so a view can be
// bookmarked.
export function Resultats() {
  const m = useResultsPage()
  const { pinned, printing, t, r, rc, year, month, dollars, gaps, assumptions, births, setParam, answerPending, runs, view, names, label, navLinks, copySummary } = m

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
      {printing && (
        <header className="print-head">
          <p className="print-head__title">{rc.out.printTitle}</p>
          <p>{rc.out.printedOn(month, year)} · {names.join(' · ')}</p>
        </header>
      )}
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
            { key: 'future' as const, label: rc.tabs.future },
            { key: 'verify' as const, label: rc.tabs.verify },
          ]}
        />
      </div>
      <SectionNav links={navLinks} ariaLabel={rc.nav.label} />


      {/* 1 — what you asked: the answer, then the same answer compared, costed and dated. */}
      {view === 'answer' && <AnswerView m={m} />}

      {/* 2 — what to change: the changes ranked, the saving an age needs, the spending that moves it. Inputs of the plan, not of the future (those live on Hypothèses). */}
      {view === 'adjust' && <AdjustView m={m} />}

      {/* 2 — two decisions: when to start the QPP and the OAS, and in which order to draw the accounts. Once every start is behind the household, nothing to choose. */}
      {view === 'strategies' && <StrategiesView m={m} />}

      {/* 4 — the future: a late-life care cost tried on the plan, and what the plan points at for this year. */}
      {view === 'future' && <FutureSection m={m} />}

      {view === 'verify' && <VerifyView m={m} />}

      {/* On paper the plan is the open view AND what a reader checks it against, whichever view that is: the year by year and the cited figures. */}
      {printing && view !== 'verify' && (
        <section className="arc print-appendix" aria-label={rc.tabs.verify}>
          <section className="results-section" aria-label={r.table.title}>
            <SectionHeader title={r.table.title} />
            <YearTables runs={runs} label={label} dollars={dollars} todayYear={year} inflation={assumptions.inflation} births={births} />
          </section>
          <section className="results-section" aria-label={r.params.title}>
            <SectionHeader title={r.params.title} />
            <ParamsPanel />
          </section>
        </section>
      )}
      {printing && <p className="print-foot">{rc.out.printFoot}</p>}

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
    </section>
  )
}
