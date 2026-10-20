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
  // a block is open, so the icon offers to close: « Tout fermer »
  await expect(page.getByRole('button', { name: 'Tout fermer' })).toBeVisible()
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
  // every block open but « Ma situation », answered once and closed to its answers until tapped
  await expect(page.locator('.accordion__item.is-closed')).toHaveCount(1)
  await expect(page.locator('#situation')).toHaveClass(/is-closed/)
  await expect(page.locator('.accordion__item.is-open').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /^(Tout ouvrir|Tout fermer)$/ })).toHaveCount(0)
  // « Suivant » at the foot of every block, walking the form: the household, what applies to it, then the people
  await page.locator('#famille').getByRole('button', { name: 'Suivant' }).click()
  await expect(page.locator('#situation')).toHaveClass(/is-open/)
  await expect(page.locator('#situation')).toBeInViewport()
  await page.locator('#situation').getByRole('button', { name: 'Suivant' }).click()
  await expect(page.locator('#person-self')).toBeInViewport()
})

test('a finished block folds to its title and its count in the all-open shape, and a tap reopens it (the gallery’s specimen)', async ({ page }) => {
  await page.goto('/dev/kit')
  const kit = page.locator('.accordion__item')
  await expect(kit).toHaveCount(3)
  // the specimen opens on its first block: the icon closes first, then opens every block
  await page.getByRole('button', { name: 'Tout fermer' }).click()
  await expect(page.locator('#un')).toHaveClass(/is-closed/)
  await page.getByRole('button', { name: 'Tout ouvrir' }).click()
  await expect(page.locator('#un')).toHaveClass(/is-open/)
  await expect(page.locator('#deux')).toHaveClass(/is-open/)
  await expect(page.locator('#trois')).toHaveClass(/is-closed/)
  await expect(page.locator('#trois')).toContainText('4 chiffres confirmés')
  await page.locator('#trois').getByRole('button', { expanded: false }).click()
  await expect(page.locator('#trois')).toHaveClass(/is-open/)
  await expect(page.locator('#trois')).not.toContainText('4 chiffres confirmés')
})

test('Décider: the first strategy is open and the rest are closed; a door from the answer opens the one it names; the proof likewise from its address', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await seedProfile(page, EXAMPLE)
  await page.goto('/decider')
  await expect(page.locator('#rentes')).toHaveClass(/is-open/)
  await expect(page.locator('#ordre')).toHaveClass(/is-closed/)
  await expect(page.locator('#ordre table')).toHaveCount(0)
  await page.goto('/resultats')
  await page.locator('#annee').getByRole('button', { name: 'Dans quel ordre puiser ?' }).click()
  await expect(page).toHaveURL(/\/decider\?.*strat=ordre/)
  await expect(page.locator('#ordre')).toHaveClass(/is-open/)
  await expect(page.locator('#rentes')).toHaveClass(/is-closed/)
  await expect(page.locator('#ordre table')).toBeVisible({ timeout: 90_000 })

  // the proof's blocks are closed when Résultats opens; an address opens the one it names
  await page.goto('/resultats')
  await expect(page.locator('#solidite')).toHaveClass(/is-closed/)
  await expect(page.locator('#tableau')).toHaveClass(/is-closed/)
  await page.goto('/resultats?bloc=tableau')
  await expect(page.locator('#tableau')).toHaveClass(/is-open/)
  await expect(page.locator('#solidite')).toHaveClass(/is-closed/)
  await expect(page.locator('#tableau table').first()).toBeVisible({ timeout: 60_000 })
})

