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
async function getInstallationToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
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
  cachedToken = { token: data.token, expiresAt: new Date(data.expires_at).getTime() };
  return cachedToken.token;
}

function repoInfo() {
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const branch = process.env.GITHUB_REPO_BRANCH || "main";
  if (!owner || !repo) throw new Error("GITHUB_REPO_OWNER / GITHUB_REPO_NAME manquants.");
  return { owner, repo, branch };
}

async function githubRequest(pathSuffix, options = {}) {
  const token = await getInstallationToken();
  const res = await fetch(`${API_BASE}${pathSuffix}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  return res;
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

module.exports = { readFile, writeFile, deleteFile, repoInfo };
