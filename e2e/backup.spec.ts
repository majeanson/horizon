import { expect, test } from '@playwright/test'
import { seedProfile } from './seed'

// The backup nudge speaks up after an HOUR of typing that no copy has left the device, and Profil always says when the last copy was made.

test.describe('the notice', () => {
  test('an hour of unsaved typing raises it on any page but the settings; one tap makes the copy and puts it away', async ({ page }) => {
    await seedProfile(page)
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('backup-seeded')) {
        sessionStorage.setItem('backup-seeded', '1')
        localStorage.setItem('horizon-unbacked-since', String(Date.now() - 2 * 3600 * 1000))
      }
    })
    await page.goto('/hypotheses')
    await expect(page.getByText(/depuis plus d’une heure sans en garder de copie/)).toBeVisible()
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Sauvegarder une copie' }).click()
    expect((await download).suggestedFilename()).toMatch(/^horizon-\d{4}-\d{2}-\d{2}\.json$/)
    await expect(page.getByText(/depuis plus d’une heure/)).toHaveCount(0)
  })

  test('twenty minutes is not enough to nag', async ({ page }) => {
    await seedProfile(page)
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('backup-seeded')) {
        sessionStorage.setItem('backup-seeded', '1')
        localStorage.setItem('horizon-unbacked-since', String(Date.now() - 20 * 60 * 1000))
      }
    })
    await page.goto('/hypotheses')
    await expect(page.getByRole('heading', { name: 'Hypothèses', level: 1 })).toBeVisible()
    await expect(page.getByText(/depuis plus d’une heure/)).toHaveCount(0)
  })
})

test('Profil says when the last copy was made — « jamais » first, today after one tap', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/?form=1')
  await expect(page.getByText(/Dernière copie de sauvegarde\s: jamais/)).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Sauvegarder maintenant' }).click()
  await download
  await expect(page.getByText(/Dernière copie de sauvegarde\s: \d{1,2}(er)? \S+ \d{4}\./)).toBeVisible()
})
