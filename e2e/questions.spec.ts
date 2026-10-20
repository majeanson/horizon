import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'
import { exactBox } from './slider'

// The three questions, one page: the verdict answers « Quand prendre ma retraite ? », and « Combien épargner ? » and
// « Quand arrêter de travailler ? » are always-visible sections below it. An old `?q=` link scrolls to its section
// and the key is dropped from the address.

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
})

test('the three answers: the verdict and stopping on the first view, saving and spending under « Décider »', async ({ page }) => {
  await page.goto('/resultats')
  await expect(page.getByText('Vous pouvez prendre votre retraite à 60 ans, tous les deux.')).toBeVisible()
  await expect(page.locator('#epargner')).toHaveCount(0)
  await page.goto('/resultats?v=decide')
  // « Décider » shows the changes ranked, and each what-if as a closed fold until it is opened
  await expect(page.locator('#ajuster')).toBeVisible()
  await expect(page.locator('#epargner')).toHaveClass(/is-closed/)
  await page.locator('#epargner .accordion__toggle').click()
  await expect(page.locator('#epargner')).toContainText('Combien épargner ?')
  await page.locator('#depenser .accordion__toggle').click()
  await expect(page.locator('#depenser')).toHaveClass(/is-open/)
  await expect(page.locator('#epargner')).toHaveClass(/is-closed/)
  await page.goto('/resultats')
  await expect(page.locator('#arreter')).toContainText('En dates')
  await expect(page.getByText(/Camille\s: en 20\d\d/)).toBeVisible()
})

test('an old « ?q= » link lands on its section and the key leaves the address', async ({ page }) => {
  await page.goto('/resultats?q=stop')
  await expect(page).not.toHaveURL(/q=stop/)
  await expect(page.locator('#arreter')).toBeInViewport()
  await page.goto('/resultats?q=save&age=58')
  await expect(page).not.toHaveURL(/q=save/)
  await expect(page).toHaveURL(/age=58/)
  await expect(page.locator('#epargner')).toBeInViewport()
})

test('« Quand arrêter de travailler ? » gives each person a year, and says what the pensions cover', async ({ page }) => {
  await page.goto('/resultats')
  await expect(page.getByText(/Camille\s: en 20\d\d/)).toBeVisible()
  await expect(page.getByText(/Alex\s: en 20\d\d/)).toBeVisible()
  await expect(page.getByText(/vos rentes, après impôt, couvrent \d+\s*% de vos dépenses/)).toBeVisible()
})

test('« Combien épargner ? » says nothing more at an age that already works, an amount before it, and « ne tient pas » far too early', async ({ page }) => {
  await page.goto('/resultats?v=adjust&age=60')
  await expect(page.getByText('Rien de plus : à 60 ans, l’argent dure déjà.')).toBeVisible({ timeout: 30_000 })
  await page.goto('/resultats?v=adjust&age=58')
  await expect(page.getByText(/de plus par année/)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/Soit environ .* par mois/)).toBeVisible()
  // …and where it goes: the placement that needs the least of the three tried (engine/savingsNeeded.ts)
  await expect(page.getByText(/^Placé dans (votre REER|votre CELI|un compte non enregistré)/)).toBeVisible()
  await expect(page.getByText(/ont chacun été essayés/)).toBeVisible()
  await page.goto('/resultats?v=adjust&age=50')
  await expect(page.getByText('À 50 ans, l’argent ne dure pas.')).toBeVisible({ timeout: 30_000 })
})

test('typing an age in « Combien épargner ? » recomputes the answer and keeps it in the address', async ({ page }) => {
  await page.goto('/resultats?v=adjust&age=60')
  await expect(page.getByText('Rien de plus : à 60 ans, l’argent dure déjà.')).toBeVisible({ timeout: 30_000 })
  const box = await exactBox(page, 'Partir à (âge)')
  await box.fill('58')
  await box.press('Enter')
  await expect(page).toHaveURL(/age=58/)
  await expect(page.getByText(/de plus par année/)).toBeVisible({ timeout: 30_000 })
})

