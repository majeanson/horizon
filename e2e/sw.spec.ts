import { test, expect, type Page } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// The service-worker offline app shell, end to end. The promise: an installed Horizon REOPENS
// with no network and still boots — and, because the profile lives in the browser, with the
// household's data intact. That relies on the build-time SW (vite.config horizon-sw) precaching
// the shell on install and, on a later navigate, falling back to the cached '/' when the network
// is gone. It can only be observed against the built PROD bundle served by `vite preview` (see
// sw.config.ts) — the DEV server registers no SW at all.

// The SW installs (the critical precache, then the optional one → skipWaiting), activates and
// claims this page, at which point navigator.serviceWorker.controller is set. Since install()
// REJECTS on a critical entry it could not cache, a non-null controller means the whole shell is
// in the cache — not merely that install ran.
async function waitControlled(page: Page): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 20_000 })
}

// The versioned precache: horizon-<djb2 of the asset list>.
async function cachedPaths(page: Page): Promise<string[] | null> {
  return page.evaluate(async () => {
    const name = (await caches.keys()).find((k) => k.startsWith('horizon-'))
    if (!name) return null
    return (await (await caches.open(name)).keys()).map((r) => new URL(r.url).pathname)
  })
}

test('the service worker precaches the whole shell it promised', async ({ page }) => {
  await page.goto('/')
  await waitControlled(page)

  const precached = await cachedPaths(page)
  expect(precached, 'a versioned horizon-<hash> precache exists').not.toBeNull()
  expect(precached).toContain('/')
  expect(precached!.some((p) => /\.js$/.test(p)), 'precache holds a hashed JS bundle').toBe(true)
  expect(precached!.some((p) => /\.woff2$/.test(p)), 'precache holds the self-hosted fonts').toBe(true)

  // EVERY entry this build called critical, not merely « at least one .js » — the guarantee
  // install() owes. A hole in that set is invisible while online and surfaces later as a blank
  // screen on the first offline reopen, with nothing pointing at the cause. Read the promise
  // back out of /sw.js and check the cache kept it, so the next failure names itself.
  const promised = await page.evaluate(async () => {
    const src = await fetch('/sw.js').then((r) => r.text())
    const from = src.indexOf('[', src.indexOf('const PRECACHE_CRITICAL ='))
    const to = src.indexOf(']', from)
    return from < 0 || to < 0 ? null : (JSON.parse(src.slice(from, to + 1)) as string[])
  })
  expect(promised, '/sw.js exposes the critical list it was built with').not.toBeNull()
  expect(promised!.filter((u) => u.endsWith('.js')).length, 'the build baked hashed JS bundles into PRECACHE_CRITICAL').toBeGreaterThan(0)
  expect(
    promised!.filter((u) => !precached!.includes(u)),
    'every critical entry actually landed in the cache',
  ).toEqual([])

  // The online-only chunk (the /dev/kit gallery) must NOT be in the precache — scripts/check-bundle
  // holds this at build time; this holds it in a real browser.
  expect(precached!.some((p) => /\/assets\/DevKit-/.test(p)), 'the gallery is online-only').toBe(false)
})

