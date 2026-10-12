import { lazy, Suspense } from 'react'
import { FirmSection } from './FirmSection'
import { LedgerPanel } from '../LedgerPanel'
import { ParamsPanel } from '../ParamsPanel'
import { SectionHeader } from '../../SectionHeader'
import { YearTables } from '../YearTables'
import { Skeleton } from '../../Skeleton'
import { LEDGER_COPY } from '../../../lib/ledgerCopy'
import { ACCURACY_COPY } from '../../../lib/accuracyCopy'
import type { ResultsModel } from '../../../lib/useResultsPage'

const AccuracyNote = lazy(() => import('../AccuracyNote').then((m) => ({ default: m.AccuracyNote })))

// The « verify » view of the results page — cut from the page unchanged; it reads the page's state through the one model object (lib/useResultsPage.ts).
export function VerifyView({ m }: { m: ResultsModel }) {
  const { lang, r, rc, profile, year, dollars, assumptions, births, runs, runsPending, scrollTo, names, label } = m
  return (
    <>
        <section className="arc" aria-label={rc.tabs.verify}>
          {/* How firm the answer is — the three scenarios and a hard market, and the grids of what moves it — one section, two depths. */}
          <FirmSection m={m} />

          {/* What the calculation was checked against and what it simplifies: it comes after « how firm is it? », the reader’s first question here, and before the figures it was checked on. */}
          <section id="precision" className="results-section" aria-label={ACCURACY_COPY[lang].title}>
            <SectionHeader title={ACCURACY_COPY[lang].title} />
            <Suspense fallback={<Skeleton count={4} />}>
              <AccuracyNote onSeeFigures={() => scrollTo('parametres')} />
            </Suspense>
          </section>

          <section id="donnees-calcul" className="results-section" aria-label={LEDGER_COPY[lang].title}>
            <SectionHeader title={LEDGER_COPY[lang].title} />
            <LedgerPanel household={profile.household} assumptions={assumptions} names={names} />
          </section>

          <section id="tableau" className="results-section" aria-label={r.table.title}>
            <SectionHeader title={r.table.title} />
            {runsPending && <Skeleton count={6} />}
            <YearTables runs={runs} label={label} dollars={dollars} todayYear={year} inflation={assumptions.inflation} births={births} />
          </section>

          <section id="parametres" className="results-section" aria-label={r.params.title}>
            <SectionHeader title={r.params.title} />
            <ParamsPanel />
          </section>
        </section>
    </>
  )
}
