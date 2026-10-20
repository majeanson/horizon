import { NavLink, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useHeadroom } from '../lib/useHeadroom'
import { useT } from '../i18n'
import { saveCopy } from '../lib/saveCopy'
import { isPreview } from '../lib/preview'
import { snoozeBackup, useBackupDue, useStorageIssue } from '../lib/store'
import { useNotice } from '../lib/toast'
import { BrandMark } from './BrandMark'
import { Icon, type IconName } from './Icon'
import { Skeleton } from './Skeleton'
import { StatusMessage } from './StatusMessage'

const PreviewGate = lazy(() => import('./PreviewGate'))
// The answer in the bar rides its own chunk: its worker and request builder are not the door's business (the bar paints, then the age arrives).
const BarAnswer = lazy(() => import('./BarAnswer'))

// The chrome around every page: a top bar (the name, the answer's age, the sheet, the glossary, the settings gear) and the main
// navigation — a bottom bar on a phone, a left rail on a wide screen. The switch between the
// two is CSS only (styles/horizon.css), never a width check in JS: one markup, two layouts.
// The language and the day / night choice are on the settings page and on a first visit's front door, not in the bar: set once, they
// do not earn two buttons on every screen, and the age they made room for is looked at every time.
//
// FOUR destinations, in the order a person works in, each ONE level of cards: who you are (Profil), what comes out and how
// sure it is (Résultats: the answer, then its proof), what to change and how to start and draw (Décider — its own tab since
// 2026-10-19, Marc: no level above the cards on one page and not on another), and what you assume about the future
// (Hypothèses) — optional, since the defaults are the Neutre scenario. Saving a copy, restoring one, the examples and the
// display settings are a page of their own (« Sauvegarde et réglages ») behind the gear in the top bar: used a few times a
// year, they do not earn a place in the thumb bar.
const TABS = [
  { to: '/profil', key: 'profile', icon: 'user-bold' },
  { to: '/resultats', key: 'results', icon: 'chart-line-up-bold' },
  { to: '/decider', key: 'decide', icon: 'signpost-bold' },
  { to: '/hypotheses', key: 'assumptions', icon: 'sliders-horizontal-bold' },
] as const satisfies ReadonlyArray<{ to: string; key: string; icon: IconName }>

// Scroll and focus across navigations. #root is the single scroller, so the browser restores
// nothing by itself: switching page used to keep the previous page's offset, with the new <h1>
// off screen. A tap on a tab lands at the top; back/forward return to where the reader was
// (one remembered offset per path). Only a PATHNAME change moves anything — Résultats keeps
// every view choice in the search string, and a chip tap must not throw the reader to the top.
// Focus moves to <main>, so a screen reader hears the new page and Tab starts in the content;
// rendered BEFORE the Outlet, so a page's own deep-link scroll (an old ?person= link) runs
// after this and wins.
const scrollPositions = new Map<string, number>()
function RouteChange() {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  const prev = useRef<string | null>(null)
  useEffect(() => {
    const el = document.getElementById('root')
    if (!el) return
    const save = () => scrollPositions.set(pathname, el.scrollTop)
    el.addEventListener('scroll', save, { passive: true })
    return () => el.removeEventListener('scroll', save)
  }, [pathname])
  useEffect(() => {
    const arriving = prev.current === null
    const samePage = prev.current === pathname
    prev.current = pathname
    if (arriving || samePage) return
    document.getElementById('root')?.scrollTo({ top: navType === 'POP' ? (scrollPositions.get(pathname) ?? 0) : 0 })
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname, navType])
  return null
}

