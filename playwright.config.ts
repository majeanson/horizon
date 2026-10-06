import { defineConfig, devices } from '@playwright/test'

// E2E against plain Vite. Horizon has no API: specs seed the profile into localStorage
// (e2e/seed.ts) before first paint, so every run is deterministic and offline.
export default defineConfig({
  testDir: './e2e',
  // sw.spec.ts needs the PROD bundle (the SW is a build artifact) — own harness,
  // e2e/sw.config.ts, `npm run e2e:sw`.
  testIgnore: ['**/sw.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Locally one retry absorbs Vite cold-compile starvation; CI is strict (retries 0).
  retries: process.env.CI ? 0 : 1,
  // A flake FAILS the local run: needing the retry must not be free.
  failOnFlakyTests: true,
  workers: process.env.CI ? 1 : Number(process.env.PW_WORKERS) || 4,
  timeout: 45_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
  outputDir: 'e2e/test-results',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    navigationTimeout: 20_000,
    actionTimeout: 15_000,
    timezoneId: 'America/Toronto',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(process.env.PW_WEBKIT ? [{ name: 'iphone', use: { ...devices['iPhone 13'] } }] : []),
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: process.env.CI ? 'pipe' : 'ignore',
  },
})
