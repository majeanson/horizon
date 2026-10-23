import { lazy, Suspense, useState } from 'react'
import type { ExampleId } from '../engine/golden/examples'
import { useLang } from '../i18n'
import type { Profile } from '../lib/schema'
import { STORY_LABELS } from '../lib/storyLabels'
import { Fold } from './Fold'
import { Skeleton } from './Skeleton'

// PlanStoryFold — a household's plan « in words », one tap away: what the plan does and why, and the « and if…? » cards (a market fall, a death, spending less, the pensions at
// seventy — or, for a household that has already stopped working, how much it can spend and what helps the money last). A Fold that renders its body only while open, so the figures —
// some seventy projections, worked out off the page's thread — cost nothing until someone asks, and the copy and the worker are a chunk of their own.
//
// `id`: an EXAMPLE household, with its own story. No `id`: the household on this device
// (`retired`, which the page knows, only picks the summary line: the cards themselves follow the facts).
const PlanStory = lazy(() => import('./PlanStory'))

export function PlanStoryFold({ id, profile, retired }: { id?: ExampleId; profile: Profile; retired?: boolean }) {
  const { lang } = useLang()
  const [open, setOpen] = useState(false)
  const labels = STORY_LABELS[lang]
  const summary = id !== undefined ? labels.fold : retired ? labels.foldRetired : labels.foldOwn
  return (
    <Fold summary={summary} open={open} onToggle={setOpen} mountOnOpen className="plan-story-fold">
      {/* keyed by household: choosing another example must never show the previous one's text while the new figures come in */}
      <Suspense fallback={<Skeleton count={3} />}>
        <PlanStory key={id ?? 'own'} id={id} profile={profile} />
      </Suspense>
    </Fold>
  )
}
