import { Fragment, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Fold } from '../components/Fold'
import { InstallCard } from '../components/install/InstallHint'
import { DemoAnswer } from '../components/DemoAnswer'
import { DripQuestion } from '../components/DripQuestion'
import { LiveAnswer } from '../components/LiveAnswer'
import { PageHead } from '../components/PageHead'
import { ReadingHelp } from '../components/ReadingHelp'
import { useLang } from '../i18n'
import { answerRequest } from '../lib/answerRequest'
import { factsOf } from '../lib/facts'
import { profileGaps } from '../lib/profileGaps'
import { useProfile } from '../lib/store'
import { today } from '../lib/today'
import { useFactImpact } from '../lib/useFactImpact'
import { useSettled } from '../lib/useSettled'
import { WELCOME_COPY } from '../lib/welcomeCopy'

// « Accueil » — the front door at `/`. Profil used to be the first thing seen, and a returning household landed on a full form.
// This page says what Horizon is, offers ONE next step (begin, or — once the profile holds enough for an answer — see it), and keeps
// the rest (how it works, what to know) to three short cards each. It reads the profile and writes nothing.
//
// A ready profile is also asked ONE question (components/DripQuestion.tsx) and shows the answer's range. Both read the SAME idle search
// (`useFactImpact`, how far the answer moves if each unconfirmed figure were off), so it is made here, once, on the settled profile, and handed down.
export function Accueil() {
  const { lang } = useLang()
  const c = WELCOME_COPY[lang]
  const profile = useProfile()
  const ready = profileGaps(profile).length === 0
  const slow = useSettled(profile)
  const { year, month } = today()
  const request = useMemo(() => answerRequest(slow, { year, month }), [slow, year, month])
  // The same gate as the live answer: a settled profile with no gap, and somebody still working (a retired household's answer is a plan, not an age).
  const asking = profileGaps(slow).length === 0 && !request.everyoneRetired
  const unconfirmed = useMemo(() => factsOf(slow).filter((f) => !f.confirmed).map((f) => ({ id: f.id, owner: f.owner, kind: f.kind })), [slow])
  const impact = useFactImpact(slow.household, request.assumptions, unconfirmed, asking)
  return (
    <section className="page-body welcome">
      <PageHead title={c.title} subtitle={c.subtitle} />
      <ReadingHelp />
      {ready && <LiveAnswer range={asking ? impact?.range : null} />}
      {ready && asking && <DripQuestion impact={impact} facts={unconfirmed} />}
      {/* A blank first visit sees the product working (a real answer for an example household), then three doors in, by effort. */}
      {!ready && <DemoAnswer />}
      {ready ? (
        <div className="welcome__go">
          <Link className="btn btn--primary" to="/resultats">
            {c.seeAnswer}
          </Link>
          <Link className="btn btn--ghost" to="/profil">
            {c.editProfile}
          </Link>
        </div>
      ) : (
        <section aria-labelledby="welcome-doors">
          <h2 id="welcome-doors" className="welcome__title">
            {c.doorsTitle}
          </h2>
          <ul className="welcome__doors">
            {c.doors.map((d) => (
              <li key={d.to}>
                <Link className="welcome__door surface" to={d.to}>
                  <span className="welcome__door-label">{d.label}</span>
                  <span className="welcome__door-hint">{d.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <InstallCard />
      <section aria-labelledby="welcome-steps">
        <h2 id="welcome-steps" className="welcome__title">
          {c.stepsTitle}
        </h2>
        <ol className="welcome__cards">
          {c.steps.map((s) => (
            <li key={s.title} className="surface welcome__card">
              <h3 className="welcome__card-title">
                <Link to={s.to}>{s.title}</Link>
              </h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="welcome-guide">
        {/* The map of the app: a reference, one tap away — the tabs and the buttons in the bar already say where things are. */}
        <Fold className="surface" summary={<span id="welcome-guide">{c.guideTitle}</span>}>
        <dl className="welcome__guide">
          {c.guide.map((g) => (
            <Fragment key={g.name}>
              <dt>{g.to === null ? g.name : <Link to={g.to}>{g.name}</Link>}</dt>
              <dd>{g.text}</dd>
            </Fragment>
          ))}
        </dl>
        </Fold>
      </section>
      <section aria-labelledby="welcome-know">
        <h2 id="welcome-know" className="welcome__title">
          {c.goodToKnow}
        </h2>
        <ul className="welcome__cards">
          {c.facts.map((f) => (
            <li key={f.to} className="surface welcome__card">
              <h3 className="welcome__card-title">{f.title}</h3>
              <p>{f.text}</p>
              <Link className="info-note__link" to={f.to}>
                {f.link}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}
