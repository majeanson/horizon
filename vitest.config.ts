import { defineConfig } from 'vitest/config'

// Vitest-only config, kept out of tsconfig.node's build graph so the nested vite that
// vitest ships does not type-clash with the app's vite at `tsc -b`.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['{src,worker}/**/*.test.ts', 'scripts/**/*.test.mjs'],
    exclude: ['**/node_modules/**'],
    // 6 workers crash (« Worker exited unexpectedly ») on a memory-tight Windows box; 3 is reliable.
    maxWorkers: process.env.CI ? undefined : 3,
    // Node 25+ ships its own global localStorage, which shadows happy-dom's.
    execArgv: ['--no-experimental-webstorage'],
  },
})
