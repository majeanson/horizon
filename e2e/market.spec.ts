import { expect, test } from '@playwright/test'
import { EXAMPLE, savedProfile, seedProfile } from './seed'

// THE ASSUMPTIONS THAT SHAPE THE MONEY'S PATH (Hypothèses): where the surplus goes, and the path the markets take.

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

test('the surplus option: off by default, one tap turns it on, and it is saved', async ({ page }) => {
  await page.goto('/hypotheses')
  const chip = page.getByRole('button', { name: 'Placer d’abord le surplus dans le REER' })
  await expect(chip).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Quand une année de travail laisse de l’argent de côté')).toBeVisible()
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await savedProfile(page)).assumptions.surplusToRrsp).toBe(true)
  await chip.click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.surplusToRrsp).toBe(false)
})

test('turned on, the plan still answers (the results page runs the same engine)', async ({ page }) => {
  await page.goto('/hypotheses')
  await page.getByRole('button', { name: 'Placer d’abord le surplus dans le REER' }).click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.surplusToRrsp).toBe(true)
  await page.goto('/resultats')
  await expect(page.getByText(/Vous pouvez (prendre votre retraite|déjà prendre)/)).toBeVisible()
})
