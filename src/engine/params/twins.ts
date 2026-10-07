// THE SAME OFFICIAL PAGE IN THE OTHER LANGUAGE.
//
// Horizon speaks French first and English second, and a figure is only checkable if the reader can open the page it came
// from in a language they read. Each cited page is listed here with the language it is WRITTEN in and its twin in the other
// one — or `null` and the reason there is none. The French UI links the French page when there is one and says so when only an
// English one exists; the English UI does the reverse; SOURCES.md prints both.
//
// Every twin below was OPENED, not guessed: nearly all are the target of the page's own language-toggle link (the `hreflang`
// alternate), the statutes and one leaflet follow the agency's published /fra/ and /fr/ address pattern and answered with the
// right-language document, and two Revenu Québec pages and one Finances Québec PDF were taken from the agencies' own search
// results (Revenu Québec refuses every automated client, so those cannot be fetched from here). A test holds this table to the
// params: a cited page missing from it fails the build, and a twin must be an official host and the OTHER language.
//
// Pure data, no imports: it runs under plain Node (`npm run sources`) and in the browser alike.

export type PageLang = 'en' | 'fr'

export interface PageTwin {
  url: string
  title: string
}

export interface PageEntry {
  /** The language the page (the `url` this entry is keyed by) is written in. */
  lang: PageLang
  /** The same page in the other language, or null when none exists. */
  twin: PageTwin | null
  /** Why there is no twin. */
  why?: string
}

