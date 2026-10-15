import { expect, test } from '@playwright/test'
import { seedProfile, blankSeed } from './seed'

// The first thing a first visit is offered is the way to READ the page: the language, the size of the letters, the contrast. Plain words, a change that shows at once,
// and a way to put the offer away for good. The same controls stay on the settings page.

test('a first visit is offered the reading card before anything else, and each choice shows at once', async ({ page }) => {
  await page.goto('/')
  const card = page.getByRole('region', { name: 'Lire plus confortablement ?' })
  await expect(card).toBeVisible()
  // above the doors in: the card comes first
  const cardTop = (await card.boundingBox())!.y
  const doorsTop = (await page.locator('#welcome-doors').boundingBox())!.y
  expect(cardTop).toBeLessThan(doorsTop)

  await card.getByRole('tab', { name: 'Grand', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-text-scale', 'large')
  await card.getByRole('tab', { name: 'Très grand' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-text-scale', 'x-large')
  await card.getByRole('tab', { name: 'Renforcé' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high')
  await card.getByRole('tab', { name: 'Nuit' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
})

test('the language switches the card itself and the whole page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'English' }).click()
  const card = page.getByRole('region', { name: 'Easier to read?' })
  await expect(card).toBeVisible()
  await expect(card.getByRole('tab', { name: 'Extra large' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('« C\'est bien comme ça » puts it away for good on this device — the settings page still has the controls', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'C’est bien comme ça' }).click()
  await expect(page.getByRole('region', { name: 'Lire plus confortablement ?' })).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.page-head__title')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Lire plus confortablement ?' })).toHaveCount(0)
  await page.goto('/donnees')
  await expect(page.getByRole('tab', { name: 'Renforcé' })).toBeVisible()
})

test('the sizes are said in percent on the settings page and in words on the front door', async ({ page }) => {
  await page.goto('/donnees')
  await expect(page.getByRole('tab', { name: '115 %' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Grand', exact: true })).toHaveCount(0)
})

test('a household with a profile already saved still sees the card until it is put away', async ({ page }) => {
  await seedProfile(page, blankSeed())
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Lire plus confortablement ?' })).toBeVisible()
})

test('a new version ready is said in one line with a Reload button, never forced under the reader', async ({ page }) => {
  await page.goto('/profil')
  await expect(page.locator('.page-head__title')).toBeVisible()
  await expect(page.getByText('Une nouvelle version d’Horizon est prête.')).toHaveCount(0)
  await page.evaluate(() => window.dispatchEvent(new Event('horizon:sw-update')))
  await expect(page.getByText('Une nouvelle version d’Horizon est prête.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recharger' })).toBeVisible()
  // the page is still the same one: nothing reloaded by itself
  await expect(page.locator('.page-head__title')).toBeVisible()
})
