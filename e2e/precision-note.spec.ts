import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// « À quel point est-ce précis ? » on the « Vérifier » view: what the calculation was checked against and what it simplifies. Always shown
// (nothing to open), and one chip away from the figures with their pages.

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
})

test('the check view opens on its accuracy note: what is checked, what is simplified, and the files that list everything', async ({ page }) => {
  await page.goto('/resultats?v=verify')
  const note = page.locator('#precision')
  await expect(note).toContainText('À quel point est-ce précis ?')
  await expect(note).toContainText('Ce qui est vérifié')
  await expect(note).toContainText('Ce qui est simplifié, et dit')
  await expect(note).toContainText('Aucune probabilité n’est annoncée')
  await expect(note).toContainText(/au plus 1\s\$ par mois/)
  await expect(note.getByRole('link', { name: /^SOURCES\.md/ })).toHaveAttribute('href', /github\.com\/majeanson\/horizon\/blob\/main\/SOURCES\.md$/)
  await expect(note.getByRole('link', { name: /^ENGINE\.md/ })).toHaveAttribute('href', /ENGINE\.md$/)
  // it comes first on the view, and the map of sections names it
  const nav = page.getByRole('navigation', { name: 'Sections des résultats' })
  await expect(nav.getByRole('button', { name: 'Précision' })).toBeVisible()
})

test('« Voir les pages officielles » goes to the figures with their pages', async ({ page }) => {
  await page.goto('/resultats?v=verify')
  await page.locator('#precision').getByRole('button', { name: /Voir les pages officielles/ }).click()
  await expect(page.locator('#parametres')).toBeInViewport()
})

test('in English the note and its links speak English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await page.goto('/resultats?v=verify')
  const note = page.locator('#precision')
  await expect(note).toContainText('How accurate is this?')
  await expect(note).toContainText('What is simplified, and said')
  await expect(note.getByRole('link', { name: /^SOURCES\.en\.md/ })).toHaveAttribute('href', /SOURCES\.en\.md$/)
})
