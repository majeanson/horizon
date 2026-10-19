import { expect, test } from '@playwright/test'
import { EXAMPLE, PROFILE_KEY, blankSeed, savedProfile, seedProfile } from './seed'

// LA PREUVE DE LA PREMIÈRE VISITE — a blank household sees the product working (a real answer for an example household, framed as not theirs) under
// the hero (front-door.spec.ts holds the hero and its doors). The demo card loads its household exactly as Données does, and asks first only when
// something is already typed.

test.beforeEach(async ({ page }) => seedProfile(page, blankSeed()))

const card = (page: import('@playwright/test').Page) => page.getByRole('region', { name: 'Voyez à quoi ressemble une réponse' })

test('a blank first visit shows a real answer for an example household, with its frame', async ({ page }) => {
  await page.goto('/')
  await expect(card(page)).toBeVisible()
  await expect(card(page).getByRole('radio', { name: 'Couple, revenus moyens' })).toBeChecked()
  await expect(card(page)).toContainText('Marie')
  await expect(card(page)).toContainText('Un exemple, pas votre situation')
  // the answer is the results page's own sentence, the age drawn large
  await expect(card(page).locator('.verdict__age')).toHaveText(/\d+ ans/, { timeout: 60_000 })
  await expect(card(page).locator('.verdict__line')).toContainText('Vous pouvez')
})

test('swapping the household swaps the story and the answer', async ({ page }) => {
  await page.goto('/')
  const answer = card(page).locator('.demo__answer')
  await expect(answer.locator('.verdict__age')).toHaveText(/\d+ ans/, { timeout: 60_000 })
  const before = await answer.innerText()
  await card(page).getByRole('radio', { name: 'Une personne, petit revenu' }).click()
  await expect(card(page).getByRole('radio', { name: 'Une personne, petit revenu' })).toBeChecked()
  await expect(card(page)).toContainText('Hélène')
  await expect(answer).not.toHaveText(before, { timeout: 60_000 })
  // six households, three of which stop early (the house sold, the high earners, the planned life): an early answer is shown reachable
  await expect(card(page).getByRole('radio')).toHaveCount(6)
  await card(page).getByRole('radio', { name: 'Couple, vendre la maison' }).click()
  await expect(card(page)).toContainText('58 ans')
})

test('« Essayer avec ce ménage » on a blank profile loads the example and opens the results — with no dialog', async ({ page }) => {
  await page.goto('/')
  await expect(card(page).locator('.verdict__age')).toHaveText(/\d+ ans/, { timeout: 60_000 })
  await card(page).getByRole('button', { name: 'Essayer avec ce ménage' }).click()
  await expect(page).toHaveURL(/\/resultats/)
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.locator('.verdict__line')).toBeVisible({ timeout: 60_000 })
  await expect.poll(async () => (await savedProfile(page)).household.persons.map((p: { id: string }) => p.id)).toEqual(['self', 'spouse'])
})

test('with something already typed, loading the example asks first — and « Annuler » leaves the profile alone', async ({ page }) => {
  // a typed income, a spending still missing: the profile is not ready (the demo card shows) but it holds something worth a question
  const seed = blankSeed() as { household: { persons: { salaryToday: number }[] }; confirmed: string[] }
  seed.household.persons[0].salaryToday = 50_000
  seed.confirmed = ['self:salary']
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [PROFILE_KEY, JSON.stringify(seed)])
  await page.goto('/')
  await card(page).getByRole('button', { name: 'Essayer avec ce ménage' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('sera remplacé')
  await dialog.getByRole('button', { name: 'Annuler' }).click()
  await expect(page).toHaveURL(/\/$/)
  expect((await savedProfile(page)).household.persons[0].salaryToday).toBe(50_000)
})

test('a ready household sees neither the demo nor the doors', async ({ page }) => {
  // (the file's beforeEach seeded a blank one; this init script runs after it and puts a real profile in place, as onboarding.spec.ts does.)
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [PROFILE_KEY, JSON.stringify(EXAMPLE)])
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Voir ma réponse' })).toBeVisible()
  await expect(card(page)).toHaveCount(0)
  await expect(page.locator('.welcome__door')).toHaveCount(0)
})

test('on a phone the demo card and the doors fit the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  await expect(card(page)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
