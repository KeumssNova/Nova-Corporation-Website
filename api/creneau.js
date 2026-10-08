/**
 * Déclencheur ponctuel des créneaux de publication Instagram.
 *
 * Pourquoi cet endpoint existe : GitHub ne livre pas ses `schedule` à l'heure. Mesuré le 06/10 sur
 * ce projet, créneau par créneau : 6h24, 6h00, 5h43, 5h19, 4h52, 4h24, 3h52, 3h22 de retard, un
 * retard qui décroît run après run, donc une file qui se vide. Le 07/10, rien n'a été livré de la
 * journée et aucun post n'est sorti. GitHub le documente : l'événement `schedule` est retardé aux
 * heures chargées et « certains runs en file peuvent être abandonnés ». Éloigner les crons de la
 * minute 0 réduit le risque, mais ne le supprime pas : il fallait un déclencheur qui, lui, arrive.
 *
 * Ce que fait cet endpoint : rien d'autre que lancer le workflow de publication de nova-brain. Toute
 * la logique (file d'attente, choix du post, envoi à Instagram) reste là-bas. Il est appelé par un
 * planificateur extérieur aux heures des créneaux, à l'heure de Paris.
 *
 * Sécurité : une clé partagée, comparée en temps constant, dans l'en-tête `x-nova-cle` de
 * préférence (une clé en adresse finit dans les journaux). Sans elle, n'importe qui pourrait vider
 * la file de publication.
 */
const crypto = require("crypto");
const { githubRequest } = require("../lib/github-app");
const { annoncer } = require("../lib/discord");

const DEPOT = process.env.NOVA_BRAIN_REPO || "KeumssNova/nova-brain";
const WORKFLOW = "publier.yml";
// Deux appels rapprochés publieraient deux posts : un planificateur qui réessaie après un délai
// d'attente suffirait à le provoquer. En deçà de cette fenêtre, le second appel ne fait rien.
const FENETRE_MINUTES = 10;

function cleValide(fournie) {
  const attendue = process.env.NOVA_CRENEAU_SECRET || "";
  if (!attendue || !fournie) return false;
  const a = Buffer.from(String(fournie));
  const b = Buffer.from(attendue);
  // timingSafeEqual exige deux tampons de même longueur, et la comparaison de longueur seule ne
  // révèle rien d'exploitable ici.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Ce que veut dire un refus de GitHub sur l'API Actions, en nommant la cause.
 *
 * Piège qui a coûté un test le 08/10 : installer l'App sur un dépôt ne suffit pas, il faut encore
 * qu'elle ait la **permission Actions en écriture**. Celle des releases est Contents, et les deux
 * sont indépendantes : les boutons de validation marchaient, le lancement de workflow non. GitHub
 * répond 403 ou 404 selon les cas, et un code nu n'apprend rien à qui lit sur son téléphone.
 */
async function detailActions(r) {
  const corps = (await r.text()).slice(0, 200);
  if (r.status === 404 || r.status === 403) {
    return (
      `GitHub refuse (${r.status}). Deux causes possibles, dans cet ordre : il manque à l'App GitHub ` +
      `la permission **Actions : lecture et écriture** (celle des releases est Contents, elle ne suffit pas, ` +
      `et une nouvelle permission doit être approuvée sur l'installation) ; ou l'App n'est pas installée ` +
      `sur ${DEPOT}. Réponse de GitHub : ${corps}`
    );
  }
  return `${r.status} ${corps}`;
}

/** Un lancement a-t-il déjà eu lieu dans la fenêtre ? Renvoie l'heure du dernier, ou null. */
async function dejaLance() {
  const res = await githubRequest(
    `/repos/${DEPOT}/actions/workflows/${WORKFLOW}/runs?event=workflow_dispatch&per_page=5`
  );
  // Ne pas bloquer une publication parce que la lecture a échoué, mais le dire : cette lecture
  // demande la permission Actions, exactement comme le lancement qui suit. Si elle échoue, le
  // lancement échouera aussi, et son message nommera la cause.
  if (!res.ok) {
    console.warn(`creneau: lecture des runs impossible (${res.status})`);
    return null;
  }
  const { workflow_runs: runs = [] } = await res.json();
  const limite = Date.now() - FENETRE_MINUTES * 60 * 1000;
  const recent = runs.find((r) => new Date(r.created_at).getTime() >= limite);
  return recent ? recent.created_at : null;
}

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ erreur: "méthode non gérée" });
    return;
  }
  const url = new URL(req.url, "https://novacorporation.fr");
  if (!cleValide(req.headers["x-nova-cle"] || url.searchParams.get("cle"))) {
    res.status(401).json({ erreur: "clé invalide ou absente" });
    return;
  }

  try {
    const recent = await dejaLance();
    if (recent) {
      res.status(200).json({ lance: false, raison: `déjà lancé à ${recent}` });
      return;
    }
    // `essai` est un booléen du workflow, et l'API le veut en chaîne. Sans ce "false" explicite,
    // la valeur par défaut du formulaire s'applique et le run ne publierait rien.
    const r = await githubRequest(`/repos/${DEPOT}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: "POST",
      body: JSON.stringify({ ref: "main", inputs: { essai: "false" } }),
    });
    if (!r.ok) {
      const erreur = await detailActions(r);
      // Le planificateur n'affiche que le code HTTP, et la cause resterait invisible : elle part
      // donc dans le salon, la ou les pannes se lisent deja (constate le 08/10 avec un 502 muet).
      await annoncer("⚠️ Le créneau n'a pas pu être lancé", erreur);
      res.status(502).json({ lance: false, erreur });
      return;
    }
    res.status(200).json({ lance: true, depot: DEPOT, workflow: WORKFLOW });
  } catch (err) {
    const erreur = String(err.message || err).slice(0, 300);
    await annoncer("⚠️ Le créneau a planté", erreur);
    res.status(500).json({ lance: false, erreur });
  }
};
