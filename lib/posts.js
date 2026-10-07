/**
 * Validation des posts du média depuis Discord.
 *
 * Les posts (Reels et carrousels) sont fabriqués par nova-brain et déposés en brouillon de release
 * dans ce dépôt-là. nova-brain poste ensuite la vidéo et sa légende dans un salon Discord, avec deux
 * boutons (voir outils/auto/discord.py côté nova-brain). Les boutons arrivent ici, parce qu'une
 * interaction Discord demande une adresse joignable en permanence : un workflow GitHub ne peut pas
 * en recevoir, Vercel si.
 *
 * ✅ publie la release : elle entre dans la file et part au créneau suivant (12, 15, 18 ou 21 h).
 *    On ne publie pas directement sur Instagram : les créneaux existent pour sortir aux bonnes
 *    heures, et publier.py reste le seul publieur.
 * ❌ supprime la release : le post ne sortira pas.
 *
 * Accès : le jeton d'installation de l'App GitHub. Il n'est pas lié à un dépôt, il couvre ceux où
 * l'App est installée. **Si l'App n'est pas installée sur nova-brain, GitHub répond 404** et le
 * message Discord l'affiche tel quel, pour ne pas laisser croire à une validation qui n'a pas eu lieu.
 */
const { githubRequest } = require("./github-app");

const DEPOT = process.env.NOVA_BRAIN_REPO || "KeumssNova/nova-brain";

/**
 * Trouve une release par son tag, brouillon compris.
 * GET /releases/tags/<tag> ne voit pas les brouillons (ils n'ont pas encore de tag Git) : il faut
 * parcourir la liste. C'est le piège de cette API.
 */
// Les deux refus qui comptent ici tiennent a la configuration de l'App, pas au code, et un message
// brut ne dit pas quoi faire. Le 404 a servi le 07/10 : l'App n'avait jamais ete installee sur
// nova-brain, et c'est ce message dans Discord qui l'a revele.
function detailAcces(status) {
  if (status === 404) {
    return `dépôt ${DEPOT} introuvable : l'App GitHub y est-elle installée ? ` +
      "Réglages du compte, Applications, l'App, Configure, ajouter ce dépôt.";
  }
  if (status === 403) {
    return `accès refusé sur ${DEPOT} : l'App y est installée mais il lui manque la permission ` +
      "Contents en écriture, qui gouverne les releases.";
  }
  return null;
}

async function trouverRelease(ref) {
  // Un identifiant numerique designe UNE release et une seule : c'est ce que portent les boutons
  // depuis le 07/10. Deux brouillons pouvant porter le meme tag, un bouton qui ne portait que le tag
  // devenait ambigu des que la veille repassait dans la journee, et refusait de choisir.
  if (/^\d+$/.test(String(ref))) {
    const direct = await githubRequest(`/repos/${DEPOT}/releases/${ref}`);
    if (direct.status === 404) return null;
    if (!direct.ok) throw new Error(`Lecture de la release ${ref} impossible (${direct.status} ${detailAcces(direct.status)})`);
    return direct.json();
  }
  const tag = ref;
  const res = await githubRequest(`/repos/${DEPOT}/releases?per_page=100`);
  if (!res.ok) {
    const detail = detailAcces(res.status) || `${res.status} ${(await res.text()).slice(0, 200)}`;
    throw new Error(`Liste des releases impossible (${detail})`);
  }
  const releases = await res.json();
  const correspondances = releases.filter((r) => r.tag_name === tag);
  // Deux brouillons peuvent porter le meme tag : un brouillon n'a pas encore de tag Git, donc rien
  // ne l'empeche cote GitHub. Arrive le 07/10, la veille numerotant ses sujets a partir de 1 a
  // chaque passage. Prendre le premier reviendrait a couvrir ou supprimer l'autre sujet sans
  // rien dire, et le message afficherait un succes. On refuse, c'est le seul choix honnete.
  if (correspondances.length > 1) {
    throw new Error(
      `${correspondances.length} releases portent le tag ${tag} : impossible de savoir laquelle. ` +
        "Supprimer les brouillons en trop, ou relancer la veille (ses tags portent l'heure depuis le 07/10)."
    );
  }
  return correspondances[0] || null;
}

/** Publie la release : le post entre dans la file de publication. */
async function validerPost(ref) {
  const release = await trouverRelease(ref);
  if (!release) throw new Error(`Release ${ref} introuvable (déjà traitée ?).`);
  // Le message montre le nom lisible, meme quand le bouton portait un identifiant numerique.
  const tag = release.tag_name || ref;
  if (!release.draft) return { deja: true, tag };

  const res = await githubRequest(`/repos/${DEPOT}/releases/${release.id}`, {
    method: "PATCH",
    body: JSON.stringify({ draft: false }),
  });
  if (!res.ok) throw new Error(`Publication de ${tag} refusée (${res.status} ${(await res.text()).slice(0, 200)})`);
  return { deja: false, tag };
}

/** Supprime la release : le post ne sortira pas. */
async function rejeterPost(ref) {
  const release = await trouverRelease(ref);
  if (!release) throw new Error(`Release ${ref} introuvable (déjà traitée ?).`);
  const tag = release.tag_name || ref;
  const res = await githubRequest(`/repos/${DEPOT}/releases/${release.id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Suppression de ${tag} refusée (${res.status} ${(await res.text()).slice(0, 200)})`);
  }
  return { tag };
}

module.exports = { validerPost, rejeterPost, trouverRelease, DEPOT };
