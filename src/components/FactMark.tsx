import { lazy, Suspense } from 'react'

// The confirmed / estimated mark of one figure, loaded on its own (with its words) so the first screen never carries them. Until
// it arrives the space is held by an empty circle of the same size, so nothing jumps.
const FactToggle = lazy(() => import('./FactToggle'))

export function FactMark({ id, label, line = false }: { id: string; label: string; line?: boolean }) {
  return (
    <Suspense fallback={<span className="fact-btn fact-btn--wait" aria-hidden="true" />}>
      <FactToggle id={id} label={label} line={line} />
    </Suspense>
  )
}
