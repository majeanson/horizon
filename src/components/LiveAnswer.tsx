import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { UncertaintyRange } from '../engine/factImpact'
import { useLang } from '../i18n'
import { useAnswer } from '../lib/useAnswer'
import { answerRequest } from '../lib/answerRequest'
import { LIVE_COPY } from '../lib/liveCopy'
import { profileGaps } from '../lib/profileGaps'
import { MAX_AGE } from '../lib/resultsModel'
import { useProfile } from '../lib/store'
import { today } from '../lib/today'
import { useSettled } from '../lib/useSettled'

// « Votre réponse : 59 ans » — pinned above Profil and Hypothèses, so a typed figure visibly moves the one thing the figures are
// for. The SAME job as the results page (`useAnswer`: the earliest age, in a worker, from a profile that has rested 300 ms), and
// nothing else: no chart, no cards. It remembers the answer it first saw and says how far an edit has moved it. Silent until the
// profile holds enough to mean something, and for a household already retired (its answer is a plan, not an age).
//
// Two optional extras, both passed by a page that already has what they need (so no page pays a search for them): `range` — the answer's range while figures
// are estimates (the Accueil computes it once, for itself and for its drip question) — adds one quiet sub-line; `inline` sets the strip in the flow instead of
// pinning it (the first-visit path shows it under the question, as a passive line: it never takes focus).
export function LiveAnswer({ range, inline }: { range?: UncertaintyRange | null; inline?: boolean } = {}) {
  const { lang } = useLang()
  const copy = LIVE_COPY[lang]
  const profile = useProfile()
  const slow = useSettled(profile)
  const { year, month } = today()
  const request = useMemo(() => answerRequest(slow, { year, month }), [slow, year, month])
  const ready = profileGaps(profile).length === 0 && !request.everyoneRetired
  const answer = useAnswer(request, ready)
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
  // A range is said only on a real age, and only when the estimates actually move it.
  const rangeText = range && range.low !== null && e !== null && range.low !== range.high ? (range.high === null ? copy.rangeOpen(range.low, MAX_AGE) : copy.range(range.low, range.high)) : null
  return (
    <div className={'live-answer surface' + (inline ? ' live-answer--inline' : '') + (answer.busy ? ' is-busy' : '')} role="status" aria-live="polite">
      <span className="live-answer__label">{copy.label}</span>
      <strong className="live-answer__age">{answer.busy ? `${said} ${copy.working}` : said}</strong>
      {moved !== null && <span className={'live-answer__moved' + (e !== null && base !== null && base !== undefined && e < base ? ' is-better' : '')}>{moved}</span>}
      <Link className="live-answer__see" to="/resultats">
        {copy.see}
      </Link>
      {rangeText !== null && <span className="live-answer__range">{rangeText}</span>}
    </div>
  )
}
