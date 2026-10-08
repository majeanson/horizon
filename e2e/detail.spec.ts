import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// The results page keeps its three views and the map pinned under the top bar while it scrolls, and the chart's
// « Détail » view shows the whole picture (sources, accounts, the three sets of hypotheses), not only the net worth.

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
})

test('the views and the section map stay pinned while the page scrolls', async ({ page }) => {
  await page.goto('/resultats')
  const pin = page.locator('.results-pin')
  await expect(pin).toBeVisible()
  const bar = await page.locator('.shell__bar').boundingBox()
  await page.locator('#root').evaluate((el) => el.scrollTo({ top: 1200 }))
  await expect.poll(async () => Math.round((await pin.boundingBox())!.y)).toBe(Math.round(bar!.y + bar!.height))
  await expect(pin.getByRole('tab').first()).toBeInViewport()
})

test('« Détail » shows where the money comes from, what the accounts hold, and the three sets of hypotheses', async ({ page }) => {
  await page.goto('/resultats?metric=detail')
  const chart = page.locator('.chart-panel')
  await expect(chart.getByRole('img')).toHaveCount(3, { timeout: 30_000 })
  await expect(chart.getByRole('heading', { name: 'D’où vient l’argent, année par année' })).toBeVisible()
  await expect(chart.getByRole('heading', { name: 'Ce que contiennent les comptes' })).toBeVisible()
  await expect(chart.getByRole('heading', { name: 'Sous les trois jeux d’hypothèses' })).toBeVisible()
})
