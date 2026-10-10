import { expect, test } from '@playwright/test'
import { EXAMPLE, PROFILE_KEY, savedProfile, seedProfile } from './seed'

// « RENDRE MON PROFIL EXACT »: each figure is confirmed (read off a document) or estimated; the meter counts them; the checklist
// names the documents; the guide walks the real form one figure at a time.

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
})

const panel = (page: import('@playwright/test').Page) => page.locator('.profile-section', { hasText: 'Rendre mon profil exact' })

test('a figure is estimated until the person says it is real; the mark, the meter and the saved profile agree, and a reload keeps it', async ({ page }) => {
  await page.goto('/profil')
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
  await page.goto('/profil')
  const docs = panel(page).locator('.doc')
  // the documents come most important first: the spending budget leads
  await expect(docs.first()).toContainText('Vos dépenses des 12 derniers mois')
  await expect(docs.filter({ hasText: 'Relevé de participation au RRQ' })).toHaveCount(1)
  await expect(panel(page).locator('.doc', { hasText: 'Avis de cotisation' }).getByRole('link', { name: /page officielle/ })).toHaveAttribute('href', /^https:\/\/www\.canada\.ca\//)
  // the two ways are two chips: walk every figure with the guide, or estimate what is still blank
  await expect(panel(page).getByRole('button', { name: 'Tout confirmer pas à pas' })).toBeVisible()
  await expect(panel(page).getByRole('button', { name: 'Estimer ce qui manque' })).toBeVisible()
  // the panel sits AFTER the form, and the one-line meter above the form leads to it
  expect(await page.locator('.accuracy-line').evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(await panel(page).evaluate((el) => el.getBoundingClientRect().top))
  // a figure of the checklist scrolls to its field and lights it
  await panel(page).locator('.doc', { hasText: 'Relevés de vos comptes' }).getByRole('button', { name: /Solde du REER, .*Camille/ }).click()
  await expect(page.locator('[data-fact="self:rrspBalance"]')).toHaveClass(/field-row--guided/)
  await expect(page.locator('[data-fact="self:rrspBalance"]')).toBeInViewport()
})

test('the guide walks the form: it lights the field, says where the figure is, confirms on a tap, and ends with the count', async ({ page }) => {
  await page.goto('/profil')
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
  await page.goto('/profil')
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
  await page.goto('/profil')
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

test('the quick way: « Estimer ce qui manque » fills blank earnings years and a TFSA room left at 0, confirms nothing, and never touches what was typed', async ({ page }) => {
  const seed = structuredClone(EXAMPLE) as { household: { persons: { salaryToday: number; earningsHistory: Record<string, number>; accounts: { tfsa: { balance: number; room: number } } }[] } }
  const me = seed.household.persons[0]
  me.salaryToday = 120_000
  me.earningsHistory = { '2020': 55_000 }
  me.accounts.tfsa.balance = 40_000
  me.accounts.tfsa.room = 0
  await page.goto('/profil')
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [PROFILE_KEY, JSON.stringify(seed)])
  await page.reload()
  const quick = panel(page)
  await expect(quick).toContainText('L’estimation remplit')
  await quick.getByRole('button', { name: 'Estimer ce qui manque' }).click()
  await expect(quick.getByRole('status')).toContainText(/années de revenus estimées/)
  await expect(quick.getByRole('status')).toContainText('Rien n’est confirmé')
  await expect.poll(async () => Object.keys((await savedProfile(page)).household.persons[0].earningsHistory).length).toBeGreaterThan(5)
  const saved = (await savedProfile(page)).household.persons[0]
  expect(saved.earningsHistory['2020']).toBe(55_000) // typed: untouched
  expect(saved.accounts.tfsa.room).toBeGreaterThan(0) // an estimate of the room a person of that age has, less the balance
  expect((await savedProfile(page)).confirmed).toEqual([]) // nothing is called real by an estimate
  // one tap wrote ~30 years and a room: the note carries the way back, and taking it restores exactly what was there
  await quick.getByRole('button', { name: 'Retirer ces estimations' }).click()
  await expect.poll(async () => Object.keys((await savedProfile(page)).household.persons[0].earningsHistory).length).toBe(1)
  expect((await savedProfile(page)).household.persons[0].accounts.tfsa.room).toBe(0)
  // estimating again, then a third press has nothing left to fill, and says so
  await quick.getByRole('button', { name: 'Estimer ce qui manque' }).click()
  await expect(quick.getByRole('status')).toContainText(/années de revenus estimées/)
  await quick.getByRole('button', { name: 'Estimer ce qui manque' }).click()
  await expect(quick.getByRole('status')).toContainText('Rien à estimer')
})

test('the results say how much of the answer stands on confirmed figures, and point back to the profile', async ({ page }) => {
  await page.goto('/resultats')
  const note = page.locator('.refine').getByText(/chiffres confirmés/)
  await expect(note).toContainText(/Votre profil\s: 0 sur \d+ chiffres confirmés\s; le reste est estimé\./)
  await note.getByRole('link', { name: 'Rendre mon profil exact' }).click()
  await expect(page).toHaveURL(/\/profil$/)
  await page.locator('[data-fact="self:rrspBalance"]').getByRole('button', { name: /^Estimé/ }).click()
  await page.getByRole('link', { name: 'Résultats' }).first().click()
  await expect(page.locator('.refine')).toContainText(/Votre profil\s: 1 sur \d+ chiffres confirmés/)
})
