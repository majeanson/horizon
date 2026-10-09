import { defineConfig } from '@playwright/test'
import base from './playwright.config.ts'

// `npm run e2e:slow` — the suite in CI's SHAPE on a slow machine: one worker, no retries, the same 45 s timeout, and the
// renderer's CPU throttled 4× (e2e/seed.ts reads `cpuThrottle` and asks Chromium for it on every page). The GitHub runner is
// about four times slower than a developer's box; a test that passes here in 6 s and there in 46 s is a timeout only CI
// sees — this run shows it first. Run it before pushing anything that changes what runs per profile write on Résultats.
export default defineConfig({
  ...base,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { ...base.use, cpuThrottle: 4 },
})
