import { expect, test } from '@playwright/test'
import { blankSeed, savedProfile, seedProfile } from './seed'

// « REPARTIR À NEUF » on the settings page (lib/freshStart.ts): the device as a first visit finds it. Over a profile that looks like somebody's it asks
// first, in words that say what is lost; over a blank one it simply happens. Either way the front door comes back with its two one-time questions —
// the reading dialog, then « Combien de temps avez-vous ? » — and the language alone is kept.

const READING = 'Lire plus confortablement ?'
const TIME = 'Combien de temps avez-vous ?'

test('over a real profile it asks first; confirmed, it forgets everything on the device but the language and reopens the two first-visit questions', async ({ page }) => {
  await seedProfile(page)
  await page.addInitScript(() => {
    localStorage.setItem('horizon-text-scale', 'x-large')
    localStorage.setItem('horizon-contrast', 'high')
    localStorage.setItem('horizon-situation', JSON.stringify(['kids']))
    localStorage.setItem('horizon-lang', 'fr')
  })
  await page.goto('/donnees')
  const html = page.locator('html')
  await expect(html).toHaveAttribute('data-text-scale', 'x-large')
  const restart = page.getByRole('button', { name: 'Repartir à neuf' })
  await restart.click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('comme à une première visite')
  await expect(dialog).toContainText('Sans copie sauvegardée')
  // Cancel: nothing moved
  await dialog.getByRole('button', { name: 'Annuler' }).click()
  await expect(page).toHaveURL(/\/donnees$/)
  expect(await savedProfile(page)).not.toBeNull()
  await expect(html).toHaveAttribute('data-text-scale', 'x-large')

  await restart.click()
  await dialog.getByRole('button', { name: 'Repartir à neuf' }).click()
  // the front door, with its first question
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('dialog', { name: READING })).toBeVisible()
  // the device reads as new: no profile, no marks, no display choice — the language alone
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('horizon-')).sort())).toEqual(['horizon-lang'])
  await expect(html).not.toHaveAttribute('data-text-scale', /./)
  await expect(html).not.toHaveAttribute('data-contrast', /./)
  await expect(html).toHaveAttribute('lang', 'fr')
  await page.getByRole('button', { name: 'C’est bien comme ça' }).click()
  await expect(page.getByRole('dialog', { name: TIME })).toBeVisible()
  await page.getByRole('button', { name: 'Plus tard' }).click()
  // a blank household: the three doors, no answer to see
  await expect(page.locator('.welcome__door')).toHaveCount(3)
  await expect(page.getByRole('link', { name: 'Voir ma réponse' })).toHaveCount(0)
  // and a reload finds the same new device
  await page.reload()
  await expect(page.getByRole('dialog')).toHaveCount(0) // the questions were answered again just now
  expect(await savedProfile(page)).toBeNull()
})

test('over a blank profile it does not ask: one tap, and the front door asks its first question again', async ({ page }) => {
  await seedProfile(page, blankSeed())
  await page.goto('/donnees')
  await page.getByRole('button', { name: 'Repartir à neuf' }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: READING })).toBeVisible()
})

test('English: the section speaks English, and the language survives the fresh start', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await seedProfile(page)
  await page.goto('/donnees')
  await page.getByRole('button', { name: 'Start over' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('Without a saved copy')
  await dialog.getByRole('button', { name: 'Start over' }).click()
  await expect(page.getByRole('dialog', { name: 'Easier to read?' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})
