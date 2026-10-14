import { lazy, Suspense, useState } from 'react'
import { FirmSection } from './FirmSection'
import { LedgerPanel } from '../LedgerPanel'
import { ParamsPanel } from '../ParamsPanel'
import { Fold } from '../../Fold'
import { SectionHeader } from '../../SectionHeader'
import { YearTables } from '../YearTables'
import { Skeleton } from '../../Skeleton'
import { LEDGER_COPY } from '../../../lib/ledgerCopy'
import { ACCURACY_COPY } from '../../../lib/accuracyCopy'
import type { ResultsModel } from '../../../lib/useResultsPage'

const AccuracyNote = lazy(() => import('../AccuracyNote').then((m) => ({ default: m.AccuracyNote })))

// The « proof » view of the results page (« Preuve ») — how far to trust the answer, and everything behind it, in the order a doubting reader asks: how firm is it · which figures set it (and the
// calculation of each) · the year-by-year table · what the calculation was checked against and what it simplifies · the official figures it reads. Read-only: a figure is changed on Profil or
// Hypothèses, and the ledger links there. It reads the page's state through the one model object (lib/useResultsPage.ts).
export function ProofView({ m }: { m: ResultsModel }) {
  const { lang, r, rc, profile, year, dollars, assumptions, births, runs, runsPending, scrollTo, names, label } = m
  // The official figures open when the accuracy note sends the reader to them.
  const [paramsOpen, setParamsOpen] = useState(false)
  return (
    <>
      <section className="arc" aria-label={rc.tabs.proof}>
        {/* How firm the answer is — the three scenarios and a hard market in brief, the grids of what moves it one tap under. */}
        <FirmSection m={m} />

        <section id="donnees-calcul" className="results-section" aria-label={LEDGER_COPY[lang].title}>
          <SectionHeader title={LEDGER_COPY[lang].title} />
          <LedgerPanel household={profile.household} assumptions={assumptions} names={names} />
        </section>

        <section id="tableau" className="results-section" aria-label={r.table.title}>
          <SectionHeader title={r.table.title} />
          {runsPending && <Skeleton count={6} />}
          <YearTables runs={runs} label={label} dollars={dollars} todayYear={year} assumptions={assumptions} livesAlone={profile.household.livesAlone} births={births} />
        </section>

        {/* What the calculation was checked against and what it simplifies: after the figures it was checked on. */}
        <section id="precision" className="results-section" aria-label={ACCURACY_COPY[lang].title}>
          <SectionHeader title={ACCURACY_COPY[lang].title} />
          <Suspense fallback={<Skeleton count={4} />}>
            <AccuracyNote
              onSeeFigures={() => {
                setParamsOpen(true)
                requestAnimationFrame(() => scrollTo('parametres'))
              }}
            />
          </Suspense>
        </section>

        {/* The official figures the engine reads: a reference, a hundred rows long — one tap away, never in the way. */}
        <section id="parametres" className="results-section" aria-label={r.params.title}>
          <Fold open={paramsOpen} onToggle={setParamsOpen} mountOnOpen summary={r.params.title}>
            <ParamsPanel />
          </Fold>
        </section>
      </section>
    </>
  )
}
