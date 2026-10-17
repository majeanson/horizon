import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// THE ACCORDION (components/Accordion.tsx): a long page read one block at a time. Hypothèses and Preuve at every width, Décider's strategies, and Profil on a phone (a wide
// screen keeps the whole form, with the finished blocks folded). The open block is in the address (`?bloc=`, `?strat=`), « Suivant » walks to the next, a map chip opens the
// block it names, « Tout ouvrir » gives every block back, and a closed block mounts nothing.

test('Hypothèses: the scenario is open and the six others are closed titles; « Suivant », the map and « Tout ouvrir » open blocks, and the address follows', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.goto('/hypotheses')
  const blocks = page.locator('.accordion__item')
  await expect(blocks).toHaveCount(7)
  await expect(page.locator('.accordion__item.is-open')).toHaveCount(1)
  await expect(page.locator('#scenario')).toHaveClass(/is-open/)
  // a closed block holds no field
  await expect(page.locator('#prix')).toHaveClass(/is-closed/)
  await expect(page.locator('#prix').getByRole('textbox')).toHaveCount(0)
  await expect(page.locator('#prix').getByRole('button', { expanded: false })).toHaveCount(1)
  // « Suivant » at the foot of the open block opens the next one, and only it
  await page.locator('#scenario').getByRole('button', { name: 'Suivant' }).click()
  await expect(page).toHaveURL(/bloc=prix/)
  await expect(page.locator('#prix')).toHaveClass(/is-open/)
  await expect(page.locator('#scenario')).toHaveClass(/is-closed/)
  await expect(page.locator('#prix').getByRole('slider')).toHaveCount(2)
  // « Précédent » goes back
  await page.locator('#prix').getByRole('button', { name: 'Précédent' }).click()
  await expect(page.locator('#scenario')).toHaveClass(/is-open/)
  // a chip of the map opens the block it names
  await page.getByRole('navigation', { name: 'Sections des hypothèses' }).getByRole('button', { name: 'Marchés' }).click()
  await expect(page).toHaveURL(/bloc=marches/)
  await expect(page.locator('#marches')).toHaveClass(/is-open/)
  // the title closes its own block: nothing open, and the address says so
  await page.locator('#marches').getByRole('button', { expanded: true }).click()
  await expect(page).toHaveURL(/bloc=none/)
  await expect(page.locator('.accordion__item.is-open')).toHaveCount(0)
  // « Tout ouvrir »: every block, the switch remembered in the address, no « Suivant » needed but still there
  await page.getByRole('button', { name: 'Tout ouvrir' }).click()
  await expect(page).toHaveURL(/bloc=tout/)
  await expect(page.locator('.accordion__item.is-open')).toHaveCount(7)
  await page.reload()
  await expect(page.locator('.accordion__item.is-open')).toHaveCount(7)
})

test('Profil on a phone: one block at a time, the map opens a person, a link to a figure opens its block; a wide screen keeps the whole form and offers no switch', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedProfile(page, EXAMPLE)
  await page.goto('/profil')
  await expect(page.locator('#famille')).toHaveClass(/is-open/)
  await expect(page.locator('#person-self')).toHaveClass(/is-closed/)
  await expect(page.locator('#person-self').getByRole('textbox')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Tout ouvrir' })).toBeVisible()
  await page.getByRole('navigation', { name: 'Sections du profil' }).getByRole('button', { name: /^Camille/ }).click()
  await expect(page).toHaveURL(/bloc=person-self/)
  await expect(page.locator('#person-self')).toHaveClass(/is-open/)
  await expect(page.locator('#famille')).toHaveClass(/is-closed/)
  await expect(page.locator('#person-self').getByRole('textbox', { name: 'Revenu de travail par année' })).toBeVisible()
  // a link from the results page to one figure of the OTHER person opens that block and lands on the field
  await page.goto('/profil?form=1&fact=spouse:salary')
  await expect(page.locator('#person-spouse')).toHaveClass(/is-open/)
  await expect(page.locator('#person-spouse').getByRole('textbox', { name: 'Revenu de travail par année' })).toBeInViewport({ timeout: 15_000 })
  await expect(page).not.toHaveURL(/fact=/)

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/profil')
  await expect(page.locator('.accordion__item.is-closed')).toHaveCount(0)
  await expect(page.locator('.accordion__item.is-open').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^(Tout ouvrir|Tout fermer)$/ })).toHaveCount(0)
  // « Suivant » at the foot of every block, walking the form
  await page.locator('#famille').getByRole('button', { name: 'Suivant' }).click()
  await expect(page.locator('#person-self')).toBeInViewport()
})

test('a finished block folds to its title and its count in the all-open shape, and a tap reopens it (the gallery’s specimen)', async ({ page }) => {
  await page.goto('/dev/kit')
  const kit = page.locator('.accordion__item')
  await expect(kit).toHaveCount(3)
  await page.getByRole('button', { name: 'Tout ouvrir' }).click()
  await expect(page.locator('#un')).toHaveClass(/is-open/)
  await expect(page.locator('#deux')).toHaveClass(/is-open/)
  await expect(page.locator('#trois')).toHaveClass(/is-closed/)
  await expect(page.locator('#trois')).toContainText('4 chiffres confirmés')
  await page.locator('#trois').getByRole('button', { expanded: false }).click()
  await expect(page.locator('#trois')).toHaveClass(/is-open/)
  await expect(page.locator('#trois')).not.toContainText('4 chiffres confirmés')
})

