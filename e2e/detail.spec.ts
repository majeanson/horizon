import { expect, test } from '@playwright/test'
import { EXAMPLE, seedProfile } from './seed'

// The results page keeps its three views and the map pinned under the top bar while it scrolls, and the chart's
// « Détail » view shows the whole picture (sources, accounts, the three sets of hypotheses), not only the net worth.

test.beforeEach(async ({ page }) => {
  await seedProfile(page, EXAMPLE)
})

test('the views and the section map stay pinned while the page scrolls', async ({ page }) => {
  await page.goto('/resultats')
  const pin = page.locator('.results-pin')
  await expect(pin).toBeVisible()
  const bar = await page.locator('.shell__bar').boundingBox()
  await page.locator('#root').evaluate((el) => el.scrollTo({ top: 1200 }))
  await expect.poll(async () => Math.round((await pin.boundingBox())!.y)).toBe(Math.round(bar!.y + bar!.height))
  await expect(pin.getByRole('tab').first()).toBeInViewport()
})

test('« Détail » shows where the money comes from, what the accounts hold, and the three sets of hypotheses', async ({ page }) => {
  await page.goto('/resultats?metric=detail')
  const chart = page.locator('.chart-panel')
  await expect(chart.getByRole('img')).toHaveCount(3, { timeout: 30_000 })
  await expect(chart.getByRole('heading', { name: 'D’où vient l’argent, année par année' })).toBeVisible()
  await expect(chart.getByRole('heading', { name: 'Ce que contiennent les comptes' })).toBeVisible()
  await expect(chart.getByRole('heading', { name: 'Sous les trois jeux d’hypothèses' })).toBeVisible()
})

// How much is pinned depends on the room: the views everywhere, the section map only from 860 px up. A tapped section
// must stop BELOW whatever is pinned — measured, not guessed (lib/pinOffset.ts).
for (const [name, width, height, mapPinned] of [['phone', 390, 844, false], ['desktop', 1280, 720, true]] as const) {
  test(`${name}: the views are pinned${mapPinned ? ' with the section map' : ', the map scrolls away'}, and a tapped section stops below them`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/resultats')
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
    const pin = page.locator('.results-pin')
    const nav = page.locator('.section-nav')
    await expect(pin).toBeVisible()
    await page.locator('#root').evaluate((el) => el.scrollTo({ top: 1500 }))
    const pinBox = (await pin.boundingBox())!
    await expect.poll(async () => ((await nav.boundingBox())!.y >= pinBox.y + pinBox.height - 1)).toBe(mapPinned)
    // Back at the top, tap « Dépenser » in the map: the section stops under the pinned chrome, fully clear of it.
    await page.locator('#root').evaluate((el) => el.scrollTo({ top: 0 }))
    await expect.poll(() => page.locator('#root').evaluate((el) => el.scrollTop)).toBe(0) // the page may scroll smoothly: tap only once it is back
    // …and only once the page has stopped growing: a smooth scroll aims at where the section WAS when it began.
    let last = -1
    await expect
      .poll(async () => {
        const h = await page.locator('#root').evaluate((el) => el.scrollHeight)
        const same = h === last
        last = h
        return same
      }, { intervals: [600] })
      .toBe(true)
    await nav.getByRole('button', { name: 'Dépenser' }).click()
    const target = page.locator('#depenser')
    // The page settles (a smooth scroll, the worker's answers replacing skeletons) before it is measured: poll the landing
    // spot until it holds, instead of guessing how long that takes.
    await expect
      .poll(
        async () => {
          const navBox = (await nav.boundingBox())!
          const pinNow = (await pin.boundingBox())!
          const clear = mapPinned ? navBox.y + navBox.height : pinNow.y + pinNow.height
          const top = (await target.boundingBox())!.y
          return top >= clear - 2 && top < clear + 120 // clear of the chrome, and close to it: scrolled TO, not left below the fold
        },
        { timeout: 10_000, message: 'landing' },
      )
      .toBe(true)
  })
}

test('the year-by-year table is ONE table; the scenario is chosen in its header and the export follows', async ({ page }) => {
  await page.goto('/resultats?v=verify&ages=plan,60,65')
  const block = page.locator('.year-table')
  await expect(block.locator('table')).toHaveCount(1, { timeout: 30_000 })
  const tabs = block.locator('.table-chooser').getByRole('tab')
  await expect(tabs).toHaveCount(3)
  const title = block.locator('.year-table__title')
  const first = await title.textContent()
  await tabs.nth(1).click()
  await expect(title).not.toHaveText(first!)
  await expect(block.locator('table')).toHaveCount(1)
  const download = page.waitForEvent('download')
  await block.getByRole('button', { name: /CSV|tableur/i }).click()
  expect((await download).suggestedFilename()).toMatch(/[a-z]/i) // a readable name, not a row of dashes
})
