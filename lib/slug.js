/**
 * Transforme un titre en slug ascii kebab-case, cohérent avec les noms de
 * fichiers déjà présents dans articles/ (nova-corporation.html, ...).
 */
function slugify(title) {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // accents (diacritiques combinants)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/-$/, "");
}

module.exports = { slugify };
