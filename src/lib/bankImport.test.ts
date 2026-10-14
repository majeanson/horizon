import { describe, expect, it } from 'vitest'
import { BANK_IMPORT_COPY } from './bankImportCopy.ts'
import { NOT_SPENDING, parseBankDate, readBank, summarize, totalOf, type BankRow } from './bankImport.ts'

// A bank's export, read on the device: the columns found by name, the sign of an amount read the way that export writes it, the last twelve complete months counted by
// category, and what is not household spending left unticked. The fixtures are made up; no real statement is committed.

const row = (year: number, month: number, day: number, category: string, amount: number): BankRow => ({ year, month, day, description: category, category, amount })

describe('the dates a bank writes', () => {
  it('reads ISO, day-first, spelled-out French and English', () => {
    expect(parseBankDate('2026-10-07')).toEqual({ year: 2026, month: 10, day: 7 })
    expect(parseBankDate('2026/10/07')).toEqual({ year: 2026, month: 10, day: 7 })
    expect(parseBankDate('07/10/2026')).toEqual({ year: 2026, month: 10, day: 7 }) // day first: the Canadian-French reading
    expect(parseBankDate('13/10/2026')).toEqual({ year: 2026, month: 10, day: 13 })
    expect(parseBankDate('10/13/2026')).toEqual({ year: 2026, month: 10, day: 13 }) // the second figure cannot be a month: it is month first
    expect(parseBankDate('7 octobre 2026')).toEqual({ year: 2026, month: 10, day: 7 })
    expect(parseBankDate('27 août 2026')).toEqual({ year: 2026, month: 8, day: 27 })
    expect(parseBankDate('Oct 7, 2026')).toEqual({ year: 2026, month: 10, day: 7 })
    expect(parseBankDate('sept. 3 2026')).toEqual({ year: 2026, month: 9, day: 3 })
  })

  it('refuses what is not a date', () => {
    for (const t of ['', 'Total', '2026-13-01', '2026-00-10', '32/01/2026', 'octobre', '12']) expect(parseBankDate(t), t).toBeNull()
  })
})

describe('reading an export', () => {
  it('finds the columns by name, in any order, with a semicolon: a signed amount, money out negative', () => {
    const csv = 'Catégorie;Montant;Date;Description\nÉpicerie;-45,20;2026-01-15;IGA\nRevenus;2 837,42;2026-01-16;Paie\n'
    const r = readBank(csv)
    expect(r.rows).toEqual([
      { year: 2026, month: 1, day: 15, description: 'IGA', category: 'Épicerie', amount: -45.2 },
      { year: 2026, month: 1, day: 16, description: 'Paie', category: 'Revenus', amount: 2837.42 },
    ])
    expect(r.skipped).toBe(0)
  })

  it('reads separate debit and credit columns, with a comma and English names', () => {
    const csv = 'Date,Payee,Category,Withdrawal,Deposit\n2026-02-01,Rent,Housing,1200.00,\n2026-02-02,Pay,Income,,3000.00\n'
    expect(readBank(csv).rows.map((x) => x.amount)).toEqual([-1200, 3000])
  })

  it('reads an export that marks money IN with a plus and leaves money out unsigned', () => {
    const csv = 'Date\tDescription\tCatégorie\tMontant\n7 octobre 2026\tNutritek\tRevenus\t+3 129,15 $\n5 octobre 2026\tProvigo\tÉpicerie\t10,35 $\n'
    expect(readBank(csv).rows.map((x) => x.amount)).toEqual([3129.15, -10.35])
  })

  it('with minus signs elsewhere in the file, an unsigned amount is money in', () => {
    const csv = 'Date,Description,Montant\n2026-03-01,Pay,2000\n2026-03-02,Shop,-35.5\n'
    expect(readBank(csv).rows.map((x) => x.amount)).toEqual([2000, -35.5])
  })

  it('reads parentheses and a trailing minus as money out', () => {
    const csv = 'Date,Description,Montant\n2026-03-01,A,(12.00)\n2026-03-02,B,7.50-\n2026-03-03,C,+4.00\n'
    expect(readBank(csv).rows.map((x) => x.amount)).toEqual([-12, -7.5, 4])
  })

  it('keeps a quoted description that holds the delimiter and a line break', () => {
    const csv = 'Date,Description,Catégorie,Montant\n2026-03-01,"Gouv. du Canada,\nCanada",Revenus,"+1 000,50"\n'
    const r = readBank(csv)
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0].description).toBe('Gouv. du Canada, Canada')
    expect(r.rows[0].amount).toBe(1000.5)
  })

  it('reads a doubled quote inside a quoted description as a quote, and Windows line breaks like any other', () => {
    const csv = 'Date,Description,Montant\r\n2026-03-01,"Café ""Chez Léo""",-12.00\r\n2026-03-02,Shop,-3.00\r\n'
    const r = readBank(csv)
    expect(r.rows.map((x) => x.description)).toEqual(['Café "Chez Léo"', 'Shop'])
    expect(r.rows.map((x) => x.amount)).toEqual([-12, -3])
  })

  it('skips what is not a transaction and counts it, and finds a header below a title', () => {
    const csv = 'Mon compte\nHistorique\n\nDate,Description,Montant\n2026-04-01,Shop,-10\nTotal,,-10\n2026-99-01,Bad,-5\n'
    const r = readBank(csv)
    expect(r.rows).toHaveLength(1)
    expect(r.skipped).toBe(2)
  })

  it('with no category column, the description is the category (cut to forty characters)', () => {
    const r = readBank('Date,Description,Montant\n2026-04-01,A very long merchant name that goes on and on and on,-10\n')
    expect(r.rows[0].category).toBe('A very long merchant name that goes on a')
  })

  it('reads nothing from text with no date and no amount column, and says so by skipping all of it', () => {
    const r = readBank('Hello\nworld\n')
    expect(r.rows).toEqual([])
    expect(r.skipped).toBeGreaterThan(0)
    expect(readBank('').rows).toEqual([])
  })
})

