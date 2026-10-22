import { expect, test } from '@playwright/test'
import { blankSeed, seedProfile } from './seed'

// A first-time visitor who closes the tab at the third question finds the third question when they come back, with the boxes they filled still filled — not the
// first screen again. Arriving mid-way is not a tap on « Suivant »: no box takes focus on its own.

test.beforeEach(async ({ page }) => seedProfile(page, blankSeed()))

test('coming back after closing the tab lands on the question left, with no box grabbing focus', async ({ page }) => {
  await page.goto('/profil')
  await page.getByRole('radio', { name: 'Moi et mon ou ma partenaire' }).click()
  await page.getByRole('button', { name: 'Suivant', exact: true }).click()
  const year = page.getByRole('textbox').first()
  await year.fill('1984')
  await year.press('Enter')
  await expect(page.locator('.onboard__step')).toContainText('Question 3')
  const second = await page.locator('.onboard__question').textContent()

  await page.reload()
  await expect(page.locator('.onboard__step')).toContainText('Question 3')
  await expect(page.locator('.onboard__question')).toHaveText(second ?? '')
  const focused = await page.evaluate(() => document.activeElement?.tagName)
  expect(focused).not.toBe('INPUT')
  // the answer given before is still there: going back shows the year
  await page.getByRole('button', { name: 'Précédent', exact: true }).click()
  await expect(page.getByRole('textbox').first()).toHaveValue('1984')
})

test('the first screen is the first screen: nothing is remembered until the person has moved on', async ({ page }) => {
  await page.goto('/profil')
  await page.reload()
  await expect(page.locator('.onboard__step')).toContainText('Question 1')
})
