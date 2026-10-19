import { expect, test } from '@playwright/test'
import { blankSeed, savedProfile, seedProfile } from './seed'

// « REPARTIR À NEUF » on the settings page (lib/freshStart.ts): the device as a first visit finds it. Over a profile that looks like somebody's it asks
// first, in words that say what is lost; over a blank one it simply happens. Either way the front door comes back as a first visit finds it — the
// hero, nothing open over it — and the language alone is kept.

const hero = (page: import('@playwright/test').Page) => page.locator('.welcome__hero')

test('over a real profile it asks first; confirmed, it forgets everything on the device but the language and shows the first visit’s front door', async ({ page }) => {
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
  // the front door, as a first visit finds it
  await expect(page).toHaveURL(/\/$/)
  await expect(hero(page)).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // the device reads as new: no profile, no marks, no display choice — the language alone
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('horizon-')).sort())).toEqual(['horizon-lang'])
  await expect(html).not.toHaveAttribute('data-text-scale', /./)
  await expect(html).not.toHaveAttribute('data-contrast', /./)
  await expect(html).toHaveAttribute('lang', 'fr')
  // a blank household: the way in, no answer to see
  await expect(page.getByRole('button', { name: 'Commencer', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Voir ma réponse' })).toHaveCount(0)
  // and a reload finds the same new device
  await page.reload()
  await expect(hero(page)).toBeVisible()
  expect(await savedProfile(page)).toBeNull()
})

test('over a blank profile it does not ask: one tap, and the first visit’s front door is back', async ({ page }) => {
  await seedProfile(page, blankSeed())
  await page.goto('/donnees')
  await page.getByRole('button', { name: 'Repartir à neuf' }).click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(hero(page)).toBeVisible()
})

test('English: the section speaks English, and the language survives the fresh start', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await seedProfile(page)
  await page.goto('/donnees')
  await page.getByRole('button', { name: 'Start over' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('Without a saved copy')
  await dialog.getByRole('button', { name: 'Start over' }).click()
  await expect(hero(page)).toContainText('Everything stays on this device')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})
