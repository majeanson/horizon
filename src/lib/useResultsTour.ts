import { useEffect } from 'react'

// THE GUIDED TOUR (`?visite=1..2`): two steps over THIS reader's own answer, each scrolling to a section of the answer view. The address keeps the step, so a reload resumes it
// and a link shares it; any other value is no tour. It is offered only on a real answer ('at' / 'now') for a household still working: several steps speak of departure ages, and
// a household that has already stopped (retiredNow) or whose money never lasts (« none ») has no age to walk through. Nothing opens it by itself.

/** The steps of the guided tour (`?visite=`). */
export const TOUR_STEPS = 2

export function useResultsTour(params: URLSearchParams, setParam: (key: string, value: string | null) => void, answered: boolean, retiredNow: boolean, headlineKind: string) {
  const tourRaw = params.get('visite')
  const tourStep = tourRaw !== null && new RegExp(`^[1-${TOUR_STEPS}]$`).test(tourRaw) ? Number(tourRaw) : 0
  const tourAvailable = answered && !retiredNow && headlineKind !== 'none'
  const tour = tourAvailable ? tourStep : 0
  const setTour = (step: number) => setParam('visite', step >= 1 && step <= TOUR_STEPS ? String(step) : null)
  // The section each step lands on.
  const tourTarget = (step: number): string => (step === 1 ? 'verdict' : 'comparer')
  // An unreadable step is dropped from the address at once; a tour that cannot apply (the answer arrived and it is « none », or everyone has stopped) is dropped once the answer is known.
  useEffect(() => {
    if (tourRaw !== null && (tourStep === 0 || (answered && !tourAvailable))) setParam('visite', null)
  }, [tourRaw, tourStep, answered, tourAvailable, setParam])
  return { tour, setTour, tourTarget }
}
