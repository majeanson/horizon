import { expect, test } from '@playwright/test'
import { EXAMPLE, savedProfile, seedProfile } from './seed'

// « MES PLANS »: named versions of the whole plan, kept in the profile.

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

test('keep a plan, change the profile, open the plan again: the figures come back, and the plan is still kept', async ({ page }) => {
  await page.goto('/donnees')
  await page.getByRole('textbox', { name: 'Nom du plan' }).fill('Base')
  await page.getByRole('button', { name: 'Garder ce plan' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Base' }).first()).toBeVisible()
  await expect(page.getByText('C’est ce que vous voyez maintenant')).toBeVisible()
  await expect.poll(async () => (await savedProfile(page)).plans.length).toBe(1)

  await page.goto('/hypotheses')
  await page.getByRole('button', { name: 'Mauvais départ' }).click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.marketPath.preset).toBe('badStart')

  await page.goto('/donnees')
  await expect(page.getByText('C’est ce que vous voyez maintenant')).toHaveCount(0)
  await page.getByRole('button', { name: 'Ouvrir — Base' }).click()
  await page.getByRole('button', { name: 'Ouvrir ce plan' }).click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.marketPath.preset).toBe('smooth')
  await expect.poll(async () => (await savedProfile(page)).plans.map((p: { name: string }) => p.name)).toEqual(['Base'])
  // the page offers to undo what the opening replaced
  await expect(page.getByRole('button', { name: /Rétablir|rétablir/ })).toBeVisible()
})

test('removing a plan asks first, and says what is lost', async ({ page }) => {
  await page.goto('/donnees')
  await page.getByRole('textbox', { name: 'Nom du plan' }).fill('Essai')
  await page.getByRole('button', { name: 'Garder ce plan' }).click()
  await page.getByRole('button', { name: 'Retirer — Essai' }).click()
  await expect(page.getByText('ce qu’il contenait est perdu')).toBeVisible()
  await page.getByRole('button', { name: 'Retirer', exact: true }).last().click()
  await expect.poll(async () => (await savedProfile(page)).plans.length).toBe(0)
})
