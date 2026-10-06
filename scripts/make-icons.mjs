// One-off PWA icon generator — renders the Horizon home-screen tile with headless Chromium
// (Playwright is already a dev dep) and screenshots it at the sizes iOS/Android want. Re-run
// if the look changes:  node scripts/make-icons.mjs   Outputs are committed (CI never runs
// this).
//
// The mark is the Phosphor "sun-horizon" glyph (the same bold icon set the app's <Icon> uses)
// in the marigold ink on the cream paper background — a sun on the horizon, which is the
// whole name.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT = resolve('public/icons')
mkdirSync(OUT, { recursive: true })

// Pip palette (src/styles/core.css): cream paper background + marigold-deep ink, matching the
// manifest's background_color/theme_color (#FBF3E4).
const BG = '#FBF3E4'
const FILL = '#d9842a' // --marigold-deep
// Phosphor `sun-horizon-bold`, viewBox 0 0 256 256.
const SUN =
  'M240,148H203.89c.07-1.33.11-2.66.11-4a76,76,0,0,0-152,0c0,1.34,0,2.67.11,4H16a12,12,0,0,0,0,24H240a12,12,0,0,0,0-24ZM76,144a52,52,0,0,1,104,0c0,1.34-.07,2.67-.17,4H76.17C76.07,146.67,76,145.34,76,144Zm144,56a12,12,0,0,1-12,12H48a12,12,0,0,1,0-24H208A12,12,0,0,1,220,200ZM12.62,92.21a12,12,0,0,1,15.17-7.59l12,4a12,12,0,1,1-7.58,22.77l-12-4A12,12,0,0,1,12.62,92.21Zm56-48.41a12,12,0,1,1,22.76-7.59l4,12A12,12,0,1,1,72.62,55.8Zm140,60a12,12,0,0,1,7.59-15.18l12-4a12,12,0,0,1,7.58,22.77l-12,4a12,12,0,0,1-15.17-7.59Zm-48-55.59,4-12a12,12,0,1,1,22.76,7.59l-4,12a12,12,0,1,1-22.76-7.59Z'

// scale: the glyph's width as a % of the tile. Maskable icons get the smaller
// safe-zone scale so launcher masks (circle, squircle) never clip the rays.
const page_html = (scale) => `<!doctype html><html><head><style>
  * { margin: 0; padding: 0; }
  body { width: 100vw; height: 100vh; display: flex; align-items: center;
         justify-content: center; background: ${BG}; overflow: hidden; }
  svg { width: ${scale}vw; height: ${scale}vw;
        filter: drop-shadow(0 ${scale / 16}vw ${scale / 10}vw rgba(72,54,30,0.25)); }
</style></head><body>
  <svg viewBox="0 0 256 256" fill="${FILL}"><path d="${SUN}"/></svg>
</body></html>`

const JOBS = [
  { file: 'icon-512.png', size: 512, scale: 56 },
  { file: 'icon-192.png', size: 192, scale: 56 },
  { file: 'apple-touch-icon.png', size: 180, scale: 56 },
  { file: 'icon-maskable-512.png', size: 512, scale: 40 }, // safe zone
]

const browser = await chromium.launch()
for (const job of JOBS) {
  const page = await browser.newPage({ viewport: { width: job.size, height: job.size } })
  await page.setContent(page_html(job.scale))
  await page.screenshot({ path: resolve(OUT, job.file) })
  await page.close()
  console.log(`✓ ${job.file} (${job.size}×${job.size})`)
}
await browser.close()
