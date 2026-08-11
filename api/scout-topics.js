const { scoutTopics } = require("../lib/scout");
const { writeFile } = require("../lib/github-app");
const { postScoutProposals } = require("../lib/discord");

/**
 * Autorise soit Vercel Cron (Authorization: Bearer <CRON_SECRET>, injecte
 * automatiquement par Vercel quand CRON_SECRET est configure sur le
 * projet), soit un declenchement manuel avec le meme secret que
 * generate-article (PUBLISH_SECRET) -- pratique pour lancer la veille a la
 * demande sans attendre le lendemain.
 */
function checkAuth(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return false;
  return token === process.env.CRON_SECRET || token === process.env.PUBLISH_SECRET;
}

module.exports = async (req, res) => {
  if (!checkAuth(req)) {
    res.status(401).json({ error: "Non autorisé." });
    return;
  }

  try {
    const proposals = await scoutTopics();

    const dateLabel = new Date().toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const batchId = `${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`;

    if (proposals.length) {
      await writeFile(
        `_scout/${batchId}.json`,
        JSON.stringify({ batchId, proposals, createdAt: new Date().toISOString() }, null, 2),
        `blog: veille du ${dateLabel}`
      );
    }

    await postScoutProposals({ proposals, batchId, dateLabel });

    res.status(200).json({ ok: true, batchId, count: proposals.length });
  } catch (err) {
    console.error("scout-topics error:", err);
    res.status(500).json({ error: err.message || "Erreur inconnue." });
  }
};
