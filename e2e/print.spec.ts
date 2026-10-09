import { expect, test } from '@playwright/test'
import { seedProfile } from './seed'

// The printed plan: whichever view is open, paper carries the answer's page, the year by year and the cited figures — and the screen
// never pays for them (they mount on `beforeprint` and go on `afterprint`).

test('printing adds the dated head, the year by year, the cited figures and the foot — whichever view is open — then takes them away', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/resultats')
  await expect(page.getByText(/Vous pouvez prendre votre retraite/)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByText('Horizon — mon plan de retraite')).toHaveCount(0)
  await expect(page.locator('.print-appendix')).toHaveCount(0)

  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
  await expect(page.getByText('Horizon — mon plan de retraite')).toBeVisible()
  await expect(page.getByText(/Imprimé en \w+ \d{4}/)).toBeVisible()
  await expect(page.locator('.print-appendix').getByRole('heading', { name: /Année par année/i })).toBeVisible()
  await expect(page.locator('.print-appendix .params').first()).toBeVisible()
  await expect(page.getByText('Une estimation selon vos hypothèses, pas un conseil financier.', { exact: false })).toBeVisible()

  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')))
  await expect(page.locator('.print-appendix')).toHaveCount(0)
  await expect(page.getByText('Horizon — mon plan de retraite')).toHaveCount(0)
})

test('on the check view the table and the figures are already there: printing does not repeat them', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/resultats?v=verify')
  await expect(page.getByRole('heading', { name: /Paramètres utilisés/ }).first()).toBeVisible({ timeout: 60_000 })
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')))
  await expect(page.getByText('Horizon — mon plan de retraite')).toBeVisible()
  await expect(page.locator('.print-appendix')).toHaveCount(0)
})
