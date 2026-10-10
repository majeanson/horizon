import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { blankSeed, seedProfile, showAllSections } from './seed'

// « Documents à rassembler »: the list a person works through BEFORE typing — ticked on this device, printable, downloadable — and the ways to it.

test('the list names every document, per person where each has their own, and a tick is kept', async ({ page }) => {
  await seedProfile(page)
  await showAllSections(page) // every « oui » to « Ma situation »: the employer's statement and the proof of residence are for those who have them
  await page.goto('/documents')
  await expect(page.getByRole('heading', { name: 'Documents à rassembler', level: 1 })).toBeVisible()
  const items = page.locator('.docs-item')
  await expect(items).toHaveCount(11) // the example is a couple: five documents each + the budget (it owns no home)
  await expect(page.getByText('0 sur 11 rassemblés')).toBeVisible()
  // most important first: the spending budget, then the tax notice; the situational documents last
  await expect(items.first().getByRole('heading', { name: 'Vos dépenses des 12 derniers mois' })).toBeVisible()
  await expect(items.first()).toContainText('Très important')
  await expect(items.last().getByRole('heading', { name: 'Preuve de vos années au Canada' })).toBeVisible()
  await expect(items.last()).toContainText('Selon votre situation')
  // grouped like the inputs: the household's documents, then a column for each person, each in order of importance
  await expect(page.getByRole('region', { name: 'Pour le ménage' }).locator('.docs-item')).toHaveCount(1)
  const camille = page.getByRole('region', { name: 'Camille' })
  await expect(camille.locator('.docs-item')).toHaveCount(5)
  await expect(camille.locator('.docs-item').first()).toContainText('Avis de cotisation')
  await expect(camille.locator('.docs-item').nth(2)).toContainText('Relevé de participation au RRQ')
  await expect(page.getByRole('region', { name: 'Alex' }).locator('.docs-item')).toHaveCount(5)
  const rrq = camille.locator('.docs-item', { hasText: 'Relevé de participation au RRQ' })
  await expect(rrq).toContainText('Vous y lirez')
  await expect(rrq.getByRole('link', { name: 'Ouvrir la page officielle' })).toHaveAttribute('href', /^https:\/\/www\.retraitequebec\.gouv\.qc\.ca\//)
  await rrq.getByRole('checkbox').check()
  await expect(page.getByText('1 sur 11 rassemblés')).toBeVisible()
  await page.reload()
  await expect(page.getByText('1 sur 11 rassemblés')).toBeVisible()
  await expect(page.locator('.docs-item', { hasText: 'Relevé de participation au RRQ' }).first().getByRole('checkbox')).toBeChecked()
  await page.getByRole('button', { name: 'Tout décocher' }).click()
  await expect(page.getByText('0 sur 11 rassemblés')).toBeVisible()
})

test('the list downloads as a text file that carries the ticks, and prints without its controls', async ({ page }) => {
  await seedProfile(page)
  await showAllSections(page)
  await page.goto('/documents')
  await page.getByRole('region', { name: 'Camille' }).locator('.docs-item', { hasText: 'Relevé de participation au RRQ' }).getByRole('checkbox').check()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Télécharger la liste' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('horizon-documents.txt')
  const text = await readFile((await file.path())!, 'utf8')
  expect(text).toContain('[x] Relevé de participation au RRQ — Camille')
  expect(text).toContain('[ ] Relevé de participation au RRQ — Alex')
  expect(text.indexOf('== Camille ==')).toBeLessThan(text.indexOf('== Alex =='))
  expect(text.indexOf('== Pour le ménage ==')).toBeLessThan(text.indexOf('== Camille =='))
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('button', { name: 'Télécharger la liste' })).toBeHidden()
  await expect(page.locator('.docs-item').first()).toBeVisible()
})

test('a first-time user finds it on the first screen, and everyone finds it on Profil and in the glossary', async ({ page }) => {
  await seedProfile(page, blankSeed())
  await page.goto('/profil')
  await page.getByRole('link', { name: 'Documents à rassembler' }).click()
  await expect(page).toHaveURL(/\/documents$/)
  await expect(page.locator('.docs-item')).toHaveCount(4) // one person alone, with nothing to say: the budget, the tax notice, the accounts and the QPP statement
  await page.goto('/profil?form=1')
  await expect(page.getByRole('link', { name: 'Documents à rassembler' })).toBeVisible()
  await page.goto('/glossaire')
  await expect(page.getByRole('link', { name: 'Documents à rassembler' })).toBeVisible()
})

test('English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await seedProfile(page)
  await page.goto('/documents')
  await expect(page.getByRole('heading', { name: 'Documents to gather', level: 1 })).toBeVisible()
  await expect(page.getByText('0 of 8 gathered')).toBeVisible()
})
