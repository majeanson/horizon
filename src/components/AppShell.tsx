import { NavLink, Outlet } from 'react-router-dom'
import { Suspense, useState } from 'react'
import { useLang, useT } from '../i18n'
import { useStorageIssue } from '../lib/store'
import { getTheme, toggleTheme, type Theme } from '../lib/theme'
import { Icon, type IconName } from './Icon'
import { Loading } from './Loading'
import { StatusMessage } from './StatusMessage'

// The chrome around every page: a top bar (name, language, day/night) and the main
// navigation — a bottom bar on a phone, a left rail on a wide screen. The switch between the
// two is CSS only (styles/horizon.css), never a width check in JS: one markup, two layouts.
//
// The four destinations follow the order a person works in: who you are (Profil), what you
// assume about the future (Hypothèses), what comes out (Résultats), and what is stored
// where (Données).
const TABS = [
  { to: '/', key: 'profile', icon: 'user-bold' },
  { to: '/hypotheses', key: 'assumptions', icon: 'sliders-horizontal-bold' },
  { to: '/resultats', key: 'results', icon: 'chart-line-up-bold' },
  { to: '/donnees', key: 'data', icon: 'download-simple-bold' },
] as const satisfies ReadonlyArray<{ to: string; key: string; icon: IconName }>

export function AppShell() {
  const t = useT()
  const { lang, setLang } = useLang()
  const [theme, setThemeState] = useState<Theme>(getTheme)
  // Whatever stops the profile from being kept — or read — must be said on EVERY page: a person who lost their plan to a
  // refused profile and finds a blank one on Profil would otherwise think the app simply forgot them.
  const storageIssue = useStorageIssue()

  return (
    <div className="shell">
      <header className="shell__bar">
        <NavLink to="/" className="shell__brand">
          {t.appName}
        </NavLink>
        <div className="shell__actions">
          <button type="button" className="btn btn--ghost btn--sm mono" onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}>
            {t.common.lang}
          </button>
          <button
            type="button"
            className="btn btn--icon"
            aria-label={t.common.theme}
            title={t.common.theme}
            onClick={() => setThemeState(toggleTheme())}
          >
            <Icon name={theme === 'night' ? 'sun-bold' : 'moon-stars-bold'} size={20} />
          </button>
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
      <main className="shell__main">
        {storageIssue && <StatusMessage tone={storageIssue === 'unsaved' ? 'error' : 'info'}>{t.data.issue[storageIssue]}</StatusMessage>}
        {/* The page chunk loads INSIDE the shell: the bar and the navigation never vanish while a route is fetched. */}
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
