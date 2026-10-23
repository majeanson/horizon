import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, blankSeed, seedProfile } from './seed'

// THE FRONT DOOR (pages/Accueil.tsx): a first visit reads, in this order and before anything covers it, what Horizon is in one sentence, the question,
// how to read the page (the language, day / night, the contrast, the size — in view, no tap), « Commencer » (on the first screen of the smallest phone), then
// what it does and the two promises it keeps. Nothing opens by itself. « Commencer » opens ONE full-screen dialog (components/WelcomeDialog.tsx): how much time there is, each answer a
// link into its own path that also keeps the choice. The settings page keeps the same reading controls for good.
// Every spec starts from a device that has seen nothing (the config seeds only the first answer's flourish).

const DIALOG = /^Par où commencer/
const hero = (page: Page) => page.locator('.welcome__hero')
const reading = (page: Page) => page.getByRole('region', { name: /^Lire plus confortablement/ })

test('a first visit sees, in view and with nothing over it: what Horizon is, how to read it, the two buttons, then the question and both promises', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedProfile(page, blankSeed())
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('retraite')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(hero(page)).toContainText('RRQ, PSV')
  await expect(hero(page)).toContainText('Tout reste sur cet appareil')
  await expect(hero(page)).toContainText('page officielle')
  // the mark of the brand, and the first button, inside the first screen of a phone
  await expect(hero(page).locator('.brand-mark')).toBeVisible()
  // in this order: the sentence of what it is, the question (the one H1), the reading controls, the way in
  const what = (await hero(page).locator('.welcome__what').boundingBox())!
  const read = (await reading(page).boundingBox())!
  const go = (await hero(page).locator('.welcome__go').boundingBox())!
  const h1 = (await page.getByRole('heading', { level: 1 }).boundingBox())!
  expect(what.y + what.height).toBeLessThanOrEqual(h1.y)
  expect(h1.y + h1.height).toBeLessThanOrEqual(read.y)
  expect(read.y + read.height).toBeLessThanOrEqual(go.y)
  await expect(hero(page).locator('.welcome__what')).toContainText('Horizon calcule')
  const begin = page.getByRole('button', { name: 'Commencer', exact: true })
  const box = (await begin.boundingBox())!
  // the first screen ends where the tab bar begins, not at the window's edge: a button behind the bar is not in view
  const tabs = (await page.getByRole('navigation', { name: 'Navigation principale' }).boundingBox())!
  expect(box.y + box.height).toBeLessThanOrEqual(tabs.y)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  // and nothing came back by itself after a reload
  await page.reload()
  await expect(page.locator('.page-head__title')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

// The smallest phones (2026-10-20, Marc: « Commencer » near the top): the language and day / night share a row, the zoom tip goes under 400 px, and
// the way in is still on the first screen — at « Grand » too on a 360 × 640 phone.
for (const [w, h, scale] of [[320, 568, 'normal'], [360, 640, 'normal'], [360, 640, 'large']] as const) {
  test(`on a ${w} × ${h} phone at the ${scale} text size, « Commencer » is on the first screen, above the tab bar, with no sideways scroll`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    if (scale !== 'normal') await page.addInitScript((sc) => localStorage.setItem('horizon-text-scale', sc), scale)
    await seedProfile(page, blankSeed())
    await page.goto('/')
    const begin = page.getByRole('button', { name: 'Commencer', exact: true })
    await expect(begin).toBeVisible()
    // measured in the faces the reader sees: a measure taken before they land (the system face) passed or failed by where the race fell
    await page.evaluate(() => document.fonts.ready)
    const box = (await begin.boundingBox())!
    const tabs = (await page.getByRole('navigation', { name: 'Navigation principale' }).boundingBox())!
    expect(box.y + box.height).toBeLessThanOrEqual(tabs.y)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    // on a phone the reading panel is ONE row (the question and « Commencer » keep the first screen): a tap opens it, and its two shared-row controls still say what they set
    await expect(reading(page).getByRole('tablist', { name: 'Langue' })).toBeHidden()
    await reading(page).getByText(/^Lire plus confortablement/).click()
    await expect(reading(page).getByRole('tablist', { name: 'Langue' })).toBeVisible()
  })
}

test('« Voir un exemple » brings the example answer into view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 })
  await seedProfile(page, blankSeed())
  await page.goto('/')
  await page.getByRole('button', { name: 'Voir un exemple' }).click()
  await expect(page.getByRole('region', { name: 'Voyez à quoi ressemble une réponse' })).toBeInViewport()
})

