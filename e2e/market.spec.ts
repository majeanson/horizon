import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow } from './overflow'
import { EXAMPLE, savedProfile, seedProfile } from './seed'

// THE ASSUMPTIONS THAT SHAPE THE MONEY'S PATH (Hypothèses): where the surplus goes, and the path the markets take.

test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

test('the surplus option: off by default, one tap turns it on, and it is saved', async ({ page }) => {
  await page.goto('/hypotheses?bloc=tout')
  const chip = page.getByRole('switch', { name: 'Placer d’abord le surplus dans le REER' })
  await expect(chip).toHaveAttribute('aria-checked', 'false')
  await expect(page.getByText('L’argent qui reste à la fin d’une année de travail')).toBeVisible()
  await chip.click()
  await expect(chip).toHaveAttribute('aria-checked', 'true')
  await expect.poll(async () => (await savedProfile(page)).assumptions.surplusToRrsp).toBe(true)
  await chip.click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.surplusToRrsp).toBe(false)
})

test('turned on, the plan still answers (the results page runs the same engine)', async ({ page }) => {
  await page.goto('/hypotheses?bloc=tout')
  await page.getByRole('switch', { name: 'Placer d’abord le surplus dans le REER' }).click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.surplusToRrsp).toBe(true)
  await page.goto('/resultats')
  await expect(page.getByText(/Vous pouvez (prendre votre retraite|déjà prendre)/)).toBeVisible()
})

test('the market path: « Lisse » by default, a ready-made one is saved, « Personnalisé » opens its years for editing', async ({ page }) => {
  await page.goto('/hypotheses?bloc=tout')
  await expect(page.getByRole('tab', { name: 'Lisse' })).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('tab', { name: 'Mauvais départ' }).click()
  await expect(page.getByText('Une chute de 15 % la première année de retraite')).toBeVisible()
  await expect.poll(async () => (await savedProfile(page)).assumptions.marketPath.preset).toBe('badStart')
  await page.getByRole('tab', { name: 'Personnalisé' }).click()
  const first = page.getByRole('textbox', { name: 'Année 1 de retraite' })
  await expect(first).toBeVisible()
  await first.fill('-30')
  await first.blur()
  await expect.poll(async () => (await savedProfile(page)).assumptions.marketPath.custom[0]).toBeCloseTo(-0.3, 5)
  await page.getByRole('button', { name: 'Ajouter une année' }).click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.marketPath.custom.length).toBe(5)
})

test('with a bad start chosen, the results page still answers', async ({ page }) => {
  await page.goto('/hypotheses?bloc=tout')
  await page.getByRole('tab', { name: 'Mauvais départ' }).click()
  await expect.poll(async () => (await savedProfile(page)).assumptions.marketPath.preset).toBe('badStart')
  await page.goto('/resultats')
  await expect(page.getByText(/Vous pouvez (prendre votre retraite|déjà prendre)|ne tient pas|Aucun âge/)).toBeVisible()
})

test('« Vérifier » shows the earliest age under a hard market, beside « Lisse »', async ({ page }) => {
  await page.goto('/resultats?v=verify')
  await expect(page.getByText('Si les marchés tournent mal')).toBeVisible()
  const smooth = page.locator('.verdict__range-item', { hasText: 'Lisse' })
  const bad = page.locator('.verdict__range-item', { hasText: 'Mauvais départ' })
  await expect(smooth.locator('dd')).toHaveText(/\d+ ans|aucun/, { timeout: 60_000 })
  await expect(bad.locator('dd')).toHaveText(/\d+ ans|aucun/, { timeout: 60_000 })
  await expect(page.getByRole('link', { name: 'Choisir ou modifier le parcours' })).toBeVisible()
})

test('the verdict says what the age can fund each month, beside what is planned', async ({ page }) => {
  await page.goto('/resultats')
  await expect(page.getByText(/peut financer jusqu’à .* par mois \(après impôt\) — vous prévoyez/)).toBeVisible()
})

test('« Essayer » ranks what moves the answer most, each lever with its age', async ({ page }) => {
  await page.goto('/resultats?v=adjust')
  await expect(page.getByText('Ce qui change le plus')).toBeVisible()
  const items = page.locator('.levers__item')
  await expect(items).toHaveCount(4)
  await expect(items.locator('.mono', { hasText: '…' })).toHaveCount(0, { timeout: 60_000 })
  await expect(items.first()).toContainText(/plus tôt|même âge|plus tard|aucun âge|un âge existe/)
})

test('Hypothèses is one page — the scenario first, then what it sets — with a one-line map of its blocks, and the market path stays right under the returns it shapes', async ({ page }) => {
  await page.goto('/hypotheses?bloc=tout')
  const map = page.getByRole('navigation', { name: 'Sections des hypothèses' })
  await expect(map.locator('.rail').getByRole('button')).toHaveText(['Scénario', 'Prix', 'Placements', 'Marchés', 'Âge de fin', 'Dépenses', 'Options'])
  // every block is on the page, none behind a switch
  for (const title of ['Scénario', 'Hausse des prix et des salaires', 'Ce que rapportent vos placements', 'Le parcours des marchés', 'Jusqu’à quel âge planifier', 'Les dépenses à la retraite avec l’âge', 'Options']) {
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
  }
  const titles = await page.locator('.profile-section').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  expect(titles.indexOf('Le parcours des marchés')).toBe(titles.indexOf('Ce que rapportent vos placements') + 1)
  // a tap on a chip goes to its block, and the chip of the block reached is the marked one
  await map.getByRole('button', { name: 'Options' }).click()
  await expect(map.getByRole('button', { name: 'Options' })).toHaveAttribute('aria-current', 'true')
  await expect(page.locator('#options')).toBeInViewport()
})

test('on a phone the map of Hypothèses is one line that scrolls inside its own box, in both languages', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 })
  for (const lang of ['fr', 'en']) {
    await page.addInitScript((l) => localStorage.setItem('horizon-lang', l), lang)
    await page.goto('/hypotheses?bloc=tout')
    await expect(page.getByRole('navigation').first()).toBeVisible()
    await expectNoHorizontalOverflow(page, page.locator('.page-body'))
  }
})
