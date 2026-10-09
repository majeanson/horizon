import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { retirementState } from '../engine/ledger'
import { useLang } from '../i18n'
import { useAnswer } from '../lib/useAnswer'
import { LIVE_COPY } from '../lib/liveCopy'
import { profileGaps } from '../lib/profileGaps'
import { MAX_AGE, MIN_AGE, assumptionsOf } from '../lib/resultsModel'
import { useProfile } from '../lib/store'
import { today } from '../lib/today'
import { useSettled } from '../lib/useSettled'

// « Votre réponse : 59 ans » — pinned above Profil and Hypothèses, so a typed figure visibly moves the one thing the figures are
// for. The SAME job as the results page (`useAnswer`: the earliest age, in a worker, from a profile that has rested 300 ms), and
// nothing else: no chart, no cards. It remembers the answer it first saw and says how far an edit has moved it. Silent until the
// profile holds enough to mean something, and for a household already retired (its answer is a plan, not an age).
export function LiveAnswer() {
  const { lang } = useLang()
  const copy = LIVE_COPY[lang]
  const profile = useProfile()
  const slow = useSettled(profile)
  const { year, month } = today()
  const assumptions = useMemo(() => assumptionsOf(slow, { year, month }), [slow, year, month])
  const state = useMemo(() => retirementState(slow.household, assumptions), [slow, assumptions])
  const ready = profileGaps(profile).length === 0 && !state.everyoneRetired
  const ages = slow.household.persons.map((p) => year - p.birth.year)
  const firstAge = Math.min(MAX_AGE, Math.max(MIN_AGE, Math.max(...ages)))
  const answer = useAnswer(slow.household, assumptions, firstAge, Math.min(...ages), state.everyoneRetired, ready)
  const got = ready ? answer.value : null
  // The first answer seen is the reference: « since you arrived ». null = it was « no age », the only value that is not a number.
  const first = useRef<{ earliest: number | null } | null>(null)
  if (got !== null && first.current === null) first.current = { earliest: got.earliest }
  if (!ready) first.current = null
  if (got === null) return null

  const e = got.earliest
  const base = first.current?.earliest
  const now = got.nowOk
  const said = e === null ? copy.none(MAX_AGE) : now ? copy.now : copy.at(e)
  let moved: string | null = null
  if (first.current !== null && base !== e) {
    if (base === null && e !== null) moved = copy.found
    else if (base !== null && base !== undefined && e === null) moved = copy.lost
    else if (base !== null && base !== undefined && e !== null) moved = e < base ? copy.earlier(base - e) : copy.later(e - base)
  }
  return (
    <div className={'live-answer surface' + (answer.busy ? ' is-busy' : '')} role="status" aria-live="polite">
      <span className="live-answer__label">{copy.label}</span>
      <strong className="live-answer__age">{answer.busy ? `${said} ${copy.working}` : said}</strong>
      {moved !== null && <span className={'live-answer__moved' + (e !== null && base !== null && base !== undefined && e < base ? ' is-better' : '')}>{moved}</span>}
      <Link className="live-answer__see" to="/resultats">
        {copy.see}
      </Link>
    </div>
  )
}
