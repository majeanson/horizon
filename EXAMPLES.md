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

Dépenses : 88 000 $ par année en travaillant, 90 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 3,1 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 665 384 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 59 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Camille | première rente 04/2043 : (base 2 339,73 $ + 1ʳᵉ supp. 345,99 $ + 2ᵉ supp. 153,92 $) × ajustement 100,0 % = 2 839,64 $/mois, soit 1 994 $ d’aujourd’hui | première pension 04/2043 : 1 085,62 $ × résidence 100 % × report 0,0 % = 1 085,62 $/mois, soit 763 $ d’aujourd’hui |
| Alex | première rente 10/2046 : (base 2 193,91 $ + 1ʳᵉ supp. 436,06 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 2 629,97 $/mois, soit 1 736 $ d’aujourd’hui | première pension 10/2046 : 1 155,46 $ × résidence 100 % × report 0,0 % = 1 155,46 $/mois, soit 763 $ d’aujourd’hui |

### Année par année — Camille (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 48 | 88 000 $ | 150 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 24 925 $ | 296 398 $ | couvert |
| 50 | 88 000 $ | 152 953 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 25 913 $ | 354 487 $ | couvert |
| 55 | 88 000 $ | 160 591 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 30 447 $ | 517 049 $ | couvert |
| 60 | 88 000 $ | 88 989 $ | 30 658 $ | 0 $ | 0 $ | 0 $ | 0 $ | 19 669 $ | 697 289 $ | couvert |
| 65 | 90 000 $ | 51 142 $ | 29 689 $ | 17 950 $ | 6 863 $ | 0 $ | 4 467 $ | 16 159 $ | 777 917 $ | tire du nid |
| 70 | 90 000 $ | 0 $ | 25 336 $ | 44 760 $ | 18 300 $ | 0 $ | 17 281 $ | 15 310 $ | 702 838 $ | tire du nid |
| 75 | 90 000 $ | 0 $ | 24 059 $ | 44 760 $ | 18 986 $ | 0 $ | 17 388 $ | 15 194 $ | 695 954 $ | tire du nid |
| 80 | 90 000 $ | 0 $ | 22 848 $ | 44 760 $ | 20 130 $ | 0 $ | 17 837 $ | 15 335 $ | 687 580 $ | tire du nid |
| 85 | 90 000 $ | 0 $ | 21 697 $ | 44 760 $ | 20 130 $ | 0 $ | 19 594 $ | 15 556 $ | 673 688 $ | tire du nid |
| 90 | 90 000 $ | 0 $ | 20 604 $ | 44 760 $ | 20 130 $ | 0 $ | 13 977 $ | 9 471 $ | 671 320 $ | tire du nid |
| 95 | 90 000 $ | 0 $ | 19 566 $ | 44 760 $ | 20 130 $ | 0 $ | 14 741 $ | 9 197 $ | 676 705 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2044, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Camille | 66 | 0 $ | 26 405 $ | 23 934 $ | 9 150 $ | 0 $ | 52 565 $ | 3 092 $ | 3 614 $ | 0 $ |
| Alex | 63 | 0 $ | 0 $ | 0 $ | 0 $ | 337 $ | 17 195 $ | 87 $ | 0 $ | 0 $ |

## average — Couple, revenus moyens

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Marie | né·e en 1984-05 | retraite à 62 ans | salaire 72 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 2002) |
| ↳ comptes | REER 85 000 $ (+5 000 $/an) | CELI 55 000 $ (+6 000 $/an) | non enregistré 10 000 $ (+0 $/an) | rente d’employeur : aucune |
| Luc | né·e en 1982-02 | retraite à 63 ans | salaire 58 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 2000) |
| ↳ comptes | REER 55 000 $ (dont immobilisé 25 000 $) (+3 000 $/an, employeur +2 000 $/an) | CELI 40 000 $ (+5 000 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 72 000 $ par année en travaillant, 74 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 3,1 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

Résidence principale : valeur 520 000 $, hypothèque 150 000 $ à 4,9 % (1 150 $ par mois, payée en 2041), gardée à vie. Le paiement s’ajoute aux dépenses tant qu’il dure ; la valeur nette de la maison compte à part des comptes.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 1 035 801 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 59 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Marie | première rente 06/2049 : (base 2 768,55 $ + 1ʳᵉ supp. 597,41 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 3 365,96 $/mois, soit 2 087 $ d’aujourd’hui | première pension 06/2049 : 1 229,79 $ × résidence 100 % × report 0,0 % = 1 229,79 $/mois, soit 762 $ d’aujourd’hui |
| Luc | première rente 03/2047 : (base 2 101,23 $ + 1ʳᵉ supp. 431,29 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 2 532,52 $/mois, soit 1 637 $ d’aujourd’hui | première pension 03/2047 : 1 179,72 $ × résidence 100 % × report 0,0 % = 1 179,72 $/mois, soit 762 $ d’aujourd’hui |

### Année par année — Marie (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 42 | 85 800 $ | 130 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 21 044 $ | 271 511 $ | couvert |
| 45 | 84 966 $ | 133 857 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 22 230 $ | 345 265 $ | couvert |
| 50 | 83 686 $ | 140 542 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 24 430 $ | 502 377 $ | couvert |
| 55 | 82 533 $ | 147 561 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 26 876 $ | 706 340 $ | couvert |
| 60 | 72 000 $ | 154 930 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 29 445 $ | 999 345 $ | couvert |
| 65 | 74 000 $ | 0 $ | 0 $ | 34 251 $ | 14 487 $ | 0 $ | 33 802 $ | 8 540 $ | 903 564 $ | tire du nid |
| 70 | 74 000 $ | 0 $ | 0 $ | 44 686 $ | 18 300 $ | 0 $ | 19 594 $ | 8 580 $ | 909 987 $ | tire du nid |
| 75 | 74 000 $ | 0 $ | 0 $ | 44 686 $ | 19 749 $ | 0 $ | 18 182 $ | 8 616 $ | 920 255 $ | tire du nid |
| 80 | 74 000 $ | 0 $ | 0 $ | 44 686 $ | 20 130 $ | 0 $ | 17 833 $ | 8 649 $ | 938 155 $ | tire du nid |
| 85 | 74 000 $ | 0 $ | 0 $ | 44 686 $ | 20 130 $ | 0 $ | 17 955 $ | 8 704 $ | 958 041 $ | tire du nid |
| 90 | 74 000 $ | 0 $ | 0 $ | 44 686 $ | 20 130 $ | 0 $ | 13 987 $ | 4 803 $ | 987 850 $ | tire du nid |
| 95 | 51 800 $ | 0 $ | 0 $ | 32 828 $ | 10 065 $ | 0 $ | 13 411 $ | 4 504 $ | 1 035 801 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2047, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Marie | 63 | 0 $ | 0 $ | 0 $ | 0 $ | 43 197 $ | 49 566 $ | 3 871 $ | 3 847 $ | 0 $ |
| Luc | 65 | 0 $ | 0 $ | 16 369 $ | 7 625 $ | 17 787 $ | 35 683 $ | 1 021 $ | 2 342 $ | 0 $ |

## modest — Une personne, petit revenu

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Hélène | né·e en 1971-11 | retraite à 65 ans | salaire 40 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1989) |
| ↳ comptes | REER 22 000 $ (+1 000 $/an) | CELI 18 000 $ (+1 500 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 30 000 $ par année en travaillant, 28 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 3,1 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 107 150 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 64 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Hélène | première rente 12/2036 : (base 981,28 $ + 1ʳᵉ supp. 139,52 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 1 120,80 $/mois, soit 910 $ d’aujourd’hui | première pension 12/2036 : 938,64 $ × résidence 100 % × report 0,0 % = 938,64 $/mois, soit 763 $ d’aujourd’hui |

### Année par année — Hélène (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 55 | 30 000 $ | 40 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 4 359 $ | 44 508 $ | couvert |
| 60 | 30 000 $ | 41 998 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 4 848 $ | 68 354 $ | couvert |
| 65 | 28 000 $ | 36 746 $ | 0 $ | 910 $ | 763 $ | 0 $ | 0 $ | 2 348 $ | 102 387 $ | couvert |
| 70 | 28 000 $ | 0 $ | 0 $ | 10 926 $ | 9 150 $ | 4 262 $ | 3 662 $ | 0 $ | 95 380 $ | tire du nid |
| 75 | 28 000 $ | 0 $ | 0 $ | 10 926 $ | 9 226 $ | 4 338 $ | 3 510 $ | 0 $ | 87 666 $ | tire du nid |
| 80 | 28 000 $ | 0 $ | 0 $ | 10 926 $ | 10 065 $ | 5 177 $ | 1 832 $ | 0 $ | 88 649 $ | tire du nid |
| 85 | 28 000 $ | 0 $ | 0 $ | 10 926 $ | 10 065 $ | 6 093 $ | 916 $ | 0 $ | 93 195 $ | tire du nid |
| 90 | 28 000 $ | 0 $ | 0 $ | 10 926 $ | 10 065 $ | 6 093 $ | 916 $ | 0 $ | 99 768 $ | tire du nid |
| 95 | 28 000 $ | 0 $ | 0 $ | 10 926 $ | 10 065 $ | 6 093 $ | 916 $ | 0 $ | 107 150 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2037, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hélène | 66 | 0 $ | 0 $ | 10 926 $ | 9 150 $ | 3 662 $ | 23 738 $ | 0 $ | 0 $ | 0 $ |

## rich — Couple, hauts revenus

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Sophie | né·e en 1976-04 | retraite à 58 ans | salaire 190 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1994) |
| ↳ comptes | REER 640 000 $ (+25 000 $/an) | CELI 100 000 $ (+7 000 $/an) | non enregistré 450 000 $ (+20 000 $/an) | rente d’employeur : aucune |
| Marc | né·e en 1978-08 | retraite à 60 ans | salaire 130 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1996) |
| ↳ comptes | REER 380 000 $ (+20 000 $/an) | CELI 98 000 $ (+7 000 $/an) | non enregistré 150 000 $ (+10 000 $/an) | rente d’employeur : aucune |

Dépenses : 150 000 $ par année en travaillant, 130 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 3,1 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 1 192 703 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 57 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Sophie | première rente 05/2041 : (base 2 181,22 $ + 1ʳᵉ supp. 257,00 $ + 2ᵉ supp. 101,97 $) × ajustement 100,0 % = 2 540,19 $/mois, soit 1 860 $ d’aujourd’hui | première pension 05/2041 : 1 041,42 $ × résidence 100 % × report 0,0 % = 1 041,42 $/mois, soit 762 $ d’aujourd’hui |
| Marc | première rente 09/2043 : (base 2 459,17 $ + 1ʳᵉ supp. 362,58 $ + 2ᵉ supp. 155,45 $) × ajustement 100,0 % = 2 977,20 $/mois, soit 2 091 $ d’aujourd’hui | première pension 09/2043 : 1 085,62 $ × résidence 100 % × report 0,0 % = 1 085,62 $/mois, soit 763 $ d’aujourd’hui |

### Année par année — Sophie (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | 150 000 $ | 320 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 80 839 $ | 1 975 167 $ | couvert |
| 55 | 150 000 $ | 335 981 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 87 828 $ | 2 637 126 $ | couvert |
| 60 | 150 000 $ | 143 309 $ | 0 $ | 0 $ | 0 $ | 0 $ | 55 448 $ | 41 822 $ | 2 998 165 $ | tire du nid |
| 65 | 130 000 $ | 0 $ | 0 $ | 14 879 $ | 6 100 $ | 1 774 $ | 109 729 $ | 2 482 $ | 2 824 561 $ | tire du nid |
| 70 | 130 000 $ | 0 $ | 0 $ | 47 411 $ | 18 300 $ | 0 $ | 83 939 $ | 18 983 $ | 2 701 396 $ | tire du nid |
| 75 | 130 000 $ | 0 $ | 0 $ | 47 411 $ | 18 910 $ | 0 $ | 107 617 $ | 40 873 $ | 2 477 519 $ | tire du nid |
| 80 | 130 000 $ | 0 $ | 0 $ | 47 411 $ | 20 130 $ | 0 $ | 103 705 $ | 39 880 $ | 2 230 305 $ | tire du nid |
| 85 | 130 000 $ | 0 $ | 0 $ | 47 411 $ | 20 130 $ | 0 $ | 101 547 $ | 39 088 $ | 1 960 313 $ | tire du nid |
| 90 | 130 000 $ | 0 $ | 0 $ | 47 411 $ | 20 130 $ | 0 $ | 101 582 $ | 39 124 $ | 1 657 673 $ | tire du nid |
| 95 | 130 000 $ | 0 $ | 0 $ | 47 411 $ | 20 130 $ | 0 $ | 101 615 $ | 39 156 $ | 1 317 122 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2039, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Sophie | 63 | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 17 586 $ | 133 $ | 0 $ | 0 $ |
| Marc | 61 | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 15 753 $ | 0 $ | 0 $ | 0 $ |

## behind — Une personne, en retard

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Julien | né·e en 1974-06 | retraite à 60 ans | salaire 62 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1992) |
| ↳ comptes | REER 35 000 $ (+3 000 $/an) | CELI 12 000 $ (+0 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 46 000 $ par année en travaillant, 38 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 3,1 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

### Ce qui sort

- Le plan tel que décrit : manque d’argent en 2036.
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 69 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Julien | première rente 07/2039 : (base 1 604,88 $ + 1ʳᵉ supp. 199,88 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 1 804,76 $/mois, soit 1 377 $ d’aujourd’hui | première pension 07/2039 : 999,02 $ × résidence 100 % × report 0,0 % = 999,02 $/mois, soit 762 $ d’aujourd’hui |

### Année par année — Julien (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 52 | 46 000 $ | 62 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 10 507 $ | 49 866 $ | couvert |
| 55 | 46 000 $ | 63 840 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 10 562 $ | 59 133 $ | couvert |
| 60 | 38 000 $ | 27 928 $ | 0 $ | 0 $ | 0 $ | 0 $ | 18 594 $ | 6 467 $ | 62 425 $ | tire du nid |
| 65 | 38 000 $ | 0 $ | 0 $ | 8 265 $ | 4 575 $ | 3 991 $ | 0 $ | 0 $ | 0 $ | manque |
| 70 | 38 000 $ | 0 $ | 0 $ | 16 530 $ | 9 150 $ | 3 291 $ | 0 $ | 82 $ | 0 $ | manque |
| 75 | 38 000 $ | 0 $ | 0 $ | 16 530 $ | 9 607 $ | 3 291 $ | 0 $ | 200 $ | 0 $ | manque |
| 80 | 38 000 $ | 0 $ | 0 $ | 16 530 $ | 10 065 $ | 3 291 $ | 0 $ | 317 $ | 0 $ | manque |
| 85 | 38 000 $ | 0 $ | 0 $ | 16 530 $ | 10 065 $ | 3 291 $ | 0 $ | 317 $ | 0 $ | manque |
| 90 | 38 000 $ | 0 $ | 0 $ | 16 530 $ | 10 065 $ | 3 291 $ | 0 $ | 317 $ | 0 $ | manque |
| 95 | 38 000 $ | 0 $ | 0 $ | 16 530 $ | 10 065 $ | 3 291 $ | 0 $ | 317 $ | 0 $ | manque |

### Année témoin pour un calculateur d’impôt : 2035, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Julien | 61 | 0 $ | 0 $ | 0 $ | 0 $ | 44 285 $ | 44 285 $ | 3 254 $ | 3 277 $ | 0 $ |

## retired — Couple à la retraite

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Gilles | né·e en 1958-03 | retraite à 62 ans | salaire 0 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1976) |
| ↳ comptes | REER 280 000 $ (+0 $/an) | CELI 90 000 $ (+0 $/an) | non enregistré 60 000 $ (+0 $/an) | rente d’employeur : Rente de l’employeur en cours : 34 000 $ par année |
| Francine | né·e en 1960-09 | retraite à 63 ans | salaire 0 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 1978) |
| ↳ comptes | REER 120 000 $ (+0 $/an) | CELI 70 000 $ (+0 $/an) | non enregistré 0 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 82 000 $ par année en travaillant, 82 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 3,1 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 268 615 $ (dollars d’aujourd’hui).
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

Dépenses : 38 000 $ par année en travaillant, 36 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 3,1 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 272 336 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 62 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Amira | première rente 03/2041 : (base 1 536,98 $ + 1ʳᵉ supp. 299,02 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 1 836,00 $/mois, soit 1 344 $ d’aujourd’hui | première pension 03/2041 : 1 041,42 $ × résidence 88 % × report 0,0 % = 911,24 $/mois, soit 667 $ d’aujourd’hui |

### Année par année — Amira (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 50 | 38 000 $ | 58 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 8 539 $ | 174 380 $ | couvert |
| 55 | 38 000 $ | 60 897 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 9 365 $ | 239 241 $ | couvert |
| 60 | 38 000 $ | 63 938 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 10 360 $ | 321 780 $ | couvert |
| 65 | 36 000 $ | 5 594 $ | 0 $ | 13 443 $ | 6 672 $ | 0 $ | 13 109 $ | 2 530 $ | 397 901 $ | tire du nid |
| 70 | 36 000 $ | 0 $ | 0 $ | 16 131 $ | 8 006 $ | 0 $ | 14 666 $ | 2 804 $ | 368 396 $ | tire du nid |
| 75 | 36 000 $ | 0 $ | 0 $ | 16 131 $ | 8 673 $ | 0 $ | 14 019 $ | 2 824 $ | 335 825 $ | tire du nid |
| 80 | 36 000 $ | 0 $ | 0 $ | 16 131 $ | 8 807 $ | 0 $ | 13 904 $ | 2 843 $ | 302 744 $ | tire du nid |
| 85 | 36 000 $ | 0 $ | 0 $ | 16 131 $ | 8 807 $ | 3 490 $ | 7 572 $ | 0 $ | 284 140 $ | tire du nid |
| 90 | 36 000 $ | 0 $ | 0 $ | 16 131 $ | 8 807 $ | 3 490 $ | 7 572 $ | 0 $ | 278 580 $ | tire du nid |
| 95 | 36 000 $ | 0 $ | 0 $ | 16 131 $ | 8 807 $ | 3 490 $ | 7 571 $ | 0 $ | 272 336 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2042, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Amira | 66 | 0 $ | 0 $ | 16 131 $ | 8 006 $ | 14 648 $ | 38 786 $ | 1 367 $ | 1 419 $ | 0 $ |

## heir — Une personne, grand héritage

### Ce qui entre

| Personne | Naissance | Retraite | Revenu | Rentes publiques |
| --- | --- | --- | --- | --- |
| Jules | né·e en 1999-09 | retraite à 30 ans | salaire 62 000 $ | RRQ à 65 ans, PSV à 65 ans (au Canada depuis 2017) |
| ↳ comptes | REER 18 000 $ (+0 $/an) | CELI 70 000 $ (+5 000 $/an) | non enregistré 3 500 000 $ (+0 $/an) | rente d’employeur : aucune |

Dépenses : 52 000 $ par année en travaillant, 54 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 3,1 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 6 790 234 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 27 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Jules | première rente 10/2064 : (base 891,24 $ + 1ʳᵉ supp. 253,41 $ + 2ᵉ supp. 0,00 $) × ajustement 100,0 % = 1 144,65 $/mois, soit 520 $ d’aujourd’hui | première pension 10/2064 : 1 679,65 $ × résidence 100 % × report 0,0 % = 1 679,65 $/mois, soit 763 $ d’aujourd’hui |

### Année par année — Jules (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 27 | 52 000 $ | 62 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 5 559 $ | 10 801 $ | 3 726 290 $ | tire du nid |
| 30 | 54 000 $ | 42 560 $ | 0 $ | 0 $ | 0 $ | 0 $ | 20 250 $ | 5 600 $ | 3 908 292 $ | tire du nid |
| 35 | 54 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 54 000 $ | 0 $ | 4 002 569 $ | tire du nid |
| 40 | 54 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 54 000 $ | 0 $ | 4 106 273 $ | tire du nid |
| 45 | 54 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 54 000 $ | 0 $ | 4 220 356 $ | tire du nid |
| 50 | 54 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 54 000 $ | 0 $ | 4 345 863 $ | tire du nid |
| 55 | 54 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 54 226 $ | 226 $ | 4 483 231 $ | tire du nid |
| 60 | 54 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 54 417 $ | 417 $ | 4 633 286 $ | tire du nid |
| 65 | 54 000 $ | 0 $ | 0 $ | 1 559 $ | 2 288 $ | 252 $ | 49 902 $ | 0 $ | 4 802 273 $ | tire du nid |
| 70 | 54 000 $ | 0 $ | 0 $ | 6 236 $ | 9 150 $ | 202 $ | 40 081 $ | 1 669 $ | 5 061 587 $ | tire du nid |
| 75 | 54 000 $ | 0 $ | 0 $ | 6 236 $ | 9 379 $ | 0 $ | 40 122 $ | 1 737 $ | 5 344 099 $ | tire du nid |
| 80 | 54 000 $ | 0 $ | 0 $ | 6 236 $ | 10 065 $ | 0 $ | 39 702 $ | 2 003 $ | 5 657 395 $ | tire du nid |
| 85 | 54 000 $ | 0 $ | 0 $ | 6 236 $ | 10 065 $ | 0 $ | 39 830 $ | 2 131 $ | 6 000 738 $ | tire du nid |
| 90 | 54 000 $ | 0 $ | 0 $ | 6 236 $ | 10 065 $ | 0 $ | 39 938 $ | 2 239 $ | 6 377 223 $ | tire du nid |
| 95 | 54 000 $ | 0 $ | 0 $ | 6 236 $ | 10 065 $ | 0 $ | 40 030 $ | 2 330 $ | 6 790 234 $ | tire du nid |

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

Dépenses : 92 000 $ par année en travaillant, 80 000 $ à la retraite (dollars d’aujourd’hui). Inflation 2,1 %, croissance des salaires 3,1 %, rendements REER 4,5 % · CELI 4,5 % · non enregistré 4,0 %, horizon 95 ans, ordre de retrait nonReg → rrsp → tfsa.

Résidence principale : valeur 880 000 $, hypothèque 70 000 $ à 4,5 % (1 300 $ par mois, payée en 2031), vendue à 58 ans (logement de remplacement : 360 000 $). Le paiement s’ajoute aux dépenses tant qu’il dure ; la valeur nette de la maison compte à part des comptes.

### Ce qui sort

- Le plan tel que décrit : tient jusqu’à l’horizon, valeur nette à la fin 332 661 $ (dollars d’aujourd’hui).
- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : 58 ans.

### Le calcul des rentes

| Personne | RRQ | PSV |
| --- | --- | --- |
| Nadia | première rente 07/2036 : (base 1 867,39 $ + 1ʳᵉ supp. 136,24 $ + 2ᵉ supp. 41,43 $) × ajustement 100,0 % = 2 045,06 $/mois, soit 1 661 $ d’aujourd’hui | première pension 07/2036 : 938,64 $ × résidence 100 % × report 0,0 % = 938,64 $/mois, soit 763 $ d’aujourd’hui |
| Paul | première rente 02/2038 : (base 1 940,11 $ + 1ʳᵉ supp. 169,84 $ + 2ᵉ supp. 14,60 $) × ajustement 100,0 % = 2 124,55 $/mois, soit 1 656 $ d’aujourd’hui | première pension 02/2038 : 978,47 $ × résidence 100 % × report 0,0 % = 978,47 $/mois, soit 762 $ d’aujourd’hui |

### Année par année — Nadia (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)

| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 55 | 107 600 $ | 170 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 34 112 $ | 617 669 $ | couvert |
| 60 | 80 000 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 80 000 $ | 0 $ | 1 143 011 $ | tire du nid |
| 65 | 80 000 $ | 0 $ | 0 $ | 9 968 $ | 4 575 $ | 6 187 $ | 59 270 $ | 0 $ | 870 694 $ | tire du nid |
| 70 | 80 000 $ | 0 $ | 0 $ | 39 803 $ | 18 300 $ | 0 $ | 32 734 $ | 10 837 $ | 787 390 $ | tire du nid |
| 75 | 80 000 $ | 0 $ | 0 $ | 39 803 $ | 18 758 $ | 0 $ | 32 325 $ | 10 885 $ | 709 243 $ | tire du nid |
| 80 | 80 000 $ | 0 $ | 0 $ | 39 803 $ | 20 130 $ | 0 $ | 31 018 $ | 10 934 $ | 629 515 $ | tire du nid |
| 85 | 80 000 $ | 0 $ | 0 $ | 39 803 $ | 20 130 $ | 0 $ | 31 032 $ | 10 965 $ | 540 855 $ | tire du nid |
| 90 | 80 000 $ | 0 $ | 0 $ | 39 803 $ | 20 130 $ | 0 $ | 31 667 $ | 11 170 $ | 440 365 $ | tire du nid |
| 95 | 80 000 $ | 0 $ | 0 $ | 39 803 $ | 20 130 $ | 0 $ | 23 488 $ | 3 420 $ | 360 062 $ | tire du nid |

### Année témoin pour un calculateur d’impôt : 2031, en dollars d’aujourd’hui

Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.

| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Nadia | 60 | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 3 078 $ | 0 $ | 0 $ | 0 $ |
| Paul | 58 | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ | 0 $ |