describe('what a year of spending is', () => {
  const spend = (months: number[], category: string, amount: number, year = 2026): BankRow[] => months.map((m) => row(year, m, 28, category, -amount))

  it('is the last twelve complete months by category: money out less refunds, biggest first', () => {
    const rows = [...spend([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'Épicerie', 500), ...spend([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'Auto', 100), row(2026, 6, 20, 'Auto', 240)]
    const s = summarize(rows)!
    expect(s.months).toBe(12)
    expect(s.groups.map((g) => [g.name, g.annual])).toEqual([
      ['Épicerie', 6000],
      ['Auto', 960], // 1 200 of purchases less the 240 refund
    ])
    expect(s.from).toEqual({ year: 2026, month: 1 })
    expect(s.to).toEqual({ year: 2026, month: 12 })
  })

  it('leaves out a last month still in progress (it stops before the 25th) and keeps one that runs to the end', () => {
    const base = spend([1, 2, 3], 'A', 100)
    const progress = summarize([...base, row(2026, 4, 12, 'A', -999)])!
    expect(progress.to).toEqual({ year: 2026, month: 3 })
    expect(progress.groups[0].annual).toBeCloseTo(1200, 6)
    const whole = summarize([...base, row(2026, 4, 28, 'A', -100)])!
    expect(whole.to).toEqual({ year: 2026, month: 4 })
  })

  it('keeps twelve months at most, the latest ones', () => {
    const rows = [...spend(Array.from({ length: 12 }, (_, i) => i + 1), 'A', 100, 2025), ...spend(Array.from({ length: 12 }, (_, i) => i + 1), 'A', 200, 2026)]
    const s = summarize(rows)!
    expect(s.months).toBe(12)
    expect(s.from).toEqual({ year: 2026, month: 1 })
    expect(s.groups[0].annual).toBe(2400)
  })

  it('with fewer than twelve months, scales to a year and says how many months it rests on', () => {
    const s = summarize(spend([1, 2, 3, 4], 'A', 100))!
    expect(s.months).toBe(4)
    expect(s.groups[0].annual).toBeCloseTo(1200, 6) // 400 over four months → 1 200 a year
  })

  it('counts a month with no transaction in a category as a month all the same', () => {
    const s = summarize([row(2026, 1, 10, 'Voyage', -1200), ...spend([1, 2, 3, 4, 5, 6], 'Épicerie', 100)])!
    expect(s.months).toBe(6)
    expect(s.groups.find((g) => g.name === 'Voyage')!.annual).toBeCloseTo(2400, 6)
  })

  it('drops a group that is money in (income, refunds beyond spending) and has nothing for an empty export', () => {
    const s = summarize([...spend([1, 2, 3], 'A', 100), row(2026, 1, 15, 'Paie', 3000), row(2026, 2, 15, 'Paie', 3000), row(2026, 3, 15, 'Paie', 3000)])!
    expect(s.groups.map((g) => g.name)).toEqual(['A'])
    expect(summarize([])).toBeNull()
  })

  it('ticks by default what is spending, and not what moves money, pays a card, is income, the mortgage, tax or saving', () => {
    for (const name of ['Épicerie', 'Restaurants', 'Assurance', 'Factures et services', 'Pharmacie', 'Carburant et essence', 'Housing', 'Argent comptant']) expect(NOT_SPENDING.test(name), name).toBe(false)
    for (const name of ['Transfert', 'Virement INTERAC', 'Paiement carte de crédit', 'Credit card payment', 'Revenus', 'Income', 'Hypothèque', 'Mortgage', 'Impôt', 'Taxes', 'REER', 'CELI', 'Placements', 'Épargne']) expect(NOT_SPENDING.test(name), name).toBe(true)
    const s = summarize([...spend([1, 2], 'Épicerie', 100), ...spend([1, 2], 'Transfert', 4000)])!
    expect(Object.fromEntries(s.groups.map((g) => [g.name, g.include]))).toEqual({ Transfert: false, Épicerie: true })
  })

  it('totals the ticked groups', () => {
    const s = summarize([...spend([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'A', 100), ...spend([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 'B', 50)])!
    expect(totalOf(s.groups, new Set(['A']))).toBe(1200)
    expect(totalOf(s.groups, new Set(['A', 'B']))).toBe(1800)
    expect(totalOf(s.groups, new Set())).toBe(0)
  })
})

describe('the words', () => {
  it('say what they are given, in both languages', () => {
    for (const lang of ['fr', 'en'] as const) {
      const c = BANK_IMPORT_COPY[lang]
      expect(c.found(10, 'A', 'B', 3)).toContain('10')
      expect(c.total('T', 'M')).toContain('T')
      expect(c.total('T', 'M')).toContain('M')
      for (const k of ['open', 'hint', 'label', 'placeholder', 'file', 'nothing', 'tipMortgage', 'apply', 'applied'] as const) expect(typeof c[k] === 'string' ? (c[k] as string).trim() : 'x', `${lang} ${k}`).not.toBe('')
    }
    expect(BANK_IMPORT_COPY.fr.hint).not.toBe(BANK_IMPORT_COPY.en.hint)
  })
})
