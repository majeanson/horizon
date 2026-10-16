import { defineConfig } from 'vitest/config'

// COVERAGE OF THE ENGINE, AS A RATCHET. `npm run coverage` runs the engine's own tests with V8 coverage over src/engine and FAILS if any of the four figures falls under its floor. Measured 2026-10-16
// from the engine tests alone: statements 98.65 %, branches 93.61 %, functions 99.62 %, lines 99.7 %. The floors sit just under, so a change that leaves new engine code with no test fails here — and a
// floor that is lowered says so in a diff, here AND in scripts/coverageFloor.test.mjs. They only go UP: raise them in the commit that earns it.
//
// It is a floor, not a goal: a line that ran is not a line that was checked (scripts/mutate.mjs and `npm run stryker` ask that question). Kept out of the ordinary run, which would pay for the instrumentation on every test.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/engine/**/*.test.ts'],
    exclude: ['**/node_modules/**'],
    testTimeout: 60_000,
    maxWorkers: process.env.CI ? undefined : 3,
    execArgv: ['--no-experimental-webstorage'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts'],
      exclude: ['src/engine/**/*.test.ts', 'src/engine/golden/**'],
      reporter: ['text-summary', 'json-summary'],
      reportsDirectory: 'reports/coverage',
      thresholds: { statements: 98, branches: 93, functions: 99, lines: 99 },
    },
  },
})
