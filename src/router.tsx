import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Loading } from './components/Loading'
import { Home } from './pages/Home'

// Every page but the landing one is lazy: the shell stays small, and the heavy ones (the
// chart library rides with Résultats) never load until their route is opened. The service
// worker precaches every one of these chunks except /dev/kit, so the app opens every route
// offline (scripts/check-bundle.mjs holds both sides of that).
const DevKit = lazy(() => import('./pages/DevKit').then((m) => ({ default: m.DevKit })))

export function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          {/* Unknown paths land on the first page rather than a dead end. */}
          <Route path="*" element={<Home />} />
        </Route>
        {/* A dev-only gallery, outside the shell: it has its own header and toggles. */}
        <Route path="/dev/kit" element={<DevKit />} />
      </Routes>
    </Suspense>
  )
}
