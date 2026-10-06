# Contexte du dépôt Nova Corporation (site vitrine)

Notes accumulées par les sessions Claude successives, la première le
2026-08-17 depuis une session travaillant sur **Arkive** (l'autre projet
de l'écosystème). Dernière mise à jour : **2026-09-25**. Elles servent à
éviter à la session suivante les pièges déjà rencontrés et à lui donner
l'état réel du chantier.

## ⚠️ Piège n°1 : le README est très en retard sur le code

`README.md` décrit un simple site statique (HTML/Tailwind/Swiper). C'est
faux depuis longtemps : ce site est aussi un média, dont les pages
(classements, certifications, rookies, agenda des concerts, actus de la
scène) sont écrites et poussées automatiquement.

**Mais pas par ce dépôt.** Elles le sont par **nova-brain**, et
`api/README.md` documente un pipeline abandonné : voir le piège n°3 plus
bas avant de lire quoi que ce soit dans `api/`. La documentation qui
compte est, dans nova-brain, `outils/auto/Automatisation, mode d'emploi.md`
et `outils/Site média, mode d'emploi.md`.

Ne pas conclure « ce projet n'a pas de X » à partir du README seul, et ne
pas conclure « ce projet fait X » à partir du seul code présent ici.

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

## ⚠️ Piège n°3 : le pipeline `api/` est abandonné (2026-10-06)

**Ne pas reprendre le chantier du pipeline de blog de ce dépôt.** Le code
d'`api/` (veille Gemini, validation par boutons Discord, publication par
commit via GitHub App) est complet et déployé, mais il **n'a jamais tourné
une seule fois en entier** et il ne tournera pas : l'éditorial vit
désormais dans **nova-brain** (`KeumssNova/nova-brain`, cloné en local dans
`~/nova-brain`).

La décision date du 2026-10-03 pour le média et du 2026-10-06 pour les
articles. Les raisons, pour ne pas la redéfaire :

- nova-brain a déjà la clé Gemini, l'accès en écriture à ce dépôt (clé de
  déploiement `SITE_DEPLOY_KEY`), le moteur vidéo Remotion, et une
  validation que l'utilisateur **utilise vraiment** (les brouillons de
  release GitHub) ;
- la validation Discord d'`api/` exige en plus de déposer une image à la
  main dans le fil avant de publier, ce que personne ne fera à chaque
  article ;
- garder les deux voulait dire deux veilles, deux prompts et deux systèmes
  de validation à maintenir, pour un seul site.

**Ce qui écrit les pages aujourd'hui** : `outils/actu/couvrir.py` dans
nova-brain, à partir d'un sujet choisi par la veille. Il appelle les
modules de **ce dépôt** à travers `outils/top10-rap-fr/build.js` :
`lib/article-template.js`, `lib/news-card.js`, `lib/sitemap.js`, et
`lib/sanitize-fragment.js`. **Ces quatre fichiers sont donc vivants et
utilisés, même si le pipeline d'articles d'`api/` ne l'est pas** : toucher
à l'un d'eux casse les éditions automatiques.

**Quatre autres fichiers sont redevenus vivants le 2026-10-06**, pour une
raison qui n'a rien à voir avec les articles : `api/discord-interactions.js`,
`lib/discord.js`, `lib/github-app.js` et le nouveau `lib/posts.js` servent à
**valider les posts Instagram depuis Discord**. Les posts sont fabriqués par
nova-brain et déposés en brouillon de release là-bas ; nova-brain poste la
vidéo dans le salon avec deux boutons, et les boutons atterrissent ici parce
qu'une interaction Discord exige une adresse joignable en permanence, ce
qu'un workflow GitHub ne peut pas offrir. Raison du changement : « tout gérer
sur GitHub par rapport aux validations c'est un réel calvaire sur téléphone ».

Ne servent plus : `api/generate-article.js`, `api/scout-topics.js`, le
chemin « article » de `api/discord-interactions.js`, `lib/gemini.js`,
`lib/generate.js`, `lib/publish.js`, `lib/scout.js`,
`prompts/topic-scouting.md`.

`prompts/article-generation.md` est un cas à part : il ne tourne plus ici,
mais `outils/actu/couvrir-prompt.md` de nova-brain reprend ses règles de
voix et sa section « le fond prime sur le style ». **Si la voix de Nova
change, elle change dans les deux fichiers.**

Le `429 RESOURCE_EXHAUSTED` de Gemini qui bloquait tout depuis septembre a
disparu le 2026-10-04 une fois les crédits prépayés chargés : ce n'était
donc pas le bug Google supposé, et il n'y a plus aucune raison de migrer
vers Vertex AI.

Supprimer les modules morts serait du nettoyage légitime, mais l'utilisateur
n'a pas tranché, et **`api/` ne peut plus être supprimé en bloc** depuis que
la validation des posts passe par son endpoint Discord : ne rien retirer sans
vérifier d'abord la liste ci-dessus.

