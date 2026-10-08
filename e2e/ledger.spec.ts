import { expect, test } from '@playwright/test'
import { EXAMPLE, savedProfile, seedProfile } from './seed'

// « Mes données et leur calcul »: the ages, each with the calculation behind it, a slider, and what the plan does.
// The arithmetic is pinned by engine/ledger.test.ts; this pins that a person can drive it and that it writes the profile.

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))


test('a slider shows the calculation, previews while held, and saves the age in the profile when released', async ({ page }) => {
  await page.goto('/resultats?v=verify')
  const panel = page.locator('.ledger')
  await expect(panel).toBeVisible()
  // each age is a slider with a readable value, and the QPP line shows its formula and its result
  const rrq = panel.getByRole('slider', { name: 'Début du RRQ' }).first()
  await expect(rrq).toHaveAttribute('aria-valuetext', /65 ans/)
  await expect(panel.locator('.ledger__calc').filter({ hasText: 'ajustement' }).first()).toBeVisible()
  const before = await panel.locator('.ledger__result').first().innerText()

  // holding a key previews the amount; releasing it saves the age
  await rrq.focus()
  await page.keyboard.down('ArrowRight')
  await page.keyboard.up('ArrowRight')
  await expect(rrq).toHaveAttribute('aria-valuetext', /66 ans/)
  await expect(panel.locator('.ledger__result').first()).not.toHaveText(before)
  await expect(panel.locator('.ledger__delta').first()).toContainText('de plus par mois')
  await expect.poll(async () => (await savedProfile(page)).household.persons[0].rrq.startAge).toBe(66)
  // the plan line is read aloud politely and names an outcome
  await expect(panel.locator('.ledger__glance')).toContainText(/L’argent dure/)
})

test('the page has no horizontal overflow at phone width with the panel open', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto('/resultats?v=verify')
  await expect(page.locator('.ledger')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('spending and the economy are sliders too: releasing one saves it, and the calculation says what it means', async ({ page }) => {
  await page.goto('/resultats?v=verify')
  const panel = page.locator('.ledger')
  const infl = panel.getByRole('slider', { name: 'Inflation' })
  const before = (await savedProfile(page)).assumptions.inflation
  await infl.focus()
  await page.keyboard.press('ArrowRight')
  await expect(panel.locator('.ledger__calc').filter({ hasText: 'Les prix montent' })).toBeVisible()
  await expect.poll(async () => (await savedProfile(page)).assumptions.inflation).toBeCloseTo(before + 0.001, 5)
  const retired = panel.getByRole('slider', { name: 'Dépenses à la retraite' })
  const spend = (await savedProfile(page)).household.spending.retiredToday
  await retired.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(async () => (await savedProfile(page)).household.spending.retiredToday).toBe(spend + 500)
})

test('a slider says what its number means while it moves: the three scenarios on the track, the band and the reason; a step button is one exact step', async ({ page }) => {
  await page.goto('/resultats?v=verify')
  const row = page.locator('.ledger__row', { has: page.getByRole('slider', { name: 'Inflation' }) })
  // The prudent / neutral / bold scenarios are three coloured dots on the track and, under it, a legend that names each,
  // says its value — always in that order — and applies it in one tap.
  await expect(row.locator('.slider__dot')).toHaveCount(3)
  const legend = row.locator('.slider__legend')
  await expect(legend.getByRole('radio')).toHaveText([/^Prudent\s+\d/, /^Neutre\s+\d/, /^Audacieux\s+\d/])
  // …and the live band follows the thumb: a typical inflation, then a very high one.
  await expect(row.locator('.impact__level')).toHaveText('Typique')
  const infl = row.getByRole('slider', { name: 'Inflation' })
  await infl.focus()
  for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight')
  await expect(row.locator('.impact__level')).toHaveText(/Élevé|Très élevé/)
  // The « + » / « − » buttons move one exact step and save it at once.
  const before = (await savedProfile(page)).assumptions.inflation
  await row.getByRole('button', { name: 'Moins : Inflation' }).click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.inflation).toBeCloseTo(before - 0.001, 5)
  // A tap on a scenario in the legend sets the slider to it and saves it at once; the chip then reads as chosen.
  await legend.getByRole('radio', { name: /^Audacieux/ }).click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.inflation).toBeCloseTo(0.02, 5)
  await expect(legend.getByRole('radio', { name: /^Audacieux/ })).toHaveAttribute('aria-checked', 'true')
  // A pension's start age carries its reference ages under the track.
  await expect(page.locator('.ledger .slider__marks').filter({ hasText: '60' }).first()).toContainText('65')
})
