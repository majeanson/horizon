import { expect, test, type Page } from '@playwright/test'
import { seedProfile } from './seed'

// A tap that lands on a section must SHOW it: on a phone, « D'où vient l'argent » scrolled its panel under the top bar and the pinned map, and what was left on
// screen was a row of pickers and a « Chargement… » — the reader saw « nothing happens » (Marc, 2026-10-20). Every chip of every pinned map is tapped here, at a
// phone's width, and the element the page scrolled to (every landing goes through `scrollIntoView`: recorded below) must start below the pinned chrome and on screen.

const PAGES = ['/resultats', '/decider', '/profil', '/hypotheses', '/glossaire', '/fiche'] as const

async function recordLandings(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const own = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (this: Element, arg?: boolean | ScrollIntoViewOptions) {
      // only a landing at the top of the free band, not a chip kept in its row (`block: 'nearest'`)
      if (typeof arg !== 'object' || arg.block === 'start') (window as unknown as { __landed?: string }).__landed = this.id || this.tagName
      return own.call(this, arg)
    }
  })
}

/** Where the landed element sits against the pinned chrome: the lowest edge of the top bar and the pinned stack, while they are pinned (as lib/guide.ts measures it). */
async function landing(page: Page) {
  return page.evaluate(() => {
    const id = (window as unknown as { __landed?: string }).__landed ?? null
    let pinned = 0
    for (const el of document.querySelectorAll<HTMLElement>('.shell__bar, .pin-stack')) {
      const r = el.getBoundingClientRect()
      const pos = getComputedStyle(el).position
      if ((pos === 'sticky' || pos === 'fixed') && r.height > 0 && r.top < 240 && r.bottom > pinned) pinned = r.bottom
    }
    const target = id === null ? null : document.getElementById(id)
    return { id, pinned: Math.round(pinned), top: target ? Math.round(target.getBoundingClientRect().top) : null, height: window.innerHeight }
  })
}

test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })

for (const path of PAGES) {
  test(`${path}: every chip of the pinned map lands its section below the pinned chrome, on screen`, async ({ page }) => {
    test.setTimeout(120_000)
    await recordLandings(page)
    await seedProfile(page)
    await page.goto(path)
    const chips = page.locator('.pin-stack .section-nav .rail button')
    // the map is there once the page has its sections (Résultats waits for its answer)
    await expect(chips.first()).toBeVisible({ timeout: 30_000 })
    const labels = await chips.allTextContents()
    expect(labels.length).toBeGreaterThan(0)
    for (let i = 0; i < labels.length; i++) {
      await page.evaluate(() => void ((window as unknown as { __landed?: string | null }).__landed = null))
      await chips.nth(i).click()
      // the landing holds the target in place while the page settles; it reaches its last place within a few seconds
      // the poll's value says where it landed, so a failure names the chip, the target and how far under the chrome it stopped
      await expect
        .poll(async () => {
          const l = await landing(page)
          return l.id !== null && l.top !== null && l.top >= l.pinned - 1 && l.top < l.height - 40 ? 'below the chrome, on screen' : `« ${labels[i].trim()} »: ${JSON.stringify(l)}`
        }, { timeout: 8_000 })
        .toBe('below the chrome, on screen')
    }
  })
}

test('« D’où vient l’argent » lands on the bars’ own title, and the map marks it — from a page with every card closed', async ({ page }) => {
  await recordLandings(page)
  await seedProfile(page)
  await page.goto('/resultats?cartes=none')
  const map = page.getByRole('navigation', { name: 'Sections des résultats' })
  const chip = map.getByRole('button', { name: 'D’où vient l’argent' })
  await chip.click()
  const title = page.locator('#graphique-sources')
  await expect(title).toHaveText('D’où vient l’argent, année par année', { timeout: 30_000 })
  await expect.poll(async () => (await landing(page)).id, { timeout: 8_000 }).toBe('graphique-sources')
  await expect
    .poll(async () => {
      const l = await landing(page)
      return l.top !== null && l.top >= l.pinned - 1 && l.top < l.height / 2
    }, { timeout: 8_000 })
    .toBe(true)
  await expect(chip).toHaveAttribute('aria-current', /.+/)
})
