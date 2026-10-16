import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, blankSeed, seedProfile } from './seed'

// « COMBIEN DE TEMPS AVEZ-VOUS ? » — the front door's second question, right after the reading dialog, once per device (lib/timeBudget.ts). The choice
// shapes the front door (the matching door is the one « Commencer », the others fold, two minutes folds the explanations) and the Profil tab (it opens the
// matching path with no second question). It can always be changed: « Changer » on the front door, a row on the settings page.
// Every other spec runs with it put off (playwright.config.ts); this one starts from a device that has not seen it — nor the reading dialog before it.
test.use({ storageState: { cookies: [], origins: [] } })

const READING = 'Lire plus confortablement ?'
const TIME = 'Combien de temps avez-vous ?'

/** Through the reading dialog, to the time question. (A door's accessible name is its label AND its hint, so a door is found by the start of its name.) */
async function arrive(page: Page) {
  await seedProfile(page, blankSeed())
  await page.goto('/')
  await expect(page.getByRole('dialog', { name: READING })).toBeVisible()
  await expect(page.getByRole('dialog', { name: TIME })).toHaveCount(0)
  await page.getByRole('button', { name: 'C’est bien comme ça' }).click()
  const dialog = page.getByRole('dialog', { name: TIME })
  await expect(dialog).toBeVisible()
  return dialog
}

test('comes right after the reading dialog, full screen, with three doors; « 2 minutes » reshapes the front door and the Profil tab opens the quick path', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  const dialog = await arrive(page)
  const box = (await dialog.boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(389)
  expect(box.height).toBeGreaterThanOrEqual(779)
  // three doors, stacked on a phone: each one's top is below the previous one's bottom
  const doors = dialog.locator('.welcome__door')
  await expect(doors).toHaveCount(3)
  const boxes = await Promise.all([0, 1, 2].map(async (i) => (await doors.nth(i).boundingBox())!))
  expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].y + boxes[0].height)
  expect(boxes[2].y).toBeGreaterThanOrEqual(boxes[1].y + boxes[1].height)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await dialog.getByRole('button', { name: /^2 minutes/ }).click()
  await expect(dialog).toHaveCount(0)
  // the line, the one big door, the others folded, the explanations folded
  await expect(page.getByText('Votre temps : 2 minutes')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Commencer', exact: true })).toHaveAttribute('href', '/profil?debut=rapide')
  await expect(page.locator('.welcome__door')).toHaveCount(2)
  await expect(page.locator('.welcome__door').first()).toBeHidden()
  await expect(page.getByText('Autres façons de commencer')).toBeVisible()
  await expect(page.getByText('En savoir plus sur Horizon')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Comment ça marche' })).toBeHidden()
  // the demo still shows what an answer looks like
  await expect(page.getByRole('region', { name: 'Voyez à quoi ressemble une réponse' })).toBeVisible()
  // the choice outlives a reload, and the question does not come back
  await page.reload()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Votre temps : 2 minutes')).toBeVisible()
  // the Profil TAB (a bare /profil) opens the quick path, and the address says so
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Profil' }).click()
  await expect(page).toHaveURL(/\/profil\?debut=rapide$/)
  await expect(page.locator('.onboard')).toBeVisible()
})

test('« 15 minutes » leaves a bare /profil alone; « 30 minutes et plus » sends the Profil tab to the documents', async ({ page }) => {
  const dialog = await arrive(page)
  await dialog.getByRole('button', { name: /^15 minutes/ }).click()
  await expect(page.getByText('Votre temps : 15 minutes')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Commencer', exact: true })).toHaveAttribute('href', '/profil?debut=complet')
  // the explanations are one closed fold at every length of time
  await expect(page.getByRole('heading', { name: 'Comment ça marche' })).toBeHidden()
  await expect(page.getByText('En savoir plus sur Horizon')).toBeVisible()
  await page.goto('/profil')
  await expect(page).toHaveURL(/\/profil$/)
  await expect(page.locator('.onboard')).toBeVisible()

  await page.goto('/donnees')
  await page.getByRole('group', { name: 'Temps disponible' }).getByRole('radio', { name: '30 minutes et plus' }).click()
  await page.goto('/profil')
  await expect(page).toHaveURL(/par=document/)
  await expect(page).toHaveURL(/etape=gather/)
  await expect(page.locator('.onboard')).toHaveCount(0)
  // a door that NAMES its path is never overridden
  await page.goto('/profil?debut=rapide')
  await expect(page).toHaveURL(/\/profil\?debut=rapide$/)
  await expect(page.locator('.onboard')).toBeVisible()
})

test('« Changer » reopens the question with the choice marked; « Plus tard » puts it off and the three doors stay; the settings row changes it for good', async ({ page }) => {
  const dialog = await arrive(page)
  await dialog.getByRole('button', { name: /^2 minutes/ }).click()
  await page.getByRole('button', { name: 'Changer' }).click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: /^2 minutes/ })).toHaveAttribute('aria-current', 'true')
  await dialog.getByRole('button', { name: '30 minutes et plus' }).click()
  await expect(page.getByText('Votre temps : 30 minutes et plus')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Commencer', exact: true })).toHaveAttribute('href', '/profil?form=1&par=document&etape=gather')

  // reopened and closed with the ✕: the choice stays
  await page.getByRole('button', { name: 'Changer' }).click()
  await dialog.getByRole('button', { name: 'Fermer' }).click()
  await expect(page.getByText('Votre temps : 30 minutes et plus')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Temps disponible' })).toHaveCount(0)
  await page.goto('/donnees')
  await expect(page.getByRole('group', { name: 'Temps disponible' }).getByRole('radio', { name: '30 minutes et plus' })).toBeChecked()
})

test('« Plus tard » leaves the front door as it was — the three doors, the explanations in their one fold — and the question stays away', async ({ page }) => {
  const dialog = await arrive(page)
  await dialog.getByRole('button', { name: 'Plus tard' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.welcome__door')).toHaveCount(3)
  await expect(page.locator('.welcome__door').first()).toBeVisible()
  await expect(page.getByText('Votre temps')).toHaveCount(0)
  await expect(page.getByText('En savoir plus sur Horizon')).toBeVisible()
  await page.reload()
  await expect(page.locator('.page-head__title')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // the settings row shows nothing chosen, and choosing there lights the front door's line
  await page.goto('/donnees')
  const row = page.getByRole('group', { name: 'Temps disponible' })
  await expect(row.getByRole('radio', { checked: true })).toHaveCount(0)
  await row.getByRole('radio', { name: '15 minutes' }).click()
  await page.goto('/')
  await expect(page.getByText('Votre temps : 15 minutes')).toBeVisible()
})

test('a household with an answer is not asked, and sees no time line', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/')
  await page.getByRole('button', { name: 'C’est bien comme ça' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Voir ma réponse' })).toBeVisible()
  await expect(page.getByText('Votre temps')).toHaveCount(0)
})

test('English: the question, the line and the doors speak English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await seedProfile(page, blankSeed())
  await page.goto('/')
  await page.getByRole('button', { name: 'This is fine' }).click()
  const dialog = page.getByRole('dialog', { name: 'How much time do you have?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Two minutes' }).click()
  await expect(page.getByText('Your time: Two minutes')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Get started', exact: true })).toHaveAttribute('href', '/profil?debut=rapide')
  await expect(page.getByText('More about Horizon')).toBeVisible()
})
