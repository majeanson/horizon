import { expect, test } from '@playwright/test'
import { EXAMPLE, savedProfile, seedProfile } from './seed'

// « RENDRE MON PROFIL EXACT »: each figure is confirmed (read off a document) or estimated; the meter counts them; the checklist
// names the documents; the guide walks the real form one figure at a time.

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
})

const panel = (page: import('@playwright/test').Page) => page.locator('.profile-section', { hasText: 'Rendre mon profil exact' })

test('a figure is estimated until the person says it is real; the mark, the meter and the saved profile agree, and a reload keeps it', async ({ page }) => {
  await page.goto('/')
  const meter = panel(page).getByRole('progressbar')
  await expect(meter).toHaveAttribute('aria-valuenow', '0')
  const total = Number(await meter.getAttribute('aria-valuemax'))
  expect(total).toBeGreaterThan(10)
  // the RRSP balance of the first person
  const row = page.locator('[data-fact="self:rrspBalance"]')
  const mark = row.getByRole('button', { name: /^Estimé/ })
  await expect(mark).toHaveAttribute('aria-pressed', 'false')
  await mark.click()
  await expect(row.getByRole('button', { name: /^Confirmé/ })).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await savedProfile(page)).confirmed).toEqual(['self:rrspBalance'])
  await expect(meter).toHaveAttribute('aria-valuenow', '1')
  await expect(panel(page)).toContainText(`1 sur ${total} chiffres confirmés`)
  // taking it back
  await row.getByRole('button', { name: /^Confirmé/ }).click()
  await expect.poll(async () => (await savedProfile(page)).confirmed).toEqual([])
  // and a reload keeps what was said
  await row.getByRole('button', { name: /^Estimé/ }).click()
  await page.reload()
  await expect(page.locator('[data-fact="self:rrspBalance"]').getByRole('button', { name: /^Confirmé/ })).toBeVisible()
})

test('the checklist names the documents, what each confirms, and its official page; a figure in it leads to its field', async ({ page }) => {
  await page.goto('/')
  const docs = panel(page).locator('.doc')
  await expect(docs.first()).toContainText('Relevé de participation au RRQ')
  await expect(panel(page).locator('.doc', { hasText: 'Avis de cotisation' }).getByRole('link', { name: /page officielle/ })).toHaveAttribute('href', /^https:\/\/www\.canada\.ca\//)
  // the quick and the exact ways are both said
  await expect(panel(page)).toContainText('Rapide')
  await expect(panel(page)).toContainText('Exact')
  // a figure of the checklist scrolls to its field and lights it
  await panel(page).locator('.doc', { hasText: 'Relevés de vos comptes' }).getByRole('button', { name: /Solde du REER, .*Camille/ }).click()
  await expect(page.locator('[data-fact="self:rrspBalance"]')).toHaveClass(/field-row--guided/)
  await expect(page.locator('[data-fact="self:rrspBalance"]')).toBeInViewport()
})

test('the guide walks the form: it lights the field, says where the figure is, confirms on a tap, and ends with the count', async ({ page }) => {
  await page.goto('/')
  await panel(page).locator('.doc', { hasText: 'Relevés de vos comptes' }).getByRole('button', { name: 'Me guider' }).click()
  const bar = page.getByRole('region', { name: 'Guide pour confirmer vos chiffres' })
  await expect(bar).toBeVisible()
  await expect(bar).toContainText('Chiffre 1 sur')
  await expect(bar).toContainText('Solde du REER')
  await expect(bar).toContainText('Où le trouver')
  await expect(bar).toContainText('Relevés de vos comptes')
  // the field it is on is lit and on screen
  await expect(page.locator('.field-row--guided')).toHaveCount(1)
  await expect(page.locator('.field-row--guided')).toBeInViewport()
  // confirming marks the figure and moves on
  await bar.getByRole('button', { name: 'C’est confirmé' }).click()
  await expect.poll(async () => (await savedProfile(page)).confirmed).toContain('self:rrspBalance')
  await expect(bar).toContainText('Chiffre 2 sur')
  // « Plus tard » skips without confirming
  await bar.getByRole('button', { name: 'Plus tard' }).click()
  await expect.poll(async () => (await savedProfile(page)).confirmed.length).toBe(1)
  // Escape closes it and puts the light out
  await page.keyboard.press('Escape')
  await expect(bar).toHaveCount(0)
  await expect(page.locator('.field-row--guided')).toHaveCount(0)
})

test('the guide finishes: after the last figure it says how many are confirmed', async ({ page }) => {
  await page.goto('/')
  // the budget document has two figures: confirm both
  await panel(page).locator('.doc', { hasText: 'Vos dépenses des 12 derniers mois' }).getByRole('button', { name: 'Me guider' }).click()
  const bar = page.getByRole('region', { name: 'Guide pour confirmer vos chiffres' })
  await bar.getByRole('button', { name: 'C’est confirmé' }).click()
  await bar.getByRole('button', { name: 'C’est confirmé' }).click()
  await expect(bar).toContainText('Guide terminé')
  await expect(bar).toContainText(/2 sur \d+ chiffres confirmés/)
  await bar.getByRole('button', { name: 'Fermer le guide' }).click()
  await expect(bar).toHaveCount(0)
  // the document is done: its row says so and offers no guide
  await expect(panel(page).locator('.doc', { hasText: 'Vos dépenses des 12 derniers mois' }).getByRole('button', { name: 'Me guider' })).toHaveCount(0)
})

test('on a phone the guide sits above the bottom navigation, inside the window, and nothing runs off the page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await panel(page).locator('.doc', { hasText: 'Relevés de vos comptes' }).getByRole('button', { name: 'Me guider' }).click()
  const bar = page.getByRole('region', { name: 'Guide pour confirmer vos chiffres' })
  await expect(bar).toBeVisible()
  const box = (await bar.boundingBox())!
  const nav = (await page.locator('.shell__nav').boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  expect(box.y + box.height).toBeLessThanOrEqual(nav.y + 1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
