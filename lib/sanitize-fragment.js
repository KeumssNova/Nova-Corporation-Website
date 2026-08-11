/**
 * Sanitisation défensive du fragment HTML renvoyé par Gemini avant qu'il
 * n'atterrisse dans une page publiée sur le site. Le prompt (voir
 * prompts/article-generation.md) interdit déjà class=/style=/scripts, mais
 * on ne fait jamais confiance à une sortie de LLM par défaut -- le texte
 * source fourni en entrée pourrait contenir une tentative d'injection de
 * prompt visant à faire produire du HTML malveillant.
 *
 * Approche : allowlist de balises (h1, h2, p, ul, li, strong, em, b, i, a),
 * tout le reste est retiré. Les balises dangereuses (script, style, iframe,
 * object, embed) sont supprimées avec leur contenu ; les autres balises non
 * autorisées sont "dépouillées" (on garde le texte, on retire juste la
 * balise) pour ne pas perdre du contenu à cause d'un tag imprévu.
 */

const DANGEROUS_TAGS = ["script", "style", "iframe", "object", "embed", "form", "link", "meta"];
const ALLOWED_TAGS = new Set(["h1", "h2", "p", "ul", "li", "strong", "em", "b", "i", "a"]);
const TRACKING_PARAMS = /^(utm_|si$|fbclid$|gclid$|igshid$)/i;

function stripTrackingParams(href) {
  try {
    const url = new URL(href);
    [...url.searchParams.keys()].forEach((key) => {
      if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
    });
    return url.toString();
  } catch {
    return null; // href invalide, on la rejette
  }
}

function sanitizeFragment(html) {
  let out = html;

  // retire les commentaires HTML
  out = out.replace(/<!--[\s\S]*?-->/g, "");

  // retire les balises dangereuses avec leur contenu
  for (const tag of DANGEROUS_TAGS) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    out = out.replace(re, "");
    // variante auto-fermante (ex: <link ... />)
    out = out.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");
  }

  // traite chaque balise ouvrante/fermante restante
  out = out.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, rawTag, attrs) => {
    const tag = rawTag.toLowerCase();
    const isClosing = match.startsWith("</");

    if (!ALLOWED_TAGS.has(tag)) return ""; // balise non permise : on la retire (contenu conservé)

    if (isClosing) return `</${tag}>`;

    if (tag === "a") {
      const hrefMatch = attrs.match(/href\s*=\s*"([^"]*)"/i) || attrs.match(/href\s*=\s*'([^']*)'/i);
      const rawHref = hrefMatch ? hrefMatch[1] : "";
      if (!/^https?:\/\//i.test(rawHref)) return "<span>"; // pas de javascript:, data:, lien interne suspect...
      const cleanHref = stripTrackingParams(rawHref);
      if (!cleanHref) return "<span>";
      return `<a href="${cleanHref.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer">`;
    }

    // toute autre balise autorisée : on retire tous les attributs (pas de class/style/on*)
    return `<${tag}>`;
  });

  // si on a remplacé un <a> par <span> (lien rejeté), on doit fermer par </span> aussi
  // -- plus simple : neutralise toute fermeture </a> orpheline en </span> via un compteur
  out = closeOrphanSpans(out);

  return out.trim();
}

function closeOrphanSpans(html) {
  // apparie les <span> injectés (liens rejetés) avec les </a> qui suivaient
  // le <a> d'origine, pour garder un HTML valide.
  const parts = [];
  let depth = 0;
  let i = 0;
  while (i < html.length) {
    if (html.startsWith("<span>", i)) {
      depth++;
      parts.push("<span>");
      i += 6;
    } else if (html.startsWith("</a>", i) && depth > 0) {
      depth--;
      parts.push("</span>");
      i += 4;
    } else {
      parts.push(html[i]);
      i++;
    }
  }
  return parts.join("");
}

module.exports = { sanitizeFragment };
