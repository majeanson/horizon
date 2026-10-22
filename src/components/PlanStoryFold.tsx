import { lazy, Suspense, useState } from 'react'
import type { ExampleId } from '../engine/golden/examples'
import { useLang } from '../i18n'
import type { Profile } from '../lib/schema'
import { STORY_LABELS } from '../lib/storyLabels'
import { Fold } from './Fold'
import { Skeleton } from './Skeleton'

// PlanStoryFold — an example household's plan « in words », one tap away: what the plan does and why, and four « and if…? » cards (a market fall, a death, spending less, the pensions at
// seventy). A Fold that renders its body only while open, so the figures — some seventy projections, worked out off the page's thread — cost nothing until someone asks, and the copy and the
// worker are a chunk of their own. `skipAnswer`: the page already states the answer (the front door's live headline), so the story does not say it a second time.
const PlanStory = lazy(() => import('./PlanStory'))

export function PlanStoryFold({ id, profile, skipAnswer }: { id: ExampleId; profile: Profile; skipAnswer?: boolean }) {
  const { lang } = useLang()
  const [open, setOpen] = useState(false)
  return (
    <Fold summary={STORY_LABELS[lang].fold} open={open} onToggle={setOpen} mountOnOpen className="plan-story-fold">
      {/* keyed by household: choosing another example must never show the previous one's text while the new figures come in */}
      <Suspense fallback={<Skeleton count={3} />}>
        <PlanStory key={id} id={id} profile={profile} skipAnswer={skipAnswer} />
      </Suspense>
    </Fold>
  )
}
