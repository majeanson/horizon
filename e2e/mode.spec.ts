import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// Simple ↔ Full. The mode is a choice about THIS device (localStorage `horizon-mode`), never part of the profile.
// A device with nothing stored starts Simple; one that already holds a profile starts Full; Simple folds the optional and
// expert groups behind « Voir les détails » and loses nothing.

const modeChip = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Complet', exact: true })
const useSimple = (page: import('@playwright/test').Page) => page.addInitScript(() => {
    // Only on the first load of the tab: a reload must keep what the switch chose.
    if (!sessionStorage.getItem('mode-seeded')) {
      sessionStorage.setItem('mode-seeded', '1')
      localStorage.setItem('horizon-mode', 'simple')
    }
  })

test('a brand-new device starts Simple, and remembers it', async ({ page }) => {
  await page.goto('/')
  await expect(modeChip(page)).toHaveAttribute('aria-pressed', 'false')
  expect(await page.evaluate(() => localStorage.getItem('horizon-mode'))).toBe('simple')
  await page.reload()
  await expect(modeChip(page)).toHaveAttribute('aria-pressed', 'false')
})

test('a device that already holds a profile starts Full', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/')
  await expect(modeChip(page)).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => localStorage.getItem('horizon-mode'))).toBe('full')
})

test('Simple results keep the verdict and the chart, and fold the rest behind one « Voir les détails »', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await useSimple(page)
  await page.goto('/resultats')
  await expect(page.getByText(/Vous pouvez prendre votre retraite/)).toBeVisible()
  await expect(page.getByText('Chacun de son côté')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Détail année par année/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Paramètres utilisés/ })).toHaveCount(0)

  await page.getByRole('button', { name: 'Voir les détails' }).click()
  await expect(page.getByText('Chacun de son côté')).toBeVisible()
  await expect(page.getByRole('button', { name: /Détail année par année/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Paramètres utilisés/ })).toBeVisible()
})

test('the switch turns Full on, shows everything in place, and survives a reload', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await useSimple(page)
  await page.goto('/resultats')
  await expect(modeChip(page)).toHaveAttribute('aria-pressed', 'false')
  await modeChip(page).click()
  await expect(modeChip(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Chacun de son côté')).toBeVisible()
  await expect(page.getByRole('button', { name: /Détail année par année/ })).toBeVisible()
  await page.reload()
  await expect(modeChip(page)).toHaveAttribute('aria-pressed', 'true')
})

test('Simple profile folds the statement check; Full keeps it in place', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await useSimple(page)
  await page.goto('/')
  const statement = page.getByLabel('Montant projeté du relevé, rente à 65 ans (par mois)').first()
  await expect(statement).toHaveCount(0)
  await page.getByRole('button', { name: 'Voir les détails' }).first().click()
  await expect(statement).toBeVisible()
})

test('Simple assumptions show the scenarios and what they assume, not the individual knobs', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await useSimple(page)
  await page.goto('/hypotheses')
  await expect(page.getByRole('tab', { name: 'Prudent' })).toBeVisible()
  await expect(page.getByText('Ce que ce scénario suppose')).toBeVisible()
  await expect(page.getByLabel('Inflation annuelle')).toHaveCount(0)
  await page.getByRole('button', { name: 'Voir les détails' }).click()
  await expect(page.getByLabel('Inflation annuelle').first()).toBeVisible()
})

test('the results lead with a plain sentence, and every page ends with its one next step', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats')
  await expect(page.getByText('Vous pouvez prendre votre retraite à 60 ans, tous les deux.')).toBeVisible()
  await expect(page.getByText('À 59 ans, l’argent viendrait à manquer dès')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Garder une copie de mon profil' })).toBeVisible()

  await page.goto('/')
  await page.getByRole('link', { name: 'Suivant : mes hypothèses' }).click()
  await expect(page).toHaveURL(/\/hypotheses$/)
  await page.getByRole('link', { name: 'Voir mes résultats' }).click()
  await expect(page).toHaveURL(/\/resultats$/)
})

test('with nothing entered, the next step says what is missing and sends you back to the profile', async ({ page }) => {
  await page.goto('/hypotheses')
  await expect(page.getByText(/Il manque des chiffres pour un résultat fiable/)).toBeVisible()
  await page.getByRole('link', { name: 'Compléter mon profil' }).click()
  await expect(page).toHaveURL(/\/$/)
})
