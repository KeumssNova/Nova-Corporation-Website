# Passation : domaine novacorporation.fr et section Écosystème

**À lire avant de toucher à cette branche.** Écrit le 2026-08-23 par la
session Claude qui s'occupe d'**Arkive**, sur l'autre machine. Cette
branche est la seule intervention faite sur le hub, et elle s'arrête là :
la suite du site Nova reste ton terrain.

Fichier temporaire. **À supprimer une fois la branche fusionnée et les
points « à faire » traités.**

---

## 1. Ce qui a changé en dehors du dépôt

C'est le plus important, parce que rien de tout ça n'est visible dans le
code et que tu risquerais de le refaire ou de le défaire.

L'utilisateur a acheté **novacorporation.fr chez OVH** le 2026-08-23.
Depuis, et déjà en production :

- `novacorporation.fr` et `www.novacorporation.fr` sont **rattachés au
  projet Vercel `nova-corporation`**, vérifiés, certificats émis. Le hub
  répond dessus.
- **`www` renvoie une redirection 308 vers l'apex.** L'apex est l'adresse
  canonique du site, pas `www`.
- **DNS chez OVH, pas chez Vercel** : deux enregistrements A vers
  `76.76.21.21`. Les serveurs de noms restent volontairement chez OVH,
  parce qu'il faudra y poser les enregistrements SPF, DKIM et DMARC de
  Brevo pour le SMTP. Ne propose pas de basculer les NS vers Vercel.
- **La variable d'environnement `SITE_URL` du projet Vercel vaut
  désormais `https://novacorporation.fr`** (production et preview). Elle
  était en type « sensitive », donc impossible à relire pour vérifier ;
  je l'ai recréée en clair, ce qui n'enlève rien puisque c'est une
  adresse publique.
- `arkive.novacorporation.fr` pointe sur le projet Arkive, et son
  ancienne adresse Vercel est déjà en redirection 308.

## 2. Ce que contient cette branche

Basée sur **`origin/main`** (7e9dc27), un commit, jamais poussée.

1. **Les 36 occurrences de `nova-corporation-nine.vercel.app` réécrites**
   en `novacorporation.fr`, dans 11 fichiers : balise canonique et
   métadonnées Open Graph de chaque page, JSON-LD, `sitemap.xml`,
   `robots.txt`, `llms.txt`, `.env.example` et les deux articles publiés
   qui en avaient.

   Pourquoi ce n'était pas facultatif : `SITE_URL` n'est lue qu'au moment
   où le pipeline **génère** quelque chose. Les pages déjà écrites ne
   changent pas toutes seules. Sans cette réécriture, le site tourne sur
   son nouveau domaine tout en déclarant à Google que sa version
   officielle est l'adresse `.vercel.app`, ce qui annule l'intérêt
   d'avoir acheté un domaine.

2. **Une section « Écosystème » en bas de `projects.html`** : Arkive,
   wip.audio et Hook, chacun avec son statut réel. **Seule la carte
   d'Arkive est un lien**, les deux autres ne sont pas déployés et un
   bouton qui ne mène nulle part ferait plus de mal que de bien. Choix
   validé par l'utilisateur : montrer les trois avec leur état plutôt que
   de n'afficher que celui qui est prêt.

   Le style vit dans `assets/css/ecosysteme.css`, en CSS ordinaire.
   **Ce n'est pas de la négligence** : `output.css` est compilé et
   committé, et ce clone n'a pas ses `node_modules`. Employer des classes
   Tailwind non encore générées aurait imposé de recompiler `output.css`,
   donc de produire un gros diff sur un fichier que tes propres branches
   touchent. Les classes de mise en page utilisées dans le HTML
   (`grid`, `gap-6`, `mx-8`, `py-20`, le gabarit du titre géant) existent
   déjà. Si tu préfères tout repasser en Tailwind plus tard, c'est ton
   appel, mais fais-le avec la recompilation qui va avec.

   Rendu vérifié par capture d'écran en 1440 px et 390 px, sans erreur
   console.

## 3. À faire, dans cet ordre

1. **Fusionner et déployer cette branche.**
2. **Ensuite seulement**, mettre `nova-corporation-nine.vercel.app` en
   redirection permanente vers `novacorporation.fr`. Pas avant : tant que
   les canoniques en ligne pointent sur l'ancienne adresse, la rediriger
   envoie des signaux contradictoires. Ça se fait côté Vercel, dans les
   domaines du projet, sans toucher au code.
3. **`articles/vaisseau-mere.html` n'a aucune balise canonique**,
   contrairement aux deux autres articles. Défaut préexistant, sans
   rapport avec le domaine, laissé tel quel pour ne pas élargir cette
   branche.

## 4. Une règle de l'utilisateur qui vaut pour Nova aussi

Le 2026-08-23, l'utilisateur a **banni le tiret cadratin de tout texte
écrit** (`—`, `–`, et `--` en ASCII). Sa raison, dans ses mots : c'est
aujourd'hui perçu comme une signature de texte généré par IA par à peu
près n'importe qui. Pour un site qui vit du référencement et de sa
crédibilité éditoriale, porter ce marqueur est un handicap gratuit.

La purge a été faite intégralement sur Arkive, code et base de données.
**Sur Nova, rien n'a été fait**, ce n'était pas ma branche. État constaté
le 2026-08-23 :

| Endroit | Occurrences |
| --- | --- |
| `prompts/article-generation.md` | 10 |
| `prompts/topic-scouting.md` | 2 |
| `articles/artistes-nova.html` | 3 |
| `articles/nova-corporation.html` | 1 |
| `index.html` (le `<title>`) | 1 |
| `projects.html` (la signature « Peace, Art, Technology ») | 1 |

Le plus urgent est le **prompt de rédaction** : tant qu'il ne l'interdit
pas explicitement, le modèle en produira dans chaque nouvel article. Je
ne l'ai pas modifié parce que la branche `claude/prompt-fond-editorial`
y touche déjà et que le conflit aurait été frontal.

Comment remplacer : par la ponctuation qui porte le sens, deux-points
quand ce qui suit explique, virgule pour une incise, point pour deux
idées, parenthèses pour un aparté. **Jamais par substitution mécanique**,
ça produit des phrases bancales.

## 5. Pièges rencontrés, à ne pas revivre

- **Le `main` local de ce clone est en retard de 39 commits sur
  `origin/main`**, et porte deux commits de mars jamais poussés
  (« Migration vers next.js », « base du site avec bdd »). C'est ce qui
  avait déjà fait conclure à tort, dans une session précédente, que Nova
  n'avait aucune automatisation d'articles. **Toujours vérifier
  `git log HEAD..origin/main` avant d'affirmer ce que contient ce
  dépôt.** Cette branche part d'`origin/main`, pas du `main` local.
- **`CLAUDE.md` n'existe pas sur `origin/main`**, il vit sur
  `claude/prompt-fond-editorial`. Je n'y ai donc rien écrit, d'où ce
  fichier séparé. Quand tu fusionneras, l'endroit naturel pour garder la
  mémoire de tout ça est ce `CLAUDE.md`, pas ce fichier de passation.
- La branche `claude/nova-css-cleanup-iharrr` a un commit non poussé sur
  cette machine.

## 6. Qui fait quoi maintenant

Arkive reste géré par la session sur l'autre machine, hub compris pour
tout ce qui touche au lien entre les deux. Le reste du site Nova, le
pipeline d'articles et ses prompts sont à toi. Le seul point de contact
prévu est la section Écosystème de `projects.html` : si Hook ou wip.audio
sont déployés un jour, ce sont leurs cartes qu'il faudra transformer en
liens.
