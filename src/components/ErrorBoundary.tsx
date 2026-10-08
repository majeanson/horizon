import { Component, type ErrorInfo, type ReactNode } from 'react'

// App-level safety net. React unmounts the ENTIRE tree when a render throws and nothing
// catches it — one bad field access would blank the whole app to the cream <body>, with no
// way back. This boundary turns any such throw into a calm, recoverable screen instead of a
// void. It is deliberately copy-light and dependency-free (no hooks/i18n/router) so it
// cannot itself fail while rendering the fallback. Bilingual inline, FR first.
//
// « Tes données sont intactes » is a promise this app can keep: the profile lives in
// localStorage, which a render error does not touch.
// A crash on a bad profile would otherwise loop on reload with no way to reach the Données
// page. Reads the stored text raw (no store, no schema — those are what may have failed) and
// hands it back as a file, so the household's numbers can be rescued before anything is reset.
function saveRawProfile() {
  try {
    const text = localStorage.getItem('horizon-profile')
    if (text === null) return
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `horizon-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    /* nothing more can be done from a fallback screen */
  }
}

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface it for the console. Swallow any logging error so the fallback always renders.
    try {
      console.error('Horizon a planté (render):', error, info.componentStack)
    } catch {
      /* noop */
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="errboundary" role="alert">
        <div className="errboundary__card surface">
          <p className="errboundary__title">Oups — un pépin</p>
          <p className="errboundary__msg mono">
            Quelque chose a planté à l’affichage. Vos données sont intactes sur cet appareil ; on recharge et ça repart.
            <br />
            <span className="errboundary__en">Something broke while rendering. Your data is safe on this device — reload to continue.</span>
          </p>
          <div className="errboundary__actions">
            <button type="button" className="btn btn--primary mono" onClick={() => window.location.reload()}>
              Recharger
            </button>
            <button type="button" className="btn btn--ghost mono" onClick={saveRawProfile}>
              Télécharger mes données
            </button>
            <button type="button" className="btn btn--ghost mono" onClick={() => window.location.assign('/')}>
              Retour au début
            </button>
          </div>
        </div>
      </div>
    )
  }
}
