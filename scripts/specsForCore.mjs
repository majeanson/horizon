// WHICH TESTS TO RUN FOR THESE CHANGES. `npm run verify` is the whole truth and takes minutes; the full e2e takes half an hour. Between an edit and a push you want the few suites that can notice THIS change,
// named, so you run them instead of guessing — and so that the one expensive thing worth running before a push (the e2e specs of the page you touched) is never forgotten. A file with no rule
// falls back to « run verify »: the helper may over-ask, it must never under-ask. The rules are plain data below; scripts/specsFor.test.mjs holds that every spec and test they name exists.

/** [pattern on the changed path, suites it adds]. A `unit` entry is a path or a directory for vitest; an `e2e` entry is a Playwright spec. */
export const RULES = [
  { re: /^src\/engine\/(projection|bracketFill|tax|taxFederal|taxQuebec|accounts|oas|rrq|rrqRules|survivor|retireAt|withdrawalOrders)[^/]*\.ts$/, unit: ['src/engine', 'src/lib/randomMatrix.test.ts', 'src/lib/metamorphic.test.ts', 'src/lib/optionMatrix.invariants.test.ts', 'src/lib/survivorSweep.test.ts'], e2e: ['e2e/strategies.spec.ts', 'e2e/bracket-fill.spec.ts', 'e2e/bridge.spec.ts'] },
  { re: /^src\/engine\/params\//, unit: ['src/engine/params', 'src/engine/verified', 'src/lib/sourcesMd.test.ts'], e2e: [] },
  { re: /^src\/engine\//, unit: ['src/engine'], e2e: [] },
  { re: /^src\/lib\/(chartData|chartMarks|chartMoments|chartSeriesAssert|fillView|bridgeModel|yearTable|yearCsv|flowBars)[^/]*\.tsx?$/, unit: ['src/lib/chartInvariants.test.ts', 'src/lib/chartShapes.test.ts', 'src/lib/chartSentences.test.ts', 'src/lib/flowBars.test.ts', 'src/lib/yearTable.test.ts', 'src/lib/fillView.test.ts', 'src/lib/chartMarks.test.ts'], e2e: ['e2e/chart-structure.spec.ts', 'e2e/detail.spec.ts', 'e2e/flow.spec.ts'] },
  { re: /^src\/lib\/[A-Za-z]*Copy\.ts$|^src\/i18n(\.en)?\.ts$/, unit: ['src/lib/lazyCopyParity.test.ts', 'src/lib/i18nParity.test.ts', 'src/lib/directionWords.test.ts', 'src/lib/copyFigures.test.ts', 'src/lib/vocabulary.test.ts'], e2e: ['e2e/copy.spec.ts', 'e2e/complexity.spec.ts'] },
  { re: /^src\/lib\/(schema|migrations|store)\.ts$|^src\/lib\/fixtures\//, unit: ['src/lib/schema.test.ts', 'src/lib/schemaVersion.test.ts', 'src/lib/profileSafety.test.ts', 'src/lib/importFuzz.test.ts', 'src/lib/storageFailure.test.ts', 'src/lib/schemaExtremes.test.ts', 'src/lib/fixtureSanity.test.ts'], e2e: ['e2e/backup.spec.ts', 'e2e/profile.spec.ts'] },
  { re: /^src\/lib\/(useOffThread|useSettled|useSensitivity)[^/]*\.ts$|^src\/lib\/[A-Za-z]*\.worker\.ts$/, unit: ['src/lib/useOffThread.test.tsx', 'src/lib/workerParity.test.ts'], e2e: ['e2e/horizon.spec.ts'] },
  { re: /^src\/components\/results\//, unit: ['src/lib/chartShapes.test.ts', 'src/lib/fillView.test.ts'], e2e: ['e2e/results.spec.ts', 'e2e/chart-structure.spec.ts', 'e2e/strategies.spec.ts', 'e2e/complexity.spec.ts', 'e2e/a11y.spec.ts'] },
  { re: /^src\/components\/(profile|Onboarding|Slider|NumberSlider|NumberField|FieldRow)[^/]*$|^src\/pages\/(Profil|Hypotheses)\.tsx$/, unit: ['src/lib/numberFieldBounds.test.ts', 'src/lib/devkitParity.test.ts'], e2e: ['e2e/profile.spec.ts', 'e2e/onboarding.spec.ts', 'e2e/a11y.spec.ts', 'e2e/complexity.spec.ts'] },
  { re: /^src\/styles\/.*\.css$/, unit: [], e2e: ['e2e/a11y.spec.ts', 'e2e/polish.spec.ts', 'e2e/phone-height.spec.ts'] },
  { re: /^src\/components\/charts\//, unit: ['src/lib/chartBoundary.test.ts', 'src/lib/chartShapes.test.ts'], e2e: ['e2e/chart-structure.spec.ts', 'e2e/results.spec.ts'] },
  { re: /^worker\//, unit: ['src/lib/noNetwork.test.ts'], e2e: ['e2e/sw.spec.ts'] },
  { re: /^scripts\/mutants?[A-Za-z]*\.mjs$/, unit: ['scripts/mutateCore.test.mjs'], e2e: [] },
]

/** The test file that sits beside a source file (`foo.ts` → `foo.test.ts`, `Foo.tsx` → `Foo.test.ts`), if the path is one that has such a sibling. */
export function siblingTest(path) {
  const m = /^(.*)\.(tsx?|mjs)$/.exec(path)
  if (!m || /\.test$/.test(m[1]) || /\.spec$/.test(m[1])) return null
  return `${m[1]}.test.${m[2] === 'mjs' ? 'mjs' : 'ts'}`
}

/**
 * What to run for these changed paths: `unit` and `e2e` lists (deduplicated, in the order the rules name them), `exists` deciding whether a sibling test file is real, and `fallback` true when some file has
 * no rule at all (then run `npm run verify`). A changed test or spec file is itself the thing to run.
 */
export function specsFor(paths, exists = () => true) {
  const unit = new Set()
  const e2e = new Set()
  let fallback = false
  for (const raw of paths) {
    const path = raw.replace(/\\/g, '/')
    if (/\.(md|json|txt|png|svg|ico|jsonc|yml|yaml|lock)$/.test(path) || path.startsWith('docs/') || path.startsWith('public/')) continue // documents and assets are held by their own guards (docs.test.ts, sourcesMd.test.ts) inside verify
    if (/\.test\.(tsx?|mjs)$/.test(path)) {
      unit.add(path)
      continue
    }
    if (/^e2e\/.*\.spec\.ts$/.test(path)) {
      e2e.add(path)
      continue
    }
    const sibling = siblingTest(path)
    if (sibling && exists(sibling)) unit.add(sibling)
    const rules = RULES.filter((r) => r.re.test(path))
    if (rules.length === 0 && !(sibling && exists(sibling))) fallback = true
    for (const r of rules) {
      for (const u of r.unit) unit.add(u)
      for (const e of r.e2e) e2e.add(e)
    }
  }
  return { unit: [...unit], e2e: [...e2e], fallback }
}
