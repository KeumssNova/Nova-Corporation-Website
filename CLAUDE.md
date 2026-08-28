# Contexte du dépôt Nova Corporation (site vitrine)

Notes accumulées par les sessions Claude successives, la première le
2026-08-17 depuis une session travaillant sur **Arkive** (l'autre projet
de l'écosystème). Dernière mise à jour : **2026-08-28**. Elles servent à
éviter à la session suivante les pièges déjà rencontrés et à lui donner
l'état réel du chantier.

## ⚠️ Piège n°1 : le README est très en retard sur le code

`README.md` décrit un simple site statique (HTML/Tailwind/Swiper) et ne
mentionne **rien** du pipeline de blog automatisé. C'est faux : le dépôt
contient un système complet : veille Gemini quotidienne, validation par
boutons Discord, publication par commit via GitHub App.

**La vraie documentation est `api/README.md`.** La lire en premier.

Ne pas conclure « ce projet n'a pas de X » à partir du README seul.

## ⚠️ Piège n°2 : les clones périmés (deux sessions s'y sont fait prendre)

**État du remote au 2026-08-28** : `main`, `v1-static` et
`claude/nova-css-cleanup-iharrr` pointent toutes sur le **même commit**
(`0f16bda`). Les trois branches `claude/domaine-et-ecosysteme`,
`claude/prompt-fond-editorial` et `claude/purge-tiret-cadratin` sont
entièrement fusionnées dans `main` (zéro commit exclusif) et peuvent être
supprimées : l'utilisateur n'a pas encore tranché. Vercel déploie depuis
`main`.

Réflexe à prendre **avant toute affirmation** sur le contenu du dépôt :

```bash
git fetch --all
git ls-remote --heads origin          # quelles branches existent vraiment ?
git log --oneline HEAD..origin/main   # suis-je en retard ?
git branch -vv                        # quelle branche est réellement à jour ?
```

`git branch -r` seul ne suffit pas : il liste les branches **déjà connues
du clone**, pas celles apparues depuis. Seul `ls-remote` (ou un `fetch`
préalable) montre l'état réel du remote.

Deux incidents, la même cause :

- **2026-08-17** : une session a affirmé à l'utilisateur que ce projet
  n'avait aucune automatisation d'articles, en lisant un clone en retard
  de 39 commits. Faux, et ça lui a fait perdre du temps.
- **2026-08-28** : j'ai affirmé qu'il n'existait pas de branche pour le
  chantier domaine. Mon clone ignorait 3 branches et `main` avait 16
  commits d'avance : la branche existait bien et le travail était déjà
  fusionné. L'utilisateur, lui, se souvenait juste bien.

## Règles d'écriture

**Aucun tiret cadratin, nulle part.** Ni `—`, ni `–`, ni le double tiret
ASCII `--`. Règle posée par l'utilisateur le 2026-08-23 : c'est aujourd'hui
lu comme une signature de texte généré par IA, et pour un site qui vit de
son référencement et de sa crédibilité éditoriale, porter ce marqueur est
un handicap gratuit.

Remplacer par la ponctuation qui porte le sens (deux-points quand ce qui
suit explique, virgule pour une incise, point pour deux idées, parenthèses
pour un aparté), **jamais par substitution mécanique**. Le trait d'union
des mots composés reste normal.

La règle est inscrite comme règle 5 de `prompts/article-generation.md`,
et c'est là qu'elle compte le plus : sans interdiction explicite dans le
prompt, le modèle en produit dans chaque nouvel article et la purge est à
refaire en permanence. Attention, `lib/gemini.js` construit lui aussi un
bout de prompt en dur : le fichier de prompt n'est pas le seul endroit à
surveiller.

Vérification :

```bash
grep -rnI '—\|–\| -- ' . | grep -vE 'node_modules|\.git/'
```

Trois occurrences légitimes attendues : la règle 5 de
`prompts/article-generation.md`, la règle ci-dessus, et le rappel du
README, qui nomment toutes les caractères qu'elles interdisent. La
commande ne se montre pas elle-même, son propre `grep -v` l'exclut.

`-I` saute les binaires et il n'y a **pas de filtre par extension** :
une version filtrée par `--include` avait laissé passer des `--` dans
`.env.example` et dans deux fichiers CSS.

## Section « Le fond prime sur le style »

`prompts/article-generation.md` contient une section qui exige un apport
réel par article (avis assumé, mise en perspective, ou contexte absent de
la source) et autorise explicitement à **abandonner un sujet** plutôt que
de produire du remplissage. Raison : les règles de voix visent à ne pas
*sonner* comme une machine, ce qui protège mal. Ce que Google sanctionne
(*scaled content abuse*), ce n'est pas un style trop lisse, c'est de
publier en série des textes qui n'apportent rien de plus que le
communiqué de presse.

## Domaine et infrastructure (hors dépôt, invisible dans le code)

**`novacorporation.fr`, acheté chez OVH le 2026-08-23, fusionné et déployé
le même jour.** Rien de ce qui suit n'est visible dans le code : ne pas le
refaire, ne pas le défaire.

- Apex et `www` rattachés au projet Vercel `nova-corporation`. **L'apex est
  l'adresse canonique**, `www` renvoie une 308 vers lui.
- **DNS chez OVH, pas chez Vercel** : deux enregistrements A vers
  `76.76.21.21`. Les serveurs de noms restent volontairement chez OVH pour
  pouvoir y poser les enregistrements SPF, DKIM et DMARC de Brevo (SMTP).
  **Ne pas proposer de basculer les NS vers Vercel.**
- `SITE_URL` vaut `https://novacorporation.fr` en production et en preview.
- `arkive.novacorporation.fr` pointe sur le projet Arkive.

Les 36 occurrences de l'ancienne adresse `.vercel.app` ont été réécrites
dans 11 fichiers (canoniques, Open Graph, JSON-LD, `sitemap.xml`,
`robots.txt`, `llms.txt`, `.env.example`, deux articles publiés). À retenir :
**`SITE_URL` n'est lue qu'au moment où le pipeline génère quelque chose**,
les pages déjà écrites ne se mettent pas à jour toutes seules.

## État du pipeline de blog : codé, très peu éprouvé (2026-08-28)

Le code est complet et déployé, mais **presque rien n'a jamais tourné
pour de vrai**. Ne pas le présenter comme fonctionnel à l'utilisateur.

**Prouvé une fois** (test « sujet de test », commits `ee08428` puis
`63858a4` puis `071f0d9`) : génération Gemini, sanitisation, commit du
brouillon via GitHub App, création du thread Discord, et le bouton
❌ Rejeter.

**Jamais exécuté, pas une seule fois :**

- **La publication complète** (bouton ✅ Publier). C'est le gros trou :
  aucun article n'est jamais passé par le pipeline, `articles/` ne
  contient que les deux articles écrits à la main. Ce chemin couvre le
  téléchargement de l'image Discord, la conversion WebP, le commit de
  l'article, l'insertion de la carte dans `news.html`, la régénération du
  `sitemap.xml` et la mise à jour du message Discord. **La conversion
  WebP et le sitemap ont été codés après ce test**, donc ces bouts de
  code n'ont jamais été exercés du tout.
- **La veille** (`/api/scout-topics`) : `_scout/` est vide.
- **La commande Discord `/article`** : l'utilisateur n'a jamais confirmé
  avoir lancé `scripts/register-discord-command.js`. Sans ça la commande
  n'existe pas côté Discord (la veille et le curl direct, eux, n'en ont
  pas besoin).