// ONE control for « all open / one at a time »: a small round icon at the END of the map row, the same on Hypothèses, Preuve and Profil (phone) — not a full-width switch of its own.
for (const [name, path, map, size, openFirst, allKey] of [
  ['Hypothèses', '/hypotheses', 'Sections des hypothèses', { width: 390, height: 844 }, 1, /bloc=tout/],
  // Résultats: the answer's two cards are open on arrival, the proof's blocks closed; the one icon answers for both
  ['Résultats', '/resultats', 'Sections des résultats', { width: 390, height: 844 }, 3, /bloc=tout/],
  ['Profil (phone)', '/profil', 'Sections du profil', { width: 390, height: 844 }, 1, /bloc=tout/],
  ['Hypothèses (desktop)', '/hypotheses', 'Sections des hypothèses', { width: 1280, height: 900 }, 1, /bloc=tout/],
] as const) {
  test(`${name}: the icon at the end of the map row closes every card while ANY is open — the first included — and opens every card once all are closed`, async ({ page }) => {
    await page.setViewportSize(size)
    await seedProfile(page, EXAMPLE)
    await page.goto(path)
    const nav = page.getByRole('navigation', { name: map })
    const icon = nav.locator('.accordion__all')
    await expect(icon).toBeVisible({ timeout: 30_000 })
    // it is the LAST thing in the row and a round icon, not a tab: no visible text
    await expect(icon).toHaveText('')
    const box = (await icon.boundingBox())!
    const rail = (await nav.locator('.rail').boundingBox())!
    expect(box.x, 'after the chips').toBeGreaterThanOrEqual(rail.x + rail.width - 1)
    expect(box.width).toBeLessThanOrEqual(48)
    // the page opens on its default card(s): the icon offers to close, and a tap closes them — not the rest opened
    await expect(page.locator('.accordion__item.is-open')).toHaveCount(openFirst, { timeout: 60_000 })
    await expect(icon).toHaveAccessibleName('Tout fermer')
    await icon.click()
    await expect(page.locator('.accordion__item.is-open')).toHaveCount(0)
    // all closed: now it opens every card
    await expect(icon).toHaveAccessibleName('Tout ouvrir')
    await icon.click()
    await expect(page).toHaveURL(allKey)
    await expect(icon).toHaveAccessibleName('Tout fermer')
    await icon.click()
    await expect(page).not.toHaveURL(allKey)
    await expect(page.locator('.accordion__item.is-open')).toHaveCount(0)
  })
}

// RÉPONSE AND DÉCIDER FOLD THE SAME WAY. Réponse's three cards — the answer itself among them (Marc, 2026-10-20) — are open until closed (`?cartes=`); Décider's what-ifs and strategies open together under the same icon (`?essai=all` + `?tout=1`). The glance under the answer's sentence sits on the page.
test('Réponse: three cards, the answer first, open by default; « Tout fermer » closes them — the answer to its glance in one line —, a map chip opens one, « Tout ouvrir » gives them back; the glance shows three tiles', async ({ page }) => {
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
  // the answer, closed, still says the result and the quick figures — the glance in one line — and nothing else of it is mounted
  await expect(page.locator('#verdict .accordion__summary')).toHaveText(/^Départ\s: \d+ ans · l’argent dure jusqu’à \d+ ans · marge de [+−][\d\s ]+\s\$ par mois$/)
  await expect(page.locator('#verdict .verdict__line')).toHaveCount(0)
  // a closed card says in one line what it holds, and mounts nothing
  await expect(page.locator('#comparer .accordion__summary')).toBeVisible()
  await expect(page.locator('#comparer .scenarios')).toHaveCount(0)
  await nav.getByRole('button', { name: 'Comparer' }).click()
  await expect(page).toHaveURL(/cartes=comparer/)
  await expect(page.locator('#comparer')).toHaveClass(/is-open/)
  await expect(page.locator('#annee')).toHaveClass(/is-closed/)
  await expect(page.locator('#verdict')).toHaveClass(/is-closed/)
  // one card open: the icon closes it; all closed, it gives every card back
  await nav.getByRole('button', { name: 'Tout fermer' }).click()
  await expect(page).toHaveURL(/cartes=none/)
  await nav.getByRole('button', { name: 'Tout ouvrir' }).click()
  await expect(page).not.toHaveURL(/cartes=/)
  await expect(page.locator('#annee')).toHaveClass(/is-open/)
})

test('Décider: « Tout ouvrir » opens the four what-ifs and every strategy; closing one what-if leaves the rest open', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await seedProfile(page, EXAMPLE)
  await page.goto('/decider')
  const nav = page.getByRole('navigation', { name: 'Sections des résultats' })
  await expect(page.locator('.try-fold')).toHaveCount(4, { timeout: 60_000 })
  await expect(page.locator('.try-fold.is-open')).toHaveCount(0)
  // the first strategy is open, so the icon first closes it; then it opens everything
  await nav.getByRole('button', { name: 'Tout fermer' }).click()
  await nav.getByRole('button', { name: 'Tout ouvrir' }).click()
  await expect(page).toHaveURL(/essai=all/)
  await expect(page.locator('.try-fold.is-open')).toHaveCount(4)
  await page.locator('#depenser').getByRole('button', { expanded: true }).first().click()
  await expect(page.locator('#depenser')).toHaveClass(/is-closed/)
  await expect(page.locator('.try-fold.is-open')).toHaveCount(3)
})

