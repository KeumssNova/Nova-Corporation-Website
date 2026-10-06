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
async function trouverRelease(tag) {
  const res = await githubRequest(`/repos/${DEPOT}/releases?per_page=100`);
  if (!res.ok) {
    const detail = res.status === 404
      ? `dépôt ${DEPOT} introuvable : l'App GitHub y est-elle installée ?`
      : `${res.status} ${(await res.text()).slice(0, 200)}`;
    throw new Error(`Liste des releases impossible (${detail})`);
  }
  const releases = await res.json();
  return releases.find((r) => r.tag_name === tag) || null;
}

/** Publie la release : le post entre dans la file de publication. */
async function validerPost(tag) {
  const release = await trouverRelease(tag);
  if (!release) throw new Error(`Release ${tag} introuvable (déjà traitée ?).`);
  if (!release.draft) return { deja: true, tag };

  const res = await githubRequest(`/repos/${DEPOT}/releases/${release.id}`, {
    method: "PATCH",
    body: JSON.stringify({ draft: false }),
  });
  if (!res.ok) throw new Error(`Publication de ${tag} refusée (${res.status} ${(await res.text()).slice(0, 200)})`);
  return { deja: false, tag };
}

/** Supprime la release : le post ne sortira pas. */
async function rejeterPost(tag) {
  const release = await trouverRelease(tag);
  if (!release) throw new Error(`Release ${tag} introuvable (déjà traitée ?).`);
  const res = await githubRequest(`/repos/${DEPOT}/releases/${release.id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`Suppression de ${tag} refusée (${res.status} ${(await res.text()).slice(0, 200)})`);
  }
  return { tag };
}

module.exports = { validerPost, rejeterPost, trouverRelease, DEPOT };
