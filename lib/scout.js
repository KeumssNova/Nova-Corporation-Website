const fs = require("fs");
const path = require("path");

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function loadSystemPrompt() {
  return fs.readFileSync(path.join(process.cwd(), "prompts", "topic-scouting.md"), "utf8");
}

/**
 * Parse la reponse en blocs "SUJET: ... / PITCH: ..." separes par une ligne
 * vide. Tolerant : ignore les blocs incomplets plutot que d'echouer sur
 * toute la reponse.
 */
function parseProposals(text) {
  const cleaned = text.trim().replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const blocks = cleaned.split(/\n\s*\n/);
  const proposals = [];

  for (const block of blocks) {
    const sujetMatch = block.match(/SUJET\s*:\s*([\s\S]*?)(?=\n\s*PITCH\s*:|$)/i);
    const pitchMatch = block.match(/PITCH\s*:\s*([\s\S]*)/i);
    const topic = sujetMatch?.[1]?.trim();
    const pitch = pitchMatch?.[1]?.trim();
    if (topic && pitch) proposals.push({ topic, pitch });
  }

  return proposals;
}

/** Interroge Gemini (recherche Google activee) pour 2-3 pistes d'articles recentes. */
async function scoutTopics() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante.");

  const systemPrompt = loadSystemPrompt();
  const todayLabel = new Date().toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: `Nous sommes le ${todayLabel}. Fais la veille du jour.` }] }],
    tools: [{ google_search: {} }],
  };

  const res = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Appel Gemini (veille) échoué (${res.status}) : ${errText.slice(0, 500)}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text) throw new Error("Réponse Gemini vide (veille).");

  return parseProposals(text);
}

module.exports = { scoutTopics, parseProposals };
