import { expect, test, type Page } from '@playwright/test'
import { EXAMPLE, PROFILE_KEY, blankSeed, savedProfile, seedProfile } from './seed'

// THE FIRST VISIT: one question per screen, information by information. A blank form is a wall; the first landing asks who, born when,
// earning what, saving what, which employer plan, wanting to stop when, spending what, owning what — each with its one line of why —
// writes every answer to the same stored profile the full form edits, and hands over to the answer. A returning visitor never sees it.

test.beforeEach(async ({ page }) => seedProfile(page, blankSeed()))

const next = (page: Page) => page.getByRole('button', { name: 'Suivant', exact: true }).click()
const back = (page: Page) => page.getByRole('button', { name: 'Précédent', exact: true }).click()
const progress = (page: Page) => page.locator('.onboard__step')
const box = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true })
const fill = async (page: Page, name: string, value: string) => {
  const f = box(page, name)
  await f.fill(value)
  await f.press('Enter')
}
test('the first landing is ONE question, not the form: who the calculation is for, with its promise, and nothing else on the page', async ({ page }) => {
  await page.goto('/profil')
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
  await expect(page.getByRole('link', { name: 'Voir un exemple' })).toHaveAttribute('href', '/donnees')
  await expect(page.getByRole('button', { name: 'Passer au formulaire complet' })).toBeVisible()
})

test('the year of birth is typed, never pre-filled: the box is empty, « Suivant » waits for it, and the box has focus', async ({ page }) => {
  await page.goto('/profil')
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
  await page.goto('/profil')
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
  await expect(page.locator('.onboard__why')).toContainText('estimations tant que vous ne les confirmez pas')
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
  expect(p.confirmed).toEqual([]) // an estimate, a guess, a typed number: none is called real until the person says so
  await page.getByRole('button', { name: 'Voir ma réponse' }).click()
  await expect(page.getByText(/Vous pouvez (prendre votre retraite|déjà prendre)/)).toBeVisible()
  // …and the answer opens ON the answer: nothing scrolled it out of sight
  await expect(page.locator('.verdict__line')).toBeInViewport()
  await expect(page.locator('.refine')).toContainText('Préciser le calcul')
})

test('a couple adds a person’s questions in the same order, and the progress counts them', async ({ page }) => {
  await page.goto('/profil')
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
  await expect(box(page, 'Vous')).toBeVisible()
  await expect(box(page, 'Votre partenaire')).toBeVisible()
  await expect.poll(async () => (await savedProfile(page)).household.persons[1]?.salaryToday).toBe(60_000)
  const p = await savedProfile(page)
  expect(p.household.persons.map((x: { id: string }) => x.id)).toEqual(['self', 'spouse'])
  expect(p.household.persons[1].birth.year).toBe(1982)
  expect(p.household.persons[1].salaryToday).toBe(60_000)
})

test('going back to « Juste moi » after typing for the partner asks first, in words that say what is lost', async ({ page }) => {
  await page.goto('/profil')
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
  await page.goto('/profil')
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
  await page.goto('/profil')
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
  await page.goto('/profil')
  await next(page)
  await fill(page, 'Année de naissance', '1975')
  await page.getByRole('button', { name: 'Passer au formulaire complet' }).click()
  await expect(page).toHaveURL(/form=1/)
  await expect(page.locator('#person-self')).toBeVisible()
  await expect(page.locator('#person-self').getByRole('textbox', { name: 'Année de naissance' })).toHaveValue('1975')
  await page.goto('/profil?form=1')
  await expect(page.locator('#person-self')).toBeVisible()
})

test('a returning visitor — someone with a profile — never sees the path', async ({ page }) => {
  await page.goto('/profil')
  await page.evaluate(([key, value]) => localStorage.setItem(key, value), [PROFILE_KEY, JSON.stringify(EXAMPLE)])
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Profil')
  await expect(page.locator('.onboard')).toHaveCount(0)
  await expect(page.locator('#person-self')).toBeVisible()
})

test('on a phone each question fits the screen: no sideways scroll, the buttons are thumb-sized', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/profil')
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
  await page.goto('/profil')
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
  await page.goto('/profil')
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
  await expect(page.locator('#situation')).toBeVisible()
  await expect(page.locator('#situation').getByRole('radiogroup', { name: /Des années hors du Canada/ }).getByRole('radio', { name: 'Oui' })).toBeChecked()
  await expect(page.locator('#situation').getByRole('radiogroup', { name: /Des enfants à la maison/ }).getByRole('radio', { name: 'Oui' })).toBeChecked()
  await expect(page.locator('#situation').getByRole('radiogroup', { name: /régime de retraite d’employeur/ }).getByRole('radio', { name: 'Non' })).toBeChecked()
  await expect(page.getByText('Au Canada depuis (année)')).toBeVisible()
})
