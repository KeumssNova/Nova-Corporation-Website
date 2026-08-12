# Pipeline de blog automatisé

Veille quotidienne + génération d'articles via Gemini (recherche Google
activée), validation manuelle sur Discord, publication par commit direct
dans le repo (Vercel redéploie automatiquement).

## Flux

```
Vercel Cron, chaque jour (voir vercel.json)
        │
        ▼
GET/POST /api/scout-topics
        │
        ▼
  Gemini (prompts/topic-scouting.md + recherche Google)
  → 2-3 pistes récentes (dernières 24-72h)
        │
        ▼
  lot committé dans _scout/<batchId>.json
        │
        ▼
  message Discord : pistes + pitch + un bouton "Générer" par piste
        │
        ▼
  toi : tu cliques la piste qui t'intéresse (ou tu ignores le message)
        │                                    (ou tu passes par /article
        │                                     avec ton propre sujet)
        ▼
  Gemini (prompts/article-generation.md + recherche Google)
        │
        ▼
  sanitisation + vérifications auto (≥1 source, HTML propre, meta SEO)
        │
        ▼
  brouillon committé dans _drafts/<id>.json
        │
        ▼
  thread Discord créé (résumé + prompt image + meta SEO + boutons ✅/❌)
        │
        ▼
  toi : tu déposes l'image dans le thread, tu cliques ✅ Publier
        │
        ▼
POST /api/discord-interactions (appelé par Discord)
        │
        ▼
  commit image (convertie en WebP) + articles/<slug>.html + carte dans news.html
        │
        ▼
  Vercel redéploie automatiquement, message Discord mis à jour
```

## Déclencher un article

**Option 1 — attendre/consulter la veille du jour** — automatique, voir
`vercel.json` pour l'horaire (8h UTC par défaut). Clique un bouton "Générer"
sous les propositions dans Discord.

**Option 2 — depuis Discord, sujet de ton choix**

Une fois la commande enregistrée (voir plus bas), tape directement dans le
salon Discord :

```
/article topic: Nouveau son de Laaska texte: notes optionnelles
```

Reservée aux membres avec la permission "Gérer le serveur" (évite que
n'importe qui déclenche des appels Gemini payants). Discord répond tout de
suite avec un accusé de réception, puis édite le message une fois le
brouillon prêt (avec un lien vers le thread de review).

**Option 3 — curl / HTTP direct**

```bash
curl -X POST https://<ton-domaine>/api/generate-article \
  -H "Authorization: Bearer $PUBLISH_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Titre ou sujet de l'\''article", "rawText": "notes brutes optionnelles"}'
```

**Lancer la veille manuellement** (sans attendre le lendemain) :

```bash
curl -X POST https://<ton-domaine>/api/scout-topics \
  -H "Authorization: Bearer $PUBLISH_SECRET"
```

## Enregistrer la commande /article (une seule fois)

```bash
node scripts/register-discord-command.js <DISCORD_BOT_TOKEN> <DISCORD_APPLICATION_ID> <DISCORD_GUILD_ID>
```

Voir les commentaires en tête de `scripts/register-discord-command.js` pour
savoir où trouver chaque valeur. À relancer uniquement si tu modifies la
définition de la commande (nom, options...) -- Discord la garde en mémoire
côté serveur sinon.

## Variables d'environnement

Voir `.env.example` à la racine du repo pour la liste complète, à configurer
dans Vercel > Project Settings > Environment Variables.

## Fichiers

- `prompts/article-generation.md` — instruction système pour la rédaction d'un article complet
- `prompts/topic-scouting.md` — instruction système pour la veille (propose des sujets, n'écrit rien)
- `lib/gemini.js` — appel API Gemini avec grounding (recherche Google) pour la rédaction, parsing de la réponse
- `lib/scout.js` — appel API Gemini pour la veille, parsing des propositions
- `lib/sanitize-fragment.js` — sanitisation défensive du HTML généré (allowlist de balises)
- `lib/article-template.js` — gabarit HTML déterministe (calqué sur articles/*.html existants), balises SEO/Open Graph/JSON-LD (schema.org NewsArticle) + bloc "Sources" visible en bas de page
- `lib/news-card.js` — insertion de la carte dans news.html
- `lib/sitemap.js` — regénère sitemap.xml (pages statiques + tous les articles, extraits de news.html) à chaque publication
- `lib/github-app.js` — auth GitHub App (JWT RS256 → token d'installation) + lecture/écriture/suppression de fichiers
- `lib/discord.js` — vérification de signature, création de thread/messages, lecture des pièces jointes, mise à jour/édition de message
- `lib/generate.js` — génération + vérification + commit du brouillon + création du thread (logique partagée entre `/article` et le curl direct)
- `lib/publish.js` — orchestration de la publication finale (appelée depuis discord-interactions.js), convertit l'image déposée en WebP (qualité 82) avant de la committer
- `api/scout-topics.js` — déclenché par Vercel Cron (ou manuellement), poste les propositions du jour
- `api/generate-article.js` — déclenchement HTTP direct (curl)
- `api/discord-interactions.js` — reçoit tous les événements Discord (commande /article, boutons de veille, boutons Publier/Rejeter)
- `_drafts/` — brouillons d'articles en attente de validation, au format JSON. Nettoyés automatiquement après publication/rejet.
- `_scout/` — lots de propositions de veille, au format JSON. Conservés (pas de nettoyage automatique) comme historique des pistes proposées.

## GEO / visibilité dans les réponses IA

Avec les AI Overviews (Google), Perplexity, etc., une part croissante des
recherches n'aboutit plus à un clic sur un site -- l'IA répond directement.
On ne peut pas empêcher ça, mais on peut maximiser les chances que Nova
Corporation soit la source citée dans cette réponse (et pas juste absorbée
sans attribution) :

- `robots.txt` autorise explicitement les crawlers IA (GPTBot,
  Google-Extended, PerplexityBot, ClaudeBot...) en plus des moteurs
  classiques -- un site qu'on ne peut pas crawler ne peut pas être cité.
- `llms.txt` (convention émergente) résume le site pour les LLM qui le
  consultent directement.
- JSON-LD (`Organization` sur toutes les pages, `NewsArticle`/`Article` sur
  chaque page d'article, avec `citation` reprenant les sources) -- donne aux
  moteurs de réponse un signal structuré propre plutôt qu'à extraire du
  texte libre, et augmente les chances d'attribution nominative.
- Chaque article publié affiche désormais ses sources en bas de page (pas
  seulement dans le thread Discord de review) -- crédibilité éditoriale
  (E-E-A-T) et matière concrète à citer pour une IA qui reprend l'article.
- `sitemap.xml` tenu à jour automatiquement à chaque publication.

Ce que ça ne résout pas : la perte de clic elle-même. La vraie parade est
ailleurs -- des canaux qui ne dépendent pas d'un clic Google (Discord,
Instagram, YouTube, une éventuelle newsletter/RSS) et du contenu que l'IA ne
peut pas résumer à ta place (le son lui-même, un angle éditorial affirmé,
pas juste un résumé factuel).

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
- Vercel Cron (plan Hobby) : une exécution par jour maximum. Largement
  suffisant pour la veille quotidienne, mais à savoir si tu veux
  expérimenter avec plusieurs veilles/jour.
- `_scout/` n'est jamais nettoyé automatiquement -- fichiers légers (2-3
  propositions en JSON), pas d'impact sur les performances du site, mais
  s'accumule dans le repo au fil du temps.
