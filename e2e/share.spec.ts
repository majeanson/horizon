import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// « PARTAGER CE SCÉNARIO ». A chip on the answer card copies a link that carries the age and the household type and NOTHING else
// (lib/shareLink.ts); opening it, with no profile at all, shows that summary framed as coming from the link. The footer line that
// credits the builder is on every page. (The Worker half — the preview tags and the card — is not in Vite: it is checked on `wrangler dev`.)

test.describe('golden couple', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await seedProfile(page, EXAMPLE)
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('the chip copies a link with three parameters, and the link opens on a profile-free browser as the same age', async ({ page, browser }) => {
    await page.goto('/resultats')
    await expect(page.locator('#comparer')).toBeAttached({ timeout: 30_000 })
    const age = (await page.locator('.verdict__age').first().textContent())!.match(/\d+/)![0]

    await page.getByRole('button', { name: 'Partager ce scénario' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Lien copié' })).toBeVisible()
    const link = await page.evaluate(() => navigator.clipboard.readText())

    const url = new URL(link)
    expect(url.pathname).toBe('/partage')
    expect([...url.searchParams.keys()]).toEqual(['age', 'foyer', 'l'])
    expect(url.searchParams.get('age')).toBe(age)
    expect(url.searchParams.get('foyer')).toBe('couple')
    // Nothing from the profile: no other number, no name, in the whole address.
    expect(link.replace(/^https?:\/\/[^/]+/, '')).toMatch(/^\/partage\?age=\d{2}&foyer=(seul|couple)&l=(fr|en)$/)

    // A fresh context: no profile, no storage — what the spouse sees.
    const fresh = await browser.newContext({ storageState: { cookies: [], origins: [{ origin: url.origin, localStorage: [{ name: 'horizon-reading-help', value: 'done' }, { name: 'horizon-time', value: 'later' }] }] } })
    const other = await fresh.newPage()
    await other.goto(url.pathname + url.search)
    await expect(other.getByRole('heading', { level: 1, name: 'Un scénario partagé' })).toBeVisible()
    await expect(other.locator('.verdict__age')).toContainText(`${age} ans`)
    await expect(other.getByText('Ces chiffres viennent du lien')).toBeVisible()
    await other.getByRole('link', { name: 'Faire mon calcul' }).click()
    await expect(other).toHaveURL(/\/$/)
    await fresh.close()
  })

  test('a link with no readable scenario says so and still offers the way in', async ({ page }) => {
    await page.goto('/partage?age=999&foyer=trio')
    await expect(page.getByRole('heading', { level: 1, name: 'Ce lien est incomplet' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Faire mon calcul' })).toBeVisible()
  })

  test('the foot of every page credits the builder with a plain link', async ({ page }) => {
    for (const path of ['/', '/profil', '/resultats', '/hypotheses']) {
      await page.goto(path)
      const link = page.getByRole('link', { name: 'marc.portal', exact: true })
      await expect(link, path).toHaveAttribute('href', 'https://marcportal.com')
    }
  })
})