export const TWINS: Readonly<Record<string, PageEntry>> = {
  'https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/finances/publications-adm/parametres/AUTFR_RegimeImpot2026.pdf': { lang: 'fr', twin: { url: 'https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/finances/publications-adm/parametres/AUTEN_IncomeTax2026.pdf', title: 'Parameters of the personal income tax system for the 2026 taxation year' } },
  'https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-118.html': { lang: 'en', twin: { url: 'https://laws-lois.justice.gc.ca/fra/lois/I-3.3/section-118.html', title: 'Loi de l’impôt sur le revenu, article 118' } },
  'https://ouvert.canada.ca/data/dataset/dfa4daf1-669e-4514-82cd-982f27707ed0': { lang: 'en', twin: { url: 'https://ouvert.canada.ca/data/fr/dataset/dfa4daf1-669e-4514-82cd-982f27707ed0', title: 'Sécurité de la vieillesse (SV) - Tableau des montants de prestation selon l’état civil et le niveau de revenu' } },
  'https://laws-lois.justice.gc.ca/eng/acts/o-9/FullText.html': { lang: 'en', twin: { url: 'https://laws-lois.justice.gc.ca/fra/lois/o-9/TexteComplet.html', title: 'Loi sur la sécurité de la vieillesse (L.R.C. (1985), ch. O-9)' } },
  'https://www.budget.finances.gouv.qc.ca/budget/outils/depenses-fiscales/documents/Depenses_fiscales_2020_Description_mesures.pdf': { lang: 'fr', twin: null, why: 'No English edition of this page was found.' },
  'https://www.budget.finances.gouv.qc.ca/budget/outils/depenses-fiscales/fiches/fiche-110111.asp': { lang: 'fr', twin: null, why: 'No English edition of this page was found.' },
  'https://www.budget.finances.gouv.qc.ca/budget/outils/depenses-fiscales/fiches/fiche-110906.asp': { lang: 'fr', twin: null, why: 'No English edition of this page was found.' },
  'https://www.canada.ca/en/department-finance/programs/federal-transfers/quebec-abatement.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/ministere-finances/programmes/transferts-federaux/abattement-impot-quebec.html', title: 'Abattement d’impôt du Québec - Canada.ca' } },
  'https://www.canada.ca/en/department-finance/services/publications/report-impact-reducing-lowest-marginal-personal-income-tax-rate-non-refundable-tax-credits.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/ministere-finances/services/publications/rapport-incidence-reduction-taux-imposition-marginal-premiere-tranche-revenu-particuliers-credits-impot-non-remboursables.html', title: 'Rapport sur l’incidence de la réduction du taux d’imposition marginal de la première tranche de revenu des particuliers sur les crédits d’impôt non remboursables - Canada.ca' } },
  'https://www.canada.ca/en/employment-social-development/programs/pensions/pension/statistics/2026-quarterly-october-december.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/emploi-developpement-social/programmes/pensions/pension/statistiques/rapport-trimestriel/2026-trimestriel-octobre-decembre.html', title: 'Montants maximaux des prestations et données connexes - Régime de pensions du Canada (2026) et Sécurité de la vieillesse (octobre à décembre 2026) - Canada.ca' } },
  'https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/t4084/pension-adjustment-guide.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/agence-revenu/services/formulaires-publications/publications/t4084/guide-facteur-equivalence.html', title: 'Guide du facteur d\'équivalence - Canada.ca' } },
  'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/completing-slips-summaries/t4rsp-t4rif-information-returns/payments/chart-prescribed-factors.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/agence-revenu/services/impot/entreprises/sujets/remplir-feuillets-sommaires/declaration-renseignements-t4rsp-t4rif/paiements/tableau-facteurs-prescrits.html', title: 'Tableau – Facteurs prescrits - Canada.ca' } },
  'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/agence-revenu/services/impot/entreprises/sujets/retenues-paie/retenues-paie-cotisations/assurance-emploi-ae/taux-cotisation-a-ae-maximums.html', title: 'Taux de cotisation à l\'AE et maximums – Calculer les retenues sur la paie et les cotisations - Canada.ca' } },
  'https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/adjustment-personal-income-tax-benefit-amounts.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/foire-questions-particuliers/rajustement-montants-fonction-indexation-impot-particuliers-prestations.html', title: 'Rajustement de montants en fonction de l’indexation pour l’impôt des particuliers et les prestations - Canada.ca' } },
  'https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/taux-imposition-tranches-revenu/annee-en-cours.html', title: 'Taux d’imposition et tranches de revenu pour l’année en cours (2026) - Impôt sur le revenu des particuliers - Canada.ca' } },
  'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-30100-amount.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/tout-votre-declaration-revenus/declaration-revenus/remplir-declaration-revenus/deductions-credits-depenses/ligne-30100-montant-raison.html', title: 'Montant en raison de l\'âge – Impôt sur le revenu des particuliers - Canada.ca' } },
  'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31260-canada-employment-amount.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/tout-votre-declaration-revenus/declaration-revenus/remplir-declaration-revenus/deductions-credits-depenses/ligne-31260-montant-canadien-emploi.html', title: 'Ligne 31260 – Montant canadien pour emploi - Canada.ca' } },
  'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/deductions-credits-expenses/line-31400-pension-income-amount.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/tout-votre-declaration-revenus/declaration-revenus/remplir-declaration-revenus/deductions-credits-depenses/ligne-31400-montant-revenu-pension.html', title: 'Montant pour revenu de pension - Impôt sur le revenu des particuliers - Canada.ca' } },
  'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/about-your-tax-return/tax-return/completing-a-tax-return/personal-income/line-12700-capital-gains/definitions-capital-gains.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/tout-votre-declaration-revenus/declaration-revenus/remplir-declaration-revenus/revenu-personnel/ligne-12700-gains-capital/definitions-gains-capital.html', title: 'Définitions pour les gains en capital - Canada.ca' } },
  'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/pension-income-splitting.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/fractionnement-revenu-pension.html', title: 'Fractionnement du revenu de pension - Canada.ca' } },
  'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/contributing-a-rrsp-prpp/contributions-affect-your-rrsp-prpp-deduction-limit.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/reer-regimes-connexes/cotiser-a-reer-a-rpac-a/effet-vos-cotisations-maximum-deductible-votre-reer-rpac.html', title: 'Effet de vos cotisations sur le maximum déductible au titre des REER - Canada.ca' } },
  'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans/rrsp-options-when-you-turn-71.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/reer-regimes-connexes/options-vos-reer-lorsque-vous-atteignez-71-ans.html', title: 'Options pour vos REER lorsque vous atteignez 71 ans - Canada.ca' } },
  'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributing/before.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/agence-revenu/services/impot/particuliers/sujets/compte-epargne-libre-impot/cotiser/avant.html', title: 'Avant de cotiser à un CELI - Canada.ca' } },
  'https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/agence-revenu/services/impot/administrateurs-regimes-enregistres/fesp/plafonds-cd-reer-rpdb-celi-mgap.html', title: 'Plafonds des CD, des PD, des REER, des RPDB, des RVDAA, des CELI et le MGAP - Canada.ca' } },
  'https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/repayment.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/services/prestations/pensionspubliques/securite-vieillesse/remboursement.html', title: 'Remboursement des prestations de pension de la Sécurité de la vieillesse - Canada.ca' } },
  'https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/when-start.html': { lang: 'en', twin: { url: 'https://www.canada.ca/fr/services/prestations/pensionspubliques/securite-vieillesse/quand-debut.html', title: 'Sécurité de la vieillesse - Quand commencer à recevoir votre pension - Canada.ca' } },
  'https://www.legisquebec.gouv.qc.ca/en/pdf/cs/R-10.pdf': { lang: 'en', twin: null, why: 'The French address (/fr/pdf/cs/R-10.pdf) answers with a stub of a few hundred bytes, not the statute.' },
  'https://www.quebec.ca/entreprises-et-travailleurs-autonomes/administrer-gerer/embauche-gestion-personnel/assurance-parentale/revenu-maximal-assurable': { lang: 'fr', twin: null, why: 'No English edition of this page was found.' },
  'https://www.quebec.ca/entreprises-et-travailleurs-autonomes/administrer-gerer/embauche-gestion-personnel/assurance-parentale/taux-cotisations': { lang: 'fr', twin: null, why: 'No English edition of this page was found.' },
  'https://www.retraitequebec.gouv.qc.ca/en/citizens/retirement-planning/applying-your-retirement-pension/retirement-pension-quebec-pension-plan/calculation-your-retirement-pension': { lang: 'en', twin: { url: 'https://www.retraitequebec.gouv.qc.ca/fr/citoyens/retraite-et-planification/demandez-rente-retraite/rente-retraite-regime-rentes-quebec/calcul-rente-retraite', title: 'Calcul de votre rente de retraite' } },
  'https://www.retraitequebec.gouv.qc.ca/en/programs/quebec-pension-plan/additional-plan': { lang: 'en', twin: { url: 'https://www.retraitequebec.gouv.qc.ca/fr/programmes/regime-rentes-quebec/regime-supplementaire', title: 'Régime supplémentaire' } },
  'https://www.retraitequebec.gouv.qc.ca/en/programs/quebec-pension-plan/quebec-pension-plan-figures': { lang: 'en', twin: { url: 'https://www.retraitequebec.gouv.qc.ca/fr/programmes/regime-rentes-quebec/regime-chiffres', title: 'Le Régime en chiffres' } },
  'https://www.retraitequebec.gouv.qc.ca/en/programs/quebec-pension-plan/work-contributions/pensionable-earnings-contributions': { lang: 'en', twin: { url: 'https://www.retraitequebec.gouv.qc.ca/fr/programmes/regime-rentes-quebec/travail-et-cotisations/revenus-travail-admissibles-et-cotisations', title: 'Revenus de travail admissibles et cotisations' } },
  'https://www.retraitequebec.gouv.qc.ca/fr/guide-employeur/education/77766': { lang: 'fr', twin: null, why: 'No English edition of this employer-guide page was found.' },
  'https://www.retraitequebec.gouv.qc.ca/en/publications/public-sector-pension-plans/rregop': { lang: 'en', twin: { url: 'https://www.retraitequebec.gouv.qc.ca/fr/publications/regimes-retraite-secteur-public/rregop', title: 'Le RREGOP' } },
  'https://www.retraitequebec.gouv.qc.ca/en/your-first-paycheck-retirement/quebec-public-service-education-health-social-services-sectors/when-can-you-receive-your-pension-rregop-how-much-will-you-receive': { lang: 'en', twin: { url: 'https://www.retraitequebec.gouv.qc.ca/fr/savoir-faire-pousser-ble/fonction-publique-sante-et-services-sociaux-et-education/quand-pourrez-vous-recevoir-rente-rregop-et-quelle-somme-recevrez-vous', title: 'Quand pourrez-vous recevoir votre rente du RREGOP et quelle somme recevrez-vous?' } },
  'https://www.retraitequebec.gouv.qc.ca/sites/default/files/SiteCollectionDocuments/RetraiteQuebec/en/publications/nos-programmes/regime-de-rentes/retraite/1036-1f-Methode-calcul-rente-2025.pdf': { lang: 'en', twin: { url: 'https://www.retraitequebec.gouv.qc.ca/sites/default/files/SiteCollectionDocuments/RetraiteQuebec/fr/publications/nos-programmes/regime-de-rentes/retraite/1036-1f-Methode-calcul-rente-2025.pdf', title: 'Rente de retraite versée dès 65 ans et 1 mois (1036-1-RRQ, 2025-06)' } },
  'https://www.retraitequebec.gouv.qc.ca/sites/default/files/SiteCollectionDocuments/RetraiteQuebec/en/publications/nos-programmes/regime-de-rentes/retraite/1036-3a-Calcul-rente-68-ans-2025.pdf': { lang: 'en', twin: null, why: 'The French edition of this leaflet is not at a predictable address and no link to it was found.' },
  'https://www.revenuquebec.ca/en/citizens/income-tax-return/completing-your-income-tax-return/income-tax-rates/': { lang: 'en', twin: { url: 'https://www.revenuquebec.ca/fr/citoyens/declaration-de-revenus/produire-votre-declaration-de-revenus/taux-dimposition/', title: 'Taux d’imposition' } },
  'https://www.revenuquebec.ca/fr/citoyens/declaration-de-revenus/produire-votre-declaration-de-revenus/comment-remplir-votre-declaration-de-revenus/aide-par-ligne/350-a-398-1-credits-dimpot-non-remboursables/ligne-361/': { lang: 'fr', twin: { url: 'https://www.revenuquebec.ca/en/citizens/income-tax-return/completing-your-income-tax-return/how-to-complete-your-income-tax-return/line-by-line-help/350-to-398-1-non-refundable-tax-credits/line-361/', title: 'Line 361 - Age amount, amount for a person living alone and amount for retirement income' } },
}

/** A cited page as shown to a reader of `lang`. */
export interface LocalizedPage {
  url: string
  title: string
  /** The language this page is actually written in. */
  pageLang: PageLang
  /** False when the reader's language has no edition of the page: they are sent to the other one, and told. */
  inReaderLanguage: boolean
}

/**
 * The page to show a reader of `lang` for a cited source: its own, or its twin, whichever is written in `lang`; with no
 * such edition, its own page marked as « not in your language ». A URL missing from TWINS is treated as an English page
 * with no twin (and a test fails the build, so it cannot stay missing).
 */
export function pageFor(source: { url: string; title: string }, lang: PageLang): LocalizedPage {
  const entry = TWINS[source.url] ?? { lang: 'en' as PageLang, twin: null }
  if (entry.lang === lang) return { url: source.url, title: source.title, pageLang: entry.lang, inReaderLanguage: true }
  if (entry.twin) return { url: entry.twin.url, title: entry.twin.title, pageLang: lang, inReaderLanguage: true }
  return { url: source.url, title: source.title, pageLang: entry.lang, inReaderLanguage: false }
}
