import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow } from './overflow'
import { blankSeed, seedProfile, slowCpu } from './seed'

// LE PLAN EN MOTS — an example household's plan told in plain words, one tap away, with « Et si… ? » cards: on the front door's demo (the answer is already stated there, so
// the story does not repeat it) and in the example list of Sauvegarde et réglages (the full story). Behavior only: that the text arrives, that it follows the household chosen, that a
// closed card costs nothing. The figures themselves are the engine's and are held by lib/exampleStory.test.ts and lib/whatIfCopy.test.ts.

test.beforeEach(async ({ page }) => {
  await slowCpu(page)
  await seedProfile(page, blankSeed())
})

const demo = (page: Page) => page.getByRole('region', { name: 'Voyez à quoi ressemble une réponse' })
const SUMMARY = 'Ce que fait ce plan, en mots'

test('the front door’s demo tells the plan in words only when asked, with four cards for a couple', async ({ page }) => {
  await page.goto('/')
  await expect(demo(page).locator('.verdict__age')).toHaveText(/\d+ ans/, { timeout: 60_000 })
  // closed: nothing is worked out or shown
  await expect(demo(page).locator('.plan-story')).toHaveCount(0)
  await demo(page).locator('summary', { hasText: SUMMARY }).click()
  await expect(demo(page).locator('.plan-story')).toBeVisible({ timeout: 60_000 })
  // the money is said to be in today's dollars, and the answer is not said a second time
  await expect(demo(page).locator('.plan-story__text')).toContainText('dollars d’aujourd’hui')
  await expect(demo(page).locator('.plan-story__text')).not.toContainText('peuvent arrêter ensemble')
  await expect(demo(page).locator('.plan-story__cards li')).toHaveCount(4)
  await expect(demo(page).locator('.plan-story__cards')).toContainText('Si les marchés chutent')
  await expect(demo(page).locator('.plan-story__cards')).toContainText('Marie meurt')
})

test('choosing another household replaces the story and the cards that do not apply to it disappear', async ({ page }) => {
  await page.goto('/')
  await expect(demo(page).locator('.verdict__age')).toHaveText(/\d+ ans/, { timeout: 60_000 })
  await demo(page).locator('summary', { hasText: SUMMARY }).click()
  await expect(demo(page).locator('.plan-story__cards li')).toHaveCount(4, { timeout: 60_000 })
  const before = await demo(page).locator('.plan-story__text').innerText()
  // one person: no death card
  await demo(page).getByRole('radio', { name: 'Une personne, petit revenu' }).click()
  await expect(demo(page).locator('.plan-story__cards li')).toHaveCount(3, { timeout: 60_000 })
  await expect(demo(page).locator('.plan-story__cards')).not.toContainText('meurt')
  await expect(demo(page).locator('.plan-story__text')).not.toHaveText(before)
})

test('the example list of Sauvegarde et réglages tells each plan in full, answer included', async ({ page }) => {
  await page.goto('/donnees?autres=examples')
  const item = page.locator('.example-list li').filter({ hasText: 'Couple, vendre la maison' })
  await item.locator('summary', { hasText: SUMMARY }).click()
  await expect(item.locator('.plan-story__text')).toContainText('Nadia et Paul peuvent arrêter ensemble', { timeout: 60_000 })
  await expect(item.locator('.plan-story__text')).toContainText('maison')
  // the other thirteen are still closed and have worked nothing out
  await expect(page.locator('.plan-story')).toHaveCount(1)
})

test('in English, the same plan is told in English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await page.goto('/donnees?autres=examples')
  const item = page.locator('.example-list li').filter({ hasText: 'Couple, selling the house' })
  await item.locator('summary', { hasText: 'What this plan does, in words' }).click()
  await expect(item.locator('.plan-story__text')).toContainText('Nadia and Paul can stop together', { timeout: 60_000 })
  await expect(item.locator('.plan-story__cards')).toContainText('If the markets fall')
})

test('on a phone, the story and the cards fit the width — on the front door and in the example list', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  await expect(demo(page).locator('.verdict__age')).toHaveText(/\d+ ans/, { timeout: 60_000 })
  await demo(page).locator('summary', { hasText: SUMMARY }).click()
  await expect(demo(page).locator('.plan-story__cards li')).toHaveCount(4, { timeout: 60_000 })
  await expectNoHorizontalOverflow(page, demo(page))
  await page.goto('/donnees?autres=examples')
  const item = page.locator('.example-list li').filter({ hasText: 'Couple, une vie à planifier' })
  await item.locator('summary', { hasText: SUMMARY }).click()
  await expect(item.locator('.plan-story__cards li').first()).toBeVisible({ timeout: 60_000 })
  await expectNoHorizontalOverflow(page, item)
})
