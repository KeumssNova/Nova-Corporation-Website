/**
 * Gabarit HTML déterministe des pages articles/*.html, calqué sur
 * articles/nova-corporation.html et articles/artistes-nova.html. Le
 * fragment généré par Gemini (déjà sanitisé, sans aucun attribut class) est
 * injecté tel quel dans <div class="article-body">, le style visuel
 * (tailles de titres, marges, listes) est appliqué via les règles
 * `.article-body h1/h2/p/ul` ajoutées dans assets/css/projets.css, pas par
 * l'IA elle-même.
 */
function buildArticlePage({ title, dateLabel, dateISO, imagePath, imageAlt, bodyHtml, seoDescription, slug, sources = [], heroHtml = "",
  datePublished = "", ariane = [], jsonLdExtra = [] }) {
  // datePublished : première publication de la page (une page mise à jour garde sa date d'origine) ; dateISO = dernière mise à jour.
  // ariane : [{nom, url}] entre "Actus" et la page (ex. l'agenda pour une page de ville).
  // jsonLdExtra : données structurées en plus (liste de titres, d'artistes, de concerts).
  // heroHtml : bloc libre (ex. la vidéo d'une édition du média) affiché à la place de l'image d'en-tête
  const heroImage = heroHtml
    ? `
      ${heroHtml}`
    : imagePath
    ? `\n      <img src="${imagePath}" alt="${escapeAttr(imageAlt || title)}" class="w-full h-auto rounded-lg mb-8 object-cover max-h-[420px]" />`
    : "";

  // sépare le <h1> (titre) du reste du contenu pour pouvoir intercaler la
  // date entre les deux, comme dans les articles existants.
  const h1Match = bodyHtml.match(/^\s*<h1>[\s\S]*?<\/h1>/i);
  const heading = h1Match ? h1Match[0].trim() : `<h1>${escapeHtml(title)}</h1>`;
  const rest = h1Match ? bodyHtml.slice(h1Match[0].length).trim() : bodyHtml.trim();

  const description = (seoDescription || "").trim();
  const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "");
  const pageUrl = siteUrl && slug ? `${siteUrl}/articles/${slug}.html` : "";
  const ogImageUrl = siteUrl && imagePath ? `${siteUrl}/${imagePath.replace(/^\.\.\//, "")}` : "";

  const metaDescription = description
    ? `\n    <meta name="description" content="${escapeAttr(description)}" />`
    : "";
  const canonical = pageUrl ? `\n    <link rel="canonical" href="${escapeAttr(pageUrl)}" />` : "";
  const openGraph = [
    ["og:type", "article"],
    ["og:site_name", "Nova Corporation"],
    ["og:title", title],
    description ? ["og:description", description] : null,
    pageUrl ? ["og:url", pageUrl] : null,
    ogImageUrl ? ["og:image", ogImageUrl] : null,
    ["og:locale", "fr_FR"],
  ]
    .filter(Boolean)
    .map(([prop, content]) => `    <meta property="${prop}" content="${escapeAttr(content)}" />`)
    .join("\n");
  const twitterCard = ogImageUrl
    ? `\n    <meta name="twitter:card" content="summary_large_image" />`
    : "";

  // JSON-LD Article : signal structuré pour les moteurs de recherche et
  // moteurs de réponse générative (AI Overviews, Perplexity, etc.) --
  // publisher/author = Nova Corporation (pas de byline individuelle, la
  // ligne éditoriale du pipeline). `citation` reprend les sources de
  // recherche Google retournées par Gemini (grounding), mêmes que celles
  // affichées en bas de page.
  const logoUrl = siteUrl ? `${siteUrl}/assets/images/nova-logo-blanc-fond-noir.png` : "";
  const jsonLd = pageUrl
    ? {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: title,
        description: description || undefined,
        image: ogImageUrl ? [ogImageUrl] : undefined,
        datePublished: datePublished || dateISO,
        dateModified: dateISO,
        author: { "@type": "Organization", name: "Nova Corporation", url: siteUrl || undefined },
        publisher: {
          "@type": "Organization",
          name: "Nova Corporation",
          logo: logoUrl ? { "@type": "ImageObject", url: logoUrl } : undefined,
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
        citation: sources.length ? sources.map((s) => s.uri) : undefined,
      }
    : null;
  // fil d'Ariane : Accueil > Actus > (parents) > page
  const ariadne = pageUrl
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { name: "Accueil", url: `${siteUrl}/` },
          { name: "Actus", url: `${siteUrl}/actus` },
          ...ariane.map((x) => ({ name: x.nom, url: `${siteUrl}/${x.url}` })),
          { name: title, url: pageUrl },
        ].map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.name, item: x.url })),
      }
    : null;
  const jsonLdScript = [jsonLd, ariadne, ...jsonLdExtra]
    .filter(Boolean)
    .map((j) => `\n    <script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`)
    .join("");

  const sourcesBlock = sources.length
    ? `\n      <div class="mt-10 pt-6 border-t border-white/10 text-sm text-gray-400">
        <p class="font-semibold text-gray-300 mb-2">Sources</p>
        <ul class="list-disc list-inside space-y-1">
${sources
  .map(
    (s) =>
      `          <li><a href="${escapeAttr(s.uri)}" target="_blank" rel="noopener noreferrer nofollow" class="underline hover:text-white">${escapeHtml(s.title || s.uri)}</a></li>`
  )
  .join("\n")}
        </ul>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr" class="bg-black text-white font-[Cousine]">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <!-- Sans cette balise, Google n'affiche qu'une vignette reduite de l'image : la grande image des
         cartes de Google Discover et des resultats de recherche demande max-image-preview:large.
         Google a publie une etude de cas la-dessus (hausse du taux de clic et des visites) :
         https://developers.google.com/search/case-studies/large-images-case-study
         Les trois valeurs possibles sont none, standard et large. -->
    <meta name="robots" content="max-image-preview:large" />
    <title>${escapeHtml(title)} - Nova Corporation</title>${metaDescription}${canonical}
${openGraph}${twitterCard}${jsonLdScript}
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="stylesheet" href="../assets/css/output.css" />
    <link rel="stylesheet" href="../assets/css/style.css" />
    <link rel="stylesheet" href="../assets/css/navbar.css" />
    <link rel="stylesheet" href="../assets/css/projets.css" />
    <link rel="stylesheet" href="../assets/css/media.css" />
    <meta name="theme-color" content="#050506" />
    <link rel="preconnect" href="https://i.ytimg.com" />
    <link rel="preload" href="../assets/fonts/Cousine-Regular.woff2" as="font" type="font/woff2" crossorigin />
  </head>

  <body class="bg-black text-white">
    <a class="nv-evitement" href="#contenu">Aller au contenu</a>
    <div id="header-container"></div>

    <main class="max-w-3xl mx-auto px-6 py-12" id="contenu">
      <div class="article-body">
        ${heading}
      </div>
      <p class="text-sm text-gray-400 mb-6">Publié le ${escapeHtml(dateLabel)}</p>${heroImage}
      <div class="article-body">
${indent(rest, 8)}
      </div>${sourcesBlock}
    </main>

    <div id="footer-container" class="w-full px-4"></div>
    <script type="module" src="../assets/js/main.js"></script>
    <script type="module" src="../assets/js/actus.js"></script>
  </body>
</html>
`;
}

function indent(html, spaces) {
  const pad = " ".repeat(spaces);
  return html
    .split("\n")
    .map((line) => (line.trim() ? pad + line : line))
    .join("\n");
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str);
}

module.exports = { buildArticlePage };
