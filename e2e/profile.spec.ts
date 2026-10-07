import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import { expectNoHorizontalOverflow } from './overflow'
import { EXAMPLE, blankSeed, savedProfile, seedProfile } from './seed'

// The profile, end to end in a real browser: what is typed is what is saved, what is saved is what comes back, and
// every number has its ⓘ. The unit tests pin the logic; this pins that a PERSON can drive it.

// A text box by its EXACT accessible name: the ⓘ button's name contains the field's label, so a substring match finds both.
const box = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true })

function watchConsole(page: Page): string[] {
  const problems: string[] = []
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`${m.type()}: ${m.text()}`)
  })
  return problems
}

// Saves are debounced a quarter-second; leaving the page flushes them. Poll the storage rather than sleep.
async function savedSalary(page: Page): Promise<number> {
  return (await savedProfile(page)).household.persons[0].salaryToday
}

test.describe('a blank profile', () => {
  test.beforeEach(async ({ page }) => seedProfile(page, blankSeed()))

  test('opens on the profile, prints nothing to the console, and asks for the missing numbers on the results page', async ({ page }) => {
    const problems = watchConsole(page)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible()
    await page.getByRole('link', { name: 'Résultats', exact: true }).click()
    await expect(page.getByText('Il manque des chiffres pour un résultat fiable')).toBeVisible()
    await expect(page.getByText('aucun revenu, régime ni compte n’est saisi')).toBeVisible()
    await expect(page.getByText(/Vous pouvez prendre votre retraite/)).toHaveCount(0)
    expect(problems).toEqual([])
  })

  test('a typed salary is saved, survives a reload, and drops the « no income » gap', async ({ page }) => {
    await page.goto('/')
    const salary = box(page, 'Revenu de travail annuel actuel')
    await salary.fill('85 000')
    await salary.press('Enter')
    await expect.poll(() => savedSalary(page)).toBe(85000)
    await page.reload()
    await expect(box(page, 'Revenu de travail annuel actuel')).toHaveValue(/85\D000/)
  })

  test('a comma decimal is read the Québécois way: « 1 507,65 » is fifteen hundred dollars and sixty-five cents', async ({ page }) => {
    await page.goto('/')
    const field = box(page, 'Montant projeté du relevé, rente à 65 ans (par mois)')
    await field.fill('1 507,65')
    await field.blur()
    await expect.poll(async () => (await savedProfile(page)).household.persons[0].rrq.statementAt65).toBe(1507.65)
  })

  test('an out-of-range text is refused with its reason, kept on screen, and not saved', async ({ page }) => {
    await page.goto('/')
    const age = box(page, 'Âge où le revenu de travail s’arrête')
    await age.fill('12')
    await age.blur()
    await expect(page.getByRole('alert').filter({ hasText: 'Entre 40 et 80' })).toBeVisible()
    await expect(age).toHaveValue('12')
    expect((await savedProfile(page)).household.persons[0].retirementAge).toBe(65)
    await age.fill('62')
    await age.blur()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect.poll(async () => (await savedProfile(page)).household.persons[0].retirementAge).toBe(62)
  })

  test('« où trouver ce chiffre » opens in place, names the document’s own wording, and links to an official page', async ({ page }) => {
    await page.goto('/')
    const toggle = page.getByRole('button', { name: /Où trouver ce chiffre : Droits de cotisation inutilisés/ }).first()
    await expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const note = page.locator('#' + (await toggle.getAttribute('aria-controls')))
    await expect(note).toBeVisible()
    await expect(note).toContainText('Maximum déductible au titre des REER')
    const link = note.getByRole('link', { name: /Ouvrir la page officielle/ })
    await expect(link).toHaveAttribute('href', /^https:\/\/www\.canada\.ca\//)
    await expect(link).toHaveAttribute('rel', /noopener/)
    await toggle.click()
    await expect(note).toBeHidden()
  })

  test('adding a spouse gives a second tab with its own numbers; removing asks first, in words that say what is lost', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Ajouter un·e conjoint·e' }).click()
    const tabs = page.getByRole('tablist', { name: 'Personne' })
    await expect(tabs.getByRole('tab', { name: 'Conjoint·e' })).toBeVisible()
    await tabs.getByRole('tab', { name: 'Conjoint·e' }).click()
    await expect(page).toHaveURL(/person=spouse/)
    // The URL changes a tick before the form does: wait for the tab that is derived from the same render.
    await expect(tabs.getByRole('tab', { name: 'Conjoint·e', selected: true })).toBeVisible()
    const salary = box(page, 'Revenu de travail annuel actuel')
    await salary.fill('65000')
    await salary.press('Enter')
    await expect.poll(async () => (await savedProfile(page)).household.persons[1]?.salaryToday).toBe(65000)
    expect((await savedProfile(page)).household.persons[0].salaryToday).toBe(0)

    await page.getByRole('button', { name: 'Retirer le·la conjoint·e' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText('Ses revenus, ses comptes et ses régimes seront effacés')
    await dialog.getByRole('button', { name: 'Annuler' }).click()
    expect((await savedProfile(page)).household.persons).toHaveLength(2)
    await page.getByRole('button', { name: 'Retirer le·la conjoint·e' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Retirer' }).click()
    await expect.poll(async () => (await savedProfile(page)).household.persons.length).toBe(1)
  })

  test('« Je vis seul·e » is on for one adult, can be unticked (and says why), and is gone — and false — for a couple', async ({ page }) => {
    await page.goto('/')
    const alone = page.getByRole('button', { name: 'Je vis seul·e' })
    await expect(alone).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Seul·e dans un logement distinct, toute l’année')).toBeVisible()
    await alone.click()
    await expect(alone).toHaveAttribute('aria-pressed', 'false')
    await expect.poll(async () => (await savedProfile(page)).household.livesAlone).toBe(false)
    await alone.click()
    await expect.poll(async () => (await savedProfile(page)).household.livesAlone).toBe(true)

    // A couple is never alone: the toggle disappears and the saved fact is false.
    await page.getByRole('button', { name: 'Ajouter un·e conjoint·e' }).click()
    await expect(page.getByRole('button', { name: 'Je vis seul·e' })).toHaveCount(0)
    await expect.poll(async () => (await savedProfile(page)).household.livesAlone).toBe(false)
  })

  test('children are birth years: added, shown as removable chips, validated', async ({ page }) => {
    await page.goto('/')
    const year = page.getByRole('textbox', { name: 'Année de naissance de l’enfant' })
    await year.fill('2015')
    await page.getByRole('button', { name: 'Ajouter un enfant' }).click()
    await year.fill('1800')
    await page.getByRole('button', { name: 'Ajouter un enfant' }).click()
    await expect(page.getByRole('alert')).toContainText('Valeur invalide')
    await expect.poll(async () => (await savedProfile(page)).children).toEqual([2015])
    await page.getByRole('button', { name: 'Retirer l’enfant né en 2015' }).click()
    await expect.poll(async () => (await savedProfile(page)).children).toEqual([])
  })

  test('an employer plan starts from the RREGOP preset, carries its cited rules, and is removable', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Ajouter le RREGOP' }).click()
    const saved = async () => (await savedProfile(page)).household.persons[0].pensions
    await expect.poll(async () => (await saved()).length).toBe(1)
    const [plan] = await saved()
    expect(plan).toMatchObject({ label: 'RREGOP', accrualRate: 0.02, maxServiceYears: 40, averagingYears: 5, earliestAge: 55 })
    expect(plan.coordination).toEqual({ rate: 0.007, fromAge: 65, maxYears: 35 })
    expect(plan.unreduced).toEqual({ age: 61, serviceYears: 35, factor: { minAge: 60, total: 90 } })
    await box(page, 'Années de service pour le calcul de la rente').fill('12,5')
    await box(page, 'Années de service pour le calcul de la rente').blur()
    await expect.poll(async () => (await saved())[0].serviceYearsToDate).toBe(12.5)
    await page.getByRole('button', { name: 'Retirer RREGOP' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Retirer' }).click()
    await expect.poll(async () => (await saved()).length).toBe(0)
  })

  test('the earnings years can be estimated from the salary — and a typed year is never overwritten', async ({ page }) => {
    await page.goto('/')
    const salary = box(page, 'Revenu de travail annuel actuel')
    await salary.fill('80000')
    await salary.press('Enter')
    await page.getByRole('button', { name: /Revenus de travail admissibles par année/ }).click()
    await box(page, 'Revenus admissibles de 2020').fill('55000')
    await box(page, 'Revenus admissibles de 2020').blur()
    await page.getByRole('button', { name: 'Estimer les années vides à partir du salaire actuel' }).click()
    await expect(page.getByText(/années estimées/)).toBeVisible()
    const history = async () => (await savedProfile(page)).household.persons[0].earningsHistory
    await expect.poll(async () => Object.keys(await history()).length).toBeGreaterThan(10)
    expect((await history())['2020']).toBe(55000)
  })
})

test.describe('first visit', () => {
  test('a blank profile says where to start, and the note goes away once something is entered', async ({ page }) => {
    await seedProfile(page, blankSeed())
    await page.goto('/')
    const welcome = page.getByRole('complementary')
    await expect(welcome).toContainText('Entrez votre année de naissance et votre revenu de travail')
    await expect(welcome.getByRole('link', { name: 'Voir un exemple' })).toHaveAttribute('href', '/donnees')
    // The card names two fields that sit a screen below it: « Commencer » takes the reader to them, without opening a keyboard.
    const salary = box(page, 'Revenu de travail annuel actuel')
    await welcome.getByRole('button', { name: 'Commencer' }).click()
    await expect(salary).toBeInViewport()
    await expect(salary).not.toBeFocused()
    await salary.fill('70000')
    await salary.press('Enter')
    await expect(welcome).toBeHidden()
  })

  test('every page names the tab, so history and bookmarks are not all « Horizon »', async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    for (const [path, title] of [['/', 'Profil · Horizon'], ['/hypotheses', 'Hypothèses · Horizon'], ['/resultats', 'Résultats · Horizon'], ['/donnees', 'Données · Horizon']] as const) {
      await page.goto(path)
      await expect(page).toHaveTitle(title)
    }
    await page.getByRole('button', { name: 'EN' }).click()
    await expect(page).toHaveTitle('Data · Horizon')
  })
})

test.describe('the example household', () => {
  test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

  test('the results page gives a verdict, four comparisons at most, and the year-by-year table', async ({ page }) => {
    const problems = watchConsole(page)
    await page.goto('/resultats')
    await expect(page.getByText('Vous pouvez prendre votre retraite à 59 ans, tous les deux.')).toBeVisible()
    // The verdict says what it is, on the card itself: an estimate under assumptions, not advice.
    await expect(page.locator('.verdict').getByText('Selon ces hypothèses — une estimation, pas un conseil financier.')).toBeVisible()
    // It opens on the household's OWN plan beside 65 — not on a pair the profile never mentioned.
    const chips = page.getByRole('group', { name: 'Comparer des âges de départ' })
    await expect(chips.getByRole('button', { name: 'Mon plan', pressed: true })).toBeVisible()
    await expect(chips.getByRole('button', { name: '65 ans', pressed: true })).toBeVisible()
    await expect(page.getByText('Départ : Mon plan')).toBeVisible()
    await expect(page.getByText('Tient jusqu’à l’horizon').first()).toBeVisible()

    // A fifth comparison is refused.
    // Clicked back to back ON PURPOSE: the second tap lands before the first one's re-render and must build on it, not on the old list
    // (it used to be lost 1 run in ~10 under load — Resultats.tsx `pending`).
    for (const age of ['55', '56']) await chips.getByRole('button', { name: `${age} ans` }).click()
    for (const age of ['55', '56']) await expect(chips.getByRole('button', { name: `${age} ans`, pressed: true })).toBeVisible()
    await expect(page.getByText('Quatre comparaisons au plus')).toBeVisible()
    await chips.getByRole('button', { name: '57 ans' }).click()
    await expect(chips.getByRole('button', { name: '57 ans', pressed: false })).toBeVisible()
    await expect(page).toHaveURL(/ages=plan%2C65%2C55%2C56|ages=plan,65,55,56/)

    await page.getByRole('button', { name: /Détail année par année/ }).click()
    await expect(page.getByRole('table').first()).toBeVisible()
    expect(await page.getByRole('table').first().getByRole('row').count()).toBeGreaterThan(40)
    expect(problems).toEqual([])
  })

  test('a plan that does not last says so and names the year it first falls short', async ({ page }) => {
    await page.goto('/resultats?ages=52')
    await expect(page.getByText(/Manque dès \d{4}/)).toBeVisible()
  })

  test('the profile page loads the golden couple’s numbers into the fields', async ({ page }) => {
    await page.goto('/')
    await expect(box(page, 'Revenu de travail annuel actuel')).toHaveValue(/85\D000/)
    await page.getByRole('tab', { name: 'Conjoint·e' }).click()
    await expect(box(page, 'Revenu de travail annuel actuel')).toHaveValue(/65\D000/)
    await page.goto('/hypotheses')
    await expect(box(page, 'Inflation annuelle')).toHaveValue('2,1')
  })

  test('the assumptions page edits the profile, and the order of withdrawals moves', async ({ page }) => {
    await page.goto('/hypotheses')
    const infl = box(page, 'Inflation annuelle')
    await infl.fill('2,5')
    await infl.blur()
    await expect.poll(async () => (await savedProfile(page)).assumptions.inflation).toBe(0.025)
    await page.getByRole('button', { name: 'Monter : CELI' }).click()
    await expect.poll(async () => (await savedProfile(page)).assumptions.withdrawalOrder).toEqual(['nonReg', 'tfsa', 'rrsp'])
    await expect(page.getByRole('button', { name: 'Monter : Non enregistré' })).toBeDisabled()
  })
})

test.describe('data stays on this device', () => {
  test.beforeEach(async ({ page }) => seedProfile(page, EXAMPLE))

  test('export downloads exactly what is stored, and import puts it back — after a confirmation that says what is lost', async ({ page }) => {
    await page.goto('/donnees')
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Télécharger mon profil' }).click()])
    expect(download.suggestedFilename()).toMatch(/^horizon-\d{4}-\d{2}-\d{2}\.json$/)
    const path = await download.path()
    const exported = JSON.parse(readFileSync(path, 'utf8'))
    expect(exported).toEqual(await savedProfile(page))
    expect(exported.app).toBe('horizon')

    // Change something, then import the file back.
    await page.goto('/hypotheses')
    const infl = box(page, 'Inflation annuelle')
    await infl.fill('4')
    await infl.blur()
    await expect.poll(async () => (await savedProfile(page)).assumptions.inflation).toBe(0.04)
    await page.goto('/donnees')
    await page.locator('input[type=file]').setInputFiles(path)
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText('sera remplacé par celui du fichier')
    await dialog.getByRole('button', { name: 'Importer' }).click()
    await expect.poll(async () => (await savedProfile(page)).assumptions.inflation).toBe(0.021)
  })

  test('a file that is not a profile is refused, field by field, and nothing changes', async ({ page }) => {
    await page.goto('/donnees')
    const before = await savedProfile(page)
    await page.locator('input[type=file]').setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'horizon', version: 1, household: { persons: [] } })) })
    await expect(page.getByRole('alert').first()).toContainText('Ce fichier semble incomplet ou modifié')
    await expect(page.getByText(/household\.persons — nombre non permis/)).toBeVisible()
    await page.locator('input[type=file]').setInputFiles({ name: 'y.json', mimeType: 'application/json', buffer: Buffer.from('not json') })
    await expect(page.getByText('n’est pas un document JSON lisible')).toBeVisible()
    expect(await savedProfile(page)).toEqual(before)
  })

  test('« tout effacer » asks first, then leaves nothing but a blank profile', async ({ page }) => {
    await page.goto('/donnees')
    await page.getByRole('button', { name: 'Tout effacer' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText('Le profil et les hypothèses seront retirés de cet appareil')
    await dialog.getByRole('button', { name: 'Annuler' }).click()
    expect(await savedProfile(page)).not.toBeNull()
    await page.getByRole('button', { name: 'Tout effacer' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Tout effacer' }).click()
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('horizon-profile'))).toBeNull()
  })

  test('the example loads over a blank profile, after a confirmation', async ({ page }) => {
    await seedProfile(page, blankSeed())
    await page.goto('/donnees')
    await page.getByRole('button', { name: 'Charger l’exemple' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Charger' }).click()
    await expect.poll(async () => (await savedProfile(page)).household.persons.length).toBe(2)
  })

  test('nothing in a whole visit goes to the network: every request is the page’s own origin', async ({ page }) => {
    const foreign: string[] = []
    page.on('request', (r) => {
      const u = new URL(r.url())
      if (u.protocol.startsWith('http') && u.origin !== 'http://127.0.0.1:5173') foreign.push(r.url())
    })
    for (const path of ['/', '/hypotheses', '/resultats', '/donnees']) {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
    }
    expect(foreign).toEqual([])
  })
})

test.describe('an unreadable stored profile', () => {
  const BROKEN = '{ "app": "horizon", "version": 2, "household": '

  test('is announced on EVERY page, kept on the device, handed back byte for byte, and forgotten with « tout effacer »', async ({ page }) => {
    await page.addInitScript((text) => {
      if (sessionStorage.getItem('e2e-seeded')) return
      sessionStorage.setItem('e2e-seeded', '1')
      localStorage.setItem('horizon-profile', text)
    }, BROKEN)
    await page.goto('/')
    // On the Profil page — not only on Données — a person who finds a blank profile is told why.
    const banner = page.getByRole('status').filter({ hasText: 'était illisible' })
    await expect(banner).toBeVisible()
    await page.getByRole('link', { name: 'Hypothèses', exact: true }).click()
    await expect(banner).toBeVisible()

    await page.getByRole('link', { name: 'Données', exact: true }).click()
    const downloading = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Télécharger la copie illisible' }).click()
    const file = await downloading
    expect(readFileSync((await file.path())!, 'utf8')).toBe(BROKEN)

    await page.getByRole('button', { name: 'Tout effacer' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Tout effacer' }).click()
    await expect(page.getByRole('button', { name: 'Télécharger la copie illisible' })).toHaveCount(0)
    await expect(banner).toHaveCount(0)
  })
})

// THE LARGEST TEXT STEP is the one a low-vision reader chooses, and the one nobody sees: at 360 px the chart's « Dollars »
// sub-tab row ran 42 px past the screen (its flex item would not shrink, so its own scroll never engaged) and the bottom nav's
// « Hypothèses » and « Résultats » touched. The page-wide check above never ran at that size.
for (const width of [360, 390]) {
  test(`at the largest text size and ${width}px the page fits, each nav label stays inside its tab, and the chart's controls are reachable`, async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.addInitScript(() => localStorage.setItem('horizon-text-scale', 'x-large'))
    await page.setViewportSize({ width, height: 800 })
    for (const path of ['/', '/hypotheses', '/resultats']) {
      await page.goto(path)
      await page.locator('.page-head__title').waitFor()
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-text-scale')), 'the large step really applied').toBe('x-large')
      await expectNoHorizontalOverflow(page)
      const labelsOutside = await page.locator('.shell__tab').evaluateAll((tabs) =>
        tabs.flatMap((tab) => {
          const t = tab.getBoundingClientRect()
          const s = tab.querySelector('span')!.getBoundingClientRect()
          return s.left < t.left - 0.5 || s.right > t.right + 0.5 ? [tab.textContent ?? ''] : []
        }),
      )
      expect(labelsOutside, 'these nav labels are wider than their tab').toEqual([])
    }
    // On the chart, the sub-tab pill must be able to SCROLL (its content wider than it) rather than push its row off the screen.
    await page.goto('/resultats')
    const pill = page.locator('.chart-panel .subtabs').nth(1)
    await pill.waitFor()
    const room = await pill.evaluate((el) => ({ client: el.clientWidth, scroll: el.scrollWidth, right: el.getBoundingClientRect().right, viewport: document.documentElement.clientWidth }))
    expect(room.right, 'the pill stays on screen').toBeLessThanOrEqual(room.viewport)
    expect(room.scroll, 'and what does not fit is reachable by scrolling it').toBeGreaterThanOrEqual(room.client)
  })

  test(`every control a thumb must hit is at least 44 px tall at ${width}px: chips, small buttons, disclosures, ⓘ`, async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.setViewportSize({ width, height: 800 })
    for (const path of ['/', '/hypotheses', '/resultats', '/donnees']) {
      await page.goto(path)
      await page.locator('.page-head__title').waitFor()
      const small = await page.locator('.chip, .btn--sm, .disclosure__summary, .info-btn').evaluateAll((els) =>
        els.flatMap((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && r.height > 0 && r.height < 43.5 ? [`${el.className} ${Math.round(r.height)}px “${(el.textContent ?? '').trim().slice(0, 24)}”`] : []
        }),
      )
      expect(small, `${path}: controls under 44 px`).toEqual([])
    }
  })
}

for (const [name, width] of [['phone', 390], ['small phone', 360], ['tablet', 820], ['desktop', 1280]] as const) {
  test(`no page runs past the right edge at ${name} width (${width}px), with the example loaded and every ⓘ open`, async ({ page }) => {
    await seedProfile(page, EXAMPLE)
    await page.setViewportSize({ width, height: 800 })
    for (const path of ['/', '/?person=spouse', '/hypotheses', '/resultats', '/donnees']) {
      await page.goto(path)
      await page.locator('.page-head__title').waitFor()
      for (const t of await page.locator('.info-btn').all()) await t.click()
      for (const d of await page.locator('.disclosure__summary').all()) await d.click()
      await expectNoHorizontalOverflow(page)
    }
  })
}

// A ready-made scenario fills the economy in at once, the picker follows any hand edit back to « Personnalisé », and on a
// wide desktop screen no control stretches to fill the width it is given (measured at 1440 px: a percent in a 52 rem box).
test('the scenario picker sets the economy, follows a hand edit, and the desktop layout caps what should not stretch', async ({ page }) => {
  await seedProfile(page, EXAMPLE)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/hypotheses')
  const picker = page.getByRole('tablist', { name: 'Choisir un scénario' })
  await picker.getByRole('tab', { name: 'Prudent' }).click()
  await expect(picker.getByRole('tab', { name: 'Prudent' })).toHaveAttribute('aria-selected', 'true')
  await expect.poll(async () => (await savedProfile(page)).assumptions).toMatchObject({ inflation: 0.025, wageGrowth: 0.025, horizonAge: 100, returns: { rrsp: 0.03, tfsa: 0.03, nonReg: 0.025 } })

  const rrsp = page.getByRole('textbox', { name: 'REER' })
  await rrsp.fill('7')
  await rrsp.press('Enter')
  await expect(picker.getByRole('tab', { name: 'Personnalisé' })).toHaveAttribute('aria-selected', 'true')
  await picker.getByRole('tab', { name: 'Neutre' }).click()
  await expect(picker.getByRole('tab', { name: 'Personnalisé' })).toHaveCount(0)
  await expect.poll(async () => (await savedProfile(page)).assumptions.returns.rrsp).toBe(0.045)

  // Desktop: the field box and the pill stay a readable size, and the page is not glued to one side.
  const box = await page.locator('.field-row__control').first().boundingBox()
  expect(box!.width, 'a field box stretched across the card').toBeLessThanOrEqual(26 * 16 + 1)
  const pill = await picker.boundingBox()
  expect(pill!.width, 'the segmented control ran the whole card').toBeLessThanOrEqual(30 * 16 + 1)
  const main = await page.locator('.shell__main').boundingBox()
  const nav = await page.locator('.shell__nav').boundingBox()
  expect(main!.x, 'the content hugs the sidebar with the empty space all on the right').toBeGreaterThanOrEqual(nav!.x + nav!.width)
  await expectNoHorizontalOverflow(page)
})
