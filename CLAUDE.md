# Contexte — Nova Corporation (site vitrine)

Note laissée le 2026-08-17 depuis une session travaillant sur **Arkive**
(l'autre projet de l'écosystème). Elle sert à éviter à la prochaine
session Claude les deux pièges sur lesquels je suis tombé.

## ⚠️ Piège n°1 : le README est très en retard sur le code

`README.md` décrit un simple site statique (HTML/Tailwind/Swiper) et ne
mentionne **rien** du pipeline de blog automatisé. C'est faux : le dépôt
contient un système complet — veille Gemini quotidienne, validation par
boutons Discord, publication par commit via GitHub App.

**La vraie documentation est `api/README.md`.** La lire en premier.

Ne pas conclure « ce projet n'a pas de X » à partir du README seul.

## ⚠️ Piège n°2 : l'état des branches locales

Constaté sur le clone de l'utilisateur (`~/Bureau/Nova-Corporation-Website`) :

- La branche de travail habituelle est `claude/nova-css-cleanup-iharrr`,
  qui pointait sur le **même commit qu'`origin/main`** — c'est elle qui
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
automatisation d'articles — en lisant un clone en retard de 39 commits.
C'était faux et ça lui a fait perdre du temps.

## Branche `claude/prompt-fond-editorial`

Contient **un seul commit**, isolé exprès pour être relu puis fusionné
dans `main` par l'utilisateur quand il le souhaite.

Il ajoute à `prompts/article-generation.md` une section « Le fond prime
sur le style ». Raison : les règles de voix existantes visent à ne pas
*sonner* comme une machine, ce qui est utile mais protège mal. Ce que
Google sanctionne (*scaled content abuse*), ce n'est pas un style trop
lisse — c'est de publier en série des textes qui n'apportent rien de plus
que le communiqué de presse. La section exige donc au moins un apport
réel par article (avis assumé, mise en perspective, ou contexte absent de
la source) et autorise explicitement à **abandonner un sujet** plutôt que
de produire du remplissage.

## Lien avec l'écosystème

Arkive (`~/Bureau/Arkive`, dépôt `KeumssNova/Arkive`) porte son propre
pipeline éditorial, en cours de construction, largement inspiré de
celui-ci. Les décisions de portage — ce qui se réutilise tel quel, ce qui
ne doit pas l'être — sont documentées dans le `CLAUDE.md` d'Arkive, pas
ici.