// NO BARE TITLE: a closed block always says, in one line, what it holds (its verdict when the page has one, its count when it is done) — on every page that reads
// one block at a time, a phone's Profil included. Measured with the example household, every block closed but the default one.
for (const [where, path, width] of [
  ['Hypothèses', '/hypotheses', 1280],
  ['Décider', '/decider', 1280],
  ['Preuve', '/resultats?v=proof', 1280],
  ['Réponse', '/resultats?v=answer&cartes=none', 1280],
  ['Profil on a phone', '/profil?form=1', 390],
] as const) {
  test(`${where}: every closed block says what it holds`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await seedProfile(page, EXAMPLE)
    await page.goto(path)
    const closed = page.locator('.accordion__item.is-closed')
    await expect(closed.first()).toBeVisible({ timeout: 60_000 })
    const n = await closed.count()
    expect(n, 'the page has closed blocks to check').toBeGreaterThan(0)
    for (let i = 0; i < n; i++) {
      const block = closed.nth(i)
      const id = await block.getAttribute('id')
      await expect(block.locator('.accordion__summary'), `#${id}`).toHaveText(/\S{3,}/)
    }
  })
}

// Marc, 2026-10-20: « if we press the close all button, all cards are closed » — on EVERY page that has the switch, from what it opens with, after a card opened
// by hand, and after « Tout ouvrir ». The check is the whole page (no `.accordion__item.is-open` left), not one named block: a card opened by default is the one
// that used to survive.
for (const [path, open] of [
  ['/profil', null],
  ['/hypotheses', null],
  ['/resultats', null],
  ['/decider', null],
  ['/decider', '#epargner'],
  ['/resultats', '#solidite'],
] as const) {
  test(`« Tout fermer » closes every card on ${path}${open ? `, ${open} opened by hand first` : ''} — and again after « Tout ouvrir »`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await seedProfile(page, EXAMPLE)
    await page.goto(path)
    const icon = page.locator('.accordion__all').first()
    await expect(icon).toHaveAttribute('aria-label', 'Tout fermer', { timeout: 60_000 })
    if (open) await page.locator(`${open} .accordion__toggle`).click()
    if (open) await expect(page.locator(`${open}.accordion__item`)).toHaveClass(/is-open/)
    await icon.click()
    await expect(icon).toHaveAttribute('aria-label', 'Tout ouvrir')
    await expect(page.locator('.accordion__item.is-open')).toHaveCount(0)
    await icon.click()
    await expect(icon).toHaveAttribute('aria-label', 'Tout fermer')
    await expect(page.locator('.accordion__item.is-open').first()).toBeVisible()
    await icon.click()
    await expect(page.locator('.accordion__item.is-open')).toHaveCount(0)
  })
}

// …and what opens outside a card: a Fold opened by hand (a fold on the answer) closes with the cards — it read as the one thing the switch missed. A controlled
// fold tells its page, so its address key goes too. (« Ma situation » on Profil was such a fold; it is a card of the accordion now, closed with the others.)
for (const [path, summary, key] of [
  ['/resultats', 'Rentes et dépenses, année par année', /dates=1/], // a controlled one: the address keeps it (`?dates=1`)
] as const) {
  test(`« Tout fermer » on ${path} also closes « ${summary} », a fold opened by hand outside the cards`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await seedProfile(page, EXAMPLE)
    await page.goto(path)
    const icon = page.locator('.accordion__all').first()
    await expect(icon).toHaveAttribute('aria-label', 'Tout fermer', { timeout: 60_000 })
    const fold = page.locator('details.fold').filter({ has: page.locator('summary', { hasText: summary }) }).first()
    await expect(fold).toBeVisible({ timeout: 60_000 })
    await fold.locator('summary').first().click()
    await expect(fold).toHaveAttribute('open', '')
    if (key) await expect(page).toHaveURL(key)
    await icon.click()
    await expect(icon).toHaveAttribute('aria-label', 'Tout ouvrir')
    // shut — or gone with the card that held it (« Rentes et dépenses » sits in the answer's card, which mounts nothing while closed)
    await expect(page.locator('details.fold[open]').filter({ has: page.locator('summary', { hasText: summary }) })).toHaveCount(0)
    await expect(page.locator('#root details.fold[open]')).toHaveCount(0)
    await expect(page.locator('.accordion__item.is-open')).toHaveCount(0)
    if (key) await expect(page).not.toHaveURL(key)
  })
}
