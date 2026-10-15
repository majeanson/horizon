import { expect, test } from '@playwright/test'
import { EXAMPLE, PROFILE_KEY, savedProfile, seedProfile } from './seed'

// « RENDRE MON PROFIL EXACT »: each figure is confirmed (read off a document) or estimated; the meter counts them; the documents are the steps
// of « Par document » (one list, not two); the guide walks the real form one figure at a time — every figure, or one document's.

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

test('the panel is a door to « Par document », beside the guide for every figure, and sits after the form', async ({ page }) => {
  await page.goto('/profil')
  // the two ways are two chips: walk every figure with the guide, or confirm document by document — filling what is blank is « Remplir ce qui manque », not here
  await expect(panel(page).getByRole('button', { name: 'Tout confirmer pas à pas' })).toBeVisible()
  await expect(panel(page).getByRole('button', { name: 'Estimer ce qui manque' })).toHaveCount(0)
  // the documents are NOT listed a second time here: no per-document cards in the panel
  await expect(panel(page).locator('.doc')).toHaveCount(0)
  // the panel sits AFTER the form, and the one-line meter above the form leads to it
  expect(await page.locator('.accuracy-line').evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(await panel(page).evaluate((el) => el.getBoundingClientRect().top))
  await panel(page).getByRole('button', { name: 'Confirmer document par document' }).click()
  await expect(page).toHaveURL(/par=document/)
  await expect(page.getByRole('tab', { name: 'Par document' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('heading', { name: 'Vous et votre ménage', level: 2 })).toBeVisible()
})

test('a document’s step names it, says what it settles and where to get it, and links its official page', async ({ page }) => {
  await page.goto('/profil?form=1&par=document&etape=tax')
  await expect(page.getByRole('heading', { name: 'Avis de cotisation et compte de l’ARC', level: 2 })).toBeVisible()
  await expect(page.getByRole('link', { name: /page officielle/ })).toHaveAttribute('href', /^https:\/\/www\.canada\.ca\//)
  await expect(page.locator('.saisie__head').getByText('Où le trouver')).toBeVisible()
  // the budget leads the order of the steps, as it led the old list
  const steps = page.getByRole('navigation', { name: 'Les étapes de la saisie' }).getByRole('button')
  await expect(steps.nth(1)).toContainText('Vous et votre ménage')
  await expect(steps.nth(2)).toContainText('Vos dépenses des 12 derniers mois')
})

test('the guide walks the form: it lights the field, says where the figure is, confirms on a tap, and ends with the count', async ({ page }) => {
  await page.goto('/profil?form=1&par=document&etape=bank')
  await page.getByRole('button', { name: 'Me guider' }).click()
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
  await page.goto('/profil?form=1&par=document&etape=budget')
  // the budget document has two figures: confirm both
  await page.getByRole('button', { name: 'Me guider' }).click()
  const bar = page.getByRole('region', { name: 'Guide pour confirmer vos chiffres' })
  await bar.getByRole('button', { name: 'C’est confirmé' }).click()
  await bar.getByRole('button', { name: 'C’est confirmé' }).click()
  await expect(bar).toContainText('Guide terminé')
  await expect(bar).toContainText(/2 sur \d+ chiffres confirmés/)
  await bar.getByRole('button', { name: 'Fermer le guide' }).click()
  await expect(bar).toHaveCount(0)
  // the document is done: its step offers no guide
  await expect(page.getByRole('button', { name: 'Me guider' })).toHaveCount(0)
})

test('on a phone the guide sits above the bottom navigation, inside the window, and nothing runs off the page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/profil?form=1&par=document&etape=bank')
  await page.getByRole('button', { name: 'Me guider' }).click()
  const bar = page.getByRole('region', { name: 'Guide pour confirmer vos chiffres' })
  await expect(bar).toBeVisible()
  const box = (await bar.boundingBox())!
  const nav = (await page.locator('.shell__nav').boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  expect(box.y + box.height).toBeLessThanOrEqual(nav.y + 1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('« Remplir ce qui manque » › « Estimer ce qui manque » fills blank earnings years and a TFSA room left at 0, confirms nothing, and never touches what was typed', async ({ page }) => {
  const seed = structuredClone(EXAMPLE) as { household: { persons: { salaryToday: number; earningsHistory: Record<string, number>; accounts: { tfsa: { balance: number; room: number } } }[] } }
  const me = seed.household.persons[0]
  me.salaryToday = 120_000
  me.earningsHistory = { '2020': 55_000 }
  me.accounts.tfsa.balance = 40_000
  me.accounts.tfsa.room = 0
  await page.goto('/profil')
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [PROFILE_KEY, JSON.stringify(seed)])
  await page.reload()
  const quick = page.locator('#niveau')
  // every balance is typed here, so only the estimate has something to fill: the section shows it without a switch
  await expect(quick.getByRole('tab')).toHaveCount(0)
  await expect(quick.getByRole('heading', { name: 'Estimer ce qui manque' })).toBeVisible()
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
  // With unconfirmed figures the line is the answer’s range (every estimated figure moved at once), still counting the confirmed ones.
  const note = page.locator('.verdict .refine__confidence')
  await expect(note).toContainText(/Entre \d+ (?:et \d+ ans|ans et peut-être aucun âge avant \d+),? selon vos chiffres estimés — 0 sur \d+ confirmés\./, { timeout: 60_000 })
  await note.getByRole('link', { name: 'Rendre mon profil exact' }).click()
  await expect(page).toHaveURL(/\/profil$/)
  await page.locator('[data-fact="self:rrspBalance"]').getByRole('button', { name: /^Estimé/ }).click()
  await page.getByRole('link', { name: 'Résultats' }).first().click()
  await expect(page.locator('.verdict')).toContainText(/1 sur \d+ (?:chiffres )?confirmés/)
})

// THE GUIDE MUST NOT COVER WHAT IT IS ASKING ABOUT. On a phone the card was a third of the screen and the figure it named was scrolled to the middle of a window half of which was
// chrome — under the card. The field now lands in the free band (below what is pinned, above the card), and the card is a strip.
for (const [name, size, maxShare] of [
  ['phone', { width: 390, height: 844 }, 0.32],
  ['large phone', { width: 440, height: 956 }, 0.32],
  ['desktop', { width: 1280, height: 800 }, 0.4],
] as const) {
  test(`the guide never covers the figure it is on, and stays a strip — ${name}`, async ({ page }) => {
    await page.setViewportSize(size)
    await page.goto('/profil?form=1&par=document&etape=bank')
    await page.getByRole('button', { name: 'Me guider' }).click()
    const bar = page.getByRole('region', { name: 'Guide pour confirmer vos chiffres' })
    await expect(bar).toBeVisible()
    for (let step = 0; step < 4; step++) {
      const field = page.locator('.field-row--guided')
      await expect(field).toHaveCount(1)
      // the page scrolls to the figure (smoothly): once it has arrived, the figure's first 120 px sit below everything pinned at the top and above the card
      await expect
        .poll(
          async () => {
            const f = (await field.boundingBox())!
            const bb = (await bar.boundingBox())!
            const pinned = await page.evaluate(() => Math.max(0, ...[...document.querySelectorAll('.shell__bar, .section-nav')].filter((e) => getComputedStyle(e).position === 'sticky' || getComputedStyle(e).position === 'fixed').map((e) => e.getBoundingClientRect()).filter((r) => r.height > 0 && r.top < 240).map((r) => r.bottom)))
            return f.y >= pinned - 1 && f.y + Math.min(f.height, 120) <= bb.y
          },
          { timeout: 8_000, message: 'the guided figure sits in the free band' },
        )
        .toBe(true)
      const b = (await bar.boundingBox())!
      expect(b.height / size.height, `the card is at most ${maxShare * 100} % of the screen`).toBeLessThanOrEqual(maxShare)
      await bar.getByRole('button', { name: 'Plus tard' }).click()
    }
  })
}

test('« Estimer ce qui manque » also estimates a REER room left at 0 — from the earnings and the balance — and says so, confirms nothing, and can be taken back', async ({ page }) => {
  const seed = structuredClone(EXAMPLE) as { household: { persons: { salaryToday: number; earningsHistory: Record<string, number>; pensions: unknown[]; accounts: { rrsp: { balance: number; room: number; lockedIn: number } } }[] } }
  const alex = seed.household.persons[1] // the example's second person has no employer plan
  expect(alex.pensions).toHaveLength(0)
  alex.salaryToday = 100_000
  alex.earningsHistory = {}
  alex.accounts.rrsp = { ...alex.accounts.rrsp, balance: 60_000, room: 0, lockedIn: 0 }
  await page.goto('/profil')
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [PROFILE_KEY, JSON.stringify(seed)])
  await page.reload()
  const quick = page.locator('#niveau')
  await expect(quick).toContainText('droits de REER')
  await quick.getByRole('button', { name: 'Estimer ce qui manque' }).click()
  await expect(quick.getByRole('status')).toContainText(/droit de REER estimé/)
  await expect(quick.getByRole('status')).toContainText('Rien n’est confirmé')
  await expect.poll(async () => (await savedProfile(page)).household.persons[1].accounts.rrsp.room).toBeGreaterThan(20_000)
  expect((await savedProfile(page)).confirmed).toEqual([]) // an estimate is never called real
  await quick.getByRole('button', { name: 'Retirer ces estimations' }).click()
  await expect.poll(async () => (await savedProfile(page)).household.persons[1].accounts.rrsp.room).toBe(0)
})
