const { generateArticle } = require("../lib/gemini");
const { sanitizeFragment } = require("../lib/sanitize-fragment");
const { slugify } = require("../lib/slug");
const { writeFile } = require("../lib/github-app");
const { createDraftThread } = require("../lib/discord");

function checkAuth(req) {
  const expected = process.env.PUBLISH_SECRET;
  if (!expected) throw new Error("PUBLISH_SECRET non configuré côté serveur.");
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  return token === expected;
}

/** Vérifications automatiques avant d'envoyer le brouillon en review. */
function verifyDraft({ html, sources }) {
  const problems = [];
  if (!/^<h1>/i.test(html.trim())) problems.push("le fragment ne commence pas par <h1>.");
  if (html.trim().length < 300) problems.push("contenu anormalement court.");
  if (sources.length < 1) problems.push("aucune source de recherche Google retournée (grounding).");
  return problems;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée, utiliser POST." });
    return;
  }
  if (!checkAuth(req)) {
    res.status(401).json({ error: "Non autorisé." });
    return;
  }

  const { topic, rawText } = req.body || {};
  if (!topic || typeof topic !== "string") {
    res.status(400).json({ error: "Paramètre 'topic' requis." });
    return;
  }

  try {
    const generated = await generateArticle({ topic, rawText });
    const sanitizedHtml = sanitizeFragment(generated.html);

    const problems = verifyDraft({ html: sanitizedHtml, sources: generated.sources });
    if (problems.length) {
      res.status(422).json({ error: "Vérification auto échouée.", problems });
      return;
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
      sources: generated.sources,
      createdAt: new Date().toISOString(),
      status: "pending",
    };

    await writeFile(
      `_drafts/${draftId}.json`,
      JSON.stringify(draft, null, 2),
      `blog: brouillon "${topic}"`
    );

    const summary = sanitizedHtml.replace(/<[^>]+>/g, " ").trim().slice(0, 300);
    const { threadId, messageId } = await createDraftThread({
      title: topic,
      summary,
      imagePrompt: generated.imagePrompt,
      caption: generated.caption,
      sources: generated.sources,
      draftId,
    });

    draft.discord = { threadId, messageId, channelId: process.env.DISCORD_CHANNEL_ID };
    await writeFile(
      `_drafts/${draftId}.json`,
      JSON.stringify(draft, null, 2),
      `blog: lien Discord pour "${topic}"`
    );

    res.status(200).json({ ok: true, draftId, threadId, sources: generated.sources });
  } catch (err) {
    console.error("generate-article error:", err);
    res.status(500).json({ error: err.message || "Erreur inconnue." });
  }
};
