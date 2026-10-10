import { useLang } from '../../i18n'
import { dismissInstall, promptInstall, useInstallCard, useInstallKind } from '../../lib/install'
import { INSTALL_COPY } from '../../lib/installCopy'
import { Section } from '../profile/shared'

// THE INSTALL OFFER, in its two places. `InstallCard` is the one quiet card on the front door: only where there is something to do (the browser holds an
// install prompt, or this is iOS and the words are all there is), only until « Plus tard » or the install, never twice. `InstallLine` is the permanent line on
// « Sauvegarde et réglages » for whoever changes their mind — it also says plainly when the app is already installed, or where a browser keeps the command.

export function InstallCard() {
  const { lang } = useLang()
  const c = INSTALL_COPY[lang].card
  const kind = useInstallCard()
  if (kind === null) return null
  return (
    <section className="surface install-card" aria-label={c.title}>
      <h2 className="welcome__card-title">{c.title}</h2>
      <p>{c.text}</p>
      <p className="field-row__hint">{kind === 'native' ? c.native : c.ios}</p>
      <div className="install-card__actions">
        {kind === 'native' && (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => void promptInstall()}>
            {c.install}
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--sm" onClick={dismissInstall}>
          {c.later}
        </button>
      </div>
    </section>
  )
}

export function InstallLine() {
  const { lang } = useLang()
  const c = INSTALL_COPY[lang].line
  const kind = useInstallKind()
  return (
    <Section title={c.title} subtitle={kind === 'installed' ? c.installed : c.hint} icon="download-simple-bold">
      {kind === 'native' && (
        <>
          <p className="field-row__hint">{c.native}</p>
          <div className="install-card__actions">
            <button type="button" className="btn btn--primary btn--sm" onClick={() => void promptInstall()}>
              {c.install}
            </button>
          </div>
        </>
      )}
      {kind === 'ios' && <p className="field-row__hint">{c.ios}</p>}
      {kind === 'manual' && <p className="field-row__hint">{c.manual}</p>}
    </Section>
  )
}
