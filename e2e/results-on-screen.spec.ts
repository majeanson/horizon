import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// RESULTS ON SCREEN (the review of 2026-10-19): a nudge says nothing before the answer is in, and a link inside the proof never closes the blocks the reader opened.

test('the spouses’ balance nudge is not asked before the answer is in — even with its block in view from the start', async ({ page }) => {
  test.slow()
  // The answer held back on purpose (its worker's script answered 6 s late): on a phone or CI's runner it is slow anyway, and the year section — open by
  // default, its block « seen » the moment it scrolls into view — is on screen long before it. Deterministic, not a race on this machine's speed.
  await page.route(/answer\.worker\.ts/, async (route) => {
    await new Promise((r) => setTimeout(r, 6_000))
    await route.continue()
  })
  let balanceAsked = false
  page.on('worker', (w) => {
    if (w.url().includes('spouseBalance')) balanceAsked = true
  })
  await seedProfile(page, EXAMPLE) // a couple: the nudge applies
  await page.goto('/resultats')
  const year = page.locator('#annee')
  await year.waitFor({ state: 'attached', timeout: 60_000 })
  await year.scrollIntoViewIfNeeded()
  const pending = page.locator('.skeleton--verdict')
  await expect(pending.first()).toBeAttached() // the answer is not in: the case this test is about
  // the whole time the answer is pending, no balance search may start (it would compute for the plan's own age, then change its sentence)
  let askedWhilePending = false
  while ((await pending.count()) > 0) {
    if (balanceAsked) askedWhilePending = true
    await page.waitForTimeout(100)
  }
  expect(askedWhilePending, 'the balance search started before the answer was in').toBe(false)
  // once the answer is in, it is asked
  await year.scrollIntoViewIfNeeded()
  await expect.poll(() => balanceAsked, { timeout: 120_000 }).toBe(true)
})

test('« Voir les pages officielles » inside « Précision » keeps every block the reader opened, and lands on the parameters', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats?bloc=tout#precision')
  const link = page.getByRole('button', { name: 'Voir les pages officielles (Paramètres utilisés)' })
  await expect(link).toBeVisible({ timeout: 60_000 })
  await link.click()
  await expect(page).toHaveURL(/bloc=tout/) // « Tout ouvrir » stays: no block closes under the reader
  await expect(page.locator('#parametres')).toBeInViewport({ timeout: 10_000 })
})

test('after a way of starting is picked, the three-scenario marks are pending until worked out again — never the previous ages’ dots shown as final', async ({ page }) => {
  test.slow()
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats?v=strategies&bt=cards')
  // the marks are inside each card's « Détails »: open them all, as bridge.spec does
  await expect(page.locator('.bridge-card').first()).toBeVisible({ timeout: 60_000 })
  for (const b of await page.locator('.bridge-card').getByRole('button', { name: /^Détails/ }).all()) await b.click()
  const marks = page.locator('.bridge-mark')
  await expect(marks.first()).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.bridge-mark', { hasText: '…' })).toHaveCount(0, { timeout: 60_000 }) // the first ones are in
  await page.locator('.bridge-card').getByRole('radio', { name: 'Reporter au maximum', exact: true }).click()
  // the cards change at once (one projection set); the fifteen marks behind them are being worked out again: said so
  await expect(page.locator('.bridge-mark', { hasText: '…' }).first()).toBeVisible({ timeout: 5_000 })
  await expect(page.locator('.bridge-mark', { hasText: '…' })).toHaveCount(0, { timeout: 60_000 })
})