- **Le Cron quotidien** de `vercel.json`.

**Ce qui bloque** : Gemini renvoie un `429 RESOURCE_EXHAUSTED`
« prepayment credits are depleted » alors que le compte est bien
approvisionné. C'est un **bug connu côté Google** (nombreux signalements
sur leur forum développeurs entre juin et août 2026), pas une erreur de
configuration de l'utilisateur : ne pas lui faire refaire sa facturation.
Deux issues : attendre la resynchronisation (souvent quelques jours), ou
migrer vers **Vertex AI** (mêmes modèles, même prix au token, facturation
via Google Cloud) au prix d'un vrai chantier d'authentification dans
`lib/gemini.js`, clé API simple vers compte de service. L'utilisateur a
choisi d'attendre.

Nuance utile : le chemin « publication » **n'appelle pas Gemini**, il ne
lit qu'un brouillon existant. Il serait donc testable sans Gemini en
fabriquant un `_drafts/<id>.json` à la main, mais il faut un vrai thread
Discord associé, donc c'est du bricolage.

Commandes de test, une seule ligne (l'utilisateur est sous Git Bash, où
la continuation par `\` casse dès qu'une espace traîne derrière) :

```bash
curl -X POST https://novacorporation.fr/api/scout-topics -H "Authorization: Bearer $CRON_SECRET"
curl -X POST https://novacorporation.fr/api/generate-article -H "Authorization: Bearer $PUBLISH_SECRET" -H "Content-Type: application/json" -d '{"topic": "sujet de test"}'
```

## Lien avec l'écosystème

Arkive (`~/Bureau/Arkive`, dépôt `KeumssNova/Arkive`) porte son propre
pipeline éditorial, en cours de construction, largement inspiré de
celui-ci. Les décisions de portage (ce qui se réutilise tel quel, ce qui
ne doit pas l'être) sont documentées dans le `CLAUDE.md` d'Arkive, pas
ici.
