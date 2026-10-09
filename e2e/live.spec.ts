import { expect, test } from '@playwright/test'
import { blankSeed, seedProfile } from './seed'

// « Votre réponse » — the strip above Profil and Hypothèses: the same answer as Résultats, kept in view while the plan is edited.

test.describe('the live answer', () => {
  test('follows an edit: it shows the answer on arrival, then how far a typed figure moved it', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/?form=1')
    const strip = page.getByRole('status').filter({ hasText: 'Votre réponse' })
    await expect(strip).toContainText('59 ans', { timeout: 30_000 })
    await expect(strip).not.toContainText('qu’à votre arrivée')

    const spend = page.getByRole('textbox', { name: 'Dépenses par année, une fois tout le monde à la retraite', exact: true })
    await spend.fill('140000')
    await spend.press('Enter')
    await expect(strip).toContainText('plus tard qu’à votre arrivée', { timeout: 30_000 })
    await expect(strip.getByRole('link', { name: 'Voir' })).toHaveAttribute('href', '/resultats')
  })

  test('is also on Hypothèses, and absent from Résultats and from a blank profile', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/hypotheses')
    await expect(page.getByRole('status').filter({ hasText: 'Votre réponse' })).toContainText('ans', { timeout: 30_000 })
    await page.getByRole('link', { name: 'Résultats', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Résultats', level: 1 })).toBeVisible()
    await expect(page.getByText('Votre réponse', { exact: true })).toHaveCount(0)
  })

  test('says nothing while the profile has gaps', async ({ page }) => {
    await seedProfile(page, blankSeed())
    await page.goto('/?form=1')
    await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible()
    await page.waitForTimeout(1500)
    await expect(page.getByText('Votre réponse', { exact: true })).toHaveCount(0)
  })
})
