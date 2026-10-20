import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { ConceptPip } from '../components/ConceptPip'
import { Fold } from '../components/Fold'
import { Icon } from '../components/Icon'
import { InstallCard } from '../components/install/InstallHint'
import { DemoAnswer } from '../components/DemoAnswer'
import { DisplayControls } from '../components/DisplayControls'
import { DripQuestion } from '../components/DripQuestion'
import { PageHead } from '../components/PageHead'
import { WelcomeDialog } from '../components/WelcomeDialog'
import { useLang } from '../i18n'
import { answerRequest } from '../lib/answerRequest'
import { factsOf } from '../lib/facts'
import { scrollToSection } from '../lib/motion'
import { profileGaps } from '../lib/profileGaps'
import { READING_HELP_COPY } from '../lib/readingHelpCopy'
import { useProfile } from '../lib/store'
import { setTimeBudget, useTimeBudget } from '../lib/timeBudget'
import { today } from '../lib/today'
import { useFactImpact } from '../lib/useFactImpact'
import { useSettled } from '../lib/useSettled'
import { WELCOME_COPY } from '../lib/welcomeCopy'

// « Accueil » — the front door at `/`. It says what Horizon is BEFORE it asks anything: nothing opens by itself.
//
// A first visit (no answer yet) meets, in this order (Marc, 2026-10-19): what Horizon is, in one sentence beside the mark; how to read the page
// (the language, day / night, the contrast, the size of the letters — in view, never behind a tap, so nobody walks in without seeing them); then
// « Commencer » and « Voir un exemple », on the first screen of the smallest phone (2026-10-20); then the question, what Horizon does and the two
// promises it keeps (nothing leaves the device; every government figure is cited) — and an example answer working (components/DemoAnswer.tsx).
// « Commencer » opens the one dialog (components/WelcomeDialog.tsx): how much time there is, each answer a door into its own path.
//
// A ready profile is asked ONE question (components/DripQuestion.tsx), from an idle search (`useFactImpact`, how far the answer moves if each
// unconfirmed figure were off) made here, on the settled profile, and offered its answer and its profile. Its answer is in the top bar, like on every
// page (components/BarAnswer.tsx).
//
// For everyone, two folds side by side at the foot, neither inside the other: how it works, and where things are. The page reads the profile; it
// writes only the time budget a door keeps.
export function Accueil() {
  const { lang } = useLang()
  const c = WELCOME_COPY[lang]
  const rc = READING_HELP_COPY[lang]
  const profile = useProfile()
  const ready = profileGaps(profile).length === 0
  const slow = useSettled(profile)
  const { year, month } = today()
  const request = useMemo(() => answerRequest(slow, { year, month }), [slow, year, month])
  // The same gate as the live answer: a settled profile with no gap, and somebody still working (a retired household's answer is a plan, not an age).
  const asking = profileGaps(slow).length === 0 && !request.everyoneRetired
  const unconfirmed = useMemo(() => factsOf(slow).filter((f) => !f.confirmed).map((f) => ({ id: f.id, owner: f.owner, kind: f.kind })), [slow])
  const impact = useFactImpact(slow.household, request.assumptions, unconfirmed, asking)
  const [starting, setStarting] = useState(false)
  const budget = useTimeBudget()

  return (
    <section className="page-body welcome">
      {ready ? (
        <PageHead title={c.title} subtitle={c.subtitle} />
      ) : (
        <div className="welcome__hero">
          <p className="welcome__what">
            <BrandMark size={32} />
            <span>{c.subtitle}</span>
          </p>
          <section className="surface welcome__reading" aria-labelledby="welcome-reading">
            <p id="welcome-reading" className="welcome__title">
              {rc.title}
            </p>
            <DisplayControls sizeLabels={rc.sizes} />
            <p className="field-row__hint">{rc.zoomTip}</p>
          </section>
          {/* The way in sits right under the preferences, above the question (Marc, 2026-10-20): on the smallest phone it is still on the first screen. */}
          <div className="welcome__go">
            <button type="button" className="btn btn--primary" onClick={() => setStarting(true)}>
              {c.begin}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => scrollToSection('demo')}>
              {c.example}
            </button>
          </div>
          <PageHead title={c.title} />
          <ul className="welcome__promises">
            {c.promises.map((p) => (
              <li key={p}>
                <Icon name="check-bold" size={18} />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <WelcomeDialog
        open={starting}
        value={budget}
        onChoose={(b) => {
          setTimeBudget(b)
          setStarting(false)
        }}
        onClose={() => setStarting(false)}
      />
      {ready && asking && <DripQuestion impact={impact} facts={unconfirmed} />}
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
        <DemoAnswer />
      )}
      <InstallCard />
      <section aria-labelledby="welcome-steps">
        <Fold className="surface welcome__fold" summary={<h2 id="welcome-steps">{c.stepsTitle}</h2>}>
          <ol className="welcome__cards">
            {/* Each step is ONE door: the whole card opens the page, its concept's pip leads the title — no underlined word to find. */}
            {c.steps.map((s) => (
              <li key={s.title}>
                <Link className="surface welcome__card" to={s.to}>
                  <h3 className="welcome__card-title">
                    <ConceptPip id={s.concept} size="sm" />
                    {s.title}
                  </h3>
                  <p>{s.text}</p>
                </Link>
              </li>
            ))}
          </ol>
        </Fold>
      </section>
      <section aria-labelledby="welcome-guide">
        {/* The map of the app: a reference, one tap away — the tabs and the buttons in the bar already say where things are. */}
        <Fold className="surface welcome__fold" summary={<h2 id="welcome-guide">{c.guideTitle}</h2>}>
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
    </section>
  )
}
