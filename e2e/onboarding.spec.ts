import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, PROFILE_KEY, blankSeed, openSituation, savedProfile, seedProfile } from './seed'
import { exactBox } from './slider'

// THE FIRST VISIT: one question per screen, information by information. A blank form is a wall; the first landing asks who, born when,
// earning what, saving what, which employer plan, wanting to stop when, spending what, owning what — each with its one line of why —
// writes every answer to the same stored profile the full form edits, and hands over to the answer. A returning visitor never sees it.

test.beforeEach(async ({ page }) => seedProfile(page, blankSeed()))

const next = (page: Page) => page.getByRole('button', { name: 'Suivant', exact: true }).click()
const back = (page: Page) => page.getByRole('button', { name: 'Précédent', exact: true }).click()
const progress = (page: Page) => page.locator('.onboard__step')
const box = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true })
const fill = async (page: Page, name: string, value: string) => {
  // A bounded figure (the retirement age) is a slider; its box is one tap away.
  const f = (await page.getByRole('slider', { name, exact: true }).count()) > 0 ? await exactBox(page, name, true) : box(page, name)
  await f.fill(value)
  await f.press('Enter')
}
test('the first landing is ONE question, not the form: who the calculation is for, with its promise, and nothing else on the page', async ({ page }) => {
  await page.goto('/profil?bloc=tout')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pour commencer')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Pour qui faisons-nous le calcul ?')
  // the promise: how many questions, and what comes out
  await expect(page.locator('.onboard__lead')).toContainText('7 questions, et vous saurez à quel âge l’argent suffit.')
  await expect(progress(page)).toHaveText('Question 1 sur 7')
  await expect(page.locator('.onboard__why')).toContainText('Un couple se calcule ensemble')
  // the whole form is NOT on the page: no person column, no sections of numbers — and no keyboard: the landing screen has no box
  await expect(page.locator('#person-self')).toHaveCount(0)
  await expect(page.getByRole('textbox')).toHaveCount(0)
  // the way out is plain: an example, or the full form
  await expect(page.getByRole('link', { name: 'Voir un exemple' })).toHaveAttribute('href', '/donnees?autres=examples')
  await expect(page.getByRole('button', { name: 'Passer au formulaire complet' })).toBeVisible()
})

test('the year of birth is typed, never pre-filled: the box is empty, « Suivant » waits for it, and the box has focus', async ({ page }) => {
  await page.goto('/profil?bloc=tout')
  await next(page)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Quelle est votre année de naissance ?')
  const year = box(page, 'Année de naissance')
  await expect(year).toHaveValue('')
  await expect(year).toBeFocused()
  await expect(page.getByRole('button', { name: 'Suivant', exact: true })).toBeDisabled()
  // the month is not asked here: the form has it, and it only moves a first payment by a few months
  await expect(page.getByRole('textbox', { name: /Mois de naissance/ })).toHaveCount(0)
  await fill(page, 'Année de naissance', '1985')
  // Enter in the box moved on by itself — to « Ma situation », the first screen that decides the rest
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Quelques oui ou non sur votre situation')
  await next(page)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Combien gagnez-vous par année ?')
  await expect(box(page, 'Revenu de travail par année')).toBeFocused()
})

