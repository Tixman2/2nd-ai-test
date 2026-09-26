# CLAUDE.md — Contexte du projet

> Relire CE fichier au début de chaque nouvelle session au lieu de relire toute la conversation.

## Utilisateur
- Parle français. Veut un mentor franc, sans flatterie : dire quand il a tort, pointer les angles morts.
- Niveau technique : inconnu (à vérifier). Pas d'idée précise au départ.

## Objectif
- Créer une IA "cool et intelligente" qui **s'entraîne toute seule**.
- Réalité posée dès le départ : un "ChatGPT qui s'auto-entraîne" est hors de portée d'une personne seule
  (coût de calcul, données). Ce qui EST faisable : apprentissage par renforcement / self-play
  (principe d'AlphaZero) sur un problème petit et bien défini.

## Pistes proposées (session 1)
1. **Puissance 4 en self-play** (recommandé) — l'IA joue contre elle-même, s'améliore, on peut jouer contre elle.
2. **Snake / jeu d'arcade** avec Q-learning ou DQN — on la voit progresser visuellement.
3. **Créatures qui apprennent à marcher** (algorithme génétique / neuroévolution) — spectaculaire, plus flou à évaluer.

## Décisions
- Aucune encore : attente du choix de l'utilisateur.

## Repo
- `tixman2/2nd-ai-test`, branche de travail : `claude/self-training-ai-7uco05`. Repo vide au départ.
