# Pipeline de blog automatisé

Génération d'articles via Gemini (recherche Google activée), validation
manuelle sur Discord, publication par commit direct dans le repo (Vercel
redéploie automatiquement).

## Flux

```
POST /api/generate-article (toi, manuellement)
        │
        ▼
  Gemini (prompts/article-generation.md + recherche Google)
        │
        ▼
  sanitisation + vérifications auto (≥1 source, HTML propre)
        │
        ▼
  brouillon committé dans _drafts/<id>.json
        │
        ▼
  thread Discord créé (résumé + prompt image + boutons ✅/❌)
        │
        ▼
  toi : tu déposes l'image dans le thread, tu cliques ✅ Publier
        │
        ▼
POST /api/discord-interactions (appelé par Discord)
        │
        ▼
  commit image + articles/<slug>.html + carte dans news.html
        │
        ▼
  Vercel redéploie automatiquement, message Discord mis à jour
```

## Déclencher une génération

```bash
curl -X POST https://<ton-domaine>/api/generate-article \
  -H "Authorization: Bearer $PUBLISH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Titre ou sujet de l'\''article", "rawText": "notes brutes optionnelles"}'
```

## Variables d'environnement

Voir `.env.example` à la racine du repo pour la liste complète, à configurer
dans Vercel > Project Settings > Environment Variables.

## Fichiers

- `lib/gemini.js` — appel API Gemini avec grounding (recherche Google), parsing de la réponse
- `lib/sanitize-fragment.js` — sanitisation défensive du HTML généré (allowlist de balises)
- `lib/article-template.js` — gabarit HTML déterministe (calqué sur articles/*.html existants)
- `lib/news-card.js` — insertion de la carte dans news.html
- `lib/github-app.js` — auth GitHub App (JWT RS256 → token d'installation) + lecture/écriture/suppression de fichiers
- `lib/discord.js` — vérification de signature, création de thread, lecture des pièces jointes, mise à jour de message
- `lib/publish.js` — orchestration de la publication finale (appelée depuis discord-interactions.js)
- `_drafts/` — brouillons en attente de validation, au format JSON. Nettoyés automatiquement après publication/rejet.

## Limitations connues (v1)

- Chaque fichier publié (image, article, news.html) fait l'objet d'un commit
  séparé via l'API Contents GitHub, pas d'un commit atomique unique. En cas
  d'échec en cours de route, il peut rester un état partiel (ex: image
  committée mais pas l'article) -- à surveiller au début, une version future
  pourrait passer par l'API Git Data (blobs/tree/commit) pour un vrai commit
  atomique.
- Un seul brouillon par thread Discord. Le bot lit la pièce jointe image la
  plus récente du thread -- évite de poster plusieurs images dans le même
  thread avant de cliquer Publier.
- `GITHUB_REPO_BRANCH` doit correspondre exactement à la branche que Vercel
  déploie en prod, sans quoi les articles publiés n'apparaîtront jamais en
  ligne.
