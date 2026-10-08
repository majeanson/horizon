import { expect, test } from '@playwright/test'
import { EXAMPLE, savedProfile, seedProfile } from './seed'

// « COLLER MON RELEVÉ »: the earnings table pasted as text — read on the device, shown before it is applied, marked confirmed once it is.

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

test('a pasted table fills the years, says what it understood first, and marks the earnings confirmed', async ({ page }) => {
  await page.goto('/')
  const section = page.locator('.persons .profile-section', { hasText: 'Revenus de travail admissibles par année' }).first()
  await section.getByRole('button', { name: 'Coller mon relevé' }).click()
  const box = section.getByRole('textbox', { name: 'Tableau copié du relevé de participation' })
  await box.fill('Année\tGains\n2023\t70 000 $\n2024\t72 000,50 $\n2025\t75 000 $')
  await expect(section.getByText('3 années lues (2023–2025), 1 ligne ignorée.')).toBeVisible()
  // nothing is applied until the person says so
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].earningsHistory['2024']).not.toBe(72001)
  await section.getByRole('button', { name: 'Importer ces années' }).click()
  await expect(section.locator('.earnings__row', { hasText: '2024' }).locator('input')).toHaveValue(/72\s?001/)
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].earningsHistory['2025']).toBe(75000)
  await expect.poll(async () => (await savedProfile(page)).confirmed).toContain('self:earnings')
  await expect(section.getByRole('textbox', { name: 'Tableau copié du relevé de participation' })).toHaveCount(0) // the panel closed
})

test('text with no year and amount reads nothing and offers nothing to import', async ({ page }) => {
  await page.goto('/')
  const section = page.locator('.persons .profile-section', { hasText: 'Revenus de travail admissibles par année' }).first()
  await section.getByRole('button', { name: 'Coller mon relevé' }).click()
  await section.getByRole('textbox', { name: 'Tableau copié du relevé de participation' }).fill('Bonjour\nrien ici')
  await expect(section.getByText('Aucune année lue pour l’instant')).toBeVisible()
  await expect(section.getByRole('button', { name: 'Importer ces années' })).toBeDisabled()
})
