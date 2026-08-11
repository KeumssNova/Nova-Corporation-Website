const nacl = require("tweetnacl");

const API_BASE = "https://discord.com/api/v10";

function botHeaders() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("DISCORD_BOT_TOKEN manquant.");
  return { Authorization: `Bot ${token}`, "Content-Type": "application/json" };
}

/**
 * Vérifie la signature Ed25519 d'une requête entrante de Discord (endpoint
 * d'interactions). À appeler AVANT de traiter le corps de la requête.
 * `rawBody` doit être la chaîne brute non parsée (le JSON.stringify d'un
 * body déjà parsé ne redonnera pas les mêmes octets et ferait échouer la
 * vérification).
 */
function verifyDiscordRequest({ rawBody, signature, timestamp }) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey || !signature || !timestamp) return false;
  try {
    return nacl.sign.detached.verify(
      Buffer.from(timestamp + rawBody),
      Buffer.from(signature, "hex"),
      Buffer.from(publicKey, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Crée un thread public dans le salon de review, avec le message initial
 * (résumé du brouillon + bouton "Publier"). Retourne { threadId, messageId }.
 */
async function createDraftThread({ title, summary, imagePrompt, caption, seoDescription, sources, draftId }) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId) throw new Error("DISCORD_CHANNEL_ID manquant.");

  const sourcesText = sources.length
    ? sources.map((s) => `• [${s.title || s.uri}](${s.uri})`).join("\n")
    : "_aucune source retournée_";

  const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
    method: "POST",
    headers: botHeaders(),
    body: JSON.stringify({
      embeds: [
        {
          title: `📝 Nouveau brouillon : ${title}`,
          description: summary.slice(0, 4000),
          color: 0xff5b5b,
          fields: [
            { name: "Prompt image", value: imagePrompt.slice(0, 1000) || "—" },
            { name: "Légende", value: caption.slice(0, 500) || "—" },
            { name: "Meta description SEO", value: (seoDescription || "—").slice(0, 500) },
            { name: "Sources", value: sourcesText.slice(0, 1000) },
          ],
          footer: { text: `draft:${draftId}` },
        },
      ],
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              style: 3,
              label: "✅ Publier",
              custom_id: `publish:${draftId}`,
            },
            {
              type: 2,
              style: 4,
              label: "❌ Rejeter",
              custom_id: `reject:${draftId}`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Création message Discord échouée (${res.status}) : ${errText.slice(0, 300)}`);
  }
  const message = await res.json();

  const threadRes = await fetch(`${API_BASE}/channels/${channelId}/messages/${message.id}/threads`, {
    method: "POST",
    headers: botHeaders(),
    body: JSON.stringify({ name: title.slice(0, 90), auto_archive_duration: 4320 }),
  });
  if (!threadRes.ok) {
    const errText = await threadRes.text().catch(() => "");
    throw new Error(`Création thread Discord échouée (${threadRes.status}) : ${errText.slice(0, 300)}`);
  }
  const thread = await threadRes.json();

  await fetch(`${API_BASE}/channels/${thread.id}/messages`, {
    method: "POST",
    headers: botHeaders(),
    body: JSON.stringify({
      content:
        "Dépose l'image générée à partir du prompt ci-dessus **dans ce thread** (en pièce jointe), " +
        "puis clique sur ✅ Publier une fois prêt·e.",
    }),
  });

  return { threadId: thread.id, messageId: message.id };
}

/** Récupère la pièce jointe image la plus récente postée dans le thread. */
async function fetchLatestImageAttachment(threadId) {
  const res = await fetch(`${API_BASE}/channels/${threadId}/messages?limit=50`, {
    headers: botHeaders(),
  });
  if (!res.ok) throw new Error(`Lecture des messages du thread échouée (${res.status})`);
  const messages = await res.json();

  for (const msg of messages) {
    const img = (msg.attachments || []).find((a) =>
      /^image\/(png|jpe?g|webp)/i.test(a.content_type || "")
    );
    if (img) return img; // messages triés du plus récent au plus ancien par l'API
  }
  return null;
}

/** Met à jour le message d'origine (embed + retire les boutons) après décision. */
async function updateDraftMessage(channelId, messageId, { statusLine, color }) {
  const getRes = await fetch(`${API_BASE}/channels/${channelId}/messages/${messageId}`, {
    headers: botHeaders(),
  });
  const original = getRes.ok ? await getRes.json() : null;
  const embed = original?.embeds?.[0] || {};

  await fetch(`${API_BASE}/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    headers: botHeaders(),
    body: JSON.stringify({
      embeds: [{ ...embed, description: `${statusLine}\n\n${embed.description || ""}`, color }],
      components: [],
    }),
  });
}

/**
 * Edite la reponse differee d'une interaction (slash command) une fois le
 * traitement en tache de fond termine. `interactionToken` vient du payload
 * d'interaction recu de Discord, valable 15 minutes -- ne necessite pas le
 * token du bot, l'URL webhook fait foi.
 */
async function editInteractionResponse(interactionToken, { content }) {
  const appId = process.env.DISCORD_APPLICATION_ID;
  if (!appId) throw new Error("DISCORD_APPLICATION_ID manquant.");
  await fetch(`${API_BASE}/webhooks/${appId}/${interactionToken}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

module.exports = {
  verifyDiscordRequest,
  createDraftThread,
  fetchLatestImageAttachment,
  updateDraftMessage,
  editInteractionResponse,
};