export function AppShell() {
  const t = useT()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  // Every link of the shell changes page with a short slide (lib/pageTransition.ts, a chunk of its own, fetched once the page is idle so the first tap does not wait for it).
  // A plain tap only: a modified click keeps the ordinary navigation, and so does a chunk that fails to load.
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1500))
    idle(() => void import('../lib/pageTransition'))
  }, [])
  const changePage = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    void import('../lib/pageTransition').then((m) => m.changePage(to, navigate, pathname), () => navigate(to))
  }
  const notice = useNotice()
  // A deploy while the page is OPEN and VISIBLE: registerSw never reloads under a reader; it raises
  // this event instead, and the shell offers the reload as a one-line notice with a button.
  const [swUpdate, setSwUpdate] = useState(false)
  useEffect(() => {
    const ready = () => setSwUpdate(true)
    window.addEventListener('horizon:sw-update', ready)
    return () => window.removeEventListener('horizon:sw-update', ready)
  }, [])
  // Whatever stops the profile from being kept — or read — must be said on EVERY page: a person who lost their plan to a
  // refused profile and finds a blank one on Profil would otherwise think the app simply forgot them.
  const storageIssue = useStorageIssue()
  // The backup notice exports in ONE tap, right here, and can be put off for a week; it never shows on the page it
  // points at. (It used to send the reader to that page to press a second button, and could not be dismissed.)
  const backupDue = useBackupDue() && pathname !== '/donnees'
  const exportNow = () => {
    saveCopy()
    notice(t.data.export.done)
  }
  // The pinned chrome slides away while the reader scrolls down and returns on the first move up (lib/useHeadroom.ts; the sliding is styles/revamp.css).
  const shell = useRef<HTMLDivElement>(null)
  useHeadroom(shell)

  return (
    <div className="shell" ref={shell}>
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        {t.nav.skip}
      </a>
      <RouteChange />
      <header className="shell__bar">
        <NavLink to="/" end className="shell__brand" onClick={(e) => changePage(e, '/')}>
          <BrandMark />
          {t.appName}
        </NavLink>
        {/* Silent until there is an answer; its chunk arrives after the bar has painted, so the bar never waits for it. */}
        <Suspense fallback={null}>
          <BarAnswer />
        </Suspense>
        <div className="shell__actions">
          <NavLink to="/fiche" onClick={(e) => changePage(e, '/fiche')} className={({ isActive }) => 'btn btn--icon btn--ghost btn--labeled shell__sheet' + (isActive ? ' is-active' : '')} aria-label={t.nav.sheet} title={t.nav.sheet}>
            <Icon name="identification-card-bold" size={20} />
            <span className="btn__label" aria-hidden="true">{t.nav.sheetShort}</span>
          </NavLink>
          <NavLink to="/glossaire" onClick={(e) => changePage(e, '/glossaire')} className={({ isActive }) => 'btn btn--icon btn--ghost btn--labeled' + (isActive ? ' is-active' : '')} aria-label={t.nav.glossary} title={t.nav.glossary}>
            <Icon name="book-open-text-bold" size={20} />
            <span className="btn__label" aria-hidden="true">{t.nav.glossaryShort}</span>
          </NavLink>
          <NavLink to="/donnees" onClick={(e) => changePage(e, '/donnees')} className={({ isActive }) => 'btn btn--icon btn--ghost btn--labeled' + (isActive ? ' is-active' : '')} aria-label={t.nav.data} title={t.nav.data}>
            <Icon name="gear-six-bold" size={20} />
            <span className="btn__label" aria-hidden="true">{t.nav.dataShort}</span>
          </NavLink>
        </div>
      </header>
      <nav className="shell__nav" aria-label={t.nav.label}>
        {TABS.map((tab) => (
          // A short slide between pages, the bars holding still (changePage above, styles/phone.css).
          <NavLink key={tab.to} to={tab.to} end onClick={(e) => changePage(e, tab.to)} className={({ isActive }) => 'shell__tab' + (isActive ? ' is-on' : '')}>
            <Icon name={tab.icon} size={22} />
            <span>{t.nav[tab.key]}</span>
          </NavLink>
        ))}
      </nav>
      {/* tabIndex -1: the skip link's target and where focus lands after a navigation — never a tab stop itself. */}
      <main className="shell__main" id="main" tabIndex={-1}>
        {storageIssue && <StatusMessage tone={storageIssue === 'unsaved' ? 'error' : 'info'}>{t.data.issue[storageIssue]}</StatusMessage>}
        {backupDue && (
          <div className="shell__notice">
            <StatusMessage tone="info">{t.data.backup.due}</StatusMessage>
            <button type="button" className="btn btn--sm" onClick={exportNow}>
              {t.data.backup.button}
            </button>
            <button type="button" className="btn btn--sm btn--ghost" onClick={snoozeBackup}>
              {t.data.backup.later}
            </button>
          </div>
        )}
        {swUpdate && (
          <div className="shell__notice">
            <StatusMessage tone="info">{t.common.updateReady}</StatusMessage>
            <button type="button" className="btn btn--sm" onClick={() => window.location.reload()}>
              {t.common.updateReload}
            </button>
          </div>
        )}
        {/* The page chunk loads INSIDE the shell: the bar and the navigation never vanish while a route is fetched — and the
            wait has a shape (a few quiet blocks where the page's cards will be), not a lone word. */}
        <Suspense fallback={<Skeleton count={4} />}>
          {/* The portfolio preview (lib/preview.ts) wraps the page: its invented household is in the store before the page first renders. */}
          {isPreview() ? (
            <PreviewGate>
              <Outlet />
            </PreviewGate>
          ) : (
            <Outlet />
          )}
        </Suspense>
        {/* One quiet line at the foot of every page: the promise, then who built it as a plain link. The link leaves the app, so it opens nothing of the profile. */}
        <p className="shell__foot">
          <span>{t.common.staysHere}</span>
          <span>
            {t.common.builtBy}{' '}
            <a href="https://marcportal.com" rel="noopener">
              marc.portal
            </a>
          </span>
        </p>
      </main>
    </div>
  )
}
