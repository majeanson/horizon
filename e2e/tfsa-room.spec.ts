import { expect, test, type Locator, type Page } from '@playwright/test'
import { savedProfile, seedProfile } from './seed'

// The TFSA room left today: the CRA's January 1 figure less this year's deposits (lib/tfsaRoom.ts). A worksheet — nothing is stored until the result is used.

test.beforeEach(async ({ page }) => {
  await seedProfile(page)
  await page.goto('/profil?bloc=tout&form=1')
})

const worksheet = (page: Page) => page.locator('#person-self').locator('details.fold', { hasText: 'Calculer mes droits d’aujourd’hui' })

/** A box owns its text until Enter (or leaving it) says it means a number. */
async function type(sheet: Locator, name: string, value: string) {
  const box = sheet.getByRole('textbox', { name })
  await box.fill(value)
  await box.press('Enter')
}

async function fillBoth(sheet: Locator, jan1: string, deposited: string) {
  await sheet.locator('summary').click()
  await type(sheet, 'Droits au 1er janvier (compte de l’ARC)', jan1)
  await type(sheet, 'Déposé depuis le 1er janvier', deposited)
}

test('the CRA figure less the deposits is the room today, and next January\'s is that plus the limit', async ({ page }) => {
  const sheet = worksheet(page)
  await fillBoth(sheet, '4401,38', '4000')
  await expect(sheet.getByRole('status')).toContainText(/Droits d’aujourd’hui\s*:\s*401,38\s*\$/)
  await expect(sheet.getByRole('status')).toContainText(/Au 1er janvier prochain\s*:\s*environ 7\s*401\s*\$.*7\s*000\s*\$ cette année/)
  await expect(sheet.getByRole('status')).not.toContainText('dépassent')
  // A worksheet: nothing is saved until the result is used.
  expect((await savedProfile(page)).household.persons[0].accounts.tfsa.room).not.toBeCloseTo(401.38, 2)
})

test('using the result writes the room and confirms it', async ({ page }) => {
  const sheet = worksheet(page)
  await fillBoth(sheet, '4401,38', '4000')
  await sheet.getByRole('button', { name: 'Utiliser ce montant' }).click()
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].accounts.tfsa.room).toBeCloseTo(401.38, 2)
  expect((await savedProfile(page)).confirmed as string[]).toContain('self:tfsaRoom')
})

test('deposits over the room say by how much and the tax, and use 0 as the room', async ({ page }) => {
  const sheet = worksheet(page)
  await fillBoth(sheet, '4401,38', '5000')
  await expect(sheet.getByRole('status')).toContainText(/Droits d’aujourd’hui\s*:\s*0,00\s*\$/)
  await expect(sheet.getByRole('status')).toContainText(/dépassent les droits de 598,62\s*\$\s*:\s*l’ARC prélève un impôt de 1\s*%\s*par mois/)
  await expect(sheet.getByRole('status')).toContainText(/environ 7\s*000\s*\$/) // only the limit: nothing is left to carry
  await sheet.getByRole('button', { name: 'Utiliser ce montant' }).click()
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].accounts.tfsa.room).toBe(0)
})

test('with nothing typed, nothing is said', async ({ page }) => {
  const sheet = worksheet(page)
  await sheet.locator('summary').click()
  await expect(sheet.getByRole('status')).toHaveCount(0)
})