test('walking through for one person: each answer is saved as typed, and the answer answers', async ({ page }) => {
  await page.goto('/profil?bloc=tout')
  await next(page) // who: Juste moi (the default)
  await fill(page, 'Année de naissance', '1985')
  // « Ma situation »: an employer plan, yes (so its screen comes later); a home, no (so its screen never does)
  await page.getByRole('radiogroup', { name: /régime de retraite d’employeur/ }).getByRole('radio', { name: 'Oui' }).click()
  await next(page)
  await fill(page, 'Revenu de travail par année', '90000')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Que contiennent vos comptes d’épargne ?')
  await box(page, 'REER (épargne-retraite)').fill('85000')
  await fill(page, 'CELI (épargne libre d’impôt)', '40000')
  // Enter in the last box of the screen moved on
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Avez-vous un régime de retraite d’employeur ?')
  await page.getByRole('radio', { name: 'Oui, le RREGOP' }).click()
  await fill(page, 'Années de service (sur votre relevé)', '12')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('À quel âge pensez-vous arrêter de travailler ?')
  await fill(page, 'Vous', '62')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Combien dépensez-vous par année ?')
  // « estimate » is offered once there is an income, says it is an estimate, and fills the figure
  await page.getByRole('button', { name: 'Estimer : 60 % du revenu brut' }).click()
  await expect(page.locator('.onboard__body')).toContainText('Estimation : 54 000 $')
  await next(page)
  // the last screen: what was said, and the way on
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('C’est assez pour une première réponse')
  await expect(page.locator('.onboard__summary')).toContainText('Année de naissance : 1985')
  await expect(page.locator('.onboard__summary')).toContainText('Régime d’employeur : RREGOP')
  await expect(page.locator('.onboard__summary')).toContainText('Retraite visée à 62 ans')
  await expect(page.locator('.onboard__why')).toContainText('une estimation reste une estimation')
  // the work is freshest here: one tap keeps a copy off this device, and the backup stamps say so
  const copy = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Sauvegarder une copie' }).click()
  expect((await copy).suggestedFilename()).toMatch(/^horizon-\d{4}-\d{2}-\d{2}\.json$/)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('horizon-last-export') !== null)).toBe(true)
  // everything was written to the stored profile, as typed (the store saves a beat after the last answer)
  await expect.poll(async () => (await savedProfile(page)).household.spending.retiredToday).toBe(54_000)
  const p = await savedProfile(page)
  expect(p.household.persons[0].birth.year).toBe(1985)
  expect(p.household.persons[0].salaryToday).toBe(90_000)
  expect(p.household.persons[0].accounts.rrsp.balance).toBe(85_000)
  expect(p.household.persons[0].accounts.tfsa.balance).toBe(40_000)
  expect(p.household.persons[0].pensions).toHaveLength(1)
  expect(p.household.persons[0].pensions[0]).toMatchObject({ label: 'RREGOP', serviceYearsToDate: 12 })
  expect(p.household.persons[0].retirementAge).toBe(62)
  expect(p.household.spending).toEqual({ workingToday: 54_000, retiredToday: 54_000 })
  expect(p.household.home).toBeNull()
  // what was TYPED is confirmed (a birth year and a retirement age are not facts); the « Estimer » spending is an estimate until typed over
  expect([...p.confirmed].sort()).toEqual(['self:pension', 'self:rrspBalance', 'self:salary', 'self:tfsaBalance'])
  await page.getByRole('button', { name: 'Voir ma réponse' }).click()
  await expect(page.getByText(/Vous pouvez (prendre votre retraite|déjà prendre)/)).toBeVisible()
  // …and the answer opens ON the answer: nothing scrolled it out of sight
  await expect(page.locator('.verdict__line')).toBeInViewport()
  await expect(page.locator('.refine__confidence')).toContainText('Voir ce qui préciserait la réponse')
})

test('the answer forms under the question as soon as it can be computed: absent on the landing and while a figure is missing, present once income and spending are typed, and it never takes the focus', async ({ page }) => {
  // the strip IN the path (the top bar carries the same answer, outside <main>)
  const strip = page.locator('main').getByRole('status').filter({ hasText: 'Votre réponse' })
  await page.goto('/profil?bloc=tout')
  await expect(strip).toHaveCount(0) // the landing screen
  await next(page)
  await fill(page, 'Année de naissance', '1985')
  await next(page) // « Ma situation »: every answer « non »
  await fill(page, 'Revenu de travail par année', '90000')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Que contiennent vos comptes d’épargne ?')
  await expect(strip).toHaveCount(0) // an income is not enough: the spending is still missing
  await next(page)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('À quel âge pensez-vous arrêter de travailler ?')
  await next(page)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Combien dépensez-vous par année ?')
  await fill(page, 'Dépenses par année', '50000') // Enter commits it and moves on to the last screen
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('C’est assez pour une première réponse')
  await expect(strip).toContainText('ans', { timeout: 30_000 })
  // a passive line: it never takes the focus
  await expect(strip.getByRole('link', { name: 'Voir' })).not.toBeFocused()
  await expect(strip.getByRole('link', { name: 'Voir' })).toHaveAttribute('href', '/resultats')
})

