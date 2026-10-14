import { expect, test, type Locator, type Page } from '@playwright/test'
import { savedProfile, seedProfile } from './seed'

// « Importer un relevé de banque »: a bank's CSV counted by category over the last twelve complete months, read on the device. The person ticks what is spending and uses the total.

/** Twelve months of 2025 (every month closes on the 28th): groceries 500 $, a 2 000 $ transfer and 5 000 $ of pay each — signed amounts, a semicolon. */
function year(): string {
  const lines = ['Date;Description;Catégorie;Montant']
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0')
    lines.push(`2025-${mm}-05;IGA;Épicerie;-500,00`, `2025-${mm}-10;Virement;Transfert;-2 000,00`, `2025-${mm}-15;Paie;Revenus;5 000,00`, `2025-${mm}-28;Pharmacie;Pharmacie;-100,00`)
  }
  return lines.join('\n')
}

test.beforeEach(async ({ page }) => {
  await seedProfile(page)
  await page.goto('/profil?form=1')
})

const sheet = (page: Page): Locator => page.locator('details.fold', { hasText: 'Importer un relevé de banque' })

async function open(page: Page): Promise<Locator> {
  const s = sheet(page)
  await s.locator('summary').click()
  return s
}

test('a pasted export is counted by category: spending ticked, transfers and pay not, and the total follows the ticks', async ({ page }) => {
  const s = await open(page)
  await s.getByRole('textbox', { name: 'Opérations copiées du relevé' }).fill(year())
  const status = s.getByRole('status')
  await expect(status).toContainText('48 opérations lues, de 01/2025 à 12/2025')
  await expect(status).not.toContainText('Moins de douze mois')
  await expect(status.getByRole('button', { name: /^Épicerie · 6\s000\s\$/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(status.getByRole('button', { name: /^Pharmacie · 1\s200\s\$/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(status.getByRole('button', { name: /^Transfert · 24\s000\s\$/ })).toHaveAttribute('aria-pressed', 'false')
  // Pay is money in: not a group of spending at all.
  await expect(status.getByRole('button', { name: /^Revenus/ })).toHaveCount(0)
  await expect(status).toContainText(/Dépenses comptées\s*:\s*7\s200\s\$ par année, soit 600\s\$ par mois\./)
  await status.getByRole('button', { name: /^Pharmacie/ }).click()
  await expect(status).toContainText(/Dépenses comptées\s*:\s*6\s000\s\$ par année, soit 500\s\$ par mois\./)
  await status.getByRole('button', { name: /^Transfert/ }).click()
  await expect(status).toContainText(/Dépenses comptées\s*:\s*30\s000\s\$ par année/)
})

test('using the total sets the spending while working and confirms it', async ({ page }) => {
  const s = await open(page)
  await s.getByRole('textbox', { name: 'Opérations copiées du relevé' }).fill(year())
  await s.getByRole('button', { name: 'Utiliser pour mes dépenses pendant le travail' }).click()
  await expect.poll(async () => (await savedProfile(page)).household.spending.workingToday).toBe(7200)
  expect((await savedProfile(page)).confirmed as string[]).toContain('household:spendingWorking')
  await expect(page.getByText(/Dépenses pendant le travail mises à 7\s200\s\$ par année/)).toBeVisible()
  await expect(s.getByRole('textbox', { name: 'Opérations copiées du relevé' })).toHaveValue('') // the worksheet is emptied
})

test('a file opened from the device is read the same way, several in a row', async ({ page }) => {
  const s = await open(page)
  const first = ['Date;Description;Catégorie;Montant', '2025-01-28;IGA;Épicerie;-300,00', '2025-02-28;IGA;Épicerie;-300,00'].join('\n')
  const second = ['Date;Description;Catégorie;Montant', '2025-03-28;IGA;Épicerie;-300,00'].join('\n')
  await s.locator('input[type=file]').setInputFiles([
    { name: 'compte-1.csv', mimeType: 'text/csv', buffer: Buffer.from(first) },
    { name: 'compte-2.csv', mimeType: 'text/csv', buffer: Buffer.from(second) },
  ])
  await expect(s.getByRole('status')).toContainText('3 opérations lues, de 01/2025 à 03/2025')
  await expect(s.getByRole('status')).toContainText('Moins de douze mois (3) : le total est ramené à une année.')
  await expect(s.getByRole('status')).toContainText(/Dépenses comptées\s*:\s*3\s600\s\$ par année/) // 900 $ in three months
})

test('text that is not a table of transactions says so, and nothing can be used', async ({ page }) => {
  const s = await open(page)
  await s.getByRole('textbox', { name: 'Opérations copiées du relevé' }).fill('bonjour\nle monde')
  await expect(s.getByText('Aucune opération lue pour l’instant')).toBeVisible()
  await expect(s.getByRole('button', { name: 'Utiliser pour mes dépenses pendant le travail' })).toHaveCount(0)
})

test('a month still in progress is left out of the year', async ({ page }) => {
  const s = await open(page)
  const csv = ['Date;Description;Catégorie;Montant', '2025-01-28;IGA;Épicerie;-100,00', '2025-02-28;IGA;Épicerie;-100,00', '2025-03-09;IGA;Épicerie;-999,00'].join('\n')
  await s.getByRole('textbox', { name: 'Opérations copiées du relevé' }).fill(csv)
  await expect(s.getByRole('status')).toContainText('de 01/2025 à 02/2025')
  await expect(s.getByRole('status')).toContainText(/Dépenses comptées\s*:\s*1\s200\s\$ par année/)
})
