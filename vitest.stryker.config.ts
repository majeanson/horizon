import { defineConfig } from 'vitest/config'

// The vitest configuration Stryker runs under (stryker.config.json): the same as vitest.config.ts, but with ONLY the test files named in STRYKER_TESTS (a comma-separated list, set by
// scripts/stryker.mjs for the file being mutated). Stryker's first move is a full dry run of whatever its runner includes: the whole suite takes minutes and trips its timeout, and a mutant of
// bracketFill.ts has no business waiting for the chart tests.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: (process.env.STRYKER_TESTS ?? 'src/engine/bracketFill.test.ts').split(','),
    exclude: ['**/node_modules/**'],
    testTimeout: 30_000,
    maxWorkers: 2,
    execArgv: ['--no-experimental-webstorage'],
  },
})
