# Bascule

Un Puissance 4 sur 6×6 où chaque joueur peut, deux fois par partie, faire pivoter le plateau d'un quart de tour
(les jetons retombent). L'IA n'a reçu aucune stratégie : elle apprend en jouant contre elle-même.

## Comment elle apprend
- Réseau de neurones minuscule (76 entrées → 96 neurones cachés → 1 sortie) qui estime « qui va gagner ».
- Self-play + apprentissage par différence temporelle (TD(0)), la méthode de TD-Gammon.
- En jeu, elle peut aussi calculer 1 à 4 coups d'avance (minimax alpha-bêta), avec le réseau pour juger les positions.

## Résultats mesurés (`node scripts/train.js 40000`)
| Parties d'entraînement | vs hasard | vs tacticien (réseau seul) | vs tacticien (3 coups d'avance) |
|---|---|---|---|
| 0 | 76 % | 14 % | 71 % |
| 2 000 | 98 % | 57 % | 98 % |
| 40 000 | 96 % | 68 % | 96 % |

Le « tacticien » est un adversaire codé à la main (gagne s'il peut, évite les coups qui offrent une victoire immédiate).
Le réseau seul plafonne vers 65-70 % contre lui : c'est la limite actuelle.

## Commandes
```sh
node test/engine.test.js                          # tests des règles
node scripts/train.js 40000 weights/brain.json    # ré-entraîner le cerveau (~3 min)
node scripts/build.js                             # génère dist/bascule.html (page autonome)
```

## Fichiers
- `src/engine.js` : règles, réseau, self-play, évaluation (sans dépendance, navigateur + Node)
- `web/template.html` : l'interface (jeu + entraînement en direct dans un Web Worker)
- `weights/brain.json` : cerveau pré-entraîné (40 000 parties)
