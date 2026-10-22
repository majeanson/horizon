import { expect, test } from '@playwright/test'

// WHAT A STRANGER MEETS: every page, opened cold with nothing saved, on a phone and on a desktop. No error in the console, no sideways scroll, exactly one
// h1, a title that says where they are. An address that is no page lands on the front door; the files a crawler asks for are files, not the app's HTML.

const ROUTES = ['/', '/profil', '/hypotheses', '/resultats', '/decider', '/fiche', '/glossaire', '/donnees', '/partage?age=62&foyer=couple&l=fr']
const SIZES = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } }

for (const [name, size] of Object.entries(SIZES)) {
  test(`every page opens clean on a ${name}`, async ({ page }) => {
    test.setTimeout(120000)
    await page.setViewportSize(size)
    const problems: string[] = []
    page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
    page.on('requestfailed', (r) => problems.push(`failed: ${r.url()}`))
    for (const route of ROUTES) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${route} scrolls sideways`).toBeLessThanOrEqual(0)
      expect(await page.title(), `${route} has no title`).toMatch(/Horizon/)
    }
    expect(problems).toEqual([])
  })
}

test('an address that is no page lands on the front door', async ({ page }) => {
  await page.goto('/nimporte-quoi')
  await expect(page).toHaveURL(/\/$/)
})

test('robots.txt is a file, not the app', async ({ request }) => {
  const res = await request.get('/robots.txt')
  expect(res.ok()).toBe(true)
  expect(res.headers()['content-type'] ?? '').toMatch(/text\/plain/)
  expect(await res.text()).toMatch(/User-agent/)
})
