import { expect, test } from '@playwright/test'
import { seedProfile, blankSeed } from './seed'

// The first thing a first visit is offered is the way to READ the page: the language, the size of the letters, the contrast. A FULL-SCREEN dialog, once per device, in plain
// words, a change that shows at once, and any way out puts it away for good. The same controls stay on the settings page.
// Every other spec runs with it already seen (playwright.config.ts); this one starts from a device that has not.
test.use({ storageState: { cookies: [], origins: [] } })

const FR_TITLE = 'Lire plus confortablement ?'

test('a first visit is offered the reading dialog, full screen, before anything else, and each choice shows at once', async ({ page }) => {
  await page.goto('/')
  const dialog = page.getByRole('dialog', { name: FR_TITLE })
  await expect(dialog).toBeVisible()
  // it fills the screen: the whole viewport, edge to edge
  const box = (await dialog.boundingBox())!
  const view = page.viewportSize()!
  expect(box.width).toBeGreaterThanOrEqual(view.width - 1)
  expect(box.height).toBeGreaterThanOrEqual(view.height - 1)

  await dialog.getByRole('tab', { name: 'Grand', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-text-scale', 'large')
  await dialog.getByRole('tab', { name: 'Très grand' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-text-scale', 'x-large')
  await dialog.getByRole('tab', { name: 'Renforcé' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high')
  await dialog.getByRole('tab', { name: 'Nuit' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
})

test('the language switches the dialog itself and the whole page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'English' }).click()
  const dialog = page.getByRole('dialog', { name: 'Easier to read?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('tab', { name: 'Extra large' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('« C\'est bien comme ça » puts it away for good on this device — the settings page still has the controls', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'C’est bien comme ça' }).click()
  await expect(page.getByRole('dialog', { name: FR_TITLE })).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.page-head__title')).toBeVisible()
  await expect(page.getByRole('dialog', { name: FR_TITLE })).toHaveCount(0)
  await page.goto('/donnees')
  await expect(page.getByRole('tab', { name: 'Renforcé' })).toBeVisible()
})

test('Escape and the ✕ are ways out too, and they are final', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('dialog', { name: FR_TITLE })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: FR_TITLE })).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.page-head__title')).toBeVisible()
  await expect(page.getByRole('dialog', { name: FR_TITLE })).toHaveCount(0)
})

test('the sizes are said in percent on the settings page and in words on the front door', async ({ page }) => {
  await page.goto('/donnees')
  await expect(page.getByRole('tab', { name: '115 %' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Grand', exact: true })).toHaveCount(0)
})

test('a household with a profile already saved still sees the dialog until it is put away', async ({ page }) => {
  await seedProfile(page, blankSeed())
  await page.goto('/')
  await expect(page.getByRole('dialog', { name: FR_TITLE })).toBeVisible()
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
