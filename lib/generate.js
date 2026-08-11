const { generateArticle } = require("./gemini");
const { sanitizeFragment } = require("./sanitize-fragment");
const { slugify } = require("./slug");
const { writeFile } = require("./github-app");
const { createDraftThread } = require("./discord");

/** Vérifications automatiques avant d'envoyer le brouillon en review. */
function verifyDraft({ html, sources, seoDescription }) {
  const problems = [];
  if (!/^<h1>/i.test(html.trim())) problems.push("le fragment ne commence pas par <h1>.");
  if (html.trim().length < 300) problems.push("contenu anormalement court.");
  if (sources.length < 1) problems.push("aucune source de recherche Google retournée (grounding).");
  if (!seoDescription || seoDescription.length < 80 || seoDescription.length > 200) {
    problems.push(`SEO_DESCRIPTION absente ou hors gabarit (140-160 caractères visés, reçu ${seoDescription?.length ?? 0}).`);
  }
  return problems;
}

/**
 * Genere un article, le sanitise, le verifie, le committe comme brouillon
 * dans _drafts/ et cree le thread Discord de review. Utilise a la fois par
 * api/generate-article.js (declenchement via curl/HTTP) et
 * api/discord-interactions.js (commande /article) -- meme logique, deux
 * points d'entree.
 *
 * Leve une erreur si la generation echoue ou si la verification auto
 * rejette le brouillon (err.problems contient alors le detail).
 */
async function generateAndDraftArticle({ topic, rawText }) {
  const generated = await generateArticle({ topic, rawText });
  const sanitizedHtml = sanitizeFragment(generated.html);

  const problems = verifyDraft({
    html: sanitizedHtml,
    sources: generated.sources,
    seoDescription: generated.seoDescription,
  });
  if (problems.length) {
    const err = new Error("Vérification auto échouée.");
    err.problems = problems;
    throw err;
  }

  const slug = slugify(topic);
  const draftId = `${slug}-${Date.now().toString(36)}`;

  const draft = {
    draftId,
    slug,
    topic,
    title: topic,
    html: sanitizedHtml,
    imagePrompt: generated.imagePrompt,
    caption: generated.caption,
    seoDescription: generated.seoDescription,
    sources: generated.sources,
    createdAt: new Date().toISOString(),
    status: "pending",
  };

  await writeFile(`_drafts/${draftId}.json`, JSON.stringify(draft, null, 2), `blog: brouillon "${topic}"`);

  const summary = sanitizedHtml.replace(/<[^>]+>/g, " ").trim().slice(0, 300);
  const { threadId, messageId } = await createDraftThread({
    title: topic,
    summary,
    imagePrompt: generated.imagePrompt,
    caption: generated.caption,
    seoDescription: generated.seoDescription,
    sources: generated.sources,
    draftId,
  });

  draft.discord = { threadId, messageId, channelId: process.env.DISCORD_CHANNEL_ID };
  await writeFile(
    `_drafts/${draftId}.json`,
    JSON.stringify(draft, null, 2),
    `blog: lien Discord pour "${topic}"`
  );

  return { draftId, threadId, sources: generated.sources };
}

module.exports = { generateAndDraftArticle };