test('Décider: the first strategy is open and the rest are closed; a door from the answer opens the one it names; Preuve likewise from its address', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats?v=decide')
  await expect(page.locator('#rentes')).toHaveClass(/is-open/)
  await expect(page.locator('#ordre')).toHaveClass(/is-closed/)
  await expect(page.locator('#ordre table')).toHaveCount(0)
  await page.goto('/resultats')
  await page.locator('#annee').getByRole('button', { name: 'Dans quel ordre puiser ?' }).click()
  await expect(page).toHaveURL(/strat=ordre/)
  await expect(page.locator('#ordre')).toHaveClass(/is-open/)
  await expect(page.locator('#rentes')).toHaveClass(/is-closed/)
  await expect(page.locator('#ordre table')).toBeVisible({ timeout: 90_000 })

  await page.goto('/resultats?v=proof')
  await expect(page.locator('#solidite')).toHaveClass(/is-open/)
  await expect(page.locator('#tableau')).toHaveClass(/is-closed/)
  await page.goto('/resultats?v=proof&bloc=tableau')
  await expect(page.locator('#tableau')).toHaveClass(/is-open/)
  await expect(page.locator('#solidite')).toHaveClass(/is-closed/)
  await expect(page.locator('#tableau table').first()).toBeVisible({ timeout: 60_000 })
})

// ONE control for « all open / one at a time »: a small round icon at the END of the map row, the same on Hypothèses, Preuve and Profil (phone) — not a full-width switch of its own.
for (const [name, path, map, size] of [
  ['Hypothèses', '/hypotheses', 'Sections des hypothèses', { width: 390, height: 844 }],
  ['Preuve', '/resultats?v=proof', 'Sections des résultats', { width: 390, height: 844 }],
  ['Profil (phone)', '/profil', 'Sections du profil', { width: 390, height: 844 }],
  ['Hypothèses (desktop)', '/hypotheses', 'Sections des hypothèses', { width: 1280, height: 900 }],
] as const) {
  test(`${name}: « Tout ouvrir » is an icon at the end of the map row, and « Tout fermer » closes every card`, async ({ page }) => {
    await page.setViewportSize(size)
    await seedProfile(page, EXAMPLE)
    await page.goto(path)
    const nav = page.getByRole('navigation', { name: map })
    const all = nav.getByRole('button', { name: 'Tout ouvrir' })
    await expect(all).toBeVisible({ timeout: 30_000 })
    // it is the LAST thing in the row and a round icon, not a tab: no visible text
    await expect(all).toHaveText('')
    const box = (await all.boundingBox())!
    const rail = (await nav.locator('.rail').boundingBox())!
    expect(box.x, 'after the chips').toBeGreaterThanOrEqual(rail.x + rail.width - 1)
    expect(box.width).toBeLessThanOrEqual(48)
    await all.click()
    await expect(page).toHaveURL(/bloc=tout/)
    await expect(nav.getByRole('button', { name: 'Tout fermer' })).toBeVisible()
    await nav.getByRole('button', { name: 'Tout fermer' }).click()
    await expect(page).not.toHaveURL(/bloc=tout/)
    await expect(page.locator('.accordion__item.is-open')).toHaveCount(0) // « Tout fermer » closes every card, the first included
  })
}

// RÉPONSE AND DÉCIDER FOLD THE SAME WAY. Réponse's two cards are open until closed (`?cartes=`); Décider's what-ifs and strategies open together under the same icon (`?essai=all` + `?tout=1`). The glance under the answer's sentence sits on the page.
test('Réponse: two cards, open by default; « Tout fermer » closes them, a map chip opens one, « Tout ouvrir » gives them back; the glance shows three tiles', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats')
  const nav = page.getByRole('navigation', { name: 'Sections des résultats' })
  await expect(page.locator('.glance .glance__tile')).toHaveCount(3, { timeout: 60_000 })
  await expect(page.locator('.glance').getByText('Marge par mois')).toBeVisible()
  await expect(page.locator('#comparer')).toHaveClass(/is-open/)
  await expect(page.locator('#annee')).toHaveClass(/is-open/, { timeout: 30_000 })
  await nav.getByRole('button', { name: 'Tout fermer' }).click()
  await expect(page).toHaveURL(/cartes=none/)
  await expect(page.locator('.results-page .accordion__item.is-open')).toHaveCount(0)
  // a closed card says in one line what it holds, and mounts nothing
  await expect(page.locator('#comparer .accordion__summary')).toBeVisible()
  await expect(page.locator('#comparer .scenarios')).toHaveCount(0)
  await nav.getByRole('button', { name: 'Comparer' }).click()
  await expect(page).toHaveURL(/cartes=comparer/)
  await expect(page.locator('#comparer')).toHaveClass(/is-open/)
  await expect(page.locator('#annee')).toHaveClass(/is-closed/)
  await nav.getByRole('button', { name: 'Tout ouvrir' }).click()
  await expect(page).not.toHaveURL(/cartes=/)
  await expect(page.locator('#annee')).toHaveClass(/is-open/)
})

test('Décider: « Tout ouvrir » opens the four what-ifs and every strategy; closing one what-if leaves the rest open', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await seedProfile(page, EXAMPLE)
  await page.goto('/resultats?v=decide')
  const nav = page.getByRole('navigation', { name: 'Sections des résultats' })
  await expect(page.locator('.try-fold')).toHaveCount(4, { timeout: 60_000 })
  await expect(page.locator('.try-fold.is-open')).toHaveCount(0)
  await nav.getByRole('button', { name: 'Tout ouvrir' }).click()
  await expect(page).toHaveURL(/essai=all/)
  await expect(page.locator('.try-fold.is-open')).toHaveCount(4)
  await page.locator('#depenser').getByRole('button', { expanded: true }).first().click()
  await expect(page.locator('#depenser')).toHaveClass(/is-closed/)
  await expect(page.locator('.try-fold.is-open')).toHaveCount(3)
})
