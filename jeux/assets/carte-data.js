// Données de la carte de Leonida.
//
// C'est un SCHÉMA, pas un relevé au mètre. Les six régions et leurs positions relatives sont
// sourcées (GTABase, Walkthrough Map, relevé du 2026-11-19) ; les formes sont les nôtres, dessinées
// pour être lisibles, pas pour décalquer la carte du jeu.
//
// Pour ajouter un point : une ligne dans POINTS. `zone` est obligatoire, `x` et `y` sont en
// coordonnées du schéma (0-1000 en largeur, 0-1400 en hauteur). Si la position exacte n'est pas
// connue, mettre `precis: false` : le point s'affiche au centre de sa zone et la carte le dit.

const ZONES = [
  {
    id: "kalaga",
    nom: "Mount Kalaga National Park",
    court: "Mount Kalaga",
    sous: "Le nord sauvage",
    texte: "Forêts, montagne, sentiers et chasse. La partie la moins urbanisée de l'État.",
    points: "400,90 760,75 800,250 740,385 450,375 370,230",
    etiquette: [585, 200],
  },
  {
    id: "gellhorn",
    nom: "Port Gellhorn",
    court: "Port Gellhorn",
    sous: "Côte nord-ouest",
    texte: "Ville portuaire fatiguée sur la côte du golfe, inspirée du Panhandle de Floride. C'est là que Moses rachète les voitures volées.",
    points: "110,230 395,200 400,360 345,445 170,432 85,330",
    etiquette: [245, 300],
  },
  {
    id: "ambrosia",
    nom: "Ambrosia",
    court: "Ambrosia",
    sous: "Cœur industriel",
    texte: "L'intérieur des terres, construit autour de sa raffinerie de sucre. Le derby de démolition d'Ambrosia Raceway est ici.",
    points: "420,392 745,388 792,560 722,702 468,708 388,545",
    etiquette: [558, 520],
  },
  {
    id: "grassrivers",
    nom: "Grassrivers",
    court: "Grassrivers",
    sous: "Les marais",
    texte: "Zones humides inspirées des Everglades : hydroglisseurs, alligators, chemins d'eau.",
    points: "248,702 562,700 592,880 500,988 300,962 205,822",
    etiquette: [398, 800],
  },
  {
    id: "vicecity",
    nom: "Vice City",
    court: "Vice City",
    sous: "Côte sud-est",
    texte: "La métropole au néon inspirée de Miami : plages, nuit, port et centre-ville. C'est la zone la plus dense du jeu.",
    points: "612,712 872,722 902,905 832,1042 640,1028 576,862",
    etiquette: [738, 840],
  },
  {
    id: "keys",
    nom: "Leonida Keys",
    court: "Leonida Keys",
    sous: "Les îles du sud",
    texte: "Chapelet d'îles au large de la pointe sud, reliées par de longs ponts. Inspirées des Florida Keys.",
    // chapelet : chaque île est un petit polygone, le liant est dessiné par le moteur
    iles: [
      [585, 1105, 46], [495, 1152, 38], [412, 1188, 32],
      [322, 1208, 27], [252, 1232, 22], [192, 1252, 18],
    ],
    etiquette: [395, 1300],
  },
];

// Catégories : les mêmes que le tracker 100 %, pour qu'un jour les deux partagent leurs données.
const CATEGORIES = [
  { id: "mission", nom: "Missions", couleur: "#ff5b5b" },
  { id: "argent", nom: "Argent", couleur: "#ffb347" },
  { id: "collectible", nom: "Collectibles", couleur: "#7dd3fc" },
  { id: "activite", nom: "Activités", couleur: "#a3e635" },
  { id: "lieu", nom: "Lieux", couleur: "#ffffff" },
];

// Points officiels du site. Tout ce qui est ici vient d'une de nos pages déjà sourcées.
// `precis: false` veut dire : on sait dans quelle région, pas où exactement.
const POINTS = [
  { id: "p-moses", cat: "argent", nom: "Voitures pour Moses", zone: "gellhorn", precis: false,
    texte: "Il refuse les voitures prises trop près de son garage. Les cibles se trouvent sur la route principale de Port Gellhorn. Environ 1 000 $ la vente.",
    lien: "/jeux/gta-6/argent-rapide/" },
  { id: "p-ambrosia-raceway", cat: "activite", nom: "Ambrosia Raceway", zone: "ambrosia", precis: false,
    texte: "Derby de démolition. Entre 3 000 et 6 300 $ par victoire, le double sur le circuit en huit.",
    lien: "/jeux/gta-6/argent-rapide/" },
  { id: "p-bijouteries", cat: "argent", nom: "Bijouteries", zone: "vicecity", precis: false,
    texte: "Débloquées au chapitre 3. De 10 000 à 25 000 $ par braquage, et un coffre dans l'arrière-boutique.",
    lien: "/jeux/gta-6/argent-rapide/" },
  { id: "p-banques", cat: "argent", nom: "Coffres de banque", zone: "vicecity", precis: false,
    texte: "La meilleure source du jeu, jusqu'à 200 000 $. Fin du chapitre 4, et 4 étoiles de recherche immédiates.",
    lien: "/jeux/gta-6/argent-rapide/" },
  { id: "p-bret", cat: "argent", nom: "La chasse avec Bret", zone: "kalaga", precis: false,
    texte: "Bret rachète le gibier depuis ton coffre. Jusqu'à 2 500 $ pour un gros sanglier. Jason uniquement.",
    lien: "/jeux/gta-6/argent-rapide/" },
  { id: "p-stand-tir", cat: "activite", nom: "Stands de tir", zone: "vicecity", precis: false,
    texte: "25 médailles de bronze, d'argent puis d'or débloquent les codes Max Ammo, Infinite Ammo et No Reload.",
    lien: "/jeux/gta-6/codes-triche/" },
  { id: "p-flamants", cat: "collectible", nom: "Flamants de cocaïne", zone: "grassrivers", precis: false,
    texte: "50 à détruire pour débloquer le flamant gonflable. Position exacte à préciser.",
    lien: "/jeux/gta-6/codes-triche/" },
  { id: "p-cartes-flamingos", cat: "collectible", nom: "Cartes Vice City Flamingos", zone: "vicecity", precis: false,
    texte: "24 cartes à collecter pour débloquer le filtre Bubblegum.",
    lien: "/jeux/gta-6/codes-triche/" },
  { id: "p-montres", cat: "collectible", nom: "Montres", zone: "vicecity", precis: false,
    texte: "10 montres débloquent Move Time Forward, 20 débloquent Pause Time of Day.",
    lien: "/jeux/gta-6/codes-triche/" },
  { id: "p-prologue", cat: "mission", nom: "Début de l'histoire", zone: "gellhorn", precis: false,
    texte: "L'histoire de Jason et Lucia démarre par un braquage de banque raté.",
    lien: "/jeux/gta-6/missions/" },
];
