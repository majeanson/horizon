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
  await expect(page.locator('#prix').getByRole('textbox')).toHaveCount(2)
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
  await page.getByRole('tab', { name: 'Tout ouvrir' }).click()
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
  await expect(page.getByRole('tab', { name: 'Un bloc à la fois' })).toBeVisible()
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
  await expect(page.getByRole('tab', { name: 'Un bloc à la fois' })).toHaveCount(0)
  // « Suivant » at the foot of every block, walking the form
  await page.locator('#famille').getByRole('button', { name: 'Suivant' }).click()
  await expect(page.locator('#person-self')).toBeInViewport()
})

test('a finished block folds to its title and its count in the all-open shape, and a tap reopens it (the gallery’s specimen)', async ({ page }) => {
  await page.goto('/dev/kit')
  const kit = page.locator('.accordion__item')
  await expect(kit).toHaveCount(3)
  await page.getByRole('tab', { name: 'Tout ouvrir' }).click()
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
