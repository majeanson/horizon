import type { Lang } from '../i18n.ts'

// THE WORDS OF « IMPORTER UN RELEVÉ DE BANQUE ». Outside the eager dictionaries: only Profil reads them.

export interface BankImportCopy {
  open: string
  hint: string
  label: string
  placeholder: string
  file: string
  nothing: string
  /** « 412 opérations, de 10/2025 à 09/2026 » (a window already formatted). */
  found: (count: number, from: string, to: string, skipped: number) => string
  /** Fewer than twelve months: the total is scaled to a year. */
  scaled: (months: number) => string
  groupsTitle: string
  tipMortgage: string
  total: (year: string, month: string) => string
  apply: string
  applied: (amount: string) => string
}

const FR: BankImportCopy = {
  open: 'Importer un relevé de banque',
  hint: 'Exportez vos opérations en CSV depuis votre banque (un compte, ou plusieurs à la suite) et ouvrez le fichier ici, ou collez-en le contenu. Il est lu sur cet appareil : rien ne le quitte.',
  label: 'Opérations copiées du relevé',
  placeholder: 'Date;Description;Catégorie;Montant\n2026-10-07;IGA;Épicerie;-45,20\n…',
  file: 'Ouvrir un fichier CSV',
  nothing: 'Aucune opération lue pour l’instant : il faut une colonne de dates et une de montants (ou de débits et de crédits).',
  found: (count, from, to, skipped) => `${count} ${count === 1 ? 'opération lue' : 'opérations lues'}, de ${from} à ${to}${skipped > 0 ? `, ${skipped} ${skipped === 1 ? 'ligne ignorée' : 'lignes ignorées'}` : ''}.`,
  scaled: (months) => `Moins de douze mois (${months}) : le total est ramené à une année.`,
  groupsTitle: 'Catégories comptées dans vos dépenses',
  tipMortgage: 'Les virements, les paiements de carte, les revenus, l’hypothèque, l’impôt et l’épargne ne sont pas des dépenses courantes : ils sont décochés. L’hypothèque et les placements sont comptés ailleurs dans le plan ; si une catégorie les contient (« Logement »), décochez-la.',
  total: (year, month) => `Dépenses comptées : ${year} par année, soit ${month} par mois.`,
  apply: 'Utiliser pour mes dépenses pendant le travail',
  applied: (amount) => `Dépenses pendant le travail mises à ${amount} par année, et marquées comme confirmées.`,
}

const EN: BankImportCopy = {
  open: 'Import a bank statement',
  hint: 'Export your transactions as CSV from your bank (one account, or several one after another) and open the file here, or paste its contents. It is read on this device: nothing leaves it.',
  label: 'Transactions copied from the statement',
  placeholder: 'Date;Description;Category;Amount\n2026-10-07;IGA;Groceries;-45.20\n…',
  file: 'Open a CSV file',
  nothing: 'No transaction read yet: it needs a column of dates and one of amounts (or of debits and credits).',
  found: (count, from, to, skipped) => `${count} ${count === 1 ? 'transaction' : 'transactions'} read, from ${from} to ${to}${skipped > 0 ? `, ${skipped} ${skipped === 1 ? 'line' : 'lines'} skipped` : ''}.`,
  scaled: (months) => `Fewer than twelve months (${months}): the total is scaled to a year.`,
  groupsTitle: 'Categories counted in your spending',
  tipMortgage: 'Transfers, card payments, income, the mortgage, tax and saving are not everyday spending: they are unticked. The mortgage and the investments are counted elsewhere in the plan; if a category holds them (“Housing”), untick it.',
  total: (year, month) => `Spending counted: ${year} a year, ${month} a month.`,
  apply: 'Use for my spending while working',
  applied: (amount) => `Spending while working set to ${amount} a year, and marked as confirmed.`,
}

export const BANK_IMPORT_COPY: Record<Lang, BankImportCopy> = { fr: FR, en: EN }
