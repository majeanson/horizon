import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// THE GLOSSARY. A sigle in a hint is a link to its entry; following it lands on that entry, marked, and the page keeps working
// as a page of its own (the map, the documents, the official links).

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

test('a sigle in a hint opens its glossary entry, scrolled to and marked', async ({ page }) => {
  await page.goto('/')
  await page.locator('.page-head__title').waitFor()
  // The ⓘ notes are closed: take a hint that is on screen.
  const link = page.locator('main a.gloss:visible').first()
  await expect(link).toBeVisible()
  const href = await link.getAttribute('href')
  expect(href).toMatch(/^\/glossaire#terme-[a-z-]+$/)
  await link.click()
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
  await page.goto('/')
  await page.getByRole('button', { name: 'Passer à l’anglais' }).click()
  await page.getByRole('link', { name: 'Glossary: abbreviations explained' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Glossary' })).toBeVisible()
  await expect(page.getByRole('term').filter({ hasText: /^QPP/ })).toHaveCount(1)
  await expect(page.getByRole('term').filter({ hasText: /^RRQ/ })).toHaveCount(0)
})
