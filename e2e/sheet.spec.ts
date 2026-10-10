import { expect, test, type Page } from '@playwright/test'
import { blankSeed, EXAMPLE, PROFILE_KEY, seedProfile } from './seed'
import { expectNoHorizontalOverflow } from './overflow'

// « Ma fiche » (/fiche): the household as a character sheet — one model, two skins (« Sérieux » and « Aventure »), the display mode a device setting. The two
// skins must show THE SAME figures; only words, layout and icons differ.

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
})

/** The sheet's figures as the page shows them: each stat's value and its bar, each slot's amount. */
async function figures(page: Page) {
  const values = await page.locator('.sheet__stat-value').allInnerTexts()
  const bars = await page.locator('.sheet-bar[role="meter"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-valuenow')))
  const amounts = await page.locator('.sheet__slot-amount').allInnerTexts()
  return { values, bars, amounts }
}
const settled = (page: Page) =>
  page.waitForFunction(() => {
    const t = document.querySelector('.sheet')?.textContent ?? ''
    return t.length > 0 && !t.includes('Calcul en cours') && !t.includes('Le sort est en train') && !t.includes('Working it out') && !t.includes('The spell is being cast')
  }, null, { timeout: 30_000 })

test('the header leads to the sheet, which opens serious: five stats, each with its figure and a bar', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /^Ma fiche/ }).click()
  await expect(page).toHaveURL(/\/fiche$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ma fiche')
  await settled(page)
  await expect(page.locator('.sheet--serious')).toBeVisible()
  await expect(page.locator('.sheet__stat')).toHaveCount(5)
  await expect(page.locator('.sheet-bar[role="meter"]')).toHaveCount(5)
  for (const name of ['Âge le plus tôt', 'Rentes', 'Épargne', 'Ce qui reste', 'Solidité']) await expect(page.locator('.sheet__stat-name', { hasText: name })).toBeVisible()
  // the example's earliest age is the one the answer gives
  await expect(page.locator('.sheet__stat', { hasText: 'Âge le plus tôt' }).locator('.sheet__stat-value')).toHaveText(/59\s*ans/)
  // each bar says what a full bar stands for, in words beside it
  await expect(page.locator('.sheet__scale').first()).toContainText('Barre pleine')
})

test('« Aventure » draws the same sheet as a role-playing one, with the very same figures, and the choice survives a reload', async ({ page }) => {
  await page.goto('/fiche')
  await settled(page)
  const serious = await figures(page)
  expect(serious.values).toHaveLength(5)
  await page.getByRole('tablist', { name: 'Affichage de la fiche' }).getByRole('tab', { name: 'Aventure' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'adventure')
  await expect(page.locator('.sheet--rpg')).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Fiche de personnage' })).toBeVisible()
  await expect(page.locator('.sheet-rpg__stat-name', { hasText: 'Endurance' })).toBeVisible()
  await settled(page)
  const adventure = await figures(page)
  expect(adventure).toEqual(serious)
  // the level is the margin, in both skins
  await expect(page.locator('.sheet-rpg__level-value')).toHaveText('3')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'adventure')
  await expect(page.locator('.sheet--rpg')).toBeVisible()
  // and back
  await page.getByRole('tablist', { name: 'Affichage de la fiche' }).getByRole('tab', { name: 'Sérieux' }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-mode', /.+/)
  await expect(page.locator('.sheet--serious')).toBeVisible()
})

test('the settings page holds the same switch, and both agree', async ({ page }) => {
  await page.goto('/donnees')
  const tabs = page.getByRole('tablist', { name: 'Affichage de la fiche' })
  await expect(tabs.getByRole('tab', { name: 'Sérieux' })).toHaveAttribute('aria-selected', 'true')
  await tabs.getByRole('tab', { name: 'Aventure' }).click()
  await page.goto('/fiche')
  await expect(page.locator('.sheet--rpg')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('tablist', { name: 'Affichage de la fiche' }).getByRole('tab', { name: 'Aventure' })).toHaveAttribute('aria-selected', 'true')
})

test('the mode is applied before first paint: a reload on the sheet never flashes the other skin', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-mode', 'adventure'))
  await page.goto('/fiche')
  await expect(page.locator('html')).toHaveAttribute('data-mode', 'adventure')
  await expect(page.locator('.sheet--serious')).toHaveCount(0)
  await expect(page.locator('.sheet--rpg')).toBeVisible({ timeout: 30_000 })
})

test('on a phone neither skin runs off the screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  for (const mode of ['serious', 'adventure']) {
    await page.evaluate((m) => localStorage.setItem('horizon-mode', m), mode).catch(() => undefined)
    await page.addInitScript((m) => localStorage.setItem('horizon-mode', m), mode)
    await page.goto('/fiche')
    await expect(page.locator(mode === 'serious' ? '.sheet--serious' : '.sheet--rpg')).toBeVisible({ timeout: 30_000 })
    await settled(page)
    await expectNoHorizontalOverflow(page, '.sheet')
  }
})

test('in English both skins speak English, with the same figures', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await page.goto('/fiche')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My sheet')
  await settled(page)
  await expect(page.locator('.sheet__stat-name', { hasText: 'Earliest age' })).toBeVisible()
  const serious = await figures(page)
  await page.getByRole('tablist', { name: 'How the sheet is shown' }).getByRole('tab', { name: 'Adventure' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Character sheet' })).toBeVisible()
  await expect(page.locator('.sheet-rpg__stat-name', { hasText: 'Stamina' })).toBeVisible()
  await settled(page)
  expect(await figures(page)).toEqual(serious)
})

test('a household already retired has no runway to draw, and a blank profile is asked to start', async ({ page }) => {
  await page.goto('/donnees')
  await page.getByRole('button', { name: 'Couple à la retraite', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Charger' }).click()
  await page.goto('/fiche')
  await settled(page)
  await expect(page.locator('.sheet__stat', { hasText: 'Âge le plus tôt' })).toContainText('Tout le monde est déjà à la retraite')
  await expect(page.locator('.sheet__stat', { hasText: 'Épargne' })).toContainText('Personne ne travaille plus')
})

test('a blank profile gets a way to the profile, and nothing invented', async ({ page }) => {
  // the example was seeded first (beforeEach); this init script runs after it and puts the blank profile where it was
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [PROFILE_KEY, JSON.stringify(blankSeed())])
  await page.goto('/fiche')
  await expect(page.locator('.sheet__empty')).toContainText('Entrez un revenu')
  await expect(page.locator('.sheet__empty').getByRole('link', { name: 'Aller au profil' })).toHaveAttribute('href', '/profil')
  for (const v of await page.locator('.sheet__stat-value').allInnerTexts()) expect(v).toBe('Rien à montrer')
})

test('the quests lead somewhere: the last one is the plan’s own « this year »', async ({ page }) => {
  await page.goto('/fiche')
  await settled(page)
  const quests = page.locator('.sheet__quest a')
  await expect(quests.last()).toHaveAttribute('href', '/resultats?v=future')
  await expect(page.locator('.sheet__quest', { hasText: 'Confirmer' })).toBeVisible()
})
