import { expect, test, type Page } from '@playwright/test'
import { exampleProfile } from '../src/lib/example'
import { expectNoHorizontalOverflow } from './overflow'
import { EXAMPLE, seedProfile, slowCpu } from './seed'

// LE PLAN EN MOTS — a household's plan told in plain words, one tap away, with « Et si… ? » cards. Three places: every example of Sauvegarde et réglages (that example's own story, in full);
// the answer card of Résultats (the household's own plan); and, for a household that has ALREADY stopped working, Décider, where the levers that rank « retire sooner » are not offered and
// this is the way to see how much can be spent and what helps the money last. Behavior only: that the text arrives, follows the household, differs for a retiree, costs nothing while closed.
// The figures are the engine's and are held by lib/exampleStory.test.ts, lib/whatIfCopy.test.ts and lib/whatIfRetired.test.ts. (Not on the front door's demo: Accueil's first-visit
// complexity budget — e2e/complexity.spec.ts — counts every control a stranger faces.)

test.beforeEach(({ page }) => slowCpu(page))

const asRetired = async (page: Page) => seedProfile(page, JSON.parse(JSON.stringify(exampleProfile('retired'))))

test('the example list of Sauvegarde et réglages tells each plan in full, answer included, and only for the one opened', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/donnees?autres=examples')
  const item = page.locator('.example-list li').filter({ hasText: 'Couple, vendre la maison' })
  // closed: nothing is worked out or shown
  await expect(page.locator('.plan-story')).toHaveCount(0)
  await item.locator('summary', { hasText: 'Ce que fait ce plan, en mots' }).click()
  await expect(item.locator('.plan-story__text')).toContainText('Nadia et Paul peuvent arrêter ensemble', { timeout: 60_000 })
  await expect(item.locator('.plan-story__text')).toContainText('dollars d’aujourd’hui')
  await expect(item.locator('.plan-story__text')).toContainText('maison')
  await expect(item.locator('.plan-story__cards li')).toHaveCount(4)
  // the other thirteen are still closed and have worked nothing out
  await expect(page.locator('.plan-story')).toHaveCount(1)
})

test('in English, the same plan is told in English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await seedProfile(page, EXAMPLE)
  await page.goto('/donnees?autres=examples')
  const item = page.locator('.example-list li').filter({ hasText: 'Couple, selling the house' })
  await item.locator('summary', { hasText: 'What this plan does, in words' }).click()
  await expect(item.locator('.plan-story__text')).toContainText('Nadia and Paul can stop together', { timeout: 60_000 })
  await expect(item.locator('.plan-story__cards')).toContainText('If the markets fall')
})

test('Résultats tells the household’s own plan, with the cards about retiring sooner and about a death for a couple', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats')
  // the card sits in the answer card, which has no body until the answer is in
  await expect(page.locator('.verdict__line')).toBeVisible({ timeout: 60_000 })
  const fold = page.locator('.plan-story-fold')
  await expect(fold.locator('summary')).toContainText('Votre plan en mots')
  await expect(page.locator('.plan-story')).toHaveCount(0)
  await fold.locator('summary').click()
  await expect(fold.locator('.plan-story__text')).toContainText('En partant aux âges que vous avez prévus', { timeout: 60_000 })
  await expect(fold.locator('.plan-story__cards li')).toHaveCount(4)
  await expect(fold.locator('.plan-story__cards')).toContainText('L’âge le plus tôt qui fonctionne')
  await expect(fold.locator('.plan-story__cards')).toContainText('meurt')
})

test('a household that has already stopped is told how much it can spend and what helps the money last — not an age to retire at', async ({ page }) => {
  await asRetired(page)
  await page.goto('/decider')
  const fold = page.locator('.plan-story-fold')
  await expect(fold.locator('summary')).toContainText('Comment faire durer l’argent plus longtemps')
  await fold.locator('summary').click()
  const cards = fold.locator('.plan-story__cards li')
  await expect(cards.first()).toContainText('Combien le ménage peut dépenser', { timeout: 60_000 })
  await expect(fold.locator('.plan-story__text')).toContainText('Vous avez déjà arrêté de travailler')
  await expect(fold.locator('.plan-story__cards')).toContainText('dépense dix pour cent de moins')
  await expect(fold.locator('.plan-story__cards')).toContainText('revenu d’appoint')
  // nothing about a sooner age: there is none left to move
  await expect(fold).not.toContainText('L’âge le plus tôt qui fonctionne')
})

test('the same card is on Résultats for a retiree, under the label that says what they came to know', async ({ page }) => {
  await asRetired(page)
  await page.goto('/resultats')
  await expect(page.locator('.verdict__line')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.plan-story-fold summary')).toContainText('Comment faire durer l’argent plus longtemps')
})

test('on a phone, the story and the cards fit the width — in the example list, on Résultats and, for a retiree, on Décider', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await seedProfile(page, EXAMPLE)
  await page.goto('/donnees?autres=examples')
  const item = page.locator('.example-list li').filter({ hasText: 'Couple, une vie à planifier' })
  await item.locator('summary', { hasText: 'Ce que fait ce plan, en mots' }).click()
  await expect(item.locator('.plan-story__cards li').first()).toBeVisible({ timeout: 60_000 })
  await expectNoHorizontalOverflow(page, item)

  await page.goto('/resultats')
  await expect(page.locator('.verdict__line')).toBeVisible({ timeout: 60_000 })
  await page.locator('.plan-story-fold summary').click()
  await expect(page.locator('.plan-story__cards li').first()).toBeVisible({ timeout: 60_000 })
  await expectNoHorizontalOverflow(page, page.locator('.plan-story-fold'))
})

test('on a phone, a retiree’s Décider card fits the width', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await asRetired(page)
  await page.goto('/decider')
  await page.locator('.plan-story-fold summary').click()
  await expect(page.locator('.plan-story__cards li').first()).toBeVisible({ timeout: 60_000 })
  await expectNoHorizontalOverflow(page, page.locator('.plan-story-fold'))
})

// LES ANNÉES PARTICULIÈRES — under the year-by-year table, a closed disclosure names the years that look odd for a reason: a pension that starts part-way through a year, so that year is not paid in
// full. The golden couple (the seeded profile) has such years: Camille and Alex are neither born in December.
test('the year table names the years where a pension starts part-way through, and says why', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats?v=proof&bloc=tableau')
  const block = page.locator('.year-table')
  await expect(block.locator('table')).toBeVisible({ timeout: 60_000 })
  const fold = block.locator('summary', { hasText: 'Années particulières' })
  await expect(fold).toBeVisible()
  await expect(block.locator('.year-table__notes')).toBeHidden()
  await fold.click()
  await expect(block.locator('.year-table__notes')).toContainText('commence en cours d’année')
  await expect(block.locator('.year-table__notes')).toContainText('n’est pas payée en entier')
})