test('« Quand arrêter » says when no pension has begun yet, and what they cover once every one is in pay', async ({ page }) => {
  await page.goto('/resultats')
  // The golden couple's verdict (59) has the plan pension in pay the year after the last stop; every pension is in pay later.
  await expect(page.locator('#arreter')).toContainText(/vos rentes, après impôt, couvrent \d+\s*% de vos dépenses/)
  await expect(page.locator('#arreter')).toContainText(/Une fois toutes vos rentes commencées, en 20\d\d \(\d\d \/ \d\d ans\), elles couvrent \d+\s*% de vos dépenses, après impôt\./)
})

test('« Quand arrêter » draws the same story: a closed fold under the dates opens the pensions-and-spending chart, its two lines named', async ({ page }) => {
  await page.goto('/resultats')
  const stop = page.locator('#arreter')
  await expect(stop).toContainText('En dates', { timeout: 60_000 })
  // closed on arrival: the chart costs nothing until asked for
  await expect(stop.getByRole('img', { name: /Vos rentes après impôt et vos dépenses, chaque année de 20\d\d à 20\d\d/ })).toHaveCount(0)
  await stop.getByText('Rentes et dépenses, année par année').click()
  const chart = stop.getByRole('img', { name: /Vos rentes après impôt et vos dépenses, chaque année de 20\d\d à 20\d\d/ })
  await expect(chart).toBeVisible({ timeout: 30_000 })
  await expect(chart).toContainText('Rentes après impôt')
  await expect(chart).toContainText('Dépenses')
  await expect(chart.locator('svg .recharts-line').first()).toBeAttached()
})

test('« Et si je dépensais moins ? » recomputes the age for an amount from the address, compares it with the profile’s, and can keep it', async ({ page }) => {
  await page.goto('/resultats')
  // The door on the answer card leads to the section; at the profile's own amount the answer IS the one at the top, so the
  // section says so and invites the slide instead of printing the age again.
  await page.getByRole('button', { name: 'Et si je dépensais moins ?' }).first().click()
  await expect(page.locator('#depenser')).toBeInViewport()
  await expect(page.locator('#depenser')).toContainText('C’est le montant de vos hypothèses. Glissez pour voir l’âge à un autre montant.')
  await expect(page.locator('#depenser')).not.toContainText('dès 60 ans')
  // A lower amount from the address: an earlier age, said against the profile's own.
  await page.goto('/resultats?v=adjust&spend=70000')
  await expect(page.locator('#depenser')).toContainText('À 70 000 $ par année : dès 56 ans.', { timeout: 30_000 })
  await expect(page.locator('#depenser')).toContainText('4 ans plus tôt qu’avec les 90 000 $ de vos hypothèses.')
  // The slider's step button is one exact step, kept in the address.
  await page.getByRole('button', { name: 'Moins : Dépenses à la retraite' }).click()
  await expect(page).toHaveURL(/spend=69500/)
  // The address changes a beat before the page re-renders with the new amount; « Garder » keeps what the PAGE shows, so wait
  // for the page (the monthly figure is read straight from the amount) — a click in that gap would keep the old 70 000.
  await expect(page.locator('#depenser')).toContainText('Soit 5 792 $ par mois')
  // Keeping the amount writes it to the profile: the verdict follows, the address forgets the what-if.
  await page.getByRole('button', { name: 'Garder ce montant dans mes hypothèses' }).click()
  await expect(page).not.toHaveURL(/spend=/)
  await expect(page.locator('#depenser')).toContainText('Soit 5 792 $ par mois', { timeout: 30_000 })
  await expect(page.locator('#depenser')).toContainText('C’est le montant de vos hypothèses.', { timeout: 30_000 })
  // The kept amount IS the profile's now: the answer, one tab over, says so.
  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Résultats' }).click()
  await expect(page.getByText('Vous pouvez prendre votre retraite à 56 ans, tous les deux.')).toBeVisible({ timeout: 30_000 })
})