test('a couple adds a person’s questions in the same order, and the progress counts them', async ({ page }) => {
  await page.goto('/profil?bloc=tout')
  await page.getByRole('radio', { name: 'Moi et mon ou ma partenaire' }).click()
  await expect(progress(page)).toHaveText('Question 1 sur 10')
  await next(page)
  await fill(page, 'Année de naissance', '1980')
  await next(page) // « Ma situation »: every answer « non »
  await fill(page, 'Revenu de travail par année', '100000')
  await next(page) // savings
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Quelle est l’année de naissance de votre partenaire ?')
  await fill(page, 'Année de naissance', '1982')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Combien gagne votre partenaire par année ?')
  await fill(page, 'Revenu de travail par année', '60000')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Et les comptes de votre partenaire ?')
  await next(page)
  // the retirement ages: one box each
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('À quel âge pensez-vous arrêter de travailler ?')
  await expect(page.getByRole('slider', { name: 'Vous', exact: true })).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Votre partenaire', exact: true })).toBeVisible()
  await expect.poll(async () => (await savedProfile(page)).household.persons[1]?.salaryToday).toBe(60_000)
  const p = await savedProfile(page)
  expect(p.household.persons.map((x: { id: string }) => x.id)).toEqual(['self', 'spouse'])
  expect(p.household.persons[1].birth.year).toBe(1982)
  expect(p.household.persons[1].salaryToday).toBe(60_000)
})

