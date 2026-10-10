import { NavLink, Outlet, useLocation, useNavigationType } from 'react-router-dom'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useLang, useT } from '../i18n'
import { saveAsFile } from '../lib/download'
import { exportFileName, exportProfileJson, getProfile, markExported, snoozeBackup, useBackupDue, useStorageIssue } from '../lib/store'
import { getTheme, toggleTheme, type Theme } from '../lib/theme'
import { useNotice } from '../lib/toast'
import { Icon, type IconName } from './Icon'
import { Skeleton } from './Skeleton'
import { StatusMessage } from './StatusMessage'

// The chrome around every page: a top bar (name, language, day/night, the settings gear) and the main
// navigation — a bottom bar on a phone, a left rail on a wide screen. The switch between the
// two is CSS only (styles/horizon.css), never a width check in JS: one markup, two layouts.
//
// THREE destinations, in the order a person works in: who you are (Profil), what comes out (Résultats), and what
// you assume about the future (Hypothèses) — optional, since the defaults are the Neutre scenario, and reached from
// the answer when the person wants to try another future. Saving a copy, restoring one, the examples and the display
// settings are a fourth page (« Sauvegarde et réglages ») behind the gear in the top bar: used a few times a year,
// it does not earn a quarter of the thumb bar.
const TABS = [
  { to: '/profil', key: 'profile', icon: 'user-bold' },
  { to: '/resultats', key: 'results', icon: 'chart-line-up-bold' },
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
  const { lang, setLang } = useLang()
  const { pathname } = useLocation()
  const notice = useNotice()
  const [theme, setThemeState] = useState<Theme>(getTheme)
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
    saveAsFile(exportProfileJson(getProfile()), exportFileName())
    markExported()
    notice(t.data.export.done)
  }
  const themeLabel = theme === 'night' ? t.common.themeToDay : t.common.themeToNight

  return (
    <div className="shell">
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
        <NavLink to="/" end className="shell__brand">
          {t.appName}
        </NavLink>
        <div className="shell__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            aria-label={t.common.langLabel}
            title={t.common.langLabel}
            onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
          >
            {t.common.lang}
          </button>
          <button type="button" className="btn btn--icon btn--ghost" aria-label={themeLabel} title={themeLabel} onClick={() => setThemeState(toggleTheme())}>
            <Icon name={theme === 'night' ? 'sun-bold' : 'moon-stars-bold'} size={20} />
          </button>
          <NavLink to="/fiche" className={({ isActive }) => 'btn btn--icon btn--ghost shell__sheet' + (isActive ? ' is-active' : '')} aria-label={t.nav.sheet} title={t.nav.sheet}>
            <Icon name="identification-card-bold" size={20} />
          </NavLink>
          <NavLink to="/glossaire" className={({ isActive }) => 'btn btn--icon btn--ghost' + (isActive ? ' is-active' : '')} aria-label={t.nav.glossary} title={t.nav.glossary}>
            <Icon name="book-open-text-bold" size={20} />
          </NavLink>
          <NavLink to="/donnees" className={({ isActive }) => 'btn btn--icon btn--ghost' + (isActive ? ' is-active' : '')} aria-label={t.nav.data} title={t.nav.data}>
            <Icon name="gear-six-bold" size={20} />
          </NavLink>
        </div>
      </header>
      <nav className="shell__nav" aria-label={t.nav.label}>
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end className={({ isActive }) => 'shell__tab' + (isActive ? ' is-on' : '')}>
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
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