## Modèle économique et stratégie éditoriale (2026-09-25)

Posé par l'utilisateur, puis affiné par une session de recherche avec
données à l'appui. **C'est ce qui donne son sens au reste du dépôt** :
sans ça, le travail GEO et le pipeline d'articles passent pour un gadget
alors que c'est le produit.

### Positionnement

Nova devient un **média pour artistes** de la scène underground
française. Le différenciateur face aux médias Instagram : **le web**. Un
post meurt en 48h, une page indexée se positionne sur le nom de l'artiste
pendant des années.

Séquence, dans cet ordre : **1.** construire l'audience, **2.** vendre des
articles, **3.** affiliation. Les deux revenus dérivent de l'audience,
donc **le positionnement dans les moteurs est l'actif**. Tout ce qui le
met en danger met en danger les deux revenus. C'est la raison d'être de
la section « le fond prime sur le style » de
`prompts/article-generation.md` : elle protège le modèle, ce n'est pas
une coquetterie.

Phase 2 venue, deux disciplines non négociables : déclarer l'article
sponsorisé, et mettre `rel="sponsored"` sur les liens payés.

### Le coeur : un catalogue d'entités, pas un fil d'actu

Le modèle est celui d'Arkive (un catalogue de fiches maintenues) et non
celui d'un média d'actualité. **L'entité est l'artiste underground.**

**La fenêtre de tir, mesurée :**

