import { lazy, Suspense } from 'react'
import { Accordion, AccordionItem, type AccordionOpen } from '../../Accordion'
import { FirmSection } from './FirmSection'
import { LedgerPanel } from '../LedgerPanel'
import { MarginalWeather } from '../MarginalWeather'
import { ParamsPanel } from '../ParamsPanel'
import { YearTables } from '../YearTables'
import { Skeleton } from '../../Skeleton'
import { LEDGER_COPY } from '../../../lib/ledgerCopy'
import { ACCURACY_COPY } from '../../../lib/accuracyCopy'
import { useParamChoice } from '../../../lib/useParamChoice'
import { PROOF_BLOCKS, type ResultsModel } from '../../../lib/useResultsPage'

const AccuracyNote = lazy(() => import('../AccuracyNote').then((m) => ({ default: m.AccuracyNote })))

// The « proof » view of the results page (« Preuve ») — how far to trust the answer, and everything behind it, in the order a doubting reader asks: how firm is it · which figures set it (and the
// calculation of each) · the year-by-year table · what the calculation was checked against and what it simplifies · the official figures it reads. Read-only: a figure is changed on Profil or
// Hypothèses, and the ledger links there. It reads the page's state through the one model object (lib/useResultsPage.ts).
// Five blocks, read ONE AT A TIME (components/Accordion.tsx): the address keeps which (`?bloc=`, « tout » opens them all), and a link to one — the answer's « Voir la sensibilité », the
// accuracy note's « Voir les chiffres officiels » — opens it before landing on it.
export function ProofView({ m }: { m: ResultsModel }) {
  const { lang, r, rc, profile, year, dollars, assumptions, births, runs, runsPending, scrollTo, names, label } = m
  const [bloc, setBloc] = useParamChoice<string>('bloc', [...PROOF_BLOCKS, 'tout', 'none'], 'solidite')
  const open: AccordionOpen = bloc === 'tout' ? 'all' : bloc === 'none' ? null : bloc
  const setOpen = (next: AccordionOpen) => setBloc(next === 'all' ? 'tout' : (next ?? 'none'))
  return (
    <>
      <section className="arc" aria-label={rc.tabs.proof}>
        <Accordion ids={PROOF_BLOCKS} open={open} onOpen={setOpen}>
          {/* How firm the answer is — the three scenarios and a hard market in brief, the grids of what moves it one tap under. */}
          <AccordionItem id="solidite" title={rc.headline.firmTitle} concept="solidite" className="results-section firm">
            <FirmSection m={m} bare />
          </AccordionItem>

          <AccordionItem id="donnees-calcul" title={LEDGER_COPY[lang].title} concept="documents" className="results-section">
            <LedgerPanel household={profile.household} assumptions={assumptions} names={names} />
          </AccordionItem>

          <AccordionItem id="tableau" title={r.table.title} concept="annee" className="results-section">
            {runsPending && <Skeleton count={6} />}
            <YearTables runs={runs} label={label} dollars={dollars} todayYear={year} assumptions={assumptions} livesAlone={profile.household.livesAlone} births={births} />
            {/* What the next RRSP dollar costs at every retired age: a calendar of ages, one fold, read off the same rows. */}
            {!runsPending && <MarginalWeather m={m} />}
          </AccordionItem>

          {/* What the calculation was checked against and what it simplifies: after the figures it was checked on. */}
          <AccordionItem id="precision" title={ACCURACY_COPY[lang].title} concept="precision" className="results-section">
            <Suspense fallback={<Skeleton count={4} />}>
              <AccuracyNote
                onSeeFigures={() => {
                  setBloc('parametres')
                  requestAnimationFrame(() => scrollTo('parametres'))
                }}
              />
            </Suspense>
          </AccordionItem>

          {/* The official figures the engine reads: a reference, a hundred rows long — its own block, mounted only when opened. */}
          <AccordionItem id="parametres" title={r.params.title} className="results-section">
            <ParamsPanel />
          </AccordionItem>
        </Accordion>
      </section>
    </>
  )
}
