const fs = require("fs");
const path = require("path");

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function loadSystemPrompt() {
  const p = path.join(process.cwd(), "prompts", "article-generation.md");
  return fs.readFileSync(p, "utf8");
}

/**
 * Découpe la réponse brute de Gemini en { html, imagePrompt, caption }.
 * Le modèle répond : fragment HTML, puis "PROMPT_IMAGE: ...", puis
 * "CAPTION_TEXT: ...". Tolère un éventuel fencing ```html ... ```.
 */
function parseModelOutput(text) {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:html)?\s*/i, "").replace(/```\s*$/i, "");

  const imgIdx = cleaned.search(/PROMPT_IMAGE\s*:/i);
  const capIdx = cleaned.search(/CAPTION_TEXT\s*:/i);

  if (imgIdx === -1 || capIdx === -1 || capIdx < imgIdx) {
    throw new Error(
      "Réponse Gemini malformée : PROMPT_IMAGE / CAPTION_TEXT introuvables ou dans le mauvais ordre."
    );
  }

  const html = cleaned.slice(0, imgIdx).trim();
  const imagePrompt = cleaned
    .slice(imgIdx, capIdx)
    .replace(/PROMPT_IMAGE\s*:/i, "")
    .trim();
  const caption = cleaned
    .slice(capIdx)
    .replace(/CAPTION_TEXT\s*:/i, "")
    .trim();

  return { html, imagePrompt, caption };
}

function extractGroundingSources(candidate) {
  const chunks = candidate?.groundingMetadata?.groundingChunks || [];
  return chunks
    .map((c) => c.web && { uri: c.web.uri, title: c.web.title })
    .filter(Boolean);
}

/**
 * Génère un article via l'API Gemini avec recherche Google (grounding)
 * activée. `topic` = sujet/titre, `rawText` = notes/texte brut à transformer.
 */
async function generateArticle({ topic, rawText }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante.");

  const systemPrompt = loadSystemPrompt();
  const userContent = [
    `Sujet de l'article : ${topic}`,
    rawText ? `\nTexte brut / notes à transformer en article :\n${rawText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    tools: [{ google_search: {} }],
  };

  const res = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Appel Gemini échoué (${res.status}) : ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text) throw new Error("Réponse Gemini vide.");

  const { html, imagePrompt, caption } = parseModelOutput(text);
  const sources = extractGroundingSources(candidate);

  return { html, imagePrompt, caption, sources };
}

module.exports = { generateArticle };
