const sharp = require("sharp");
const { readFile, writeFile, deleteFile } = require("./github-app");
const { fetchLatestImageAttachment, updateDraftMessage } = require("./discord");
const { buildArticlePage } = require("./article-template");
const { insertCard } = require("./news-card");
const { buildSitemap } = require("./sitemap");

function todayLabel(date) {
  return date.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
}

/** Publie un brouillon validé : commit image + article + mise à jour news.html. */
async function publishDraft(draftId) {
  const draftFile = await readFile(`_drafts/${draftId}.json`);
  if (!draftFile) throw new Error(`Brouillon ${draftId} introuvable (déjà publié/rejeté ?).`);
  const draft = JSON.parse(draftFile.content);

  const { threadId, channelId, messageId } = draft.discord || {};
  if (!threadId) throw new Error("Brouillon sans thread Discord associé.");

  const attachment = await fetchLatestImageAttachment(threadId);
  if (!attachment) {
    throw new Error("Aucune image trouvée dans le thread : dépose l'image avant de publier.");
  }

  const imgRes = await fetch(attachment.url);
  if (!imgRes.ok) throw new Error(`Téléchargement de l'image échoué (${imgRes.status}).`);
  const rawBuffer = Buffer.from(await imgRes.arrayBuffer());
  const sourceExt = (attachment.filename.split(".").pop() || "jpg").toLowerCase();

  // Conversion WebP systematique (sauf si deja WebP) pour ne pas gonfler le
  // stockage du repo, ~25-40% plus leger qu'un PNG/JPEG a qualite visuelle
  // equivalente. En cas d'echec de conversion (image corrompue, format
  // exotique...), on publie quand meme avec le fichier d'origine plutot que
  // de bloquer toute la publication.
  let imgBuffer = rawBuffer;
  let ext = sourceExt;
  if (sourceExt !== "webp") {
    try {
      imgBuffer = await sharp(rawBuffer).webp({ quality: 82 }).toBuffer();
      ext = "webp";
    } catch (err) {
      console.error("Conversion WebP échouée, image publiée au format d'origine :", err.message);
    }
  }

  const imageRepoPath = `assets/images/articles/${draft.slug}.${ext}`;
  const imagePathFromArticles = `../${imageRepoPath}`; // articles/*.html est dans un sous-dossier
  const imagePathFromNews = imageRepoPath; // news.html est à la racine

  await writeFile(imageRepoPath, imgBuffer.toString("base64"), `blog: image "${draft.title}"`, {
    contentBase64: true,
  });

  const now = new Date();
  const dateLabel = todayLabel(now);
  const articleHtml = buildArticlePage({
    title: draft.title,
    dateLabel,
    dateISO: now.toISOString(),
    imagePath: imagePathFromArticles,
    imageAlt: draft.caption || draft.title,
    bodyHtml: draft.html,
    seoDescription: draft.seoDescription,
    slug: draft.slug,
    sources: draft.sources || [],
  });
  await writeFile(`articles/${draft.slug}.html`, articleHtml, `blog: publication "${draft.title}"`);

  const newsFile = await readFile("news.html");
  if (!newsFile) throw new Error("news.html introuvable dans le repo.");
  const updatedNews = insertCard(newsFile.content, {
    title: draft.title,
    summary: "",
    dateLabel,
    slug: draft.slug,
    imagePath: imagePathFromNews,
  });
  await writeFile("news.html", updatedNews, `blog: ajout de la carte "${draft.title}" dans les actus`);

  // Sitemap regenere a chaque publication, non bloquant : l'article et sa
  // carte sont deja committes a ce stade, pas la peine de faire echouer
  // toute la publication pour ca.
  try {
    const sitemapXml = buildSitemap(updatedNews);
    await writeFile("sitemap.xml", sitemapXml, "blog: mise à jour du sitemap");
  } catch (err) {
    console.error("Mise à jour du sitemap échouée (article publié quand même) :", err.message);
  }

  await deleteFile(`_drafts/${draftId}.json`, `blog: nettoyage brouillon "${draft.title}"`);

  if (channelId && messageId) {
    const siteUrl = (process.env.SITE_URL || "").replace(/\/$/, "");
    const link = siteUrl ? ` : [voir l'article](${siteUrl}/articles/${draft.slug}.html)` : "";
    await updateDraftMessage(channelId, messageId, {
      statusLine: `✅ **Publié**${link} (le redeploy Vercel peut prendre 1-2 min)`,
      color: 0x2ecc71,
    });
  }

  return { slug: draft.slug, articlePath: `articles/${draft.slug}.html` };
}

/** Rejette un brouillon : supprime le fichier _drafts/, met à jour Discord. */
async function rejectDraft(draftId) {
  const draftFile = await readFile(`_drafts/${draftId}.json`);
  if (!draftFile) return; // déjà traité
  const draft = JSON.parse(draftFile.content);

  await deleteFile(`_drafts/${draftId}.json`, `blog: rejet brouillon "${draft.title}"`);

  const { channelId, messageId } = draft.discord || {};
  if (channelId && messageId) {
    await updateDraftMessage(channelId, messageId, {
      statusLine: "❌ **Rejeté**",
      color: 0x808080,
    });
  }
}

module.exports = { publishDraft, rejectDraft };