test('the app reopens offline with no network — shell, language and theme intact', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await waitControlled(page)

  // Set a language and a theme, as a returning visitor would have.
  await page.getByRole('button', { name: 'Passer à l’anglais' }).click()
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  await page.getByRole('button', { name: /Switch to (day|night) mode/ }).click()
  const theme = await page.locator('html').getAttribute('data-theme')

  const consoleErrors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 200)))
  const failed: string[] = []
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`)
  })

  // Kill the network and reopen the app: the navigation cannot reach the server, so the SW must
  // serve the cached shell.
  await page.context().setOffline(true)
  await page.reload()

  try {
    await expect(page.locator('.shell__brand')).toBeVisible({ timeout: 30_000 })
  } catch (err) {
    // THE ONLY WITNESS when the shell does not come back and there is no trace to open: carry the
    // page's state into the failure so it names itself.
    const diag = await page.evaluate(async () => ({
      body: document.body?.innerText?.slice(0, 200) ?? null,
      controller: !!navigator.serviceWorker.controller,
      caches: await caches.keys(),
    }))
    throw new Error(`offline reopen did not render the shell\n${JSON.stringify({ diag, failed, consoleErrors }, null, 1)}\n${String(err)}`)
  }
  await expect(page.getByRole('navigation', { name: 'Main navigation' }), 'the language survived').toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme!)
  expect(failed, 'nothing the offline shell asked for failed').toEqual([])
  expect(consoleErrors).toEqual([])
})

test('a deep link boots from the cached shell offline (a client route, not a file)', async ({ page }) => {
  await page.goto('/')
  await waitControlled(page)
  await page.context().setOffline(true)
  await page.goto('/hypotheses')
  await expect(page.locator('.shell__brand')).toBeVisible({ timeout: 30_000 })
})

test('a gone hashed asset is refused and never cached as HTML (the grey-screen trap)', async ({ page }) => {
  await page.goto('/')
  await waitControlled(page)

  // `vite preview` answers an unknown path with the SPA fallback — 200 text/html — exactly like
  // the real origin's single-page-application mode. The SW must treat HTML under a subresource
  // URL as « this build is gone », not as a script.
  const status = await page.evaluate(async () => (await fetch('/assets/gone-0000.js')).status)
  expect(status, 'the SW refuses HTML under a .js URL').toBe(504)
  const stored = await page.evaluate(async () => {
    const name = (await caches.keys()).find((k) => k.startsWith('horizon-'))
    return name ? !!(await (await caches.open(name)).match('/assets/gone-0000.js')) : null
  })
  expect(stored, 'the HTML was never written under the .js URL').toBe(false)

  // …and the refusal dropped the cached shell so the next navigation must go to the network for
  // fresh HTML — which the very next ONLINE navigation re-caches (the stale-asset branch heals).
  await page.reload()
  await expect(page.locator('.shell__brand')).toBeVisible()
  await expect.poll(async () => (await cachedPaths(page))?.includes('/') ?? false, { message: 'the shell was re-cached by the navigation' }).toBe(true)
})

test('with no network AND no cached shell, a navigation shows the last page rather than nothing', async ({ page }) => {
  await page.goto('/')
  await waitControlled(page)
  // The worst case: the cache is gone (storage pressure, a clear-site-data) and the network too.
  await page.evaluate(async () => {
    for (const k of await caches.keys()) await caches.delete(k)
  })
  await page.context().setOffline(true)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  // A fallback is ALWAYS a Response — an installed PWA paints a failed navigation as nothing.
  await expect(page.getByRole('heading', { name: 'Horizon' })).toBeVisible()
  await expect(page.getByText('Pas de réseau')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
})

test('offline, the saved profile is intact and the results — the chart and the worker included — are computed from the cache', async ({ page }) => {
  // The promise this app is built on: no network is needed, ever, for anything a person did. Reopen offline and the
  // profile is still there, the verdict is re-derived, the chart's lazy chunk comes from the cache, and the
  // « what if » grid runs in a worker whose script is also from the cache.
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats')
  await waitControlled(page)
  await expect(page.getByText('Vous pouvez prendre votre retraite à 59 ans, tous les deux.')).toBeVisible()

  const consoleErrors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message.slice(0, 200)))
  const failed: string[] = []
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`)
  })

  await page.context().setOffline(true)
  await page.reload()
  await expect(page.getByText('Vous pouvez prendre votre retraite à 59 ans, tous les deux.')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.chart-panel figure.chart')).toBeVisible()
  await expect(page.locator('.chart-panel path.recharts-line-curve')).toHaveCount(2)

  // The profile page, offline, still holds what was saved (both people are on the page: scope to the first).
  await page.getByRole('link', { name: 'Profil', exact: true }).click()
  await expect(page.locator('#person-self').getByRole('textbox', { name: 'Revenu de travail par année', exact: true })).toHaveValue(/85\D000/)

  // …and the worker runs offline: the « what if » grid starts by itself and fills from the cache.
  await page.getByRole('link', { name: 'Résultats', exact: true }).click()
  await page.getByRole('tab', { name: 'Vérifier' }).click() // the grid lives on the « Vérifier » view
  // 9 cells = the one 3 × 3 grid shown (the horizon is chosen in its header; the worker still works out all three).
  await expect(page.locator('.sensitivity__grids tbody td')).toHaveCount(9, { timeout: 90_000 })
  // The 9 cells exist at once as « … » placeholders and fill as the worker streams: wait for the value, not the cell.
  await expect(page.locator('.sensitivity__grids td.is-base')).toHaveText('59', { timeout: 90_000 })

  expect(failed, 'nothing the offline app asked for failed').toEqual([])
  expect(consoleErrors).toEqual([])
})
