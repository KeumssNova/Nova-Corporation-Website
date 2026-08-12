/**
 * Génère sitemap.xml : pages statiques + tous les articles publiés. La
 * liste des articles est extraite de news.html (les cartes générées par
 * lib/news-card.js pointent toutes vers articles/<slug>.html) -- ça évite
 * un appel API GitHub supplémentaire pour lister le dossier articles/,
 * puisque news.html est de toute façon déjà lu/écrit à chaque publication.
 */
const STATIC_PAGES = [
  { path: "index.html", priority: "1.0", changefreq: "weekly" },
  { path: "news.html", priority: "0.9", changefreq: "daily" },
  { path: "projects.html", priority: "0.7", changefreq: "monthly" },
  { path: "services.html", priority: "0.5", changefreq: "monthly" },
  { path: "contact.html", priority: "0.3", changefreq: "yearly" },
];

function extractArticleSlugs(newsHtml) {
  const slugs = new Set();
  const re = /href="articles\/([a-z0-9-]+)\.html"/g;
  let m;
  while ((m = re.exec(newsHtml))) slugs.add(m[1]);
  return [...slugs];
}

function buildSitemap(newsHtml) {
  const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "");
  if (!siteUrl) throw new Error("SITE_URL manquant -- impossible de générer un sitemap avec des URLs absolues.");

  const today = new Date().toISOString().slice(0, 10);
  const slugs = extractArticleSlugs(newsHtml);

  const urls = [
    ...STATIC_PAGES.map((p) => ({ loc: `${siteUrl}/${p.path}`, priority: p.priority, changefreq: p.changefreq })),
    ...slugs.map((slug) => ({ loc: `${siteUrl}/articles/${slug}.html`, priority: "0.6", changefreq: "monthly" })),
  ];

  const body = urls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

module.exports = { buildSitemap };
