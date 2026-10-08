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

test('the market path: « Lisse » by default, a ready-made one is saved, « Personnalisé » opens its years for editing', async ({ page }) => {
  await page.goto('/hypotheses')
  await expect(page.getByRole('button', { name: 'Lisse' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Mauvais départ' }).click()
  await expect(page.getByText('Une chute de 15 % la première année de retraite')).toBeVisible()
  await expect.poll(async () => (await savedProfile(page)).assumptions.marketPath.preset).toBe('badStart')
  await page.getByRole('button', { name: 'Personnalisé' }).click()
  const first = page.getByRole('textbox', { name: 'Année 1 de retraite' })
  await expect(first).toBeVisible()
  await first.fill('-30')
  await first.blur()
  await expect.poll(async () => (await savedProfile(page)).assumptions.marketPath.custom[0]).toBeCloseTo(-0.3, 5)
  await page.getByRole('button', { name: 'Ajouter une année' }).click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.marketPath.custom.length).toBe(5)
})

test('with a bad start chosen, the results page still answers', async ({ page }) => {
  await page.goto('/hypotheses')
  await page.getByRole('button', { name: 'Mauvais départ' }).click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.marketPath.preset).toBe('badStart')
  await page.goto('/resultats')
  await expect(page.getByText(/Vous pouvez (prendre votre retraite|déjà prendre)|ne tient pas|Aucun âge/)).toBeVisible()
})
