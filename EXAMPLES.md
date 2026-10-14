# Les foyers d’exemple, imprimés

> **Fichier généré** par `npm run examples` — ne pas l’éditer à la main (`src/lib/examplesMd.test.ts` échoue si une ligne diffère).
> Les foyers sont inventés (`src/engine/golden/examples.ts`) ; chaque tableau vient du même moteur que l’application.

## Comment contre-vérifier

- **RRQ** : le simulateur de Retraite Québec (« Estimation des prestations ») avec les mêmes revenus de travail ; comparez la rente à 65 ans (en dollars d’aujourd’hui, la rente de la colonne « d’aujourd’hui »). Un écart de quelques pourcents vient du fait que l’application suppose que les salaires futurs croissent plus vite que les prix.
- **PSV / SRG** : l’estimateur des prestations de la Sécurité de la vieillesse (canada.ca). La PSV de base est le montant cité × la part de résidence × le report ; le SRG dépend du revenu net du ménage de l’année témoin.
- **Impôt** : un calculateur d’impôt 2026 (fédéral et Québec) avec les revenus de la ligne « Année témoin » ; l’application ne modélise ni les dons, ni les frais médicaux, ni la contribution santé. **À ce jour, l’impôt n’a été comparé à StudioTax que pour le cas « modeste » (voir STATE.md)**.
- **Année par année** : chaque ligne doit satisfaire dépenses + impôt = travail + rentes + SRG + tiré du nid (+ surplus épargné).

