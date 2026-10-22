import type { Profile } from '../lib/schema'
import { pictogramOf } from '../lib/householdPictogram'
import { today } from '../lib/today'
import { ConceptPip } from './ConceptPip'

// A household as a row of small pips (lib/householdPictogram.ts): the people (the first marigold, the second sky, each at their stage of a working life), the
// children, the home, one to three « $ » for what is saved, an employer pension, an inheritance. It is a picture beside words that already tell the same thing
// (the household's story, its answer), so it is hidden from a screen reader and adds no control and no text. People come first, then a thin gap, then what they have.
export function HouseholdGlyphs({ profile, year }: { profile: Profile; year?: number }) {
  const tokens = pictogramOf(profile, year ?? today().year)
  const people = tokens.filter((t) => t.who !== undefined)
  const rest = tokens.filter((t) => t.who === undefined)
  return (
    <div className="household-glyphs" aria-hidden="true">
      <span className="household-glyphs__people">
        {people.map((t) => (
          <ConceptPip key={t.id} id={t.concept} size="md" hue={t.who === 1 ? 'sky' : 'marigold'} />
        ))}
      </span>
      {rest.length > 0 && (
        <span className="household-glyphs__have">
          {rest.map((t) => (
            <ConceptPip key={t.id} id={t.concept} size="sm" />
          ))}
        </span>
      )}
    </div>
  )
}
