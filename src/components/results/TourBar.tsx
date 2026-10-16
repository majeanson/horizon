import { useEffect } from 'react'
import { timelineOf } from '../../lib/timeline'
import { TOUR_COPY } from '../../lib/tourCopy'
import { MAX_AGE, selectionAge, worthAtHorizon } from '../../lib/resultsModel'
import { TOUR_STEPS, type ResultsModel } from '../../lib/useResultsPage'

// « Visite guidée » — a bar docked at the foot of Résultats (`?visite=1..3`) that walks the reader's OWN answer in three steps, scrolling to the section each speaks of
// and saying what it means with their numbers. Every figure is read from the page's model (the headline, the confidence range, the runs, the movers) and formatted with
// the page's own helpers: nothing is recomputed or retyped here. Docked like the profile's GuideBar — above the phone's tab bar, at the foot of the window from 860 px —
// so it never covers the pinned chrome at the top (CSS: .tour-bar in revamp.css). The model opens it, keeps the step in the address and drops it when it cannot apply.
export function TourBar({ m }: { m: ResultsModel }) {
  const { lang, tour, setTour, tourTarget, goTo } = m
  const c = TOUR_COPY[lang]

  // Land on the step's section whenever the step changes — and on arrival, so a reload of `?visite=3` resumes where it was.
  useEffect(() => {
    goTo('answer', tourTarget(tour))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour])

  return (
    // `--p` is how far along the tour is (0 → 1): a thin meter along the bar's top edge, decoration beside the words « 2 / 3 ».
    <div className="tour-bar" role="region" aria-label={c.label} style={{ ['--p' as string]: tour / TOUR_STEPS }}>
      {/* Keyed on the step: its sentence settles into place (styles/motion.css) instead of swapping in place. */}
      <p key={tour} className="tour-bar__text" aria-live="polite">
        {sentence(m)}
      </p>
      <div className="tour-bar__actions">
        <span className="tour-bar__count">{c.step(String(tour), String(TOUR_STEPS))}</span>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => setTour(0)}>
          {c.close}
        </button>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setTour(tour < TOUR_STEPS ? tour + 1 : 0)}>
          {tour < TOUR_STEPS ? c.next : c.done}
        </button>
      </div>
    </div>
  )
}

/** The current step's sentence, from the model. */
function sentence(m: ResultsModel): string {
  const { lang, r, rc, tour, headline, confidenceRange, profile, assumptions, year, at, runs, label, dollars, money } = m
  const c = TOUR_COPY[lang]

  if (tour === 1) {
    const range = confidenceRange === null ? null : confidenceRange.high === null ? c.rangeOpen(String(confidenceRange.low), String(MAX_AGE)) : c.range(String(confidenceRange.low), String(confidenceRange.high))
    return c.verdict(headline.kind === 'at' && headline.age !== null ? rc.headline.ageText(headline.age) : null, range)
  }

  if (tour === 2) {
    const first = timelineOf(profile.household, year, assumptions.horizonAge)[0]
    return c.timeline(at(first.birthYear + first.endAge))
  }

  // Step 3: the comparison.
  // The two outermost departures among those compared, by the age each stands for on the chart's axis.
  const ends = runs.map((x) => ({ age: selectionAge(profile.household, x.selection), name: r.scenario.retireAt(label(x.selection)), worth: money(worthAtHorizon(x.result, dollars, assumptions)) }))
  ends.sort((a, b) => a.age - b.age)
  const low = ends[0]
  const high = ends[ends.length - 1]
  if (low === undefined || high === undefined || low.age === high.age) return c.compareOne
  return c.compare(low.name, high.name, String(assumptions.horizonAge), low.worth, high.worth)
}
