import { expect, test } from '@playwright/test'
import { seedProfile } from './seed'

// « Copier le résumé » — the answer as plain text on the clipboard, for a message or an email. Read from the card as it is on screen.

test('copies the answer, its dates and its assumptions as plain text', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await seedProfile(page)
  await page.goto('/resultats')
  await expect(page.getByText(/Vous pouvez prendre votre retraite/)).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: 'Copier le résumé' }).click()
  await expect(page.getByText('Résumé copié.')).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('Horizon — mon plan de retraite')
  expect(text).toMatch(/Vous pouvez prendre votre retraite à.*59 ans/s)
  expect(text).toContain('- Camille : en 2037 (59 ans)')
  expect(text).toMatch(/Inflation 2,1\s%/)
  expect(text).toContain('pas un conseil financier')
  // A caveat the card already carries is not said twice, and no button label leaks in.
  expect(text).not.toContain('Et si je dépensais moins')
})

test('is not offered on the other views', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/resultats?v=strategies')
  await expect(page.getByRole('heading', { name: 'Résultats', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copier le résumé' })).toHaveCount(0)
})
