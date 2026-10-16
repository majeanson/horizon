import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// « D'où vient ce chiffre ? » (components/Figure.tsx): a computed figure opens, in place, its formula with this household's numbers, each input as a door to its
// field, and the official page. The arithmetic is pinned by engine/trace.test.ts; this pins the gesture on the ledger's QPP and OAS amounts.
//
// The hosts below are the two the QPP and OAS traces actually cite (the Retraite Québec leaflet, the Service Canada page) — a literal list here rather than an import
// from fieldInfoCopy.test.ts: a spec must not import a unit-test file, and the full official-host list would let a trace drift to any of them unnoticed.
const TRACE_HOSTS = ['www.retraitequebec.gouv.qc.ca', 'www.canada.ca']

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

test('the QPP amount opens its calculation, a door to the field, and an official page', async ({ page }) => {
  await page.goto('/resultats?v=proof&bloc=donnees-calcul')
  const row = page.locator('.ledger__row').filter({ hasText: 'Début du RRQ' }).first()
  const figure = row.locator('button.figure')
  await expect(figure).toHaveAttribute('aria-expanded', 'false')
  const note = row.locator('.figure-note')
  await expect(note).toBeHidden()

  await figure.click()
  await expect(figure).toHaveAttribute('aria-expanded', 'true')
  await expect(note).toBeVisible()
  // layer 1: the formula, with this household's numbers
  await expect(note.locator('.figure-note__formula')).toContainText(/Première rente en \d\d\/\d{4}\..*ajustement.*=/)
  // layer 3: an official page, named as such for a screen reader
  const source = note.getByRole('link', { name: /page officielle/ })
  const host = new URL((await source.getAttribute('href')) ?? '').host
  expect(TRACE_HOSTS).toContain(host)
  // layer 2: an input is a door to the field that sets it — and the door lands there
  await note.getByRole('link', { name: /Vos gains de travail/ }).click()
  await expect(page).toHaveURL(/\/profil\?fact=self%3Aearnings/)
})

test('the OAS amount opens the same way, and the note closes on a second tap', async ({ page }) => {
  await page.goto('/resultats?v=proof&bloc=donnees-calcul')
  const row = page.locator('.ledger__row').filter({ hasText: 'Début de la PSV' }).first()
  const figure = row.locator('button.figure')
  await figure.click()
  await expect(row.locator('.figure-note__formula')).toContainText(/pension complète.*résidence.*report.*=/)
  expect(TRACE_HOSTS).toContain(new URL((await row.getByRole('link', { name: /page officielle/ }).getAttribute('href')) ?? '').host)
  await figure.click()
  await expect(row.locator('.figure-note')).toBeHidden()
})
