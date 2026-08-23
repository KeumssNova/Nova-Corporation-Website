# Contexte du dépôt Nova Corporation (site vitrine)

Note laissée le 2026-08-17 depuis une session travaillant sur **Arkive**
(l'autre projet de l'écosystème). Elle sert à éviter à la prochaine
session Claude les deux pièges sur lesquels je suis tombé.

## ⚠️ Piège n°1 : le README est très en retard sur le code

`README.md` décrit un simple site statique (HTML/Tailwind/Swiper) et ne
mentionne **rien** du pipeline de blog automatisé. C'est faux : le dépôt
contient un système complet : veille Gemini quotidienne, validation par
boutons Discord, publication par commit via GitHub App.

**La vraie documentation est `api/README.md`.** La lire en premier.

Ne pas conclure « ce projet n'a pas de X » à partir du README seul.

## ⚠️ Piège n°2 : l'état des branches locales

Constaté sur le clone de l'utilisateur (`~/Bureau/Nova-Corporation-Website`) :

- La branche de travail habituelle est `claude/nova-css-cleanup-iharrr`,
  qui pointait sur le **même commit qu'`origin/main`** : c'est elle qui
  est à jour, pas `main`.
- Le `main` **local** était *en avance de 2 commits et en retard de 39*
  sur `origin/main`. Il est périmé et divergent : **ne pas s'en servir
  comme référence, ne pas pousser depuis lui** sans que l'utilisateur ait
  tranché ce qu'il veut faire de ses 2 commits locaux.

Réflexe à prendre avant toute affirmation sur le contenu du dépôt :

```bash
git fetch --all
git log --oneline HEAD..origin/main   # suis-je en retard ?
git branch -vv                        # quelle branche est réellement à jour ?
```

J'ai personnellement affirmé à l'utilisateur que ce projet n'avait aucune
automatisation d'articles, en lisant un clone en retard de 39 commits.
C'était faux et ça lui a fait perdre du temps.

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
grep -rn '—\|–\| -- ' --include='*.md' --include='*.html' --include='*.js' --include='*.txt' . | grep -v node_modules
```

Deux occurrences légitimes attendues, et deux seulement : la règle 5 de
`prompts/article-generation.md` et la règle ci-dessus, qui nomment toutes
deux les caractères qu'elles interdisent. La commande ne se montre pas
elle-même, son propre `grep -v node_modules` l'exclut du résultat.

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

Défaut préexistant connu, laissé tel quel : `articles/vaisseau-mere.html`
n'a aucune balise canonique, contrairement aux deux autres articles.

## Lien avec l'écosystème

Arkive (`~/Bureau/Arkive`, dépôt `KeumssNova/Arkive`) porte son propre
pipeline éditorial, en cours de construction, largement inspiré de
celui-ci. Les décisions de portage (ce qui se réutilise tel quel, ce qui
ne doit pas l'être) sont documentées dans le `CLAUDE.md` d'Arkive, pas
ici.
