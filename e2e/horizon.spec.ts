import { expect, test } from '@playwright/test'
import { EXAMPLE, savedProfile, seedProfile } from './seed'

// Each person's own horizon age, and the survivor's spending share, on Hypothèses — written to the profile, read by the engine
// (the plan ends with the last person; the other leaves the rows after their age). The arithmetic of a death is pinned by
// engine/death.test.ts; this pins that a person can SET it and SEE it.

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

test('each person has their own horizon age: Alex set to 80 is saved on him alone, and a chip gives him the scenario’s back', async ({ page }) => {
  await page.goto('/hypotheses')
  const alex = page.getByRole('textbox', { name: /^Alex vit jusqu’à l’âge de/ })
  await expect(alex).toHaveValue('95') // the scenario's, until he has one of his own
  await alex.fill('80')
  await alex.blur()
  await expect.poll(async () => (await savedProfile(page)).household.persons[1].horizonAge).toBe(80)
  expect((await savedProfile(page)).household.persons[0].horizonAge).toBeNull()
  // The chip names the age it gives back, and only shows for a person with an age of their own.
  const chip = page.getByRole('button', { name: /^Comme le scénario \(95 ans\)/ })
  await expect(chip).toHaveCount(1)
  await chip.click()
  await expect.poll(async () => (await savedProfile(page)).household.persons[1].horizonAge).toBeNull()
  await expect(chip).toHaveCount(0)
})

test('the survivor’s spending share is a couple’s setting, saved as a fraction', async ({ page }) => {
  await page.goto('/hypotheses')
  const share = page.getByRole('textbox', { name: /^Dépenses de la personne qui reste/ })
  await expect(share).toHaveValue(/^70/)
  await share.fill('60')
  await share.blur()
  await expect.poll(async () => (await savedProfile(page)).assumptions.survivorSpending).toBeCloseTo(0.6, 5)
})

test('with Alex at 80 the plan still ends with Camille: the last year of the table is hers alone', async ({ page }) => {
  await page.goto('/hypotheses')
  const alex = page.getByRole('textbox', { name: /^Alex vit jusqu’à l’âge de/ })
  await alex.fill('80')
  await alex.blur()
  await expect.poll(async () => (await savedProfile(page)).household.persons[1].horizonAge).toBe(80)
  await page.goto('/resultats?v=verify')
  const rows = page.locator('#tableau .year-table tbody tr')
  await expect(rows.first()).toBeVisible({ timeout: 30_000 }) // worked out in a worker
  // Camille (1978) reaches 95 in 2073; Alex (1981) is gone after 2061 — the last row names one age only.
  await expect(rows.last()).toContainText('2073')
  await expect(rows.last().locator('.year-table__ages')).toHaveText(/·\s*95$/)
  await expect(rows.filter({ hasText: '2061' }).first().locator('.year-table__ages')).toHaveText(/83 \/ 80$/)
})

test('a pension plan says what share it pays a surviving spouse: RREGOP’s 50 % is pre-filled and editable', async ({ page }) => {
  await page.goto('/profil')
  await page.getByRole('button', { name: /^Régimes d’employeur/ }).first().click().catch(() => {})
  const share = page.getByRole('textbox', { name: /^Part versée au conjoint survivant/ }).first()
  await expect(share).toHaveValue(/^50/)
  await share.fill('60')
  await share.blur()
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].pensions[0].survivorShare).toBeCloseTo(0.6, 5)
})
