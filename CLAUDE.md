# CLAUDE.md — Contexte du projet

> Relire CE fichier au début de chaque nouvelle session au lieu de relire toute la conversation.

## Utilisateur
- Parle français. Veut un mentor franc, sans flatterie : dire quand il a tort, pointer les angles morts.
- Ne code pas lui-même : « c'est toi qui vas tout coder ». Veut quelque chose d'ORIGINAL.

## Objectif
- Une IA « cool et intelligente » qui s'entraîne toute seule.
- Recadrage posé : pas de ChatGPT maison (hors de portée). Faisable : self-play / apprentissage par renforcement sur un petit problème.

## Projet choisi (par Claude, l'utilisateur n'avait pas d'idée) : **Bascule**
- Puissance 4 en 6×6 + 2 bascules par joueur (rotation 90° du plateau, gravité réappliquée).
- Règles : pas de bascule au 1er coup de la partie ; si une bascule aligne les deux camps → nul ; aligne l'adversaire → il gagne.
- IA : MLP 76→96→1 (tanh), TD(0) en self-play sur les afterstates, epsilon-greedy. Recherche alpha-bêta 1-4 coups au jeu.
- Page web autonome : jouer contre l'IA + la regarder s'entraîner en direct (Web Worker, ~380 parties/s), graphique de progression, « Repartir de zéro ».
- Artifact publié : https://claude.ai/artifact/RC69PvPtbPQL9iRLsyNSAB (republier `dist/bascule.html` pour mettre à jour).

## Résultats mesurés
- vs tacticien (réseau seul) : 14 % → ~57 % en 2k parties → plateau ~65-70 % à 40k.
- La recherche (3 coups) fait beaucoup du travail tactique : 71 % même non entraîné, ~97 % entraîné.

## Pistes d'amélioration (pas faites)
- Casser le plateau des ~68 % : TD(λ), augmentation par symétrie miroir, réseau plus gros, ou vrai AlphaZero-lite (MCTS + politique).
- Ligue : faire jouer le cerveau contre ses anciennes versions (Elo).

## Repo / commandes
- `tixman2/2nd-ai-test`, branche : `claude/self-training-ai-7uco05`.
- `node test/engine.test.js` · `node scripts/train.js 40000 weights/brain.json` · `node scripts/build.js`
- Piège : ne pas utiliser `pkill -f` avec un motif présent dans la commande elle-même (ça tue le shell).
