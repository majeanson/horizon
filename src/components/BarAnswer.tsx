import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useLang } from '../i18n'
import { answerRequest } from '../lib/answerRequest'
import { LIVE_COPY } from '../lib/liveCopy'
import { profileGaps } from '../lib/profileGaps'
import { useProfile } from '../lib/store'
import { today } from '../lib/today'
import { useAnswer } from '../lib/useAnswer'
import { useChangePulse } from '../lib/useChangePulse'
import { useSettled } from '../lib/useSettled'

// « 60 ans » IN THE TOP BAR — the answer one glance away on every page, where the language and the theme buttons used to be (both live on the
// settings page and in the reading dialog). The SAME job as the results page (`useAnswer`: the earliest age, in a worker, from a profile that has
// rested 300 ms) and nothing else; a tap opens Résultats. Silent — absent — until the profile holds enough to mean something, and for a household
// already retired (its answer is a plan, not an age). It replaced the strip that was pinned under the bar on Profil and Hypothèses: one row of
// chrome less on a phone, and the age is there on every page, not two.
//
// A LAZY chunk of the shell (AppShell.tsx): the worker, the request builder and these words are not the door's business — the bar paints, then
// the age arrives. Busy is said in words (« … »), never dimmed below 4.5:1.
export default function BarAnswer() {
  const { lang } = useLang()
  const copy = LIVE_COPY[lang]
  const profile = useProfile()
  const slow = useSettled(profile)
  const { year, month } = today()
  const request = useMemo(() => answerRequest(slow, { year, month }), [slow, year, month])
  const ready = profileGaps(profile).length === 0 && !request.everyoneRetired
  const answer = useAnswer(request, ready)
  const got = ready ? answer.value : null
  // A ring around the pill when the age MOVES (not when it first arrives): sage if earlier, accent if later (styles/motion.css). Decoration — the live region says the age.
  const pulse = useChangePulse(got === null ? null : got.nowOk ? null : got.earliest)
  if (got === null) return null
  const said = got.earliest === null ? copy.bar.none : got.nowOk ? copy.now : copy.at(got.earliest)
  const text = answer.busy ? `${said} ${copy.working}` : said
  return (
    <div className={'shell__answer' + (answer.busy ? ' is-busy' : '')} role="status" aria-live="polite">
      <NavLink to="/resultats" className={({ isActive }) => 'shell__answer-link' + (isActive ? ' is-active' : '')} aria-label={copy.bar.aria(text)} title={copy.bar.aria(text)}>
        {pulse.count > 0 && <span key={pulse.count} className="answer-pulse" data-dir={pulse.dir ?? undefined} aria-hidden="true" />}
        <span className="shell__answer-label">{copy.label}</span>
        {/* Keyed on the age said, not on the busy suffix: the figure settles into place (styles/motion.css) when it CHANGES, and sits still while it is being worked out again. */}
        <strong key={said} className="shell__answer-age">
          {text}
        </strong>
      </NavLink>
    </div>
  )
}
