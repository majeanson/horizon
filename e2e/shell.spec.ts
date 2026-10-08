import { test, expect } from '@playwright/test'
import { seedProfile } from './seed'

// The shell is chrome, not content: scrolling the page must never move the top bar or the navigation, at any
// width or orientation. #root is the one scroller, so this scrolls IT and reads where the chrome ended up.
const VIEWPORTS = [
  { name: 'phone portrait', width: 360, height: 740 },
  { name: 'phone landscape', width: 740, height: 360 },
  { name: 'tablet portrait', width: 820, height: 1180 },
  { name: 'tablet landscape', width: 1180, height: 820 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'short desktop', width: 1280, height: 500 },
]
const ROUTES = ['/', '/hypotheses', '/resultats', '/donnees']

for (const vp of VIEWPORTS) {
  test(`chrome holds still while the page scrolls — ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await seedProfile(page)
    for (const route of ROUTES) {
      await page.goto(route)
      await expect(page.locator('.shell__nav')).toBeVisible()
      const read = () =>
        page.evaluate(() => {
          const r = (s: string) => document.querySelector(s)!.getBoundingClientRect()
          const root = document.getElementById('root')!
          return { bar: r('.shell__bar'), nav: r('.shell__nav'), scrollable: root.scrollHeight - root.clientHeight, top: root.scrollTop }
        })
      // Whatever the page holds, make it tall: this tests the chrome's CSS, not a page's length.
      await page.evaluate(() => {
        const pad = document.createElement('div')
        pad.style.height = '3000px'
        document.getElementById('main')!.append(pad)
      })
      const before = await read()
      await page.evaluate(() => document.getElementById('root')!.scrollTo(0, 1e6))
      const after = await read()
      // A page that cannot scroll proves nothing.
      expect(after.scrollable, `${route} has something to scroll`).toBeGreaterThan(0)
      expect(after.top, `${route} scrolled`).toBeGreaterThan(before.top)
      expect(after.bar.top, `${route} bar`).toBeCloseTo(0, 0)
      expect(after.nav.top, `${route} nav top`).toBeCloseTo(before.nav.top, 0)
      expect(after.nav.bottom, `${route} nav bottom`).toBeCloseTo(before.nav.bottom, 0)
      if (vp.width >= 860) {
        // The rail reaches the foot of the window, however far down the page is.
        expect(after.nav.bottom, `${route} rail reaches the bottom`).toBeGreaterThanOrEqual(vp.height - 1)
      }
    }
  })
}
