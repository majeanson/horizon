import { expect, test, type Locator, type Page } from '@playwright/test'
import { seedProfile } from './seed'

// THE STRUCTURE OF EVERY CHART, AS A BROWSER RENDERS IT. Not a screenshot: pixels differ from one operating system's fonts to the next's (CI runs Linux, this is written on Windows), so a baseline image
// would be a different test on each. What does not differ: a chart is a figure with an accessible name that says its range, an SVG that has something drawn in it, and no coordinate that is NaN
// (the sign of a figure that went wrong on the way to the screen — an empty series, a division by nothing — which draws as a line to nowhere or not at all).

test.beforeEach(async ({ page }) => seedProfile(page))

const VIEWS = [
  ['the answer', '/resultats', 1],
  ['the detail bars', '/resultats?metric=detail', 3],
  ['the strategies, every section open', '/resultats?v=strategies&tout=1', 2],
  ['the strategies, the bridge years', '/resultats?v=strategies&bv=years', 3],
] as const

async function settle(page: Page): Promise<Locator> {
  const figures = page.locator('figure.chart[role="img"]')
  await expect(figures.first()).toBeVisible({ timeout: 90_000 })
  // the charts are lazy and the results come from a worker: wait until something is drawn in the first one, then give the others the same chance
  await expect(figures.first().locator('svg path, svg rect').first()).toBeAttached({ timeout: 90_000 })
  await page.waitForTimeout(1_500)
  return figures
}

// the number of charts each view draws today, held as a floor: a chart that stops rendering (a lazy chunk that fails, a section that never opens) is a failure, not a smaller page
for (const [name, url, min] of VIEWS) {
  test(`${name}: every chart has a real name, something drawn, and no NaN in its geometry`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(url)
    const figures = await settle(page)
    const count = await figures.count()
    expect(count, `${name} should draw at least ${min} chart(s)`).toBeGreaterThanOrEqual(min)
    for (let i = 0; i < count; i++) {
      const fig = figures.nth(i)
      const label = (await fig.getAttribute('aria-label')) ?? ''
      expect(label.trim().length, `chart ${i} of ${name} has no accessible name`).toBeGreaterThan(8)
      expect(label, `chart ${i}: « ${label} »`).not.toMatch(/undefined|NaN|\[object|Infinity|null/)
      // an accessible name that says a range says it with figures
      expect(label, `chart ${i}: « ${label} »`).toMatch(/\d/)
      const geometry = await fig.evaluate((el) => {
        const drawn = el.querySelectorAll('svg path, svg rect, svg line, svg circle')
        const bad: string[] = []
        el.querySelectorAll('svg *').forEach((node) => {
          for (const attr of ['d', 'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'x1', 'x2', 'y1', 'y2', 'points', 'transform']) {
            const v = node.getAttribute(attr)
            if (v !== null && /NaN|undefined|Infinity/.test(v)) bad.push(`${node.tagName}[${attr}]=${v.slice(0, 40)}`)
          }
        })
        // A missing or NaN value is not drawn as a NaN coordinate: the chart library leaves a GAP, which is a second « M » (move) in the line's path. Every line here is one unbroken run of years.
        el.querySelectorAll('path.recharts-line-curve').forEach((node) => {
          const moves = (node.getAttribute('d') ?? '').match(/M/g)?.length ?? 0
          if (moves > 1) bad.push(`a line breaks into ${moves} pieces (a missing value in its data)`)
        })
        return { drawn: drawn.length, bad: bad.slice(0, 5) }
      })
      expect(geometry.bad, `chart ${i} « ${label} »`).toEqual([])
      expect(geometry.drawn, `chart ${i} « ${label} » draws nothing`).toBeGreaterThan(2)
    }
  })

  test(`${name}: no chart makes the page wider than the screen, wide or narrow`, async ({ page }) => {
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(url)
      await settle(page)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `${name} at ${width} px`).toBeLessThanOrEqual(1)
    }
  })
}
