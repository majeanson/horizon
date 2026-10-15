import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { Fold } from '../components/Fold'
import { InstallCard } from '../components/install/InstallHint'
import { DemoAnswer } from '../components/DemoAnswer'
import { DripQuestion } from '../components/DripQuestion'
import { LiveAnswer } from '../components/LiveAnswer'
import { PageHead } from '../components/PageHead'
import { ReadingHelp } from '../components/ReadingHelp'
import { TimeBudget } from '../components/TimeBudget'
import { useLang } from '../i18n'
import { answerRequest } from '../lib/answerRequest'
import { factsOf } from '../lib/facts'
import { profileGaps } from '../lib/profileGaps'
import { readingHelpDone } from '../lib/readingHelp'
import { useProfile } from '../lib/store'
import { setTimeBudget, timeBudgetAsked, useTimeBudget } from '../lib/timeBudget'
import { TIME_BUDGET_COPY } from '../lib/timeBudgetCopy'
import { today } from '../lib/today'
import { useFactImpact } from '../lib/useFactImpact'
import { useSettled } from '../lib/useSettled'
import { WELCOME_COPY, type WelcomeCopy } from '../lib/welcomeCopy'

// « Accueil » — the front door at `/`. Profil used to be the first thing seen, and a returning household landed on a full form.
// This page says what Horizon is, offers ONE next step (begin, or — once the profile holds enough for an answer — see it), and keeps
// the rest (how it works, what to know) to three short cards each. It reads the profile and writes nothing.
//
// A first visit is asked two things before the page, each a full-screen dialog shown once per device: how to READ it (components/ReadingHelp.tsx), then
// how much TIME it has (components/TimeBudget.tsx, lib/timeBudget.ts). The time shapes the page: the matching door becomes the one « Commencer » and the
// other two fold away; two minutes also folds the explanations. « Changer » on the line, or the settings page, reopens the question.
//
// A ready profile is also asked ONE question (components/DripQuestion.tsx) and shows the answer's range. Both read the SAME idle search
// (`useFactImpact`, how far the answer moves if each unconfirmed figure were off), so it is made here, once, on the settled profile, and handed down.
export function Accueil() {
  const { lang } = useLang()
  const c = WELCOME_COPY[lang]
  const tc = TIME_BUDGET_COPY[lang]
  const profile = useProfile()
  const ready = profileGaps(profile).length === 0
  const slow = useSettled(profile)
  const { year, month } = today()
  const request = useMemo(() => answerRequest(slow, { year, month }), [slow, year, month])
  // The same gate as the live answer: a settled profile with no gap, and somebody still working (a retired household's answer is a plan, not an age).
  const asking = profileGaps(slow).length === 0 && !request.everyoneRetired
  const unconfirmed = useMemo(() => factsOf(slow).filter((f) => !f.confirmed).map((f) => ({ id: f.id, owner: f.owner, kind: f.kind })), [slow])
  const impact = useFactImpact(slow.household, request.assumptions, unconfirmed, asking)
  // The time question waits for the reading dialog, opens once, and again on « Changer ». Closing it without a choice puts it off for good; closing it
  // with a choice already made (reopened, then ✕) keeps that choice.
  const [readingAway, setReadingAway] = useState(readingHelpDone)
  const [timeOpen, setTimeOpen] = useState(() => !timeBudgetAsked())
  const budget = useTimeBudget()
  const chosen = budget === null ? null : (c.doors.find((d) => d.budget === budget) ?? null)
  const doorList = (doors: WelcomeCopy['doors']) => (
    <ul className="welcome__doors">
      {doors.map((d) => (
        <li key={d.to}>
          <Link className="welcome__door surface" to={d.to}>
            <span className="welcome__door-label">{d.label}</span>
            <span className="welcome__door-hint">{d.hint}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
  // The explanations — how it works, the map, what to know: in the open for a reader who has the time, one fold away for the two-minute one.
  const about = (
    <>
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
    </>
  )
  return (
    <section className="page-body welcome">
      <PageHead title={c.title} subtitle={c.subtitle} />
      <ReadingHelp onDone={() => setReadingAway(true)} />
      <TimeBudget
        open={!ready && readingAway && timeOpen}
        value={budget}
        onChoose={(b) => {
          setTimeBudget(b)
          setTimeOpen(false)
        }}
        onClose={() => {
          if (budget === null) setTimeBudget(null)
          setTimeOpen(false)
        }}
      />
      {ready && <LiveAnswer range={asking ? impact?.range : null} />}
      {ready && asking && <DripQuestion impact={impact} facts={unconfirmed} />}
      {/* The chosen time, the door it opens as the one big button, and the way to change one's mind — before anything else on the page. */}
      {!ready && chosen && (
        <div className="welcome__time surface">
          <p className="welcome__time-head">
            <span>{tc.yours(tc.options[chosen.budget].label)}</span>
            <Chip onClick={() => setTimeOpen(true)}>{tc.change}</Chip>
          </p>
          <p className="welcome__door-hint">{chosen.hint}</p>
          <Link className="btn btn--primary" to={chosen.to}>
            {tc.start}
          </Link>
        </div>
      )}
      {/* A blank first visit sees the product working (a real answer for an example household), then the doors in, by effort. */}
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
      ) : chosen ? (
        <Fold className="surface welcome__fold" summary={tc.otherWays}>
          {doorList(c.doors.filter((d) => d !== chosen))}
        </Fold>
      ) : (
        <section aria-labelledby="welcome-doors">
          <h2 id="welcome-doors" className="welcome__title">
            {c.doorsTitle}
          </h2>
          {doorList(c.doors)}
        </section>
      )}
      <InstallCard />
      {!ready && budget === '2' ? (
        <Fold className="surface welcome__fold" summary={tc.moreAbout}>
          {about}
        </Fold>
      ) : (
        about
      )}
    </section>
  )
}
