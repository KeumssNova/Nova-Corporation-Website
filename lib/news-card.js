/**
 * Page Actus (news.html) : sections générées automatiquement.
 *
 * Le média Nova (outils de nova-brain, publiés par GitHub Actions) tient à jour assets/data/actus.json :
 * une entrée par rendez-vous (top 10, certifs, rookies, concerts) avec son image, sa vidéo et sa dernière accroche.
 * renderActus() réécrit à partir de ce fichier les blocs placés entre les marqueurs
 *   <!-- AUTO:une -->, <!-- AUTO:videos -->, <!-- AUTO:editions -->  ...  <!-- /AUTO:xxx -->
 * Le reste de la page (en-tête, concerts de la semaine, présentation de la Nova) est écrit à la main.
 *
 * insertCard() reste disponible pour l'ancien pipeline d'articles (api/) : il ajoute une carte
 * dans le bloc "Autres articles" (<!-- AUTO:autres -->).
 */

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const escapeAttr = escapeHtml;

function remplaceBloc(html, nom, contenu) {
  const debut = `<!-- AUTO:${nom} -->`;
  const fin = `<!-- /AUTO:${nom} -->`;
  const i = html.indexOf(debut);
  const j = html.indexOf(fin);
  if (i < 0 || j < i) throw new Error(`Marqueur ${debut} introuvable dans news.html`);
  return html.slice(0, i + debut.length) + "\n" + contenu + "\n" + html.slice(j);
}

function trie(manifest) {
  return Object.entries(manifest.rubriques || {})
    .map(([slug, r]) => ({ slug, ...r }))
    .sort((a, b) => (a.ordre || 99) - (b.ordre || 99));
}

function carteUne(r, i) {
  // la première carte est la plus grande : son image est chargée tout de suite
  const chargement = i === 0 ? 'fetchpriority="high"' : 'loading="lazy"';
  return `          <a class="nv-carte" href="articles/${r.slug}.html">
            <img src="${escapeAttr(r.image)}" alt="" width="1200" height="1200" ${chargement} decoding="async" />
            <div class="nv-carte__texte">
              <span class="nv-carte__rubrique">${escapeHtml(r.rubrique)}</span>
              <h3>${escapeHtml(r.titre)}</h3>
              <p>${escapeHtml(r.accroche || "")}</p>
              <time datetime="${escapeAttr(r.dateISO || "")}">${escapeHtml(r.date || "")}</time>
            </div>
          </a>`;
}

function figureSon(r) {
  const id = escapeAttr(r.clip.id);
  return `          <figure class="nv-son">
            <div class="nv-clip" data-yt="${id}">
              <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" width="480" height="360" loading="lazy" decoding="async" />
              <button type="button" class="nv-clip__lire" aria-label="Lire ${escapeAttr(r.clip.libelle)}">Lire le son</button>
            </div>
            <figcaption>${escapeHtml(r.clip.libelle)}<span><a href="articles/${r.slug}.html">${escapeHtml(r.titre)}</a></span></figcaption>
          </figure>`;
}

// "Top 10 rap FR de la semaine du 1er octobre 2026" devient "Semaine du 1er octobre 2026", etc.
function libelleCourt(titre) {
  const t = titre
    .replace(/^Top 10 rap FR de la semaine du /i, "Semaine du ")
    .replace(/^Certifications rap FR de /i, "")
    .replace(/^Nouveaux rappeurs à suivre : la sélection du /i, "Sélection du ")
    .replace(/^Concerts rap (à|en) (.*?) : l'agenda$/i, "$2")
    .replace(/^Paris et en Île-de-France$/, "Paris et Île-de-France");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function blocEditions(r, pages) {
  const liste = (pages[r.slug] || []).slice(0, 12);
  if (!liste.length) return "";
  return `          <div>
            <h3><a href="articles/${r.slug}.html">${escapeHtml(r.titre)}</a></h3>
            <ul>
${liste.map((p) => `              <li><a href="articles/${p.f}">${escapeHtml(libelleCourt(p.titre))}</a></li>`).join("\n")}
            </ul>
          </div>`;
}

/**
 * manifest : contenu de assets/data/actus.json
 * pages : { slugDeLaRubrique: [{ f: "fichier.html", titre: "..." }, ...] } (éditions ou pages par ville, de la plus récente à la plus ancienne)
 */
function renderActus(newsHtml, manifest, pages = {}) {
  const rubriques = trie(manifest);
  let html = newsHtml;
  // l'image de la première carte est le plus gros élément affiché : préchargée dès l'en-tête
  if (html.includes("<!-- AUTO:preload -->") && rubriques[0]) {
    html = remplaceBloc(html, "preload", `    <link rel="preload" as="image" href="${escapeAttr(rubriques[0].image)}" fetchpriority="high" />`);
  }
  html = remplaceBloc(html, "une", rubriques.map(carteUne).join("\n"));
  html = remplaceBloc(html, "videos", rubriques.filter((r) => r.clip).map(figureSon).join("\n"));
  html = remplaceBloc(html, "editions", rubriques.map((r) => blocEditions(r, pages)).filter(Boolean).join("\n"));
  return html;
}

// ---------- compatibilité avec l'ancien pipeline (api/) ----------
function buildCard({ title, dateLabel, slug, imagePath }) {
  return `          <a class="nv-carte" href="articles/${slug}.html">
            <img src="${escapeAttr(imagePath)}" alt="" loading="lazy" decoding="async" />
            <div class="nv-carte__texte">
              <h3>${escapeHtml(title)}</h3>
              <time>${escapeHtml(dateLabel)}</time>
            </div>
          </a>`;
}

function insertCard(newsHtml, cardData) {
  const debut = "<!-- AUTO:autres -->";
  if (!newsHtml.includes(debut)) {
    throw new Error("Marqueur <!-- AUTO:autres --> introuvable dans news.html. Insertion annulée.");
  }
  return newsHtml.replace(debut, `${debut}\n${buildCard(cardData)}`);
}

module.exports = { renderActus, insertCard, buildCard };
