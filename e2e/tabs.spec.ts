import { expect, test, type Locator, type Page } from '@playwright/test'
import { blankSeed, EXAMPLE, seedProfile, type SeedProfile } from './seed'

// EVERY TAB IS REACHABLE, AND THE CHOSEN ONE SHOWS (Marc, 2026-10-19). Two halves:
//   · the navigation — the three tabs and the bar's three buttons: on each page exactly ONE is marked current (aria-current), and it LOOKS different;
//   · every SubTabs row the app draws — walked through the states that reveal them (a Preuve block, a bridge view, an empty profile…): each option is
//     clicked, becomes the ONE selected (aria-selected), and is drawn unlike its neighbours; the row is then put back as it was.
// Each state pins the rows it shows, by name and in order: a row the app gains or loses fails until the state says so (per state, not one check at the
// end: CI shards a file across runners).

type State = { name: string; path: string; seed: SeedProfile; ready?: string; rows: string[] }

const blankWithSalary = (): SeedProfile => {
  const p = blankSeed() as unknown as { household: { persons: { salaryToday: number }[] } }
  p.household.persons[0].salaryToday = 60_000
  return p as unknown as SeedProfile
}

const STATES: State[] = [
  { name: 'Profil, the form', path: '/profil?form=1', seed: EXAMPLE, rows: ['Façon de remplir le profil'] },
  { name: 'Profil, a document step', path: '/profil?form=1&par=document&etape=rrq', seed: EXAMPLE, rows: ['Façon de remplir le profil', 'Présentation des cases'] },
  { name: 'Profil, figures to fill', path: '/profil?form=1&bloc=tout', seed: blankWithSalary(), rows: ['Façon de remplir le profil', 'Façon de remplir ce qui manque'] },
  { name: 'Hypothèses', path: '/hypotheses', seed: EXAMPLE, rows: ['Choisir un scénario'] },
  { name: 'Hypothèses, the markets', path: '/hypotheses?bloc=marches', seed: EXAMPLE, rows: ['Le parcours des marchés'] },
  { name: 'Réponse', path: '/resultats?cartes=all', seed: EXAMPLE, ready: '#graphique', rows: ['Façons de comparer', 'Afficher'] },
  { name: 'Réponse, where the money comes from', path: '/resultats?cartes=all&metric=detail', seed: EXAMPLE, ready: '#graphique', rows: ['Façons de comparer', 'Afficher', 'Montants', 'Départ', 'Pour qui'] },
  { name: 'Décider, the pensions', path: '/decider', seed: EXAMPLE, ready: '#rentes [role="tablist"]', rows: ['Pour', 'Quatre façons de regarder vos rentes'] },
  { name: 'Décider, the pensions year by year', path: '/decider?bv=years', seed: EXAMPLE, ready: '#rentes [role="tablist"]', rows: ['Pour', 'Quatre façons de regarder vos rentes', 'Années montrées'] },
  { name: 'Décider, melting the RRSP', path: '/decider?strat=fonte', seed: EXAMPLE, ready: '#fonte [role="tablist"]', rows: ['Façons de fondre le REER'] },
  { name: 'Preuve, the grids', path: '/resultats?cartes=all&bloc=solidite&solidite=grids', seed: EXAMPLE, ready: '#solidite [role="tablist"]', rows: ['Façons de comparer', 'Afficher', 'Rendement (lignes) · inflation (colonnes)'] },
  { name: 'Preuve, the year table', path: '/resultats?cartes=all&bloc=tableau', seed: EXAMPLE, ready: '#tableau [role="tablist"]', rows: ['Façons de comparer', 'Afficher', 'Départ'] },
  // (Preuve ▸ « Paramètres utilisés » draws its year chooser only once there are two tax years: TableChooser hides a row of one.)
  { name: 'Réglages', path: '/donnees', seed: EXAMPLE, rows: ['Langue', 'Thème', 'Contraste', 'Taille du texte'] },
]


const rows = (page: Page) => page.locator('[role="tablist"]:visible')

/** Click every option of the row, each becoming the ONE selected and drawn unlike the others; then put the row back. Returns the row's name. */
async function walk(page: Page, i: number): Promise<string> {
  const row = rows(page).nth(i)
  const name = (await row.getAttribute('aria-label')) ?? `(row ${i})`
  const tabs = row.getByRole('tab')
  const n = await tabs.count()
  expect(n, `${name}: a row of one is not a choice`).toBeGreaterThan(1)
  let original = 0
  for (let k = 0; k < n; k++) if ((await tabs.nth(k).getAttribute('aria-selected')) === 'true') original = k
  for (let k = 0; k < n; k++) await select(rows(page).nth(i), name, k)
  await select(rows(page).nth(i), name, original)
  return name
}

