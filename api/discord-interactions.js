const { waitUntil } = require("@vercel/functions");
const { verifyDiscordRequest } = require("../lib/discord");
const { publishDraft, rejectDraft } = require("../lib/publish");

// Discord signe le corps BRUT de la requête : le body-parser JSON de Vercel
// re-sérialiserait différemment (ordre des clés, espaces...) et ferait
// échouer la vérification -- on lit le flux nous-mêmes.
module.exports.config = { api: { bodyParser: false } };

const INTERACTION_TYPE = { PING: 1, MESSAGE_COMPONENT: 3 };
const RESPONSE_TYPE = { PONG: 1, DEFERRED_UPDATE_MESSAGE: 6 };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];

  if (!verifyDiscordRequest({ rawBody, signature, timestamp })) {
    res.status(401).json({ error: "signature invalide" });
    return;
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === INTERACTION_TYPE.PING) {
    res.status(200).json({ type: RESPONSE_TYPE.PONG });
    return;
  }

  if (interaction.type === INTERACTION_TYPE.MESSAGE_COMPONENT) {
    const customId = interaction.data?.custom_id || "";
    const [action, draftId] = customId.split(":");

    if (action === "publish" && draftId) {
      // Le travail réel (lecture GitHub, téléchargement image, plusieurs
      // commits) dépasse largement les 3s que Discord accorde pour
      // répondre : on accuse réception immédiatement (type 6) et on
      // termine la publication en tâche de fond via waitUntil, en
      // éditant le message d'origine une fois terminé.
      res.status(200).json({ type: RESPONSE_TYPE.DEFERRED_UPDATE_MESSAGE });
      waitUntil(
        publishDraft(draftId).catch((err) => {
          console.error(`publishDraft(${draftId}) failed:`, err);
        })
      );
      return;
    }

    if (action === "reject" && draftId) {
      res.status(200).json({ type: RESPONSE_TYPE.DEFERRED_UPDATE_MESSAGE });
      waitUntil(
        rejectDraft(draftId).catch((err) => {
          console.error(`rejectDraft(${draftId}) failed:`, err);
        })
      );
      return;
    }
  }

  res.status(400).json({ error: "interaction non gérée" });
};
