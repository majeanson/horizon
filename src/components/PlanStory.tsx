import { useMemo } from 'react'
import type { ExampleId } from '../engine/golden/examples'
import { useLang } from '../i18n'
import { renderStory } from '../lib/exampleStory'
import type { Profile } from '../lib/schema'
import { STORY_LABELS } from '../lib/storyLabels'
import { today } from '../lib/today'
import { usePlanFacts } from '../lib/usePlanFacts'
import { whatIfCards } from '../lib/whatIfCopy'
import { Skeleton } from './Skeleton'

// THE BODY OF PlanStoryFold: an example household's plan in plain words, then four « and if…? » cards. Loaded only when the disclosure is opened (the copy and the worker
// ride with it, never in the shell). Every figure in it is the engine's, worked out here, off the page's thread, at the real clock — never typed (lib/exampleStory.ts, lib/whatIfCopy.ts).
export default function PlanStory({ id, profile, skipAnswer }: { id: ExampleId; profile: Profile; skipAnswer?: boolean }) {
  const { lang } = useLang()
  const { year, month } = today()
  const request = useMemo(() => ({ profile, today: { year, month } }), [profile, year, month])
  const r = usePlanFacts(request, true, 'now')
  const labels = STORY_LABELS[lang]
  if (r.value === null) return <Skeleton count={3} />
  const { facts, whatIf } = r.value
  const sentences = renderStory(id, lang, facts, { skipAnswer })
  const cards = whatIfCards(lang, facts, whatIf, profile.household.persons[0].name)
  return (
    <div className="plan-story" aria-busy={r.busy || undefined}>
      <p className="plan-story__text">{sentences.join(' ')}</p>
      {cards.length > 0 && (
        <>
          <h4 className="plan-story__heading">{labels.whatIf}</h4>
          <ul className="plan-story__cards">
            {cards.map((c) => (
              <li key={c.id}>
                <strong>{c.title}</strong>
                <span className="field-row__hint">{c.text}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
