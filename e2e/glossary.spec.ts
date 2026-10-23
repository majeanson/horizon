import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile, switchLanguage } from './seed'

// THE GLOSSARY. A sigle in a hint is a link to its entry: a plain tap says what it is in a small dialog, right where the person is reading, and the way on
// from there lands on that entry, marked; the page keeps working as a page of its own (the map, the documents, the official links).

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

test('a sigle in a hint says what it is in place, and the way on opens its glossary entry, scrolled to and marked', async ({ page }) => {
  await page.goto('/profil')
  await page.locator('.page-head__title').waitFor()
  // The ⓘ notes are closed: take a hint that is on screen.
  const link = page.locator('main a.gloss:visible').first()
  await expect(link).toBeVisible()
  const href = await link.getAttribute('href')
  expect(href).toMatch(/^\/glossaire#terme-[a-z-]+$/)
  await link.click()
  // The tap stays on the page: a dialog with the sentence, not a new page.
  const card = page.getByRole('dialog')
  await expect(card).toBeVisible()
  await expect(page).toHaveURL((url) => url.pathname === '/profil')
  await card.locator(`a[href="${href}"]`).click()
  await expect(page).toHaveURL((url) => url.pathname + url.hash === href)
  const entry = page.locator(`#${href!.split('#')[1]}`)
  await expect(entry).toBeInViewport()
  await expect(entry).toHaveClass(/is-target/)
})

test('the glossary page: every group, the documents list and official links that open in a new tab', async ({ page }) => {
  await page.goto('/glossaire')
  await expect(page.getByRole('heading', { level: 1, name: 'Glossaire' })).toBeVisible()
  for (const name of ['Ce que l’État vous verse', 'Vos comptes d’épargne', 'Le régime de votre employeur', 'Les mots d’Horizon', 'Où trouver vos documents', 'Aller plus loin']) {
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible()
  }
  await expect(page.getByRole('term').filter({ hasText: /^RRQ/ })).toHaveCount(1)
  const official = page.locator('a.info-note__link')
  expect(await official.count()).toBeGreaterThan(15)
  for (const a of await official.all()) {
    await expect(a).toHaveAttribute('target', '_blank')
    await expect(a).toHaveAttribute('href', /^https:\/\//)
  }
})

test('the glossary follows the language and the top-bar book leads to it', async ({ page }) => {
  await page.goto('/profil')
  await switchLanguage(page, 'en')
  await page.getByRole('link', { name: 'Glossary: abbreviations explained' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Glossary' })).toBeVisible()
  await expect(page.getByRole('term').filter({ hasText: /^QPP/ })).toHaveCount(1)
  await expect(page.getByRole('term').filter({ hasText: /^RRQ/ })).toHaveCount(0)
})

test('every section of the page is in its map — the colours first, as on the page', async ({ page }) => {
  await page.goto('/glossaire')
  const map = page.getByRole('navigation', { name: 'Aller à un groupe' })
  await expect(map.getByRole('button').first()).toHaveText('Les couleurs')
  await map.getByRole('button', { name: 'Les couleurs' }).click()
  await expect(page.locator('#glossaire-couleurs')).toBeInViewport()
})
