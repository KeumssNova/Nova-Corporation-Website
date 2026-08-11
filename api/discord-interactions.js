const { waitUntil } = require("@vercel/functions");
const { verifyDiscordRequest, editInteractionResponse, updateDraftMessage } = require("../lib/discord");
const { readFile } = require("../lib/github-app");
const { publishDraft, rejectDraft } = require("../lib/publish");
const { generateAndDraftArticle } = require("../lib/generate");

// Discord signe le corps BRUT de la requête : le body-parser JSON de Vercel
// re-sérialiserait différemment (ordre des clés, espaces...) et ferait
// échouer la vérification -- on lit le flux nous-mêmes.
module.exports.config = { api: { bodyParser: false } };

const INTERACTION_TYPE = { PING: 1, APPLICATION_COMMAND: 2, MESSAGE_COMPONENT: 3 };
const RESPONSE_TYPE = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function getOption(options, name) {
  return options?.find((o) => o.name === name)?.value;
}

/** Traite /article en tache de fond, edite la reponse differee a la fin. */
async function handleArticleCommand(interaction) {
  const topic = getOption(interaction.data.options, "topic");
  const rawText = getOption(interaction.data.options, "texte");

  try {
    const { threadId } = await generateAndDraftArticle({ topic, rawText });
    await editInteractionResponse(interaction.token, {
      content: `✅ Brouillon généré pour **${topic}** — <#${threadId}>`,
    });
  } catch (err) {
    console.error(`generateAndDraftArticle via /article failed:`, err);
    const detail = err.problems ? err.problems.join(" / ") : err.message;
    await editInteractionResponse(interaction.token, {
      content: `❌ Échec de la génération pour **${topic}** : ${detail}`,
    });
  }
}

/**
 * Traite le clic sur un bouton "Générer l'article N" d'un message de
 * veille. Relit la piste choisie dans _scout/<batchId>.json (le custom_id
 * ne contient que l'index, pas le sujet -- trop long pour la limite de 100
 * caractères de Discord), puis lance la meme generation que /article.
 */
async function handleScoutChoice(interaction, batchId, index) {
  const channelId = interaction.channel_id;
  const messageId = interaction.message?.id;

  try {
    const batchFile = await readFile(`_scout/${batchId}.json`);
    if (!batchFile) throw new Error(`Lot de veille ${batchId} introuvable.`);
    const batch = JSON.parse(batchFile.content);
    const proposal = batch.proposals?.[index];
    if (!proposal) throw new Error(`Piste #${index + 1} introuvable dans ce lot.`);

    const { threadId } = await generateAndDraftArticle({ topic: proposal.topic });

    if (channelId && messageId) {
      await updateDraftMessage(channelId, messageId, {
        statusLine: `✅ Piste **"${proposal.topic}"** choisie — brouillon prêt dans <#${threadId}>`,
        color: 0x2ecc71,
      });
    }
  } catch (err) {
    console.error(`handleScoutChoice(${batchId}, ${index}) failed:`, err);
    if (channelId && messageId) {
      await updateDraftMessage(channelId, messageId, {
        statusLine: `❌ Échec de la génération pour la piste #${index + 1} : ${err.message}`,
        color: 0xe74c3c,
      });
    }
  }
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

  if (interaction.type === INTERACTION_TYPE.APPLICATION_COMMAND) {
    if (interaction.data?.name === "article") {
      // Generation Gemini + commits GitHub + creation de thread : largement
      // au-dela des 3s que Discord accorde pour repondre. Meme pattern que
      // pour les boutons : accuse de reception differe, travail en tache de
      // fond, edition de la reponse une fois termine.
      res.status(200).json({ type: RESPONSE_TYPE.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE });
      waitUntil(handleArticleCommand(interaction));
      return;
    }
    res.status(400).json({ error: "commande non gérée" });
    return;
  }

  if (interaction.type === INTERACTION_TYPE.MESSAGE_COMPONENT) {
    const customId = interaction.data?.custom_id || "";
    const [action, refId, scoutIndex] = customId.split(":");

    if (action === "scout" && refId && scoutIndex !== undefined) {
      res.status(200).json({ type: RESPONSE_TYPE.DEFERRED_UPDATE_MESSAGE });
      waitUntil(handleScoutChoice(interaction, refId, Number(scoutIndex)));
      return;
    }

    const draftId = refId;
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
