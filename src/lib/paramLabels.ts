// A human name for every government figure the « Paramètres utilisés » panel lists, in both languages — so the first
// column does not show the engine's ids (« rrq.mga »). One per cited path: `lib/paramsView.test.ts` fails on a missing
// or a left-over one.
//
// It lives HERE and not in the i18n dictionaries on purpose: only the results page reads it, and 96 × 2 labels would
// push the eager dictionary past its budget (check-bundle.mjs) for every page of the app.

export const PARAM_LABELS: {
  fr: Record<string, string>;
  en: Record<string, string>;
} = {
  fr: {
    "accounts.pensionAdjustmentFactor":
      "Facteur d’équivalence (régime à prestations déterminées)",
    "accounts.pensionAdjustmentOffset":
      "Facteur d’équivalence : montant soustrait (600 $)",
    "accounts.rrifConversionAge": "Âge limite de conversion du REER en FERR",
    "accounts.lifFreeAge": "FRV : âge dès lequel le plafond de retrait disparaît",
    "accounts.lifPrescribedRate": "FRV : taux prescrit (plafond de retrait avant 55 ans)",
    "accounts.lifUnlockAge": "CRI/FRV : âge du remboursement d’un petit solde",
    "accounts.lifUnlockShareOfMga": "CRI/FRV : part du MGA sous laquelle le solde se débloque",
    "accounts.rrifDivisor": "FERR : diviseur du retrait minimum",
    "accounts.rrifFactors": "FERR : pourcentage de retrait minimum, par âge",
    "accounts.rrspLimit": "Plafond de cotisation REER",
    "accounts.rrspRate":
      "Taux de droits de cotisation REER (% du revenu gagné)",
    "accounts.tfsaCumulativeSince2009": "CELI : droits cumulés depuis 2009",
    "accounts.tfsaLimit": "CELI : plafond annuel",
    "federal.ageAmount": "Fédéral : montant en raison de l’âge",
    "federal.ageMinAge": "Fédéral : âge minimal du montant en raison de l’âge",
    "federal.ageReduction":
      "Fédéral : taux de réduction du montant en raison de l’âge",
    "federal.ageThreshold":
      "Fédéral : seuil de revenu où le montant en raison de l’âge diminue",
    "federal.bpaMax": "Fédéral : montant personnel de base (maximum)",
    "federal.bpaMin": "Fédéral : montant personnel de base (minimum)",
    "federal.brackets": "Fédéral : tranches d’imposition et taux",
    "federal.capitalGainsInclusion":
      "Fédéral : taux d’inclusion des gains en capital",
    "federal.creditRate": "Fédéral : taux des crédits non remboursables",
    "federal.employmentAmount": "Fédéral : montant canadien pour emploi",
    "federal.pensionAmountMax":
      "Fédéral : montant pour revenu de pension (maximum)",
    "federal.pensionMinAge":
      "Fédéral : âge minimal de fractionnement du revenu de pension",
    "federal.quebecAbatement": "Abattement du Québec (impôt fédéral)",
    "federal.splitMaxShare":
      "Fédéral : part maximale du revenu de pension fractionnable",
    "oas.deferralMaxMonths": "PSV : nombre maximal de mois de report",
    "oas.allowanceCurve": "Allocation : courbe selon le revenu du couple (table 4)",
    "oas.allowanceCutoff": "Allocation : seuil de revenu du couple",
    "oas.allowanceMax": "Allocation : prestation mensuelle maximale",
    "oas.deferralPerMonth": "PSV : bonification par mois de report",
    "oas.gisAllowanceCurve": "SRG du conjoint d’une personne qui reçoit l’allocation : courbe (table 4)",
    "oas.survivorAllowanceMax": "Allocation au survivant : prestation mensuelle maximale",
    "oas.survivorAllowanceCutoff": "Allocation au survivant : seuil de revenu",
    "oas.survivorAllowanceCurve": "Allocation au survivant : courbe selon le revenu (table 5)",
    "oas.gis.baseDivisorCouple":
      "SRG : diviseur de la prestation de base (couple)",
    "oas.gis.baseDivisorSingle":
      "SRG : diviseur de la prestation de base (personne seule)",
    "oas.gis.employmentExemptionBand":
      "SRG : tranche du revenu d’emploi exemptée à 50 %",
    "oas.gis.employmentExemptionFull":
      "SRG : revenu d’emploi entièrement exempté",
    "oas.gis.single.cutoff":
      "SRG, personne seule : seuil de revenu d’élimination",
    "oas.gis.single.max": "SRG, personne seule : prestation maximale",
    "oas.gis.single.topUpCutoff":
      "SRG, personne seule : seuil du supplément additionnel",
    "oas.gis.spouseNone.cutoff":
      "SRG, conjoint sans PSV : seuil de revenu d’élimination",
    "oas.gis.spouseNone.max": "SRG, conjoint sans PSV : prestation maximale",
    "oas.gis.spouseNone.topUpCutoff":
      "SRG, conjoint sans PSV : seuil du supplément additionnel",
    "oas.gis.spouseOas.cutoff":
      "SRG, conjoint avec PSV : seuil de revenu d’élimination",
    "oas.gis.spouseOas.max": "SRG, conjoint avec PSV : prestation maximale",
    "oas.gis.spouseOas.topUpCutoff":
      "SRG, conjoint avec PSV : seuil du supplément additionnel",
    "oas.gis.topUpDivisorCouple":
      "SRG : diviseur du supplément additionnel (couple)",
    "oas.gis.topUpDivisorSingle":
      "SRG : diviseur du supplément additionnel (personne seule)",
    "oas.gis.topUpStartCouple":
      "SRG : début du supplément additionnel (couple)",
    "oas.gis.topUpStartSingle":
      "SRG : début du supplément additionnel (personne seule)",
    "oas.increaseAt75": "PSV : majoration à 75 ans",
    "oas.monthly65to74": "PSV : prestation mensuelle, 65 à 74 ans",
    "oas.monthly75plus": "PSV : prestation mensuelle, 75 ans et plus",
    "oas.recoveryRate": "PSV : taux de l’impôt de récupération",
    "oas.recoveryThreshold": "PSV : seuil de revenu de l’impôt de récupération",
    "oas.residenceYearsFull":
      "PSV : années de résidence pour la pension complète",
    "oas.residenceYearsMinimum": "PSV : années de résidence minimales",
    "oas.startAgeMax": "PSV : âge de début le plus tardif",
    "oas.startAgeMin": "PSV : âge de début le plus précoce",
    "payroll.eiMaxInsurable": "AE : gain assurable maximal",
    "payroll.eiRate": "AE : taux de cotisation",
    "payroll.qpipMaxInsurable": "RQAP : gain assurable maximal",
    "payroll.qpipRate": "RQAP : taux de cotisation",
    "quebec.ageAmount": "Québec : montant en raison de l’âge",
    "quebec.ageMinAge": "Québec : âge minimal du montant en raison de l’âge",
    "quebec.bpa": "Québec : montant personnel de base",
    "quebec.brackets": "Québec : tranches d’imposition et taux",
    "quebec.creditRate": "Québec : taux des crédits non remboursables",
    "quebec.livingAloneAmount": "Québec : montant pour personne vivant seule",
    "quebec.reductionRate":
      "Québec : taux de réduction des montants liés à l’âge et à la vie seule",
    "quebec.reductionThreshold":
      "Québec : seuil de revenu familial où ces montants diminuent",
    "quebec.retirementIncomeAmount":
      "Québec : montant pour revenu de retraite (maximum)",
    "quebec.retirementIncomeMultiple":
      "Québec : multiple appliqué au revenu de retraite admissible",
    "quebec.splitMaxShare":
      "Québec : part maximale du revenu de retraite fractionnable",
    "quebec.splitMinAge":
      "Québec : âge minimal de fractionnement du revenu de retraite",
    "quebec.workerDeductionMax":
      "Québec : déduction pour travailleur (maximum)",
    "quebec.workerDeductionRate": "Québec : déduction pour travailleur (taux)",
    "rrq.additionalMonths":
      "RRQ : nombre de mois retenus (les 480 meilleurs) pour le régime supplémentaire",
    "rrq.baseReplacement": "RRQ : taux de remplacement du régime de base",
    "rrq.careerMaxAge": "RRQ : âge où la carrière cotisable se termine",
    "rrq.careerStartAge": "RRQ : âge où la carrière cotisable commence",
    "rrq.earliestAge": "RRQ : âge de début le plus précoce",
    "rrq.earlyBase":
      "RRQ : réduction par mois avant 65 ans, pour les plus petites rentes",
    "rrq.earlySlope":
      "RRQ : hausse de cette réduction selon la rente de base (jusqu’au maximum)",
    "rrq.excludedShare": "RRQ : part des pires années exclue (abandon)",
    "rrq.exemption": "RRQ : exemption générale de cotisation",
    "rrq.firstFrom": "RRQ : première année du premier régime supplémentaire",
    "rrq.firstReplacement":
      "RRQ : taux de remplacement du premier régime supplémentaire",
    "rrq.indexation": "RRQ : indexation annuelle des rentes",
    "rrq.lateMaxMonths": "RRQ : nombre maximal de mois de report",
    "rrq.latePerMonth": "RRQ : bonification par mois après 65 ans",
    "rrq.lateProtectionFrom":
      "RRQ : première année de la rente de base protégée au report",
    "rrq.latestAge": "RRQ : âge de début le plus tardif",
    "rrq.survivorBaseShareUnder65": "Rente de conjoint survivant : part de la composante de base avant 65 ans (37,5 %)",
    "rrq.survivorBaseShare65": "Rente de conjoint survivant : part de la composante de base dès 65 ans (60 %)",
    "rrq.survivorAdditionalShare": "Rente de conjoint survivant : part des composantes supplémentaires (50 %)",
    "rrq.survivorOwnPensionOffset": "Rente de conjoint survivant : part de la rente du survivant qui la réduit (40 %)",
    "rrq.survivorFlatRate45to64": "Rente de conjoint survivant : partie uniforme, 45 à 64 ans",
    "rrq.survivorFlatRateUnder45": "Rente de conjoint survivant : partie uniforme, moins de 45 ans",
    "rrq.survivorMaxUnder65": "Rente de conjoint survivant : maximum mensuel, 45 à 64 ans (vérification)",
    "rrq.survivorMax65": "Rente de conjoint survivant : maximum mensuel, 65 ans ou plus (vérification)",
    "rrq.maxBasePension65": "RRQ : rente de base maximale à 65 ans",
    "rrq.maxPension65": "RRQ : rente maximale à 65 ans",
    "rrq.mga": "RRQ : maximum des gains admissibles (MGA)",
    "rrq.normalAge": "RRQ : âge normal de la rente",
    "rrq.phaseIn": "RRQ : progression de la bonification, par année",
    "rrq.rateBase": "RRQ : taux de cotisation du régime de base",
    "rrq.rateFirst":
      "RRQ : taux de cotisation du premier régime supplémentaire",
    "rrq.rateSecond":
      "RRQ : taux de cotisation du deuxième régime supplémentaire",
    "rrq.secondFrom": "RRQ : première année du deuxième régime supplémentaire",
    "rrq.secondReplacement":
      "RRQ : taux de remplacement du deuxième régime supplémentaire",
    "rrq.yampe": "RRQ : maximum supplémentaire des gains admissibles (MSGA)",
  },
  en: {
    "accounts.pensionAdjustmentFactor":
      "Pension adjustment factor (defined-benefit plan)",
    "accounts.pensionAdjustmentOffset":
      "Pension adjustment: amount subtracted ($600)",
    "accounts.rrifConversionAge":
      "Age by which an RRSP must be converted to a RRIF",
    "accounts.lifFreeAge": "LIF: age from which the withdrawal maximum no longer applies",
    "accounts.lifPrescribedRate": "LIF: prescribed rate (withdrawal maximum before 55)",
    "accounts.lifUnlockAge": "LIRA/LIF: age at which a small balance can be refunded",
    "accounts.lifUnlockShareOfMga": "LIRA/LIF: share of the MPE under which the balance unlocks",
    "accounts.rrifDivisor": "RRIF minimum withdrawal divisor",
    "accounts.rrifFactors": "RRIF minimum withdrawal percentage, by age",
    "accounts.rrspLimit": "RRSP contribution dollar limit",
    "accounts.rrspRate": "RRSP contribution room rate (% of earned income)",
    "accounts.tfsaCumulativeSince2009": "TFSA cumulative room since 2009",
    "accounts.tfsaLimit": "TFSA annual limit",
    "federal.ageAmount": "Federal age amount",
    "federal.ageMinAge": "Federal minimum age for the age amount",
    "federal.ageReduction": "Federal age amount reduction rate",
    "federal.ageThreshold":
      "Federal income threshold where the age amount shrinks",
    "federal.bpaMax": "Federal basic personal amount (maximum)",
    "federal.bpaMin": "Federal basic personal amount (minimum)",
    "federal.brackets": "Federal tax brackets and rates",
    "federal.capitalGainsInclusion": "Federal capital gains inclusion rate",
    "federal.creditRate": "Federal non-refundable credit rate",
    "federal.employmentAmount": "Federal Canada employment amount",
    "federal.pensionAmountMax": "Federal pension income amount (maximum)",
    "federal.pensionMinAge": "Federal minimum age for pension income splitting",
    "federal.quebecAbatement": "Quebec abatement (federal tax)",
    "federal.splitMaxShare":
      "Federal maximum share of pension income that can be split",
    "oas.deferralMaxMonths": "OAS maximum months of deferral",
    "oas.allowanceCurve": "Allowance: curve by the couple's income (table 4)",
    "oas.allowanceCutoff": "Allowance: the couple's income cut-off",
    "oas.allowanceMax": "Allowance: maximum monthly amount",
    "oas.deferralPerMonth": "OAS increase per month of deferral",
    "oas.gisAllowanceCurve": "GIS of the spouse of an Allowance recipient: curve (table 4)",
    "oas.survivorAllowanceMax": "Allowance for the Survivor: maximum monthly amount",
    "oas.survivorAllowanceCutoff": "Allowance for the Survivor: the survivor's income cut-off",
    "oas.survivorAllowanceCurve": "Allowance for the Survivor: curve by income (table 5)",
    "oas.gis.baseDivisorCouple": "GIS base-amount divisor (couple)",
    "oas.gis.baseDivisorSingle": "GIS base-amount divisor (single)",
    "oas.gis.employmentExemptionBand":
      "GIS employment-income band exempted at 50%",
    "oas.gis.employmentExemptionFull": "GIS employment income fully exempted",
    "oas.gis.single.cutoff": "GIS, single: income cut-off",
    "oas.gis.single.max": "GIS, single: maximum benefit",
    "oas.gis.single.topUpCutoff": "GIS, single: top-up cut-off",
    "oas.gis.spouseNone.cutoff": "GIS, spouse without OAS: income cut-off",
    "oas.gis.spouseNone.max": "GIS, spouse without OAS: maximum benefit",
    "oas.gis.spouseNone.topUpCutoff": "GIS, spouse without OAS: top-up cut-off",
    "oas.gis.spouseOas.cutoff": "GIS, spouse with OAS: income cut-off",
    "oas.gis.spouseOas.max": "GIS, spouse with OAS: maximum benefit",
    "oas.gis.spouseOas.topUpCutoff": "GIS, spouse with OAS: top-up cut-off",
    "oas.gis.topUpDivisorCouple": "GIS top-up divisor (couple)",
    "oas.gis.topUpDivisorSingle": "GIS top-up divisor (single)",
    "oas.gis.topUpStartCouple": "GIS top-up start (couple)",
    "oas.gis.topUpStartSingle": "GIS top-up start (single)",
    "oas.increaseAt75": "OAS increase at age 75",
    "oas.monthly65to74": "OAS monthly benefit, ages 65 to 74",
    "oas.monthly75plus": "OAS monthly benefit, age 75 and over",
    "oas.recoveryRate": "OAS recovery tax rate",
    "oas.recoveryThreshold": "OAS recovery tax income threshold",
    "oas.residenceYearsFull": "OAS years of residence for the full pension",
    "oas.residenceYearsMinimum": "OAS minimum years of residence",
    "oas.startAgeMax": "OAS latest start age",
    "oas.startAgeMin": "OAS earliest start age",
    "payroll.eiMaxInsurable": "EI maximum insurable earnings",
    "payroll.eiRate": "EI contribution rate",
    "payroll.qpipMaxInsurable": "QPIP maximum insurable earnings",
    "payroll.qpipRate": "QPIP contribution rate",
    "quebec.ageAmount": "Quebec age amount",
    "quebec.ageMinAge": "Quebec minimum age for the age amount",
    "quebec.bpa": "Quebec basic personal amount",
    "quebec.brackets": "Quebec tax brackets and rates",
    "quebec.creditRate": "Quebec non-refundable credit rate",
    "quebec.livingAloneAmount": "Quebec amount for a person living alone",
    "quebec.reductionRate":
      "Quebec reduction rate for the age and living-alone amounts",
    "quebec.reductionThreshold":
      "Quebec family-income threshold where those amounts shrink",
    "quebec.retirementIncomeAmount":
      "Quebec retirement income amount (maximum)",
    "quebec.retirementIncomeMultiple":
      "Quebec multiple applied to eligible retirement income",
    "quebec.splitMaxShare":
      "Quebec maximum share of retirement income that can be split",
    "quebec.splitMinAge": "Quebec minimum age for retirement income splitting",
    "quebec.workerDeductionMax": "Quebec worker deduction (maximum)",
    "quebec.workerDeductionRate": "Quebec worker deduction (rate)",
    "rrq.additionalMonths":
      "QPP months retained (the best 480) for the additional plan",
    "rrq.baseReplacement": "QPP base-plan replacement rate",
    "rrq.careerMaxAge": "QPP age where the contributory career ends",
    "rrq.careerStartAge": "QPP age where the contributory career starts",
    "rrq.earliestAge": "QPP earliest start age",
    "rrq.earlyBase":
      "QPP reduction per month before 65, for the smallest pensions",
    "rrq.earlySlope":
      "QPP increase of that reduction with the base pension (up to the maximum)",
    "rrq.excludedShare": "QPP share of lowest years dropped out",
    "rrq.exemption": "QPP general contribution exemption",
    "rrq.firstFrom": "QPP first year of the first additional plan",
    "rrq.firstReplacement": "QPP first additional plan replacement rate",
    "rrq.indexation": "QPP annual pension indexation",
    "rrq.lateMaxMonths": "QPP maximum months of deferral",
    "rrq.latePerMonth": "QPP increase per month after 65",
    "rrq.lateProtectionFrom":
      "QPP first year the base pension is protected on late start",
    "rrq.latestAge": "QPP latest start age",
    "rrq.survivorBaseShareUnder65": "Surviving spouse's pension: share of the base component under 65 (37.5%)",
    "rrq.survivorBaseShare65": "Surviving spouse's pension: share of the base component from 65 (60%)",
    "rrq.survivorAdditionalShare": "Surviving spouse's pension: share of the additional components (50%)",
    "rrq.survivorOwnPensionOffset": "Surviving spouse's pension: share of the survivor's own pension that offsets it (40%)",
    "rrq.survivorFlatRate45to64": "Surviving spouse's pension: flat-rate portion, 45 to 64",
    "rrq.survivorFlatRateUnder45": "Surviving spouse's pension: flat-rate portion, under 45",
    "rrq.survivorMaxUnder65": "Surviving spouse's pension: maximum monthly amount, 45 to 64 (check)",
    "rrq.survivorMax65": "Surviving spouse's pension: maximum monthly amount, 65 or over (check)",
    "rrq.maxBasePension65": "QPP maximum base pension at 65",
    "rrq.maxPension65": "QPP maximum pension at 65",
    "rrq.mga": "QPP maximum pensionable earnings (MPE)",
    "rrq.normalAge": "QPP normal pension age",
    "rrq.phaseIn": "QPP enhancement phase-in, by year",
    "rrq.rateBase": "QPP base-plan contribution rate",
    "rrq.rateFirst": "QPP first additional plan contribution rate",
    "rrq.rateSecond": "QPP second additional plan contribution rate",
    "rrq.secondFrom": "QPP first year of the second additional plan",
    "rrq.secondReplacement": "QPP second additional plan replacement rate",
    "rrq.yampe": "QPP additional maximum pensionable earnings (AMPE)",
  },
};
