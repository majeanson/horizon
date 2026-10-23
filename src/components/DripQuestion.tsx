import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { FactImpactAnswer, FactImpactRequest } from '../lib/factImpact.job'
import { useLang, useT } from '../i18n'
import { GUIDE_COPY } from '../lib/guideCopy'
import { useProfile } from '../lib/store'
import { WELCOME_COPY } from '../lib/welcomeCopy'
import { SkeletonStatus } from './Skeleton'
import { SkeletonText } from './SkeletonShapes'

// ONE QUESTION PER VISIT, on the front door: the unconfirmed figure whose confirming would narrow the answer most (the top mover of
// lib/useFactImpact.ts — the SAME ranking the results page and the sheet show), asked once, with the way to its field. Dumb on purpose: the page
// hands over the impact it already computed for the live answer's range, so the searches run once. « Plus tard » puts it away for THIS SESSION
// only (sessionStorage, unlike the install card's permanent « plus tard »): a returning household is asked again next visit, never twice in one.
// Nothing to ask (no figure moves the answer) renders nothing; while it is worked out, the card waits in its own shape.

const LATER_KEY = 'horizon-drip-later'

function putOff(): boolean {
  try {
    return sessionStorage.getItem(LATER_KEY) === '1'
  } catch {
    return false
  }
}

export function DripQuestion({ impact, facts }: { impact: FactImpactAnswer | undefined; facts: FactImpactRequest['facts'] }) {
  const { lang } = useLang()
  const t = useT()
  const profile = useProfile()
  const [later, setLater] = useState(putOff)
  const c = WELCOME_COPY[lang].drip
  // every figure confirmed: there is nothing to ask, so nothing to wait for
  if (later || facts.length === 0) return null
  // While the search runs, the card is already there, its size: the title and the doors are known words (the doors drawn as quiet ghosts of themselves); only the
  // figure's sentence waits as lines. It used to appear 3 s in and push the whole front door down by its height.
  const gc = GUIDE_COPY[lang]
  const nameOf = (f: (typeof facts)[number]) => `${gc.kind[f.kind]} — ${f.owner === 'household' ? gc.guide.householdOwner : gc.guide.owner(profile.household.persons.find((p) => p.id === f.owner)?.name.trim() || (f.owner === 'self' ? t.profile.self : t.profile.spouse))}`
  if (impact === undefined)
    return (
      <section className="surface install-card drip" aria-label={c.title}>
        <h2 className="welcome__card-title">{c.title}</h2>
        <SkeletonStatus />
        {/* the sentence it will most likely say: the first figure still estimated (the top one is not known before the search), and a stand-in swing */}
        <p>
          <SkeletonText>{`${nameOf(facts[0])} ${c.swing(2)}`}</SkeletonText>
        </p>
        <div className="install-card__actions" aria-hidden="true">
          <span className="skeleton-as-btn skeleton-as-btn--primary skeleton-as-btn--sm skeleton__ghost" data-placeholder="">{c.go}</span>
          <span className="skeleton-as-btn skeleton-as-btn--ghost skeleton-as-btn--sm skeleton__ghost" data-placeholder="">{c.all}</span>
          <span className="skeleton-as-btn skeleton-as-btn--ghost skeleton-as-btn--sm skeleton__ghost" data-placeholder="">{c.later}</span>
        </div>
      </section>
    )
  const top = facts.filter((f) => (impact.swings[f.id]?.years ?? 0) > 0).sort((x, y) => impact.swings[y.id].years - impact.swings[x.id].years)[0]
  if (top === undefined) return null
  const name = nameOf(top)
  return (
    <section className="surface install-card drip" aria-label={c.title}>
      <h2 className="welcome__card-title">{c.title}</h2>
      <p>
        <strong>{name}</strong> {c.swing(impact.swings[top.id].years)}
      </p>
      <div className="install-card__actions">
        <Link className="btn btn--primary btn--sm" to={`/profil?fact=${encodeURIComponent(top.id)}`}>
          {c.go}
        </Link>
        <Link className="btn btn--ghost btn--sm" to="/profil#exact">
          {c.all}
        </Link>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            try {
              sessionStorage.setItem(LATER_KEY, '1')
            } catch {
              /* storage blocked: it hides for this view of the page only */
            }
            setLater(true)
          }}
        >
          {c.later}
        </button>
      </div>
    </section>
  )
}