- **Borne basse** : assez de fanbase pour générer des recherches, environ
  300 par mois minimum. En dessous, personne ne cherche, la fiche ne sert
  à rien (erreur commise en séance : proposer de cataloguer des artistes
  inconnus, qui n'ont aucune demande).
- **Borne haute** : le seuil Wikipédia. Au-dessus, Wikipédia, Konbini et
  le panneau Google occupent déjà la place.

**Diagnostic immédiat par le panneau Google** (trouvé par l'utilisateur,
gratuit, visible en trois secondes sur un téléphone) :

| Panneau observé | Lecture | Action |
|---|---|---|
| Aucun panneau (ex. Bedry) | terrain vierge | y aller |
| Panneau musical seul, pochettes et titres, **sans aperçu ni date de naissance** (ex. Hologram Lo') | **cible idéale** : demande réelle, aucun fait publié | prioritaire |
| Panneau complet avec aperçu Wikipédia (ex. H JeuneCrack) | pris | passer, ou n'y aller que sur les angles profonds |

### Données mesurées (Google Keyword Planner, FR, septembre 2026)

Artistes underground, recherches mensuelles : zamdane 8 100, jolagreen23
6 600, lesram 4 400, yvnnis 2 900, h jeunecrack 2 400, zed yun pavarotti
1 900, winnterzuko 1 600, rounhaa 1 600, ashe 22 1 600, bedry 720, prince
waly 720, slimka 590, khali 480, la fève 390, squidji 210.

**Environ 34 000 recherches par mois pour quinze noms**, moyenne 2 300.
La scène en compte largement plus de cent dans cette fourchette, soit un
gisement de l'ordre de 100 000 à 300 000 recherches mensuelles.

**Cluster secondaire : les concerts.** zamdane concert + concert zamdane
= 1 040, zed yun pavarotti concert 210, lesram concert 170, plus les
requêtes de salles (« lesram la cigale », « ashe 22 zénith », « prince
waly olympia »). C'est récurrent à chaque tournée et **c'est le seul
contenu où l'intérêt de Nova et celui de l'artiste sont parfaitement
alignés**, donc le meilleur prétexte de prise de contact.

**Producteurs** : hologram lo 720, myth syzer 720, junior alaprod 320,
puis chute brutale (diabi 10, ponko 0). Ce n'est **pas un pilier**, mais
c'est précieux autrement : une fiche producteur relie 20 ou 30 fiches
artistes (maillage, donc autorité thématique), les producteurs sont plus
faciles à obtenir que les artistes et servent de **portes** vers eux, et
personne ne compile les crédits. Les 10 à 20 premiers méritent leur
fiche, le reste enrichit les autres pages.

### Pistes explorées et écartées, avec la raison

**Ne pas les relancer sans élément nouveau.**

- **Guides et tutos pour artistes** : volume trop faible en français.
  Tout le cluster fait quelques milliers de recherches par mois, et le
  seul gros morceau (home studio, 1 900, forte concurrence) empiète sur
  Arkive. Les tutos marchent, mais **en vidéo**, pas en article français.
- **Scènes géographiques** (rap marseillais 5 400, rap toulouse 210) :
  demande réelle, mais c'est un angle secondaire, pas le coeur.
- **Artistes mainstream** : le volume est sur le nom (freeze corleone
  27 100) et il est verrouillé par Genius, Wikipédia et Booska. Les
  modificateurs autour font 10 à 140, des miettes. Seul le cluster
  « origine » sort (niska origine 1 300), et c'est du contenu ferme à
  clics, hors ligne éditoriale.
- **Fiches d'artistes totalement inconnus** : aucune demande de
  recherche. Zéro concurrence n'est pas une opportunité.

### Ce que l'artiste gagne, et pourquoi ce n'est pas un service gratuit

Erreur à ne pas refaire : proposer « photo pro et interview gratuites ».
Un artiste à 200 000 vues par clip qui remplit des salles peut se les
payer. Il ne veut pas un service, il veut **exister**.

**Critères pour obtenir un panneau Google** (sources : agences
spécialisées, donc mode d'emploi crédible mais non officiel, Google ne
garantit rien) :

- une **entrée Wikidata**, et c'est le levier central car **Wikidata
  n'exige pas la notoriété de Wikipédia**
- **MusicBrainz** et **Discogs**, bases de référence du secteur,
  MusicBrainz étant le chemin le plus rapide vers le Knowledge Graph
- **3 à 5 sources indépendantes** aux descriptions cohérentes
- des **données structurées cohérentes** (le `about: MusicGroup` ci-dessous)
- délai annoncé : 4 à 12 semaines une fois l'ensemble en place

**D'où l'offre réelle de Nova** : écrire la fiche (la source), puis créer
MusicBrainz, Discogs et Wikidata en la citant. Résultat : le panneau de
l'artiste apparaît. C'est mécanique, démontrable, et **totalement
indépendant du trafic de Nova**, ce qui règle le problème d'amorçage.

Corollaire : Wikipédia ne peut pas occuper cette niche, ses règles de
notoriété le lui interdisent. Wikipédia agrège des sources secondaires,
il ne peut pas être la source. Nova, si.

**Méthode d'approche** : ne pas demander la permission d'être catalogué.
Publier la page, puis prévenir l'artiste qu'il y est et lui demander de
corriger ou compléter. Quelqu'un qui ignore une demande d'interview
répond à une erreur sur sa fiche. C'est ainsi que Discogs, Genius et
Wikipédia se sont remplis.

**Amorçage** : le trafic initial ne vient pas de Google mais des fanbases
des artistes couverts, denses et engagées (un artiste peut remplir des
salles avec peu d'abonnés). Le rapport de force s'inverse quand le
catalogue est assez complet pour qu'en être absent se remarque. Les six
premiers mois se construisent sans compter là-dessus.

### Conséquences techniques

- **Le JSON-LD ne dit rien de l'artiste.** `lib/article-template.js`
  déclare l'article et Nova comme éditeur, rien d'autre. Il manque un
  `about` de type `MusicGroup` ou `Person` avec un `sameAs` vers Spotify,
  Instagram, YouTube, **et désormais MusicBrainz, Discogs, Wikidata**.
  C'est un des critères du panneau, donc ce n'est plus du confort.
- **La veille change de rôle.** `prompts/topic-scouting.md` impose une
  fraîcheur de 24 à 72h : c'est un réglage de fil d'actu, inadapté. Elle
  doit détecter **les artistes qui entrent dans la fenêtre** (volume
  suffisant, panneau absent ou sans faits) et les changements sur les
  entités suivies. C'est mesurable, donc automatisable.
- **Une URL stable par entité, mise à jour**, plutôt qu'un article de
  plus à chaque sortie. Une page forte qui accumule de l'autorité bat dix
  posts maigres.
- **Le maillage est le moteur de l'autorité** : chaque fiche renvoie vers
  les featurings, le collectif, le producteur. C'est le graphe de la
  scène qui fait la différence, pas les pages isolées.

### Ce qu'une fiche doit contenir, et ne pas contenir

Le panneau Google répond déjà aux faits bruts quand il les a (nom, âge,
label, titres). Une fiche qui se contente de ça est morte pour les
artistes qui ont un panneau complet. Elle doit porter ce qu'un panneau ne
peut structurellement pas contenir : **le récit, la filiation dans la
scène, les crédits complets, l'historique live, et un point de vue
assumé**.

Gisement de matière que les concurrents n'exploitent pas : les
**interviews audio et vidéo ne sont pas transcrites**, donc leur contenu
n'existe nulle part en texte et personne ne l'a écrit. S'y ajoutent les
crédits éparpillés (descriptions YouTube, Genius, Spotify), l'historique
live reconstituable via les pages de salles, et le graphe des
collaborations.

Les photos des panneaux sont créditées à des médias (RapCity, YARD). Avec
un photographe en interne, cette place est atteignable.

## Lien avec l'écosystème

Arkive (`~/Bureau/Arkive`, dépôt `KeumssNova/Arkive`) porte son propre
pipeline éditorial, en cours de construction, largement inspiré de
celui-ci. Les décisions de portage (ce qui se réutilise tel quel, ce qui
ne doit pas l'être) sont documentées dans le `CLAUDE.md` d'Arkive, pas
ici.
