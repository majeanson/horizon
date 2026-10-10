import { lazy, Suspense } from 'react'
import { Skeleton } from '../../Skeleton'
import { MAX_AGE } from '../../../lib/resultsModel'
import { formatCare } from '../../../lib/careModel'
import type { ResultsModel } from '../../../lib/useResultsPage'

const FutureView = lazy(() => import('../FutureView').then((m) => ({ default: m.FutureView })))

// The « future » view of the results page — cut from the page unchanged; it reads the page's state through the one model object (lib/useResultsPage.ts).
export function FutureSection({ m }: { m: ResultsModel }) {
  const { profile, state, retiredNow, assumptions, setParam, firstAge, earliest, goTo, impact, factName, movers, bestLever, care } = m
  return (
    <>
        <Suspense fallback={<Skeleton count={4} />}>
        <FutureView
          household={profile.household}
          assumptions={assumptions}
          care={care}
          onCare={(c) => setParam('care', c === null ? null : formatCare(c))}
          earliest={earliest}
          age={earliest ?? Math.min(MAX_AGE, Math.max(firstAge, profile.household.persons[0].retirementAge))}
          maxAge={MAX_AGE}
          retiredNow={retiredNow}
          lever={bestLever}
          movers={movers.map((m) => ({ id: m.id, name: factName(m.id), years: impact!.swings[m.id].years }))}
          moversPending={impact === undefined}
          pensionsOpen={state.pensionsOpen}
          onGo={goTo}
        />
        </Suspense>
    </>
  )
}