## golden — Couple, un en fonction publique

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Camille | né·e en 1978-03 | retraite à 60 ans | salaire 85 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1996) |
| ↳ comptes | REER 95 000 $ (+6 000 $/an) | CELI 48 000 $ (+7 000 $/an) | non enregistré 15 000 $ (+0 $/an) | rente d’employeur : RREGOP : 12 ans de service, début à 60 ans |
| Alex | né·e en 1981-09 | retraite à 62 ans | salaire 65 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1999) |
| ↳ comptes | REER 60 000 $ (+4 000 $/an) | CELI 36 000 $ (+6 000 $/an) | non enregistré 10 000 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 88 000 $ par année en travaillant, 90 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 2,7 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 437 119 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 60 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Camille | première rente 04/2043 : (base 2 206,53 $ + 1ʳᵉ supp. 326,29 $ + 2ᵉ supp. 145,25 $) × ajustement 100,0 % = 2 678,07 $/mois, soit 1 881 $ d’aujourd’hui | première pension 04/2043 : 1 085,62 $ × résidence 100 % × report 0,0 % = 1 085,62 $/mois, soit 763 $ d’aujourd’hui |
| Alex | première rente 10/2046 : (base 2 045,39 $ + 1ʳᵉ supp. 406,55 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 2 451,94 $/mois, soit 1 618 $ d’aujourd’hui | première pension 10/2046 : 1 155,46 $ × résidence 100 % × report 0,0 % = 1 155,46 $/mois, soit 763 $ d’aujourd’hui |

### Année par année — Camille (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 48 | 88 000 $ | 150 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 24 925 $ | 296 398 $ | couvert |
| 50 | 88 000 $ | 151 768 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 25 516 $ | 353 482 $ | couvert |
| 55 | 88 000 $ | 156 280 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 29 001 $ | 507 064 $ | couvert |
| 60 | 88 000 $ | 84 933 $ | 29 482 $ | 0 $ | 0 $ | 0 $ | 604 $ | 19 520 $ | 667 138 $ | tire du nid |
| 65 | 90 000 $ | 47 872 $ | 28 551 $ | 16 929 $ | 6 863 $ | 0 $ | 8 563 $ | 15 038 $ | 724 004 $ | tire du nid |
| 70 | 90 000 $ | 0 $ | 24 364 $ | 41 989 $ | 18 300 $ | 0 $ | 20 579 $ | 15 176 $ | 617 541 $ | tire du nid |
| 75 | 90 000 $ | 0 $ | 23 137 $ | 41 989 $ | 18 986 $ | 0 $ | 22 085 $ | 15 529 $ | 578 693 $ | tire du nid |
| 80 | 90 000 $ | 0 $ | 21 971 $ | 41 989 $ | 20 130 $ | 0 $ | 19 373 $ | 13 036 $ | 536 891 $ | tire du nid |
| 85 | 90 000 $ | 0 $ | 20 864 $ | 41 989 $ | 20 130 $ | 0 $ | 15 756 $ | 8 739 $ | 520 294 $ | tire du nid |
| 90 | 90 000 $ | 0 $ | 19 813 $ | 41 989 $ | 20 130 $ | 0 $ | 16 531 $ | 8 463 $ | 497 509 $ | tire du nid |
| 95 | 90 000 $ | 0 $ | 18 815 $ | 41 989 $ | 20 130 $ | 0 $ | 17 266 $ | 8 199 $ | 467 894 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2044, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Camille | 66 | 0 $ | 25 392 $ | 22 572 $ | 9 150 $ | 0 $ | 45 897 $ | 2 205 $ | 3 772 $ | 0 $ |
| Alex | 63 | 0 $ | 0 $ | 0 $ | 0 $ | 37 223 $ | 51 453 $ | 4 092 $ | 4 429 $ | 0 $ |

## average — Couple, revenus moyens

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Marie | né·e en 1984-05 | retraite à 62 ans | salaire 72 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 2002) |
| ↳ comptes | REER 85 000 $ (+5 000 $/an) | CELI 55 000 $ (+6 000 $/an) | non enregistré 10 000 $ (+0 $/an) | rente d’employeur : aucune |
| Luc | né·e en 1982-02 | retraite à 63 ans | salaire 58 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 2000) |
| ↳ comptes | REER 55 000 $ (dont immobilisé 25 000 $) (+3 000 $/an, employeur +2 000 $/an) | CELI 40 000 $ (+5 000 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 72 000 $ par année en travaillant, 74 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 2,7 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

Résidence principale : valeur 520 000 $, hypothèque 150 000 $ à 4,9 % (1 150 $ par mois, payée en 2041), gardée à vie. Le paiement s’ajoute aux dépenses tant qu’il dure ; la valeur nette de la maison compte à part des comptes.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 757 441 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 60 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Marie | première rente 06/2049 : (base 2 551,42 $ + 1ʳᵉ supp. 550,56 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 3 101,98 $/mois, soit 1 923 $ d’aujourd’hui | première pension 06/2049 : 1 229,79 $ × résidence 100 % × report 0,0 % = 1 229,79 $/mois, soit 762 $ d’aujourd’hui |
| Luc | première rente 03/2047 : (base 1 951,30 $ + 1ʳᵉ supp. 400,52 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 2 351,82 $/mois, soit 1 520 $ d’aujourd’hui | première pension 03/2047 : 1 179,72 $ × résidence 100 % × report 0,0 % = 1 179,72 $/mois, soit 762 $ d’aujourd’hui |

### Année par année — Marie (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 85 800 $ | 130 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 21 044 $ | 271 511 $ | couvert |
| 45 | 84 966 $ | 132 305 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 21 741 $ | 343 305 $ | couvert |
| 50 | 83 686 $ | 136 239 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 22 998 $ | 490 143 $ | couvert |
| 55 | 82 533 $ | 140 289 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 24 335 $ | 674 029 $ | couvert |
| 60 | 72 000 $ | 144 460 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 25 787 $ | 935 149 $ | couvert |
| 65 | 74 000 $ | 0 $ | 0 $ | 31 704 $ | 14 487 $ | 0 $ | 36 349 $ | 8 540 $ | 811 582 $ | tire du nid |
| 70 | 74 000 $ | 0 $ | 0 $ | 41 320 $ | 18 300 $ | 0 $ | 22 960 $ | 8 580 $ | 788 643 $ | tire du nid |
| 75 | 74 000 $ | 0 $ | 0 $ | 41 320 $ | 19 749 $ | 0 $ | 21 547 $ | 8 616 $ | 765 932 $ | tire du nid |
| 80 | 74 000 $ | 0 $ | 0 $ | 41 320 $ | 20 130 $ | 0 $ | 21 835 $ | 8 829 $ | 746 382 $ | tire du nid |
| 85 | 74 000 $ | 0 $ | 0 $ | 41 320 $ | 20 130 $ | 0 $ | 16 400 $ | 3 850 $ | 746 635 $ | tire du nid |
| 90 | 74 000 $ | 0 $ | 0 $ | 41 320 $ | 20 130 $ | 0 $ | 16 400 $ | 3 850 $ | 750 754 $ | tire du nid |
| 95 | 51 800 $ | 0 $ | 0 $ | 29 789 $ | 10 065 $ | 0 $ | 15 670 $ | 3 723 $ | 757 441 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2047, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Marie | 63 | 0 $ | 0 $ | 0 $ | 0 $ | 41 772 $ | 50 182 $ | 3 943 $ | 3 940 $ | 0 $ |
| Luc | 65 | 0 $ | 0 $ | 15 201 $ | 7 625 $ | 20 886 $ | 35 357 $ | 983 $ | 2 297 $ | 0 $ |

## modest — Une personne, petit revenu

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Hélène | né·e en 1971-11 | retraite à 65 ans | salaire 40 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1989) |
| ↳ comptes | REER 22 000 $ (+1 000 $/an) | CELI 18 000 $ (+1 500 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 30 000 $ par année en travaillant, 28 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 2,7 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 86 718 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 64 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Hélène | première rente 12/2036 : (base 951,04 $ + 1ʳᵉ supp. 135,22 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 1 086,26 $/mois, soit 882 $ d’aujourd’hui | première pension 12/2036 : 938,64 $ × résidence 100 % × report 0,0 % = 938,64 $/mois, soit 763 $ d’aujourd’hui |

### Année par année — Hélène (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 55 | 30 000 $ | 40 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 4 359 $ | 44 508 $ | couvert |
| 60 | 30 000 $ | 41 189 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 4 649 $ | 66 649 $ | couvert |
| 65 | 28 000 $ | 35 345 $ | 0 $ | 882 $ | 763 $ | 0 $ | 0 $ | 1 996 $ | 95 885 $ | couvert |
| 70 | 28 000 $ | 0 $ | 0 $ | 10 589 $ | 9 150 $ | 4 262 $ | 3 999 $ | 0 $ | 86 273 $ | tire du nid |
| 75 | 28 000 $ | 0 $ | 0 $ | 10 589 $ | 9 226 $ | 4 338 $ | 3 846 $ | 0 $ | 75 634 $ | tire du nid |
| 80 | 28 000 $ | 0 $ | 0 $ | 10 589 $ | 10 065 $ | 6 251 $ | 1 095 $ | 0 $ | 75 078 $ | tire du nid |
| 85 | 28 000 $ | 0 $ | 0 $ | 10 589 $ | 10 065 $ | 6 261 $ | 1 084 $ | 0 $ | 78 517 $ | tire du nid |
| 90 | 28 000 $ | 0 $ | 0 $ | 10 589 $ | 10 065 $ | 6 261 $ | 1 085 $ | 0 $ | 82 379 $ | tire du nid |
| 95 | 28 000 $ | 0 $ | 0 $ | 10 589 $ | 10 065 $ | 6 261 $ | 1 085 $ | 0 $ | 86 718 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2037, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hélène | 66 | 0 $ | 0 $ | 10 589 $ | 9 150 $ | 3 999 $ | 23 738 $ | 0 $ | 0 $ | 0 $ |

## rich — Couple, hauts revenus

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Sophie | né·e en 1976-04 | retraite à 58 ans | salaire 190 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1994) |
| ↳ comptes | REER 640 000 $ (+25 000 $/an) | CELI 100 000 $ (+7 000 $/an) | non enregistré 450 000 $ (+20 000 $/an) | rente d’employeur : aucune |
| Marc | né·e en 1978-08 | retraite à 60 ans | salaire 130 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1996) |
| ↳ comptes | REER 380 000 $ (+20 000 $/an) | CELI 98 000 $ (+7 000 $/an) | non enregistré 150 000 $ (+10 000 $/an) | rente d’employeur : aucune |

Dépenses : 150 000 $ par année en travaillant, 130 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 2,7 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 972 482 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 57 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Sophie | première rente 05/2041 : (base 2 073,17 $ + 1ʳᵉ supp. 244,27 $ + 2ᵉ supp. 97,03 $) × ajustement 100,0 % = 2 414,47 $/mois, soit 1 768 $ d’aujourd’hui | première pension 05/2041 : 1 041,42 $ × résidence 100 % × report 0,0 % = 1 041,42 $/mois, soit 762 $ d’aujourd’hui |
| Marc | première rente 09/2043 : (base 2 319,17 $ + 1ʳᵉ supp. 341,94 $ + 2ᵉ supp. 146,65 $) × ajustement 100,0 % = 2 807,76 $/mois, soit 1 972 $ d’aujourd’hui | première pension 09/2043 : 1 085,62 $ × résidence 100 % × report 0,0 % = 1 085,62 $/mois, soit 763 $ d’aujourd’hui |

### Année par année — Sophie (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | 150 000 $ | 320 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 80 839 $ | 1 975 167 $ | couvert |
| 55 | 150 000 $ | 329 514 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 84 971 $ | 2 626 681 $ | couvert |
| 60 | 150 000 $ | 137 845 $ | 0 $ | 0 $ | 0 $ | 0 $ | 58 215 $ | 39 398 $ | 2 968 256 $ | tire du nid |
| 65 | 130 000 $ | 0 $ | 0 $ | 14 142 $ | 6 100 $ | 1 792 $ | 110 418 $ | 2 452 $ | 2 784 983 $ | tire du nid |
| 70 | 130 000 $ | 0 $ | 0 $ | 44 879 $ | 18 300 $ | 0 $ | 105 303 $ | 38 481 $ | 2 628 523 $ | tire du nid |
| 75 | 130 000 $ | 0 $ | 0 $ | 44 879 $ | 18 910 $ | 0 $ | 105 215 $ | 39 004 $ | 2 385 342 $ | tire du nid |
| 80 | 130 000 $ | 0 $ | 0 $ | 44 879 $ | 20 130 $ | 0 $ | 104 039 $ | 39 048 $ | 2 120 222 $ | tire du nid |
| 85 | 130 000 $ | 0 $ | 0 $ | 44 879 $ | 20 130 $ | 0 $ | 104 080 $ | 39 088 $ | 1 823 913 $ | tire du nid |
| 90 | 130 000 $ | 0 $ | 0 $ | 44 879 $ | 20 130 $ | 0 $ | 105 482 $ | 39 641 $ | 1 489 861 $ | tire du nid |
| 95 | 130 000 $ | 0 $ | 0 $ | 44 879 $ | 20 130 $ | 0 $ | 104 147 $ | 39 156 $ | 1 115 254 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2039, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sophie | 63 | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 17 788 $ | 156 $ | 0 $ | 0 $ |
| Marc | 61 | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 15 963 $ | 0 $ | 0 $ | 0 $ |

## behind — Une personne, en retard

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Julien | né·e en 1974-06 | retraite à 60 ans | salaire 62 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1992) |
| ↳ comptes | REER 35 000 $ (+3 000 $/an) | CELI 12 000 $ (+0 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 46 000 $ par année en travaillant, 38 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 2,7 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

### Ce qui sort

- Le plan tel que décrit : manque d’argent en 2036.
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 70 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Julien | première rente 07/2039 : (base 1 537,64 $ + 1ʳᵉ supp. 191,52 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 1 729,16 $/mois, soit 1 320 $ d’aujourd’hui | première pension 07/2039 : 999,02 $ × résidence 100 % × report 0,0 % = 999,02 $/mois, soit 762 $ d’aujourd’hui |

### Année par année — Julien (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 52 | 46 000 $ | 62 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 10 507 $ | 49 866 $ | couvert |
| 55 | 46 000 $ | 63 099 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 10 542 $ | 57 768 $ | couvert |
| 60 | 38 000 $ | 27 073 $ | 0 $ | 0 $ | 0 $ | 0 $ | 19 367 $ | 6 453 $ | 55 954 $ | tire du nid |
| 65 | 38 000 $ | 0 $ | 0 $ | 7 919 $ | 4 575 $ | 4 120 $ | 0 $ | 0 $ | 0 $ | manque |
| 70 | 38 000 $ | 0 $ | 0 $ | 15 837 $ | 9 150 $ | 3 637 $ | 0 $ | 0 $ | 0 $ | manque |
| 75 | 38 000 $ | 0 $ | 0 $ | 15 837 $ | 9 607 $ | 3 637 $ | 0 $ | 47 $ | 0 $ | manque |
| 80 | 38 000 $ | 0 $ | 0 $ | 15 837 $ | 10 065 $ | 3 637 $ | 0 $ | 139 $ | 0 $ | manque |
| 85 | 38 000 $ | 0 $ | 0 $ | 15 837 $ | 10 065 $ | 3 637 $ | 0 $ | 139 $ | 0 $ | manque |
| 90 | 38 000 $ | 0 $ | 0 $ | 15 837 $ | 10 065 $ | 3 637 $ | 0 $ | 139 $ | 0 $ | manque |
| 95 | 38 000 $ | 0 $ | 0 $ | 15 837 $ | 10 065 $ | 3 637 $ | 0 $ | 139 $ | 0 $ | manque |

### Année témoin pour un calculateur d’impôt : 2035, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Julien | 61 | 0 $ | 0 $ | 0 $ | 0 $ | 40 003 $ | 40 003 $ | 2 753 $ | 2 643 $ | 0 $ |

## retired — Couple à la retraite

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Gilles | né·e en 1958-03 | retraite à 62 ans | salaire 0 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1976) |
| ↳ comptes | REER 280 000 $ (+0 $/an) | CELI 90 000 $ (+0 $/an) | non enregistré 60 000 $ (+0 $/an) | rente d’employeur : Rente de l’employeur en cours : 34 000 $ par année |
| Francine | né·e en 1960-09 | retraite à 63 ans | salaire 0 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1978) |
| ↳ comptes | REER 120 000 $ (+0 $/an) | CELI 70 000 $ (+0 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 82 000 $ par année en travaillant, 82 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 2,7 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 269 345 $ (dollars d’aujourd’hui).
- Tout le monde est déjà à la retraite : la question n’est plus « quand ? » mais « l’argent dure-t-il ? » (la réponse est la ligne du dessus).

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Gilles | première rente 04/2023 : (base 841,59 $ + 1ʳᵉ supp. 1,35 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 842,94 $/mois, soit 897 $ d’aujourd’hui | première pension 04/2023 : 762,50 $ × résidence 100 % × report 0,0 % = 762,50 $/mois, soit 812 $ d’aujourd’hui |
| Francine | première rente 10/2025 : (base 773,75 $ + 1ʳᵉ supp. 21,82 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 795,57 $/mois, soit 812 $ d’aujourd’hui | première pension 10/2025 : 762,50 $ × résidence 100 % × report 0,0 % = 762,50 $/mois, soit 779 $ d’aujourd’hui |

### Année par année — Gilles (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 68 | 82 000 $ | 0 $ | 34 000 $ | 20 513 $ | 18 300 $ | 0 $ | 15 354 $ | 6 152 $ | 631 958 $ | tire du nid |
| 70 | 82 000 $ | 0 $ | 33 304 $ | 20 513 $ | 18 300 $ | 0 $ | 16 035 $ | 6 153 $ | 628 902 $ | tire du nid |
| 75 | 82 000 $ | 0 $ | 31 627 $ | 20 513 $ | 18 986 $ | 0 $ | 22 432 $ | 11 558 $ | 592 635 $ | tire du nid |
| 80 | 82 000 $ | 0 $ | 30 033 $ | 20 513 $ | 20 130 $ | 0 $ | 22 955 $ | 11 632 $ | 544 524 $ | tire du nid |
| 85 | 82 000 $ | 0 $ | 28 521 $ | 20 513 $ | 20 130 $ | 0 $ | 24 548 $ | 11 680 $ | 483 660 $ | tire du nid |
| 90 | 82 000 $ | 0 $ | 27 084 $ | 20 513 $ | 20 130 $ | 0 $ | 26 059 $ | 11 739 $ | 407 158 $ | tire du nid |
| 95 | 82 000 $ | 0 $ | 25 720 $ | 20 513 $ | 20 130 $ | 0 $ | 27 066 $ | 10 555 $ | 313 720 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2026, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gilles | 68 | 0 $ | 34 000 $ | 10 766 $ | 9 150 $ | 0 $ | 45 635 $ | 2 101 $ | 2 462 $ | 0 $ |
| Francine | 66 | 0 $ | 0 $ | 9 747 $ | 9 150 $ | 0 $ | 29 097 $ | 168 $ | 1 420 $ | 0 $ |

## newcomer — Arrivée au Canada à 30 ans

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Amira | né·e en 1976-02 | retraite à 65 ans | salaire 58 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 2006) |
| ↳ comptes | REER 110 000 $ (+3 000 $/an) | CELI 50 000 $ (+3 000 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 38 000 $ par année en travaillant, 36 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 2,7 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 217 429 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 63 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Amira | première rente 03/2041 : (base 1 460,89 $ + 1ʳᵉ supp. 284,22 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 1 745,11 $/mois, soit 1 278 $ d’aujourd’hui | première pension 03/2041 : 1 041,42 $ × résidence 88 % × report 0,0 % = 911,24 $/mois, soit 667 $ d’aujourd’hui |

### Année par année — Amira (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | 38 000 $ | 58 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 8 539 $ | 174 380 $ | couvert |
| 55 | 38 000 $ | 59 724 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 9 019 $ | 236 935 $ | couvert |
| 60 | 38 000 $ | 61 500 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 9 542 $ | 312 999 $ | couvert |
| 65 | 36 000 $ | 5 277 $ | 0 $ | 12 777 $ | 6 672 $ | 0 $ | 14 065 $ | 2 529 $ | 379 375 $ | tire du nid |
| 70 | 36 000 $ | 0 $ | 0 $ | 15 333 $ | 8 006 $ | 0 $ | 15 465 $ | 2 804 $ | 343 310 $ | tire du nid |
| 75 | 36 000 $ | 0 $ | 0 $ | 15 333 $ | 8 673 $ | 0 $ | 14 818 $ | 2 824 $ | 303 371 $ | tire du nid |
| 80 | 36 000 $ | 0 $ | 0 $ | 15 333 $ | 8 807 $ | 0 $ | 14 703 $ | 2 843 $ | 262 014 $ | tire du nid |
| 85 | 36 000 $ | 0 $ | 0 $ | 15 333 $ | 8 807 $ | 3 890 $ | 7 971 $ | 0 $ | 244 217 $ | tire du nid |
| 90 | 36 000 $ | 0 $ | 0 $ | 15 333 $ | 8 807 $ | 3 890 $ | 7 971 $ | 0 $ | 231 600 $ | tire du nid |
| 95 | 36 000 $ | 0 $ | 0 $ | 15 333 $ | 8 807 $ | 3 890 $ | 7 971 $ | 0 $ | 217 429 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2042, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Amira | 66 | 0 $ | 0 $ | 15 333 $ | 8 006 $ | 15 447 $ | 38 786 $ | 1 367 $ | 1 419 $ | 0 $ |

## heir — Une personne, grand héritage

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Jules | né·e en 1999-09 | retraite à 30 ans | salaire 62 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 2017) |
| ↳ comptes | REER 18 000 $ (+0 $/an) | CELI 70 000 $ (+5 000 $/an) | non enregistré 3 500 000 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 52 000 $ par année en travaillant, 54 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 2,7 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 6 763 578 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 27 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Jules | première rente 10/2064 : (base 774,74 $ + 1ʳᵉ supp. 220,28 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 995,02 $/mois, soit 452 $ d’aujourd’hui | première pension 10/2064 : 1 679,65 $ × résidence 100 % × report 0,0 % = 1 679,65 $/mois, soit 763 $ d’aujourd’hui |

### Année par année — Jules (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 27 | 52 000 $ | 62 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 5 559 $ | 10 801 $ | 3 726 290 $ | tire du nid |
| 30 | 54 000 $ | 42 066 $ | 0 $ | 0 $ | 0 $ | 0 $ | 20 589 $ | 5 484 $ | 3 907 503 $ | tire du nid |
| 35 | 54 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 54 000 $ | 0 $ | 4 001 703 $ | tire du nid |
| 40 | 54 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 54 000 $ | 0 $ | 4 105 324 $ | tire du nid |
| 45 | 54 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 54 000 $ | 0 $ | 4 219 315 $ | tire du nid |
| 50 | 54 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 54 000 $ | 0 $ | 4 344 723 $ | tire du nid |
| 55 | 54 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 54 226 $ | 226 $ | 4 481 980 $ | tire du nid |
| 60 | 54 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 54 417 $ | 417 $ | 4 631 915 $ | tire du nid |
| 65 | 54 000 $ | 0 $ | 0 $ | 1 355 $ | 2 288 $ | 268 $ | 50 090 $ | 0 $ | 4 800 577 $ | tire du nid |
| 70 | 54 000 $ | 0 $ | 0 $ | 5 420 $ | 9 150 $ | 551 $ | 40 369 $ | 1 490 $ | 5 058 218 $ | tire du nid |
| 75 | 54 000 $ | 0 $ | 0 $ | 5 420 $ | 9 379 $ | 0 $ | 40 803 $ | 1 602 $ | 5 337 237 $ | tire du nid |
| 80 | 54 000 $ | 0 $ | 0 $ | 5 420 $ | 10 065 $ | 0 $ | 40 385 $ | 1 871 $ | 5 646 262 $ | tire du nid |
| 85 | 54 000 $ | 0 $ | 0 $ | 5 420 $ | 10 065 $ | 0 $ | 40 515 $ | 2 001 $ | 5 984 909 $ | tire du nid |
| 90 | 54 000 $ | 0 $ | 0 $ | 5 420 $ | 10 065 $ | 0 $ | 40 625 $ | 2 110 $ | 6 356 234 $ | tire du nid |
| 95 | 54 000 $ | 0 $ | 0 $ | 5 420 $ | 10 065 $ | 0 $ | 40 718 $ | 2 203 $ | 6 763 578 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2030, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Jules | 31 | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 4 584 $ | 0 $ | 0 $ | 0 $ |

## downsizer — Couple, vendre la maison

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Nadia | né·e en 1971-06 | retraite à 58 ans | salaire 96 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1989) |
| ↳ comptes | REER 255 000 $ (+6 000 $/an) | CELI 88 000 $ (+6 000 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |
| Paul | né·e en 1973-01 | retraite à 58 ans | salaire 74 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1991) |
| ↳ comptes | REER 170 000 $ (+4 000 $/an) | CELI 62 000 $ (+5 000 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 92 000 $ par année en travaillant, 80 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 2,7 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

Résidence principale : valeur 880 000 $, hypothèque 70 000 $ à 4,5 % (1 300 $ par mois, payée en 2031), vendue à 58 ans (logement de remplacement : 360 000 $). Le paiement s’ajoute aux dépenses tant qu’il dure ; la valeur nette de la maison compte à part des comptes.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 276 312 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 58 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Nadia | première rente 07/2036 : (base 1 809,81 $ + 1ʳᵉ supp. 132,04 $ + 2ᵉ supp. 40,18 $) × ajustement 100,0 % = 1 982,03 $/mois, soit 1 610 $ d’aujourd’hui | première pension 07/2036 : 938,64 $ × résidence 100 % × report 0,0 % = 938,64 $/mois, soit 763 $ d’aujourd’hui |
| Paul | première rente 02/2038 : (base 1 865,84 $ + 1ʳᵉ supp. 163,34 $ + 2ᵉ supp. 14,04 $) × ajustement 100,0 % = 2 043,22 $/mois, soit 1 592 $ d’aujourd’hui | première pension 02/2038 : 978,47 $ × résidence 100 % × report 0,0 % = 978,47 $/mois, soit 762 $ d’aujourd’hui |

### Année par année — Nadia (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 55 | 107 600 $ | 170 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 34 112 $ | 617 669 $ | couvert |
| 60 | 80 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 80 000 $ | 0 $ | 1 140 144 $ | tire du nid |
| 65 | 80 000 $ | 0 $ | 0 $ | 9 661 $ | 4 575 $ | 6 253 $ | 59 511 $ | 0 $ | 867 270 $ | tire du nid |
| 70 | 80 000 $ | 0 $ | 0 $ | 38 428 $ | 18 300 $ | 0 $ | 34 109 $ | 10 837 $ | 775 811 $ | tire du nid |
| 75 | 80 000 $ | 0 $ | 0 $ | 38 428 $ | 18 758 $ | 0 $ | 33 731 $ | 10 894 $ | 688 902 $ | tire du nid |
| 80 | 80 000 $ | 0 $ | 0 $ | 38 428 $ | 20 130 $ | 0 $ | 32 369 $ | 10 927 $ | 599 328 $ | tire du nid |
| 85 | 80 000 $ | 0 $ | 0 $ | 38 428 $ | 20 130 $ | 0 $ | 32 975 $ | 11 126 $ | 499 292 $ | tire du nid |
| 90 | 80 000 $ | 0 $ | 0 $ | 38 428 $ | 20 130 $ | 0 $ | 27 218 $ | 5 285 $ | 391 965 $ | tire du nid |
| 95 | 80 000 $ | 0 $ | 0 $ | 38 428 $ | 20 130 $ | 0 $ | 24 473 $ | 3 031 $ | 309 143 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2031, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Nadia | 60 | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 3 080 $ | 0 $ | 0 $ | 0 $ |
| Paul | 58 | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ |

## planner — Couple, une vie à planifier

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Élise | né·e en 1989-03 | retraite à 58 ans | salaire 88 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 2007) |
| ↳ comptes | REER 45 000 $ (+7 000 $/an) | CELI 22 000 $ (+6 000 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |
| Thomas | né·e en 1987-09 | retraite à 58 ans | salaire 74 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 2005) |
| ↳ comptes | REER 30 000 $ (+5 000 $/an) | CELI 18 000 $ (+6 000 $/an) | non enregistré 12 000 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 78 000 $ par année en travaillant, 72 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 2,7 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

Résidence principale : valeur 470 000 $, hypothèque 215 000 $ à 4,9 % (1 550 $ par mois, payée en 2042), gardée à vie. Le paiement s’ajoute aux dépenses tant qu’il dure ; la valeur nette de la maison compte à part des comptes.

Événements de vie : enfants à venir ou à la maison (2028) : coût par tranche d’âge 11 000 $ · 9 500 $ · 11 500 $ · 6 000 $ par année jusqu’à 23 ans ; allocations pour enfants comptées, exclusion des mois avec un enfant de moins de 7 ans dans la moyenne du RRQ, congé parental (20 + 12 semaines partagées) ; Élise garde 30 % de son salaire jusqu’à 64 ans ; Un héritage : 60 000 $ reçus en 2038 ; Des soins plus tard : 45 000 $ par année de 2072 à 2081 ; les dépenses à la retraite changent de -1,0 % par année (en termes réels) à partir de 70 ans.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 493 003 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 57 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Élise | première rente 04/2054 : (base 2 856,96 $ + 1ʳᵉ supp. 670,71 $ + 2ᵉ supp. 316,14 $) × ajustement 100,0 % = 3 843,81 $/mois, soit 2 148 $ d’aujourd’hui | première pension 04/2054 : 1 364,46 $ × résidence 100 % × report 0,0 % = 1 364,46 $/mois, soit 763 $ d’aujourd’hui |
| Thomas | première rente 10/2052 : (base 2 545,81 $ + 1ʳᵉ supp. 582,34 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 3 128,15 $/mois, soit 1 822 $ d’aujourd’hui | première pension 10/2052 : 1 308,91 $ × résidence 100 % × report 0,0 % = 1 308,91 $/mois, soit 763 $ d’aujourd’hui |

### Année par année — Élise (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 37 | 96 600 $ | 162 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 30 504 $ | 156 239 $ | couvert |
| 40 | 106 476 $ | 152 369 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 26 675 $ | 213 391 $ | couvert |
| 45 | 103 251 $ | 172 553 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 33 211 $ | 355 816 $ | couvert |
| 50 | 101 696 $ | 177 445 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 34 969 $ | 602 859 $ | couvert |
| 55 | 89 500 $ | 182 483 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 36 779 $ | 856 085 $ | couvert |
| 60 | 78 000 $ | 30 209 $ | 0 $ | 0 $ | 0 $ | 0 $ | 64 507 $ | 14 427 $ | 796 160 $ | tire du nid |
| 65 | 72 000 $ | 0 $ | 0 $ | 40 569 $ | 16 013 $ | 0 $ | 24 165 $ | 8 061 $ | 631 674 $ | tire du nid |
| 70 | 70 567 $ | 0 $ | 0 $ | 46 877 $ | 18 300 $ | 0 $ | 13 543 $ | 7 513 $ | 632 759 $ | tire du nid |
| 75 | 67 109 $ | 0 $ | 0 $ | 46 877 $ | 19 901 $ | 0 $ | 6 599 $ | 6 023 $ | 660 312 $ | tire du nid |
| 80 | 63 820 $ | 0 $ | 0 $ | 46 877 $ | 20 130 $ | 0 $ | 2 293 $ | 5 480 $ | 721 351 $ | tire du nid |
| 85 | 105 692 $ | 0 $ | 0 $ | 46 877 $ | 20 130 $ | 0 $ | 44 109 $ | 5 423 $ | 659 660 $ | tire du nid |
| 90 | 102 717 $ | 0 $ | 0 $ | 46 877 $ | 20 130 $ | 0 $ | 41 134 $ | 5 423 $ | 514 097 $ | tire du nid |
| 95 | 39 202 $ | 0 $ | 0 $ | 33 199 $ | 10 065 $ | 0 $ | 545 $ | 4 608 $ | 493 003 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2053, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Élise | 64 | 0 $ | 0 $ | 0 $ | 0 $ | 51 838 $ | 51 838 $ | 4 137 $ | 4 604 $ | 0 $ |
| Thomas | 66 | 0 $ | 0 $ | 21 644 $ | 9 150 $ | 426 $ | 31 221 $ | 600 $ | 1 718 $ | 0 $ |

## family — Couple, une famille qui grandit

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Olivier | né·e en 1988-06 | retraite à 62 ans | salaire 135 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 2006) |
| ↳ comptes | REER 95 000 $ (+9 000 $/an) | CELI 48 000 $ (+7 000 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |
| Léa | né·e en 1990-02 | retraite à 62 ans | salaire 24 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 2008) |
| ↳ comptes | REER 22 000 $ (+1 000 $/an) | CELI 26 000 $ (+2 000 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 80 000 $ par année en travaillant, 66 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 2,7 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

Résidence principale : valeur 590 000 $, hypothèque 410 000 $ à 4,9 % (2 350 $ par mois, payée en 2051), gardée à vie. Le paiement s’ajoute aux dépenses tant qu’il dure ; la valeur nette de la maison compte à part des comptes.

Événements de vie : enfants à venir ou à la maison (2024, 2028) : coût par tranche d’âge 11 000 $ · 9 500 $ · 11 500 $ · 6 000 $ par année jusqu’à 23 ans ; allocations pour enfants comptées, exclusion des mois avec un enfant de moins de 7 ans dans la moyenne du RRQ, congé parental (24 + 8 semaines partagées) ; les dépenses à la retraite changent de -1,0 % par année (en termes réels) à partir de 70 ans.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 963 277 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 60 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Olivier | première rente 07/2053 : (base 3 027,50 $ + 1ʳᵉ supp. 742,80 $ + 2ᵉ supp. 358,53 $) × ajustement 100,0 % = 4 128,83 $/mois, soit 2 356 $ d’aujourd’hui | première pension 07/2053 : 1 336,40 $ × résidence 100 % × report 0,0 % = 1 336,40 $/mois, soit 763 $ d’aujourd’hui |
| Léa | première rente 03/2055 : (base 1 540,91 $ + 1ʳᵉ supp. 293,90 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 1 834,81 $/mois, soit 1 004 $ d’aujourd’hui | première pension 03/2055 : 1 393,11 $ × résidence 100 % × report 0,0 % = 1 393,11 $/mois, soit 762 $ d’aujourd’hui |

### Année par année — Olivier (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 38 | 108 200 $ | 162 818 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 35 406 $ | 211 117 $ | couvert |
| 40 | 118 052 $ | 160 496 $ | 0 $ | 0 $ | 0 $ | 0 $ | 2 275 $ | 37 632 $ | 232 223 $ | tire du nid |
| 45 | 115 382 $ | 173 368 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 38 178 $ | 294 683 $ | couvert |
| 50 | 111 476 $ | 176 662 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 40 248 $ | 408 146 $ | couvert |
| 55 | 111 307 $ | 178 173 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 42 438 $ | 546 811 $ | couvert |
| 60 | 94 852 $ | 180 876 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 44 693 $ | 733 742 $ | couvert |
| 65 | 66 000 $ | 0 $ | 0 $ | 14 135 $ | 4 575 $ | 0 $ | 63 027 $ | 10 169 $ | 620 934 $ | tire du nid |
| 70 | 66 000 $ | 0 $ | 0 $ | 40 201 $ | 18 300 $ | 0 $ | 13 928 $ | 5 727 $ | 593 517 $ | tire du nid |
| 75 | 62 765 $ | 0 $ | 0 $ | 40 201 $ | 18 757 $ | 0 $ | 9 851 $ | 4 726 $ | 610 997 $ | tire du nid |
| 80 | 59 689 $ | 0 $ | 0 $ | 40 201 $ | 20 130 $ | 0 $ | 9 489 $ | 5 033 $ | 655 032 $ | tire du nid |
| 85 | 56 764 $ | 0 $ | 0 $ | 40 201 $ | 20 130 $ | 0 $ | 9 125 $ | 4 949 $ | 721 784 $ | tire du nid |
| 90 | 53 982 $ | 0 $ | 0 $ | 40 201 $ | 20 130 $ | 0 $ | 8 759 $ | 4 863 $ | 812 429 $ | tire du nid |
| 95 | 51 336 $ | 0 $ | 0 $ | 40 201 $ | 20 130 $ | 0 $ | 8 341 $ | 4 760 $ | 929 219 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2053, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Olivier | 65 | 0 $ | 0 $ | 14 135 $ | 4 575 $ | 62 882 $ | 50 150 $ | 2 795 $ | 3 836 $ | 0 $ |
| Léa | 63 | 0 $ | 0 $ | 0 $ | 0 $ | 145 $ | 31 586 $ | 1 769 $ | 1 769 $ | 0 $ |

## melter — Une personne, un très gros REER

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Denise | né·e en 1966-04 | retraite à 60 ans | salaire 0 $ | RRQ à 70 ans, PSV à 70 ans (au Canada depuis 1984) |
| ↳ comptes | REER 1 600 000 $ (+0 $/an) | CELI 35 000 $ (+0 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 42 000 $ par année en travaillant, 42 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 2,7 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 1 649 065 $ (dollars d’aujourd’hui).
- Tout le monde est déjà à la retraite : la question n’est plus « quand ? » mais « l’argent dure-t-il ? » (la réponse est la ligne du dessus).

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Denise | première rente 05/2036 : (base 1 880,39 $ + 1ʳᵉ supp. 75,35 $ + 2ᵉ supp. 13,31 $) × ajustement 142,0 % = 2 796,05 $/mois, soit 2 271 $ d’aujourd’hui | première pension 05/2036 : 938,64 $ × résidence 100 % × report 36,0 % = 1 276,55 $/mois, soit 1 037 $ d’aujourd’hui |

### Année par année — Denise (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 60 | 42 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 54 345 $ | 9 380 $ | 1 656 052 $ | tire du nid |
| 65 | 42 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 54 344 $ | 7 177 $ | 1 587 057 $ | tire du nid |
| 70 | 42 000 $ | 0 $ | 0 $ | 18 171 $ | 8 296 $ | 0 $ | 27 879 $ | 7 199 $ | 1 546 097 $ | tire du nid |
| 75 | 42 000 $ | 0 $ | 0 $ | 27 256 $ | 13 274 $ | 0 $ | 74 228 $ | 32 827 $ | 1 577 163 $ | tire du nid |
| 80 | 42 000 $ | 0 $ | 0 $ | 27 256 $ | 13 688 $ | 0 $ | 71 501 $ | 31 689 $ | 1 589 101 $ | tire du nid |
| 85 | 42 000 $ | 0 $ | 0 $ | 27 256 $ | 13 688 $ | 0 $ | 68 754 $ | 30 384 $ | 1 604 926 $ | tire du nid |
| 90 | 42 000 $ | 0 $ | 0 $ | 27 256 $ | 13 688 $ | 0 $ | 66 002 $ | 29 099 $ | 1 624 658 $ | tire du nid |
| 95 | 42 000 $ | 0 $ | 0 $ | 27 256 $ | 13 688 $ | 0 $ | 62 851 $ | 27 625 $ | 1 649 065 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2026, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Denise | 60 | 0 $ | 0 $ | 0 $ | 0 $ | 54 345 $ | 54 345 $ | 4 430 $ | 4 950 $ | 0 $ |

## couple62 — Couple, retraite à 62 ans avec 150 000 $

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Dave | né·e en 1964-05 | retraite à 62 ans | salaire 32 500 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1982) |
| ↳ comptes | REER 40 000 $ (+0 $/an) | CELI 35 000 $ (+0 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |
| Linda | né·e en 1964-05 | retraite à 62 ans | salaire 32 500 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1982) |
| ↳ comptes | REER 40 000 $ (+0 $/an) | CELI 35 000 $ (+0 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 48 000 $ par année en travaillant, 48 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 2,7 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

Résidence principale : valeur 450 000 $, hypothèque 0 $ à 5,0 % (0 $ par mois, aucune hypothèque), gardée à vie. Le paiement s’ajoute aux dépenses tant qu’il dure ; la valeur nette de la maison compte à part des comptes.

### Ce qui sort

- Le plan tel que décrit : manque d’argent en 2031.
- Tout le monde est déjà à la retraite : la question n’est plus « quand ? » mais « l’argent dure-t-il ? » (la réponse est la ligne du dessus).

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Dave | première rente 06/2029 : (base 798,09 $ + 1ʳᵉ supp. 20,76 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 818,85 $/mois, soit 769 $ d’aujourd’hui | première pension 06/2029 : 811,55 $ × résidence 100 % × report 0,0 % = 811,55 $/mois, soit 762 $ d’aujourd’hui |
| Linda | première rente 06/2029 : (base 798,09 $ + 1ʳᵉ supp. 20,76 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 818,85 $/mois, soit 769 $ d’aujourd’hui | première pension 06/2029 : 811,55 $ × résidence 100 % × report 0,0 % = 811,55 $/mois, soit 762 $ d’aujourd’hui |

### Année par année — Dave (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 62 | 48 000 $ | 21 667 $ | 0 $ | 0 $ | 0 $ | 0 $ | 31 409 $ | 3 777 $ | 124 642 $ | tire du nid |
| 65 | 48 000 $ | 0 $ | 0 $ | 10 771 $ | 10 675 $ | 5 755 $ | 20 799 $ | 0 $ | 6 682 $ | tire du nid |
| 70 | 48 000 $ | 0 $ | 0 $ | 18 465 $ | 18 300 $ | 6 032 $ | 0 $ | 0 $ | 0 $ | manque |
| 75 | 48 000 $ | 0 $ | 0 $ | 18 465 $ | 19 367 $ | 6 032 $ | 0 $ | 0 $ | 0 $ | manque |
| 80 | 48 000 $ | 0 $ | 0 $ | 18 465 $ | 20 130 $ | 6 032 $ | 0 $ | 0 $ | 0 $ | manque |
| 85 | 48 000 $ | 0 $ | 0 $ | 18 465 $ | 20 130 $ | 6 032 $ | 0 $ | 0 $ | 0 $ | manque |
| 90 | 48 000 $ | 0 $ | 0 $ | 18 465 $ | 20 130 $ | 6 032 $ | 0 $ | 0 $ | 0 $ | manque |
| 95 | 48 000 $ | 0 $ | 0 $ | 18 465 $ | 20 130 $ | 6 032 $ | 0 $ | 0 $ | 0 $ | manque |

### Année témoin pour un calculateur d’impôt : 2027, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dave | 63 | 0 $ | 0 $ | 0 $ | 0 $ | 25 217 $ | 25 217 $ | 1 025 $ | 877 $ | 0 $ |
| Linda | 63 | 0 $ | 0 $ | 0 $ | 0 $ | 25 217 $ | 25 217 $ | 1 025 $ | 877 $ | 0 $ |

