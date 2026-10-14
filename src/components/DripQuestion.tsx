import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { FactImpactAnswer, FactImpactRequest } from '../lib/factImpact.worker'
import { useLang, useT } from '../i18n'
import { GUIDE_COPY } from '../lib/guideCopy'
import { useProfile } from '../lib/store'
import { WELCOME_COPY } from '../lib/welcomeCopy'

// ONE QUESTION PER VISIT, on the front door: the unconfirmed figure whose confirming would narrow the answer most (the top mover of
// lib/useFactImpact.ts — the SAME ranking the results page and the sheet show), asked once, with the way to its field. Dumb on purpose: the page
// hands over the impact it already computed for the live answer's range, so the searches run once. « Plus tard » puts it away for THIS SESSION
// only (sessionStorage, unlike the install card's permanent « plus tard »): a returning household is asked again next visit, never twice in one.
// Nothing to ask (no figure moves the answer, or it is still being worked out) renders nothing.

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
  if (later || impact === undefined) return null
  const top = facts.filter((f) => (impact.swings[f.id]?.years ?? 0) > 0).sort((x, y) => impact.swings[y.id].years - impact.swings[x.id].years)[0]
  if (top === undefined) return null
  const c = WELCOME_COPY[lang].drip
  const gc = GUIDE_COPY[lang]
  const who = top.owner === 'household' ? gc.guide.householdOwner : gc.guide.owner(profile.household.persons.find((p) => p.id === top.owner)?.name.trim() || (top.owner === 'self' ? t.profile.self : t.profile.spouse))
  const name = `${gc.kind[top.kind]} — ${who}`
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
