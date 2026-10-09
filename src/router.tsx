import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Loading } from './components/Loading'

// Every page is lazy: the shell stays small, and the heavy ones (the chart library rides with Résultats) never
// load until their route is opened. The service worker precaches every one of these chunks except /dev/kit, so
// the app opens every route offline (scripts/check-bundle.mjs holds both sides of that).
const Profil = lazy(() => import('./pages/Profil').then((m) => ({ default: m.Profil })))
const Hypotheses = lazy(() => import('./pages/Hypotheses').then((m) => ({ default: m.Hypotheses })))
const Resultats = lazy(() => import('./pages/Resultats').then((m) => ({ default: m.Resultats })))
const Donnees = lazy(() => import('./pages/Donnees').then((m) => ({ default: m.Donnees })))
const Documents = lazy(() => import('./pages/Documents').then((m) => ({ default: m.Documents })))
const Glossaire = lazy(() => import('./pages/Glossaire').then((m) => ({ default: m.Glossaire })))
const DevKit = lazy(() => import('./pages/DevKit').then((m) => ({ default: m.DevKit })))

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Profil />} />
          <Route path="hypotheses" element={<Hypotheses />} />
          <Route path="resultats" element={<Resultats />} />
          <Route path="documents" element={<Documents />} />
          <Route path="glossaire" element={<Glossaire />} />
          <Route path="donnees" element={<Donnees />} />
          {/* Unknown paths land on the first page rather than a dead end — and the ADDRESS follows:
              rendering Profil under /typo left no nav tab active and a wrong URL to re-bookmark. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        {/* A dev-only gallery, outside the shell: it has its own header and toggles. */}
        <Route path="/dev/kit" element={<DevKit />} />
      </Routes>
    </Suspense>
  )
}
