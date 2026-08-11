/**
 * Insère une carte pour le nouvel article dans la section "Toutes les news"
 * de news.html (grille md:grid-cols-3), en première position.
 */
const ANCHOR =
  '<h2 class="text-3xl font-bold">Toutes les news</h2>\n          <div class="grid md:grid-cols-3 gap-6">';

function buildCard({ title, summary, dateLabel, slug, imagePath }) {
  return `
            <!-- Article généré automatiquement -->
            <article class="relative h-64 rounded-lg overflow-hidden shadow-lg opacity-100 hover:opacity-75 transition-opacity duration-300">
              <img
                src="${imagePath}"
                alt="${escapeAttr(title)}"
                class="absolute inset-0 w-full h-full object-cover"
              />
              <div class="absolute inset-0 bg-black/50"></div>
              <div class="relative z-10 h-full flex items-end p-4">
                <div>
                  <h3 class="text-xl font-semibold text-white">
                    ${escapeHtml(title)}
                  </h3>
                  <p class="text-sm text-gray-300">${escapeHtml(dateLabel)}</p>
                  <a
                    href="articles/${slug}.html"
                    class="text-sm underline text-white hover:text-gray-300"
                    >Voir plus</a
                  >
                </div>
              </div>
            </article>`;
}

function insertCard(newsHtml, cardData) {
  if (!newsHtml.includes(ANCHOR)) {
    throw new Error(
      "Ancre introuvable dans news.html (section 'Toutes les news' modifiée ?) -- insertion annulée."
    );
  }
  const card = buildCard(cardData);
  return newsHtml.replace(ANCHOR, `${ANCHOR}${card}`);
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function escapeAttr(str) {
  return escapeHtml(str);
}

module.exports = { insertCard, buildCard };
