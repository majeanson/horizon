import { expect, test } from '@playwright/test'
import { EXAMPLE, blankSeed, seedProfile } from './seed'

// « COMMENT S'Y RETROUVER » — the guide to the whole app lives on the home page (it was a chip under the answer, about that one page): each place and what it is for, in a few lines,
// with a link where the place is a page of its own.

// the guide is its own closed fold at the foot of the home page, beside « how it works » — never a fold inside a fold

for (const [who, seed] of [['a first visit', blankSeed()], ['a returning visit', EXAMPLE]] as const) {
  test(`the home page says what each place is for — ${who}`, async ({ page }) => {
    await seedProfile(page, seed)
    await page.goto('/')
    const guide = page.locator('section[aria-labelledby="welcome-guide"]')
    // the guide is a fold: closed it is one line, open it is the map of the app
    await expect(guide.locator('dt').first()).toBeHidden()
    await guide.locator('summary').click()
    await expect(guide.locator('summary')).toContainText('Comment s’y retrouver')
    const terms = guide.locator('dt')
    await expect(terms).toHaveText(['Profil', 'Hypothèses', 'Résultats', 'Décider', 'Votre réponse', 'Ma fiche', 'En haut'])
    await expect(guide.locator('dd')).toHaveCount(7)
    // the places that are pages lead there
    for (const [name, href] of [['Profil', '/profil'], ['Hypothèses', '/hypotheses'], ['Résultats', '/resultats'], ['Décider', '/decider'], ['Ma fiche', '/fiche']] as const) {
      await expect(guide.getByRole('link', { name, exact: true })).toHaveAttribute('href', href)
    }
    // …and the two that are not pages are not links
    await expect(guide.getByRole('link', { name: 'Votre réponse' })).toHaveCount(0)
    await expect(guide.getByRole('link', { name: 'En haut' })).toHaveCount(0)
  })
}

test('a link of the guide opens the view it names', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/')
  await page.locator('section[aria-labelledby="welcome-guide"] summary').click()
  await page.locator('section[aria-labelledby="welcome-guide"]').getByRole('link', { name: 'Décider', exact: true }).click()
  await expect(page).toHaveURL(/\/decider$/)
  await expect(page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Décider' })).toHaveAttribute('aria-current', 'page')
})

test('English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await seedProfile(page, EXAMPLE)
  await page.goto('/')
  await expect(page.locator('section[aria-labelledby="welcome-guide"] summary')).toContainText('Finding your way')
  await page.locator('section[aria-labelledby="welcome-guide"] summary').click()
  await expect(page.locator('section[aria-labelledby="welcome-guide"] dt')).toHaveText(['Profile', 'Assumptions', 'Results', 'Decide', 'Your answer', 'My sheet', 'At the top'])
})
