import { StrictMode, useState } from 'react'
// createRoot, not hydrateRoot — there is no prerender to match.
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from './router'
import { ErrorBoundary } from './components/ErrorBoundary'
import { LangContext, type Lang } from './i18n'
import { ToastProvider } from './lib/toast'
import { ConfirmProvider } from './lib/confirm'
import { registerSw } from './lib/registerSw'
import './styles.css'

const LANG_KEY = 'horizon-lang'

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'fr' || saved === 'en') return saved
  } catch {
    /* storage blocked — fall through to the default */
  }
  return 'fr'
}

function Root() {
  const [lang, setLangState] = useState<Lang>(initialLang)
  function setLang(l: Lang) {
    setLangState(l)
    try {
      localStorage.setItem(LANG_KEY, l)
    } catch {
      /* storage blocked — the choice just does not persist */
    }
    document.documentElement.lang = l
  }
  // index.html is lang="fr"; keep <html lang> honest on a saved English choice.
  if (document.documentElement.lang !== lang) document.documentElement.lang = lang

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            {/* A render throw anywhere in the routes degrades to a calm, recoverable card
                instead of unmounting the whole app to a blank page. */}
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </LangContext.Provider>
  )
}

// Offline app shell for the installed PWA. No-op in dev.
registerSw()

// A deploy deletes the previous build's hashed chunks; a page loaded BEFORE it that then
// lazy-imports a route gets a 404 (worker/index.ts + the SW both refuse the SPA-fallback
// HTML as JS), the import() rejects — and React.lazy memoises the REJECTION, so that route
// stays dead for the life of the document. Vite surfaces exactly this as
// `vite:preloadError`: reload once to pick up the new build. The sessionStorage stamp keeps
// a genuinely broken asset from looping the reload — after one attempt per minute we let
// the app-level ErrorBoundary say « Recharger » instead.
window.addEventListener('vite:preloadError', (e) => {
  let last = 0
  try {
    last = Number(sessionStorage.getItem('horizon-preload-reload') || 0)
  } catch {
    /* storage broken → still reload; the loop guard just degrades */
  }
  if (Date.now() - last < 60_000) return
  try {
    sessionStorage.setItem('horizon-preload-reload', String(Date.now()))
  } catch {
    /* ignore */
  }
  e.preventDefault() // we own the recovery — do not also throw into the boundary
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
