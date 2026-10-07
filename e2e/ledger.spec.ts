import { expect, test } from '@playwright/test'
import { EXAMPLE, savedProfile, seedProfile } from './seed'

// « Mes données et leur calcul »: the ages, each with the calculation behind it, a slider, and what the plan does.
// The arithmetic is pinned by engine/ledger.test.ts; this pins that a person can drive it and that it writes the profile.

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))


test('a slider shows the calculation, previews while held, and saves the age in the profile when released', async ({ page }) => {
  await page.goto('/resultats')
  await page.getByRole('button', { name: 'Mes données et leur calcul' }).click()
  const panel = page.locator('.ledger')
  await expect(panel).toBeVisible()
  // each age is a slider with a readable value, and the QPP line shows its formula and its result
  const rrq = panel.getByRole('slider', { name: 'Début du RRQ' }).first()
  await expect(rrq).toHaveAttribute('aria-valuetext', /65 ans/)
  await expect(panel.locator('.ledger__calc').filter({ hasText: 'ajustement' }).first()).toBeVisible()
  const before = await panel.locator('.ledger__result').first().innerText()

  // holding a key previews the amount; releasing it saves the age
  await rrq.focus()
  await page.keyboard.down('ArrowRight')
  await page.keyboard.up('ArrowRight')
  await expect(rrq).toHaveAttribute('aria-valuetext', /66 ans/)
  await expect(panel.locator('.ledger__result').first()).not.toHaveText(before)
  await expect(panel.locator('.ledger__delta').first()).toContainText('de plus par mois')
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].rrq.startAge).toBe(66)
  // the plan line is read aloud politely and names an outcome
  await expect(panel.locator('.ledger__glance')).toContainText(/Le plan (tient|manque)/)
})

test('the page has no horizontal overflow at phone width with the panel open', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/resultats')
  await page.getByRole('button', { name: 'Mes données et leur calcul' }).click()
  await expect(page.locator('.ledger')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