test('the reading controls on the front door: the sizes in words, and each choice applies at once', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await seedProfile(page, blankSeed())
  await page.goto('/')
  const r = reading(page)
  await r.getByText(/^Lire plus confortablement/).click() // a phone folds the panel to one row
  await r.getByRole('tab', { name: 'Grand', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-text-scale', 'large')
  await r.getByRole('tab', { name: 'Très grand' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-text-scale', 'x-large')
  await r.getByRole('tab', { name: 'Renforcé' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high')
  await r.getByRole('tab', { name: 'Nuit' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  // the language switches the page itself
  await r.getByRole('tab', { name: 'English' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('When can you retire?')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('« Commencer » opens one full-screen dialog: the time, three doors stacked — the reading controls are not repeated in it', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await seedProfile(page, blankSeed())
  await page.goto('/')
  await page.getByRole('button', { name: 'Commencer', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: DIALOG })
  await expect(dialog).toBeVisible()
  const box = (await dialog.boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(389)
  expect(box.height).toBeGreaterThanOrEqual(779)
  // taller than a phone, it opens at its TOP: the title is on screen, never centred up out of reach
  await expect(dialog.getByRole('heading', { name: DIALOG })).toBeInViewport()
  await expect(dialog.getByRole('heading', { name: /Combien de temps avez-vous/ })).toBeVisible()
  // three doors, stacked: each one's top is below the previous one's bottom
  const doors = dialog.locator('.welcome__door')
  await expect(doors).toHaveCount(3)
  const boxes = await Promise.all([0, 1, 2].map(async (i) => (await doors.nth(i).boundingBox())!))
  expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].y + boxes[0].height)
  expect(boxes[2].y).toBeGreaterThanOrEqual(boxes[1].y + boxes[1].height)
  await expect(dialog.getByRole('tab')).toHaveCount(0)
})

test('each door is a link into its own path, and keeps the choice: the Profil tab then opens the same path, the dialog marks it, the settings row shows it', async ({ page }) => {
  await seedProfile(page, blankSeed())
  await page.goto('/')
  await page.getByRole('button', { name: 'Commencer', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: DIALOG })
  const door = (name: RegExp) => dialog.getByRole('link', { name })
  await expect(door(/^2 minutes/)).toHaveAttribute('href', '/profil?debut=rapide')
  await expect(door(/^15 minutes/)).toHaveAttribute('href', '/profil?debut=complet')
  await expect(door(/^30 minutes et plus/)).toHaveAttribute('href', '/profil?form=1&par=document&etape=gather')
  await door(/^2 minutes/).click()
  await expect(page).toHaveURL(/\/profil\?debut=rapide$/)
  await expect(page.locator('.onboard')).toBeVisible()
  // the page behind the dialog is live again (the dialog made it inert while open)
  await expect(page.locator('#root')).not.toHaveAttribute('inert', /.*/)
  // the Profil TAB (a bare /profil) opens the quick path
  await page.goto('/hypotheses')
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Profil' }).click()
  await expect(page).toHaveURL(/\/profil\?debut=rapide$/)
  // the dialog marks the choice already made
  await page.goto('/')
  await page.getByRole('button', { name: 'Commencer', exact: true }).click()
  await expect(door(/^2 minutes/)).toHaveAttribute('aria-current', 'true')
  await expect(door(/^15 minutes/)).not.toHaveAttribute('aria-current', /.*/)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  // and the settings row shows it, and changes it for good
  await page.goto('/donnees')
  const row = page.getByRole('group', { name: 'Temps disponible' })
  await expect(row.getByRole('radio', { name: '2 minutes' })).toBeChecked()
  await row.getByRole('radio', { name: '30 minutes et plus' }).click()
  await page.goto('/profil')
  await expect(page).toHaveURL(/par=document/)
  await expect(page).toHaveURL(/etape=gather/)
})

test('the fifteen-minute door and the documents door land where they say', async ({ page }) => {
  await seedProfile(page, blankSeed())
  await page.goto('/')
  await page.getByRole('button', { name: 'Commencer', exact: true }).click()
  await page.getByRole('dialog', { name: DIALOG }).getByRole('link', { name: /^15 minutes/ }).click()
  await expect(page).toHaveURL(/\/profil\?debut=complet$/)
  await expect(page.locator('.onboard')).toBeVisible()
  await page.goto('/')
  await page.getByRole('button', { name: 'Commencer', exact: true }).click()
  await page.getByRole('dialog', { name: DIALOG }).getByRole('link', { name: /^30 minutes et plus/ }).click()
  await expect(page).toHaveURL(/par=document/)
  await expect(page.locator('#person-self, .onboard')).toHaveCount(0)
})

test('the ✕ and Escape close the dialog and choose nothing', async ({ page }) => {
  await seedProfile(page, blankSeed())
  await page.goto('/')
  const begin = page.getByRole('button', { name: 'Commencer', exact: true })
  await begin.click()
  await page.getByRole('dialog', { name: DIALOG }).getByRole('button', { name: 'Fermer' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await begin.click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('horizon-time'))).toBeNull()
  // focus went back to the button that opened it
  await expect(begin).toBeFocused()
})

test('a household with an answer sees no hero and no « Commencer »: its answer and its profile', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Voir ma réponse' })).toBeVisible()
  await expect(hero(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Commencer', exact: true })).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('English: the front door, its reading card, the dialog and its doors speak English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await seedProfile(page, blankSeed())
  await page.goto('/')
  await expect(hero(page)).toContainText('Everything stays on this device')
  await expect(page.getByRole('region', { name: 'Easier to read?' })).toBeVisible()
  await page.getByRole('button', { name: 'Get started', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: /^Where to start/ })
  await expect(dialog.getByRole('heading', { name: 'How much time do you have?' })).toBeVisible()
  await expect(dialog.getByRole('link', { name: /^Two minutes/ })).toHaveAttribute('href', '/profil?debut=rapide')
})

test.describe('a browser in English', () => {
  test.use({ locale: 'en-US' })
  test('opens a first visit in English, before the first paint and after; a choice made in the app then wins', async ({ page }) => {
    await seedProfile(page, blankSeed())
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('When can you retire?')
    await page.getByRole('region', { name: 'Easier to read?' }).getByRole('tab', { name: 'Français' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText('retraite')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('retraite')
  })
})

test('the sizes are said in percent on the settings page and in words on the front door', async ({ page }) => {
  await page.goto('/donnees')
  await expect(page.getByRole('tab', { name: '115 %' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Grand', exact: true })).toHaveCount(0)
})

test('changing the text size takes the page back to its top', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 500 })
  await page.goto('/donnees')
  const size = page.getByRole('tab', { name: '115 %' })
  await expect(size).toBeVisible()
  await page.evaluate(() => document.getElementById('root')?.scrollTo({ top: 300 }))
  await expect.poll(() => page.evaluate(() => document.getElementById('root')!.scrollTop)).toBeGreaterThan(0)
  await size.click()
  await expect.poll(() => page.evaluate(() => document.getElementById('root')!.scrollTop)).toBe(0)
})

test('a new version ready is said in one line with a Reload button, never forced under the reader', async ({ page }) => {
  await page.goto('/profil')
  await expect(page.locator('.page-head__title')).toBeVisible()
  await expect(page.getByText('Une nouvelle version d’Horizon est prête.')).toHaveCount(0)
  await page.evaluate(() => window.dispatchEvent(new Event('horizon:sw-update')))
  await expect(page.getByText('Une nouvelle version d’Horizon est prête.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recharger' })).toBeVisible()
  // the page is still the same one: nothing reloaded by itself
  await expect(page.locator('.page-head__title')).toBeVisible()
})
