import { expect, test } from '@playwright/test'
import { seedProfile } from './seed'

// « ARRÊTER À L'ÂGE DE MON CHOIX » — the plan asked the other way round, under « Décider ». An age to aim at; below the age that works it names four changes, each enough on its own and each
// in its own unit; at an age that works it says so. Under it, what waiting one more year buys. The example couple's answer is 60.

test.beforeEach(async ({ page }) => seedProfile(page))

test('an age that does not work names the five changes, each in its own unit, and what waiting buys', async ({ page }) => {
  await page.goto('/resultats?v=decide&essai=target&age=55')
  const fold = page.locator('#viser')
  await expect(fold).toHaveAttribute('open', '')
  const levers = fold.locator('.reverse__levers').first().locator('li')
  await expect(levers).toHaveCount(5, { timeout: 90_000 })
  await expect(fold.getByText('Pour arrêter à 55 ans, il faudrait l’une de ces choses')).toBeVisible()
  await expect(levers.nth(0)).toContainText('par année à la retraite')
  await expect(levers.nth(1)).toContainText('de côté chaque année')
  await expect(levers.nth(2)).toContainText('Travailler jusqu’à 60 ans (5 ans de plus)')
  await expect(levers.nth(3)).toContainText('Garder la moitié de votre salaire jusqu’à')
  await expect(levers.nth(4)).toContainText('points de plus par année')
  await expect(fold.getByText('on ne les additionne pas')).toBeVisible()
  // waiting one more year: a few rows, and a knee sentence that names its threshold
  await expect(fold.locator('.reverse__wait li').first()).toContainText('de plus à la fin', { timeout: 90_000 })
  await expect(fold.locator('.reverse__wait .answer__note')).toContainText('une année de vie à la retraite')
})

test('an age that works says so, and how much more could be spent', async ({ page }) => {
  await page.goto('/resultats?v=decide&essai=target&age=62')
  const fold = page.locator('#viser')
  await expect(fold.getByText('À 62 ans, votre plan tient déjà tel quel.')).toBeVisible({ timeout: 90_000 })
  await expect(fold.getByText('Vous pourriez même dépenser jusqu’à')).toBeVisible()
  await expect(fold.getByText('il faudrait l’une de ces choses')).toHaveCount(0) // the four changes are only asked for when the plan fails
})

test('the age is the one « Combien épargner ? » reads: moving it here moves it there', async ({ page }) => {
  await page.goto('/resultats?v=decide&essai=target&age=55')
  await expect(page.locator('#viser').getByText('Pour arrêter à 55 ans')).toBeVisible({ timeout: 90_000 })
  await expect(page).toHaveURL(/age=55/)
  await page.locator('#viser > summary').click() // close it, open the saving
  await page.locator('#epargner > summary').click()
  await expect(page.locator('#epargner').getByText(/55/).first()).toBeVisible()
})

test('in English the fold speaks English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await page.goto('/resultats?v=decide&essai=target&age=55')
  await expect(page.locator('#viser > summary')).toHaveText('Stop at the age I choose')
  await expect(page.locator('#viser').getByText('To stop at 55, one of these would have to be true')).toBeVisible({ timeout: 90_000 })
})
