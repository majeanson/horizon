import { expect, test } from '@playwright/test'
import { blankSeed, seedProfile } from './seed'

// LA QUESTION DU JOUR — the front door asks a ready household ONE question per visit: the unconfirmed figure that most narrows the answer.
// « Plus tard » puts it away for the rest of the session (sessionStorage), not forever.

const card = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Une question pour préciser votre réponse' })

test.describe('the drip question', () => {
  test('a ready profile gets one question, with the way to its field and to everything still estimated', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/')
    await expect(card(page)).toBeVisible({ timeout: 60_000 })
    await expect(page.getByRole('region', { name: 'Une question pour préciser votre réponse' })).toHaveCount(1)
    // the card is there from the first frame, its sentence and its doors waiting as a ghost while the search runs: the real door comes with the answer
    await expect(card(page).getByRole('link', { name: 'Confirmer ce chiffre' })).toHaveAttribute('href', /^\/profil\?fact=[^&]+$/, { timeout: 60_000 })
    await expect(card(page).getByRole('link', { name: 'Voir tout ce qui reste estimé' })).toHaveAttribute('href', '/profil#exact')
    await expect(card(page)).toContainText(/resserrer la réponse d’environ \d+ ans?/)
  })

  test('« Plus tard » hides it, and it stays hidden when the reader comes back to the front door in the same tab', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/')
    await expect(card(page)).toBeVisible({ timeout: 60_000 })
    await card(page).getByRole('button', { name: 'Plus tard' }).click()
    await expect(card(page)).toHaveCount(0)
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('horizon-drip-later'))).toBe('1')
    // away and back, without leaving the tab
    await page.getByRole('link', { name: 'Modifier mon profil' }).click()
    await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible()
    await page.locator('.shell__brand').click()
    await expect(page.getByRole('link', { name: 'Voir ma réponse' })).toBeVisible()
    await page.waitForTimeout(1500)
    await expect(card(page)).toHaveCount(0)
  })

  test('its link lands on the figure’s field', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/')
    await expect(card(page)).toBeVisible({ timeout: 60_000 })
    await card(page).getByRole('link', { name: 'Confirmer ce chiffre' }).click()
    await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible()
  })

  test('a blank profile is asked nothing', async ({ page }) => {
    await seedProfile(page, blankSeed())
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Commencer', exact: true })).toBeVisible()
    await page.waitForTimeout(1500)
    await expect(card(page)).toHaveCount(0)
  })
})
