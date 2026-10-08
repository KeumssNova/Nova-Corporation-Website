const crypto = require("crypto");

const API_BASE = "https://api.github.com";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * Construit et signe un JWT App (RS256), valable 9 minutes, comme requis
 * par l'API GitHub Apps. Pas de dépendance externe : Node fait du RS256
 * nativement via crypto.
 */
function buildAppJwt() {
  const appId = process.env.GITHUB_APP_ID;
  const privateKey = (process.env.GITHUB_APP_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!appId || !privateKey) throw new Error("GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY manquants.");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = { iat: now - 60, exp: now + 9 * 60, iss: appId };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), privateKey);

  return `${unsigned}.${base64url(signature)}`;
}

let cachedToken = null; // { token, expiresAt }

/**
 * Échange le JWT App contre un token d'installation (scopé au repo installé).
 * Mis en cache en mémoire le temps de vie de la fonction serverless (les
 * tokens d'installation sont valables 1h).
 */
async function getInstallationToken({ frais = false } = {}) {
  if (!frais && cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
  if (!installationId) throw new Error("GITHUB_APP_INSTALLATION_ID manquant.");

  const jwt = buildAppJwt();
  const res = await fetch(`${API_BASE}/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Echange token installation echoue (${res.status}) : ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  // GitHub renvoie, avec le token, les permissions reellement accordees a l'installation et les
  // depots couverts. C'est la seule facon de savoir ce que l'App peut faire sans deviner : une
  // permission ajoutee sur l'App reste inactive tant que l'installation ne l'a pas acceptee, et
  // rien ne le distingue d'un oubli. Garde pour pouvoir le dire dans un message d'erreur.
  cachedToken = {
    token: data.token,
    expiresAt: new Date(data.expires_at).getTime(),
    permissions: data.permissions || {},
    portee: data.repository_selection || "?",
  };
  return cachedToken.token;
}

/** Ce que l'installation peut reellement faire, en une ligne lisible. "" si rien n'est encore su. */
async function droitsAccordes({ frais = false } = {}) {
  try {
    await getInstallationToken({ frais });
  } catch (err) {
    return `droits illisibles (${String(err.message || err).slice(0, 120)})`;
  }
  const p = cachedToken.permissions || {};
  const lignes = Object.keys(p).sort().map((k) => `${k}: ${p[k]}`);
  return `dépôts : ${cachedToken.portee} ; permissions accordées : ${lignes.join(", ") || "aucune"}`;
}

function repoInfo() {
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const branch = process.env.GITHUB_REPO_BRANCH || "main";
  if (!owner || !repo) throw new Error("GITHUB_REPO_OWNER / GITHUB_REPO_NAME manquants.");
  return { owner, repo, branch };
}

function envoyer(pathSuffix, options, token) {
  return fetch(`${API_BASE}${pathSuffix}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
}

/**
 * Un 403 sur un token venu du cache n'est pas forcement un refus.
 *
 * GitHub fige les permissions d'un token d'installation au moment ou il l'emet, et le token vit une
 * heure. Quand une permission est ajoutee sur l'App puis acceptee sur l'installation, les tokens
 * deja emis gardent l'ancienne liste jusqu'a leur expiration. Une instance serverless tiede peut
 * donc presenter l'ancien token : l'appel echoue alors que le droit est accorde, et rien dans le
 * message ne le distingue d'un oubli de reglage.
 *
 * Precaution deduite de la documentation, pas d'une panne observee : le 403 du 08/10 sur
 * `actions: write` venait bien d'une permission pas encore acceptee sur l'installation.
 *
 * On purge donc le cache et on reessaie une seule fois, avec un token neuf. Si le droit manque
 * vraiment, le second 403 est le bon et c'est lui qui remonte.
 */
async function githubRequest(pathSuffix, options = {}) {
  const avant = cachedToken && cachedToken.token;
  const token = await getInstallationToken();
  const res = await envoyer(pathSuffix, options, token);
  // Comparer le token lui-meme, et non la seule presence d'un cache : un token qui vient d'etre emis
  // porte deja les derniers droits, et le reemettre ne changerait rien.
  if (res.status !== 403 || token !== avant) return res;
  cachedToken = null;
  return envoyer(pathSuffix, options, await getInstallationToken());
}

/** Lit un fichier du repo. Retourne { content (string), sha } ou null si absent. */
async function readFile(filePath) {
  const { owner, repo, branch } = repoInfo();
  const res = await githubRequest(
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Lecture ${filePath} echouee (${res.status})`);
  const data = await res.json();
  return { content: Buffer.from(data.content, "base64").toString("utf8"), sha: data.sha };
}

/**
 * Crée ou met à jour un fichier (texte ou binaire base64) via l'API Contents.
 * `contentBase64: true` pour committer des données déjà encodées en base64
 * (images).
 */
async function writeFile(filePath, content, message, { contentBase64 = false } = {}) {
  const { owner, repo, branch } = repoInfo();
  const existing = await readFile(filePath);
  const body = {
    message,
    content: contentBase64 ? content : Buffer.from(content, "utf8").toString("base64"),
    branch,
    ...(existing ? { sha: existing.sha } : {}),
  };
  const res = await githubRequest(`/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ecriture ${filePath} echouee (${res.status}) : ${errText.slice(0, 300)}`);
  }
  return res.json();
}

async function deleteFile(filePath, message) {
  const { owner, repo, branch } = repoInfo();
  const existing = await readFile(filePath);
  if (!existing) return; // déjà absent, rien à faire
  const res = await githubRequest(`/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha: existing.sha, branch }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Suppression ${filePath} echouee (${res.status}) : ${errText.slice(0, 300)}`);
  }
}

// githubRequest est exporte pour les appels hors du depot du site (les releases de nova-brain, voir
// lib/posts.js) : le token d'installation n'est pas lie a un depot, il couvre ceux ou l'App est
// installee. Si elle ne l'est pas sur nova-brain, l'appel repond 404 et le message le dit.
module.exports = { readFile, writeFile, deleteFile, repoInfo, githubRequest, droitsAccordes };
