const { generateAndDraftArticle } = require("../lib/generate");

function checkAuth(req) {
  const expected = process.env.PUBLISH_SECRET;
  if (!expected) throw new Error("PUBLISH_SECRET non configuré côté serveur.");
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  return token === expected;
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
    const result = await generateAndDraftArticle({ topic, rawText });
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error("generate-article error:", err);
    if (err.problems) {
      res.status(422).json({ error: err.message, problems: err.problems });
      return;
    }
    res.status(500).json({ error: err.message || "Erreur inconnue." });
  }
};
