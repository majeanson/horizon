import { expect, test } from '@playwright/test'
import { blankSeed, seedProfile } from './seed'
import { expectNoHorizontalOverflow } from './overflow'

// « Votre réponse » — the age in the top bar, on every page (components/BarAnswer.tsx): the same answer as Résultats, one glance away while the plan is
// edited. It took the room of the language and theme buttons (settings page now) and replaced the strip that was pinned under the bar on Profil and Hypothèses.

const bar = (page: Parameters<typeof seedProfile>[0]) => page.locator('.shell__bar').getByRole('status').filter({ hasText: 'Votre réponse' })

test.describe('the answer in the bar', () => {
  test('follows an edit: it shows the answer on arrival, then the age a typed figure moves it to; a tap opens Résultats', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/profil?form=1')
    await expect(bar(page)).toContainText('60 ans', { timeout: 30_000 })
    // (the link's name is the aria-label, « Votre réponse : 60 ans. Voir les résultats » — with the French no-break space before the colon)
    const link = bar(page).getByRole('link', { name: /Votre réponse : 60 ans/ })
    await expect(link).toHaveAttribute('href', '/resultats')

    const spend = page.getByRole('textbox', { name: 'Dépenses par année, une fois tout le monde à la retraite', exact: true })
    await spend.fill('140000')
    await spend.press('Enter')
    await expect(bar(page)).not.toContainText('60 ans', { timeout: 30_000 })
    await expect(bar(page)).toContainText(/\d+ ans|aucun âge/)
    // the bar has no language or theme button any more: the sheet, the glossary and the settings alone
    await expect(page.locator('.shell__actions').getByRole('link')).toHaveCount(3)
    await expect(page.locator('.shell__bar').getByRole('button')).toHaveCount(0)

    await bar(page).getByRole('link').click()
    await expect(page).toHaveURL(/\/resultats$/)
    await expect(bar(page).getByRole('link')).toHaveClass(/is-active/)
  })

  test('is on Hypothèses and on Résultats alike, and absent from a blank profile', async ({ page }) => {
    await seedProfile(page)
    await page.goto('/hypotheses')
    await expect(bar(page)).toContainText('ans', { timeout: 30_000 })
    await page.getByRole('link', { name: 'Résultats', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Résultats', level: 1 })).toBeVisible()
    await expect(bar(page)).toContainText('ans')
    // nothing of it is pinned INSIDE the page any more
    await expect(page.locator('main .live-answer')).toHaveCount(0)
  })

  test('says nothing while the profile has gaps', async ({ page }) => {
    await seedProfile(page, blankSeed())
    await page.goto('/profil?form=1')
    await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible()
    await page.waitForTimeout(1500)
    await expect(page.getByText('Votre réponse', { exact: true })).toHaveCount(0)
  })

  test('fits the bar on a small phone: the label goes, the age stays, nothing runs past the edge', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 })
    await seedProfile(page)
    await page.goto('/profil')
    await expect(bar(page)).toContainText('ans', { timeout: 30_000 })
    await expect(bar(page).locator('.shell__answer-label')).toBeHidden()
    await expectNoHorizontalOverflow(page)
    const pill = (await bar(page).getByRole('link').boundingBox())!
    const actions = (await page.locator('.shell__actions').boundingBox())!
    expect(pill.x + pill.width).toBeLessThanOrEqual(actions.x + 1)
    expect(pill.height).toBeGreaterThanOrEqual(44)
  })

  test('English', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
    await seedProfile(page)
    await page.goto('/profil')
    await expect(page.locator('.shell__bar').getByRole('status')).toContainText('Your answer', { timeout: 30_000 })
    await expect(page.locator('.shell__bar').getByRole('link', { name: /Your answer: age 60/ })).toBeVisible()
  })
})