async function select(row: Locator, name: string, k: number): Promise<void> {
  const tabs = row.getByRole('tab')
  const tab = tabs.nth(k)
  await tab.click()
  await expect(tab, `${name} › option ${k + 1} is selected`).toHaveAttribute('aria-selected', 'true')
  await expect(row.locator('[role="tab"][aria-selected="true"]'), `${name}: ONE option selected`).toHaveCount(1)
  // Drawn unlike its neighbours: the chosen label's colour differs from an unchosen one's, and the fill is there (on the tab, or the gliding thumb).
  const other = tabs.nth(k === 0 ? 1 : 0)
  const look = (l: Locator) => l.evaluate((el) => getComputedStyle(el).color)
  await expect.poll(async () => (await look(tab)) !== (await look(other)), { message: `${name} › option ${k + 1} looks chosen` }).toBe(true)
  const filled = await row.evaluate((el) => {
    const on = el.querySelector('[aria-selected="true"]') as HTMLElement
    const thumb = el.querySelector('.subtabs__thumb') as HTMLElement | null
    const paint = (x: HTMLElement | null) => (x ? getComputedStyle(x).backgroundColor : 'rgba(0, 0, 0, 0)')
    return paint(on) !== 'rgba(0, 0, 0, 0)' || (thumb !== null && paint(thumb) !== 'rgba(0, 0, 0, 0)')
  })
  expect(filled, `${name} › option ${k + 1} has its fill`).toBe(true)
}

test.describe('every SubTabs row is reachable, and the chosen option shows', () => {
  for (const s of STATES) {
    test(s.name, async ({ page }) => {
      test.slow()
      await seedProfile(page, s.seed)
      // Each row from a fresh load of the state: an option of one row may change the page (« Par sujet » leaves the document steps), and putting it
      // back need not bring back where the page was.
      const arrive = async () => {
        await page.goto(s.path)
        await expect(page.locator('.page-head__title').first()).toBeAttached({ timeout: 60_000 })
        if (s.ready) await page.locator(s.ready).first().waitFor({ timeout: 60_000 })
        // a panel still waiting is a ghost of itself — its tabs inert, counted as none: walk the rows once every wait has landed
        await expect(page.locator('[data-placeholder]')).toHaveCount(0, { timeout: 60_000 })
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 60_000 })
        // Lazy parts draw their rows a moment later: wait until the number of rows has held for a second.
        let last = -1
        await expect
          .poll(async () => {
            const n = await rows(page).count()
            const same = n === last
            last = n
            return same
          }, { intervals: [1_000], timeout: 30_000 })
          .toBe(true)
      }
      await arrive()
      const count = await rows(page).count()
      expect(count, 'this state shows at least one row').toBeGreaterThan(0)
      const names: string[] = []
      for (let i = 0; i < count; i++) {
        if (i > 0) await arrive()
        names.push(await walk(page, i))
      }
      // the rows this state must show, by name, in order: a row the app gains or loses is said here first
      expect(names).toEqual(s.rows)
    })
  }
})

test.describe('the navigation marks where the reader is', () => {
  const PLACES: [path: string, name: RegExp][] = [
    ['/profil', /^Profil$/],
    ['/resultats', /^Résultats$/],
    ['/decider', /^Décider$/],
    ['/hypotheses', /^Hypothèses$/],
    ['/fiche', /^Ma fiche/],
    ['/glossaire', /^Glossaire/],
    ['/donnees', /^Sauvegarde et réglages$/],
  ]
  for (const [path, name] of PLACES) {
    test(`${path}: ONE place is current, and it looks it`, async ({ page }) => {
      await seedProfile(page, EXAMPLE)
      await page.goto(path)
      await expect(page.locator('.page-head__title').first()).toBeAttached({ timeout: 60_000 })
      const current = page.locator('.shell__nav [aria-current="page"], .shell__actions [aria-current="page"]')
      await expect(current).toHaveCount(1)
      await expect(current).toHaveAccessibleName(name)
      // the current one is drawn unlike the others of its group (its pill, its fill)
      const group = current.locator('xpath=..')
      const look = (l: Locator) => l.evaluate((el) => {
        const cs = getComputedStyle(el)
        const svg = el.querySelector('svg')
        return [cs.color, cs.backgroundColor, svg ? getComputedStyle(svg).backgroundColor : ''].join('|')
      })
      const others = group.locator(':scope > a:not([aria-current="page"])')
      expect(await others.count()).toBeGreaterThan(0)
      expect(await look(current)).not.toBe(await look(others.first()))
    })
  }
  test('the front door marks no tab: it is the brand that leads there', async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.goto('/')
    await expect(page.locator('.shell__nav [aria-current="page"]')).toHaveCount(0)
  })
})
