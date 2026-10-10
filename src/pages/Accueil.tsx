import { Link } from 'react-router-dom'
import { LiveAnswer } from '../components/LiveAnswer'
import { PageHead } from '../components/PageHead'
import { useLang } from '../i18n'
import { profileGaps } from '../lib/profileGaps'
import { useProfile } from '../lib/store'
import { WELCOME_COPY } from '../lib/welcomeCopy'

// « Accueil » — the front door at `/`. Profil used to be the first thing seen, and a returning household landed on a full form.
// This page says what Horizon is, offers ONE next step (begin, or — once the profile holds enough for an answer — see it), and keeps
// the rest (how it works, what to know) to three short cards each. It reads the profile and writes nothing.
export function Accueil() {
  const { lang } = useLang()
  const c = WELCOME_COPY[lang]
  const ready = profileGaps(useProfile()).length === 0
  return (
    <section className="page-body welcome">
      <PageHead title={c.title} subtitle={c.subtitle} />
      {ready && <LiveAnswer />}
      <div className="welcome__go">
        <Link className="btn btn--primary" to={ready ? '/resultats' : '/profil'}>
          {ready ? c.seeAnswer : c.begin}
        </Link>
        <Link className="btn btn--ghost" to={ready ? '/profil' : '/donnees'}>
          {ready ? c.editProfile : c.example}
        </Link>
      </div>
      <section aria-labelledby="welcome-steps">
        <h2 id="welcome-steps" className="welcome__title">
          {c.stepsTitle}
        </h2>
        <ol className="welcome__cards">
          {c.steps.map((s) => (
            <li key={s.title} className="surface welcome__card">
              <h3 className="welcome__card-title">{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
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