test('going back to « Juste moi » after typing for the partner asks first, in words that say what is lost', async ({ page }) => {
  await page.goto('/profil?bloc=tout')
  await page.getByRole('radio', { name: 'Moi et mon ou ma partenaire' }).click()
  await next(page)
  await fill(page, 'Année de naissance', '1980')
  await next(page) // « Ma situation »: every answer « non »
  await fill(page, 'Revenu de travail par année', '100000')
  await next(page)
  await fill(page, 'Année de naissance', '1982')
  for (let i = 0; i < 6; i++) await back(page)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Pour qui faisons-nous le calcul ?')
  await page.getByRole('radio', { name: 'Juste moi' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('sera effacé')
  await dialog.getByRole('button', { name: 'Annuler' }).click()
  expect((await savedProfile(page)).household.persons).toHaveLength(2)
  await page.getByRole('radio', { name: 'Juste moi' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Effacer' }).click()
  await expect.poll(async () => (await savedProfile(page)).household.persons.length).toBe(1)
})

test('going back keeps what was typed; a home asks for its balance and, if there is one, the payment', async ({ page }) => {
  await page.goto('/profil?bloc=tout')
  await next(page)
  await fill(page, 'Année de naissance', '1990')
  // « Ma situation »: a home, yes — which is why its screen comes later
  await page.getByRole('radiogroup', { name: /Propriétaire de votre résidence/ }).getByRole('radio', { name: 'Oui' }).click()
  await back(page)
  await expect(box(page, 'Année de naissance')).toHaveValue('1990')
  // jump to the home question: the typed year lets « Suivant » through, then one tap per question
  for (let i = 0; i < 6; i++) await next(page)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Êtes-vous propriétaire de votre résidence ?')
  await page.getByRole('radio', { name: 'Oui, je suis propriétaire' }).click()
  await box(page, 'Valeur de la maison').fill('500000')
  await box(page, 'Valeur de la maison').blur()
  await expect(box(page, 'Paiement mensuel')).toHaveCount(0) // no balance, no loan, no payment to ask for
  await box(page, 'Solde de l’hypothèque').fill('200000')
  await box(page, 'Solde de l’hypothèque').blur()
  await box(page, 'Paiement mensuel').fill('1400')
  await box(page, 'Paiement mensuel').blur()
  await expect.poll(async () => (await savedProfile(page)).household.home?.mortgage.monthlyPayment).toBe(1_400)
  expect((await savedProfile(page)).household.home).toMatchObject({ value: 500_000, mortgage: { balance: 200_000, monthlyPayment: 1_400 }, sale: null })
})

test('the last screen says what is still missing, takes the reader back to that question, and holds the answer back until it is there', async ({ page }) => {
  await page.goto('/profil?bloc=tout')
  await next(page)
  await fill(page, 'Année de naissance', '1985')
  for (let i = 0; i < 5; i++) await next(page)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Il manque une réponse')
  const gaps = page.locator('.onboard__gaps li')
  await expect(gaps).toHaveCount(2)
  await expect(gaps.first()).toContainText('aucun revenu, régime ni compte n’est saisi')
  await expect(page.getByRole('button', { name: 'Voir ma réponse' })).toBeDisabled()
  // each missing item leads back to its question
  await gaps.first().getByRole('button', { name: 'Répondre' }).click()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Combien gagnez-vous par année ?')
})

test('leaving for the full form: the form is there, with what was typed, and a link can carry the choice', async ({ page }) => {
  await page.goto('/profil?bloc=tout')
  await next(page)
  await fill(page, 'Année de naissance', '1975')
  await page.getByRole('button', { name: 'Passer au formulaire complet' }).click()
  await expect(page).toHaveURL(/form=1/)
  await expect(page.locator('#person-self')).toBeVisible()
  await expect(page.locator('#person-self').getByRole('textbox', { name: 'Année de naissance' })).toHaveValue('1975')
  await page.goto('/profil?bloc=tout&form=1')
  await expect(page.locator('#person-self')).toBeVisible()
})

test('a returning visitor — someone with a profile — never sees the path', async ({ page }) => {
  // Seeded BEFORE the first load, as a returning visitor's profile is: overwriting storage under a page that has just loaded races the app's own write when the page is hidden (the reload).
  // (the file's beforeEach already seeded a blank one, once per tab; this init script runs after it and puts a real profile in place.)
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [PROFILE_KEY, JSON.stringify(EXAMPLE)])
  await page.goto('/profil?bloc=tout')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Profil')
  await expect(page.locator('.onboard')).toHaveCount(0)
  await expect(page.locator('#person-self')).toBeVisible()
})

test('on a phone each question fits the screen: no sideways scroll, the buttons are thumb-sized', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/profil?bloc=tout')
  const check = async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    for (const b of await page.locator('.onboard button.btn:not(.btn--sm)').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(43)
  }
  await check()
  await next(page)
  await check()
  await fill(page, 'Année de naissance', '1985')
  await check()
  await next(page)
  await check()
})

// « Ma situation » is the third thing the first visit asks, right after who and when: its answers decide which of the later screens a person is asked at all.
const situation = (page: Page) => page.getByRole('heading', { level: 2, name: 'Quelques oui ou non sur votre situation' })
const ask = (page: Page, text: string | RegExp) => page.getByRole('radiogroup', { name: text })
const toSituation = async (page: Page, birth = '1985') => {
  await page.goto('/profil?bloc=tout')
  await next(page) // who: Juste moi
  await fill(page, 'Année de naissance', birth)
  await expect(situation(page)).toBeVisible()
}

test('« Ma situation » comes third, with the questions that gate the rest — every answer « non » until a « oui »', async ({ page }) => {
  await toSituation(page)
  await expect(progress(page)).toHaveText('Question 3 sur 7')
  await expect(page.getByRole('radiogroup')).toHaveCount(6)
  for (const q of [/Des enfants à la maison/, /Propriétaire de votre résidence/, /régime de retraite d’employeur/, /Des placements hors REER et CELI/, /Des années hors du Canada/, /Du travail après votre retraite/]) {
    await expect(ask(page, q).getByRole('radio', { name: 'Non' })).toBeChecked()
  }
})

test('every answer « non »: no non-registered box, no plan screen, no home screen — the path is shorter, and the last screen follows spending', async ({ page }) => {
  await toSituation(page)
  await next(page)
  await fill(page, 'Revenu de travail par année', '80000')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Que contiennent vos comptes d’épargne ?')
  await expect(box(page, 'REER (épargne-retraite)')).toBeVisible()
  await expect(box(page, 'CELI (épargne libre d’impôt)')).toBeVisible()
  await expect(box(page, 'Autres placements, hors REER et CELI')).toHaveCount(0)
  await next(page)
  // no « Avez-vous un régime de retraite d’employeur ? » here: straight to the retirement age
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('À quel âge pensez-vous arrêter de travailler ?')
  await fill(page, 'Vous', '62')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Combien dépensez-vous par année ?')
  await fill(page, 'Dépenses par année', '60000')
  // no home screen either: the last one
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('C’est assez pour une première réponse')
})

test('a « oui » keeps the screen it would have skipped: the plan, the non-registered box and the home each come back, and the count grows', async ({ page }) => {
  await toSituation(page)
  await ask(page, /régime de retraite d’employeur/).getByRole('radio', { name: 'Oui' }).click()
  await expect(progress(page)).toHaveText('Question 3 sur 8')
  await ask(page, /Propriétaire de votre résidence/).getByRole('radio', { name: 'Oui' }).click()
  await expect(progress(page)).toHaveText('Question 3 sur 9')
  await ask(page, /Des placements hors REER et CELI/).getByRole('radio', { name: 'Oui' }).click()
  await expect(progress(page)).toHaveText('Question 3 sur 9') // a box on a screen that was there, not a new screen
  await next(page)
  await fill(page, 'Revenu de travail par année', '80000')
  await expect(box(page, 'Autres placements, hors REER et CELI')).toBeVisible()
  await next(page)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Avez-vous un régime de retraite d’employeur ?')
  await next(page)
  await fill(page, 'Vous', '62')
  await fill(page, 'Dépenses par année', '60000')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Êtes-vous propriétaire de votre résidence ?')
})

test('a couple is asked for each person: the plan screen of the partner comes only with the partner’s « oui »', async ({ page }) => {
  await page.goto('/profil?bloc=tout')
  await page.getByRole('radio', { name: 'Moi et mon ou ma partenaire' }).click()
  await next(page)
  await fill(page, 'Année de naissance', '1980')
  await expect(situation(page)).toBeVisible()
  // one group of questions each, named
  await expect(page.getByRole('group', { name: 'Moi' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Partenaire' })).toBeVisible()
  await expect(page.getByRole('radiogroup')).toHaveCount(2 + 4 * 2)
  // the partner has a plan, I do not
  await page.getByRole('group', { name: 'Partenaire' }).getByRole('radiogroup', { name: /régime de retraite d’employeur/ }).getByRole('radio', { name: 'Oui' }).click()
  await next(page)
  await fill(page, 'Revenu de travail par année', '90000')
  await next(page) // savings
  // no plan screen for me
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Quelle est l’année de naissance de votre partenaire ?')
  await fill(page, 'Année de naissance', '1982')
  await fill(page, 'Revenu de travail par année', '60000')
  await next(page) // the partner's savings
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Et votre partenaire, un régime de retraite d’employeur ?')
})

test('what is answered here is what the full form shows: the same questions, the same answers, the sections they open', async ({ page }) => {
  await toSituation(page, '1975')
  await ask(page, /Des années hors du Canada/).getByRole('radio', { name: 'Oui' }).click()
  await ask(page, /Des enfants à la maison/).getByRole('radio', { name: 'Oui' }).click()
  await page.getByRole('button', { name: 'Passer au formulaire complet' }).click()
  await expect(page).toHaveURL(/form=1/)
  await openSituation(page)
  await expect(page.locator('#situation')).toBeVisible()
  await expect(page.locator('#situation').getByRole('radiogroup', { name: /Des années hors du Canada/ }).getByRole('radio', { name: 'Oui' })).toBeChecked()
  await expect(page.locator('#situation').getByRole('radiogroup', { name: /Des enfants à la maison/ }).getByRole('radio', { name: 'Oui' })).toBeChecked()
  await expect(page.locator('#situation').getByRole('radiogroup', { name: /régime de retraite d’employeur/ }).getByRole('radio', { name: 'Non' })).toBeChecked()
  await expect(page.getByText('Au Canada depuis (année)')).toBeVisible()
})

// THE QUICK PATH (« J'ai 2 minutes », `?debut=rapide`): who, born when, income, savings, spending — nothing else — and a last screen that calls the departure age an assumption.
test('the quick path asks only what a first answer needs: five questions for one person, and none of situation, plan, retirement age or home', async ({ page }) => {
  await page.goto('/profil?bloc=tout&debut=rapide')
  await expect(page.locator('.onboard__lead')).toContainText('5 questions')
  await expect(progress(page)).toHaveText('Question 1 sur 5')
  await next(page) // who: Juste moi
  await fill(page, 'Année de naissance', '1985') // straight to the income — « Ma situation » is not asked
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Combien gagnez-vous par année ?')
  await expect(progress(page)).toHaveText('Question 3 sur 5')
  await fill(page, 'Revenu de travail par année', '90000')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Que contiennent vos comptes d’épargne ?')
  await next(page)
  // no retirement-age screen: spending is next
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Combien dépensez-vous par année ?')
  await fill(page, 'Dépenses par année', '50000')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('C’est assez pour une première réponse')
})

test('the quick path’s last screen states the departure age as an ASSUMPTION, never as an answer', async ({ page }) => {
  await page.goto('/profil?bloc=tout&debut=rapide')
  await next(page)
  await fill(page, 'Année de naissance', '1985')
  await fill(page, 'Revenu de travail par année', '90000')
  await next(page)
  await fill(page, 'Dépenses par année', '50000')
  const summary = page.locator('.onboard__summary')
  await expect(summary).toContainText('On a supposé un départ à 65 ans — à vous de le changer.')
  await expect(summary).not.toContainText('Retraite visée')
  await expect(summary).toContainText('On n’a compté ni régime d’employeur ni maison pour l’instant.')
  // what WAS answered is still said as answered
  await expect(summary).toContainText('Année de naissance : 1985')
  await expect(summary).toContainText('Dépenses : 50 000 $ par année')
})

test('a couple on the quick path is asked each person’s birth, income and savings, and the assumption names both ages', async ({ page }) => {
  await page.goto('/profil?bloc=tout&debut=rapide')
  await page.getByRole('radio', { name: 'Moi et mon ou ma partenaire' }).click()
  await expect(progress(page)).toHaveText('Question 1 sur 8')
  await next(page)
  await fill(page, 'Année de naissance', '1980')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Quelle est l’année de naissance de votre partenaire ?')
  await fill(page, 'Année de naissance', '1982')
  await fill(page, 'Revenu de travail par année', '100000')
  await fill(page, 'Revenu de travail par année', '60000')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Que contiennent vos comptes d’épargne ?')
  await next(page)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Et les comptes de votre partenaire ?')
  await next(page)
  await fill(page, 'Dépenses par année', '70000')
  await expect(page.locator('.onboard__summary')).toContainText('On a supposé un départ à 65 ans pour vous et à 65 ans pour votre partenaire')
})

test('« Préciser » on the quick path’s last screen re-enters the FULL questions at « Ma situation »', async ({ page }) => {
  await page.goto('/profil?bloc=tout&debut=rapide')
  await next(page)
  await fill(page, 'Année de naissance', '1985')
  await fill(page, 'Revenu de travail par année', '90000')
  await next(page)
  await fill(page, 'Dépenses par année', '50000')
  await page.getByRole('button', { name: 'Préciser (départ, régime, maison)' }).click()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Quelques oui ou non sur votre situation')
  // the full path: seven questions, the situation third
  await expect(progress(page)).toHaveText('Question 3 sur 7')
  await next(page)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Combien gagnez-vous par année ?')
  // what was typed is kept
  await expect(box(page, 'Revenu de travail par année')).toHaveValue(/90/)
})

test('an unknown value of the quick key is the full path', async ({ page }) => {
  await page.goto('/profil?bloc=tout&debut=lent')
  await expect(progress(page)).toHaveText('Question 1 sur 7')
})

test('a figure typed on the path is confirmed; the « Estimer » figure is an estimate until typed over', async ({ page }) => {
  await toSituation(page)
  await next(page)
  await fill(page, 'Revenu de travail par année', '90000')
  await next(page) // savings, left as they are
  await fill(page, 'Vous', '62')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Combien dépensez-vous par année ?')
  await page.getByRole('button', { name: 'Estimer : 60 % du revenu brut' }).click()
  await expect.poll(async () => (await savedProfile(page)).household.spending.retiredToday).toBe(54_000)
  expect((await savedProfile(page)).confirmed).toEqual(['self:salary'])
  await fill(page, 'Dépenses par année', '48000')
  await expect.poll(async () => (await savedProfile(page)).confirmed.sort()).toEqual(['household:spendingRetired', 'household:spendingWorking', 'self:salary'])
})

// « SI VOUS SAUTEZ »: under a question's why, one line says what is assumed if the screen is left as it is — only while its value is still the default.
test('the savings screen says what a skip assumes while it is empty, and the line goes once a figure is typed; birth and income never carry one', async ({ page }) => {
  const skip = page.getByText('Sans chiffre, on suppose 0 $ — votre réponse sera prudente.')
  await toSituation(page)
  await expect(skip).toHaveCount(0) // « Ma situation »: nothing to assume
  await next(page)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Combien gagnez-vous par année ?')
  await expect(page.getByText(/on suppose|sera prudente/)).toHaveCount(0) // income is a gap, not an assumption
  await fill(page, 'Revenu de travail par année', '80000')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Que contiennent vos comptes d’épargne ?')
  await expect(skip).toBeVisible()
  await box(page, 'REER (épargne-retraite)').fill('85000')
  await box(page, 'REER (épargne-retraite)').blur()
  await expect(skip).toHaveCount(0)
  await box(page, 'REER (épargne-retraite)').fill('')
  await box(page, 'REER (épargne-retraite)').blur()
  await expect(skip).toBeVisible() // back to the default: the line is back (derived, never stored)
})

test('the spending screen says that no figure means no answer yet', async ({ page }) => {
  await toSituation(page)
  await next(page)
  await fill(page, 'Revenu de travail par année', '80000')
  await next(page)
  await next(page)
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Combien dépensez-vous par année ?')
  await expect(page.getByText(/Sans chiffre, il n’y a pas encore de réponse/)).toBeVisible()
  await fill(page, 'Dépenses par année', '50000')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('C’est assez pour une première réponse')
})

// THE TAP THAT WAS SWALLOWED: typing a figure and tapping « Suivant » once. The tap blurs the box, the box commits, and the screen under the button used to
// reflow (« Sans chiffre, on suppose 0 $ » left, « Votre réponse » arrived), moving the button between pointer-down and pointer-up.
test('the quick path: a savings figure typed and ONE tap on « Suivant » moves to question 5, and the button does not move', async ({ page }) => {
  const seed = blankSeed() as { household: { spending: Record<string, number> } }
  seed.household.spending = { workingToday: 50000, retiredToday: 50000 }
  // the file-wide seed has run: let this one replace it (seedProfile keeps the first profile it stored in a tab)
  await page.addInitScript(() => sessionStorage.removeItem('e2e-seeded'))
  await seedProfile(page, seed as never)
  await page.goto('/profil?bloc=tout&debut=rapide')
  await next(page)
  await fill(page, 'Année de naissance', '1985')
  await fill(page, 'Revenu de travail par année', '70000')
  await expect(progress(page)).toHaveText('Question 4 sur 5')
  const button = page.getByRole('button', { name: 'Suivant', exact: true })
  await box(page, 'REER (épargne-retraite)').fill('45000')
  await button.click()
  await expect(progress(page)).toHaveText('Question 5 sur 5')
})

test('« Suivant » keeps a figure typed without a blur (a keyboard or screen-reader activation)', async ({ page }) => {
  await page.goto('/profil?bloc=tout&debut=rapide')
  await next(page)
  await fill(page, 'Année de naissance', '1985')
  await fill(page, 'Revenu de travail par année', '70000')
  await box(page, 'REER (épargne-retraite)').fill('45000')
  await page.getByRole('button', { name: 'Suivant', exact: true }).evaluate((b) => (b as HTMLButtonElement).click())
  await expect(progress(page)).toHaveText('Question 5 sur 5')
  await fill(page, 'Dépenses par année', '50000')
  await expect(page.locator('.onboard__summary')).toContainText('45 000')
})

test('the income box opens with its 0 selected: typing replaces it (« 70000 », never « 070000 »)', async ({ page }) => {
  await page.goto('/profil?bloc=tout&debut=rapide')
  await next(page)
  await fill(page, 'Année de naissance', '1985')
  const income = box(page, 'Revenu de travail par année')
  await expect(income).toBeFocused()
  await page.keyboard.type('70000')
  await expect(income).toHaveValue(/^70[\s  ]?000$/)
})

test('the reserved slot holds: the button is where it was before and after the typed figure commits and the answer arrives', async ({ page }) => {
  const seed = blankSeed() as { household: { spending: Record<string, number> } }
  seed.household.spending = { workingToday: 50000, retiredToday: 50000 }
  // the file-wide seed has run: let this one replace it (seedProfile keeps the first profile it stored in a tab)
  await page.addInitScript(() => sessionStorage.removeItem('e2e-seeded'))
  await seedProfile(page, seed as never)
  await page.goto('/profil?bloc=tout&debut=rapide')
  await next(page)
  await fill(page, 'Année de naissance', '1985')
  await fill(page, 'Revenu de travail par année', '70000')
  const button = page.getByRole('button', { name: 'Suivant', exact: true })
  // the y once it has held for three samples: the screen's own entrance is over, only a reflow may move the button from here
  const settledY = async () => {
    let last = -1
    for (let held = 0; held < 3; ) {
      await page.waitForTimeout(100)
      const y = (await button.boundingBox())!.y
      held = y === last ? held + 1 : 0
      last = y
    }
    return last
  }
  const before = await settledY()
  await box(page, 'REER (épargne-retraite)').fill('45000')
  await box(page, 'REER (épargne-retraite)').blur()
  await expect(page.locator('.live-answer')).toContainText('Votre réponse')
  expect(Math.abs((await settledY()) - before)).toBeLessThan(1)
})
