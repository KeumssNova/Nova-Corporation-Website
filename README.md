# Nova Corporation

Site du label **Nova Corporation**, en ligne sur **[novacorporation.fr](https://novacorporation.fr)**.

Deux choses cohabitent dans ce dépôt :

1. **Un site statique** en HTML et Tailwind, écrit à la main.
2. **Un pipeline éditorial automatisé** qui repère des sujets, rédige des
   articles, les fait valider dans Discord et les publie par commit.

> **La documentation du pipeline est dans [`api/README.md`](api/README.md).**
> Ce fichier ne couvre que le site. Ne pas conclure de ce README seul que
> telle brique n'existe pas.

## Stack

- HTML statique, aucun framework, aucun bundler côté site
- Tailwind CSS v4 (`@tailwindcss/cli`), compilé vers `assets/css/output.css`
- JavaScript vanilla, Swiper pour les carrousels, Three.js pour la planète
  animée de la page d'accueil
- Fonctions serverless Vercel pour le pipeline (`api/`)
- Gemini pour la veille et la rédaction, Discord pour la validation, une
  GitHub App dédiée pour les commits

## Structure

```
index.html  projects.html  services.html  contact.html  news.html
articles/        articles publiés, un fichier par article
components/      header et footer, injectés par assets/js/main.js
assets/css/      input.css (source Tailwind) -> output.css (compilé, committé)
assets/js/       main.js, planet.js (Three.js), marker.js
assets/images/   images du site
assets/images/og/  cartes de partage, une par page
assets/fonts/    Cousine, la police du site
textures/        textures de la planète de l'accueil
api/             endpoints serverless, voir api/README.md
lib/             logique du pipeline (Gemini, Discord, GitHub, sitemap...)
prompts/         prompts de veille et de rédaction, modifiables sans toucher au code
scripts/         utilitaires ponctuels, hors runtime
_drafts/         brouillons en attente de validation (JSON)
_scout/          propositions de veille (JSON, conservées comme historique)
```

`output.css` est **compilé et committé**. Une classe Tailwind non encore
générée n'existera pas tant que le CSS n'est pas recompilé.

## Développement

```bash
npm install
npm run watch:css     # recompile output.css à chaque changement
```

Puis servir la racine avec n'importe quel serveur statique. Ouvrir les
fichiers en `file://` ne marche pas : `main.js` charge le header et le
footer par `fetch`, ce que le navigateur bloque hors HTTP.

Avant de committer un changement de style :

```bash
npm run build:css     # version minifiée
```

## URLs

Les URLs propres (`/projets`, `/actus`, `/services`, `/contact`) sont des
réécritures définies dans `vercel.json`, qui redirige aussi les anciennes
adresses en `.html`. Modifier un nom de page implique de toucher à ce
fichier, pas seulement de renommer le HTML.

## Déploiement

Automatique : tout push sur `main` déclenche un déploiement Vercel.

Le domaine, les DNS et les redirections sont documentés dans
[`CLAUDE.md`](CLAUDE.md), section « Domaine et infrastructure ». Rien de
tout ça n'est visible dans le code.

## Variables d'environnement

Voir [`.env.example`](.env.example), qui liste chaque variable et son rôle.
Elles se définissent dans Vercel (Project Settings > Environment
Variables), jamais dans le dépôt.

## Scripts

| Script | Rôle |
| --- | --- |
| `npm run build:css` | Compile Tailwind en version minifiée |
| `npm run watch:css` | Recompile en continu pendant le développement |
| `scripts/generate-og-images.py` | Régénère les cartes de partage (Pillow) |
| `scripts/register-discord-command.js` | Enregistre la commande `/article`, à lancer une seule fois |

## Règles d'écriture

**Aucun tiret cadratin nulle part**, ni `—`, ni `–`, ni `--` en ASCII.
La règle, sa raison et la commande de vérification sont dans
[`CLAUDE.md`](CLAUDE.md). Elle vaut pour le code, la documentation et les
articles générés : elle est inscrite dans `prompts/article-generation.md`.

## Auteur

Projet du label Nova Corporation, Keumss.
