// Page Actus et pages d'articles du média : vidéos qui jouent quand on les voit, concerts de la semaine.
// ---------- sons : clips YouTube des titres ----------
// Seule la miniature est affichée ; le lecteur YouTube (domaine sans cookie) n'est chargé qu'au clic.
function iframe(id, titre) {
  const f = document.createElement("iframe");
  f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  f.title = titre || "Lecteur YouTube";
  f.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  f.allowFullscreen = true;
  f.loading = "lazy";
  return f;
}

function lireClip(cadre) {
  if (cadre.querySelector("iframe")) return;
  const bouton = cadre.querySelector(".nv-clip__lire");
  cadre.appendChild(iframe(cadre.dataset.yt, bouton ? bouton.getAttribute("aria-label") : ""));
  if (bouton) bouton.remove();
}

function cadreClip(id, libelle) {
  const c = document.createElement("div");
  c.className = "nv-clip";
  c.dataset.yt = id;
  c.appendChild(iframe(id, libelle));
  return c;
}

export function initSons(racine = document) {
  racine.addEventListener("click", (e) => {
    const lire = e.target.closest(".nv-clip__lire");
    if (lire) {
      lireClip(lire.closest(".nv-clip"));
      return;
    }
    const ecouter = e.target.closest(".nv-ecouter");
    if (!ecouter) return;
    // le lecteur s'ouvre sous la ligne ; un seul ouvert à la fois
    const ligne = ecouter.closest("li");
    const ouvert = ligne.nextElementSibling && ligne.nextElementSibling.classList.contains("nv-rang__lecteur");
    document.querySelectorAll(".nv-rang__lecteur").forEach((l) => l.remove());
    document.querySelectorAll('.nv-ecouter[aria-expanded="true"]').forEach((b) => b.setAttribute("aria-expanded", "false"));
    if (ouvert) return;
    const li = document.createElement("li");
    li.className = "nv-rang__lecteur";
    li.appendChild(cadreClip(ecouter.dataset.yt, ecouter.getAttribute("aria-label")));
    ligne.after(li);
    ecouter.setAttribute("aria-expanded", "true");
  });
}

// ---------- concerts de la semaine ----------
const fmtMois = new Intl.DateTimeFormat("fr-FR", { month: "short" });
const fmtJour = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });

function echappe(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function carteConcert(c) {
  const d = new Date(c.d + "T12:00:00");
  const img = c.i ? `<img src="${echappe(c.i)}" alt="" loading="lazy" decoding="async" />` : "";
  return `<a class="nv-concert" href="${echappe(c.u || "#")}" target="_blank" rel="noopener nofollow">
    <div class="nv-concert__img">${img}</div>
    <div class="nv-concert__corps">
      <div class="nv-date"><b>${d.getDate()}</b><span>${fmtMois.format(d)}</span></div>
      <div><strong>${echappe(c.a)}</strong><small>${fmtJour.format(d)} ${c.h ? c.h.replace(":", "h") : ""} · ${echappe(c.s)}, ${echappe(c.v)}</small></div>
    </div>
  </a>`;
}

async function initConcertsSemaine() {
  const zone = document.getElementById("nv-concerts-semaine");
  if (!zone) return;
  try {
    const r = await fetch(zone.dataset.src, { cache: "no-cache" });
    if (!r.ok) throw new Error(r.status);
    const data = await r.json();
    const auj = new Date();
    const debut = iso(auj);
    let fin = iso(new Date(auj.getTime() + 7 * 864e5));
    let liste = data.concerts.filter((c) => c.d >= debut && c.d <= fin);
    if (liste.length < 4) {
      // semaine creuse : on montre les deux prochaines semaines
      fin = iso(new Date(auj.getTime() + 14 * 864e5));
      liste = data.concerts.filter((c) => c.d >= debut && c.d <= fin);
      const titre = document.getElementById("titre-concerts");
      if (titre) titre.textContent = "Concerts à venir";
    }
    // les rappeurs suivis par Nova d'abord, un concert par artiste, dans l'ordre des dates
    const vus = new Set();
    liste = liste
      .sort((a, b) => (b.f || 0) - (a.f || 0) || a.d.localeCompare(b.d))
      .filter((c) => (vus.has(c.a) ? false : vus.add(c.a)))
      .slice(0, 12)
      .sort((a, b) => a.d.localeCompare(b.d));
    zone.setAttribute("aria-busy", "false");
    zone.innerHTML = liste.length
      ? liste.map(carteConcert).join("")
      : `<p class="nv-vide">Aucun concert annoncé ces deux prochaines semaines. <a href="articles/agenda-concerts-rap.html">Voir tout l'agenda</a>.</p>`;
  } catch (e) {
    zone.setAttribute("aria-busy", "false");
    zone.innerHTML = `<p class="nv-vide">Les concerts n'ont pas pu être chargés. <a href="articles/agenda-concerts-rap.html">Ouvrir l'agenda</a>.</p>`;
  }
}

initSons();
initConcertsSemaine();

/**
 * « Voir plus » du fil d'actus.
 *
 * Un bouton plutôt qu'un défilement infini : pour une collection petite ou moyenne, c'est la
 * recommandation du Nielsen Norman Group, et surtout le pied de page reste atteignable, ce que le
 * défilement infini interdit.
 *
 * Les cartes au-delà du premier lot sont **dans la page** et cachées par ce script : sans
 * JavaScript tout s'affiche, et rien n'est soustrait aux moteurs de recherche. L'inverse, les
 * charger au clic, rendrait le fil invisible tant que personne ne clique.
 */
const PAS = 6;

function initVoirPlus() {
  const fil = document.getElementById("nv-fil");
  const bouton = document.getElementById("nv-fil-plus");
  if (!fil || !bouton) return;

  const cartes = Array.from(fil.querySelectorAll(".nv-carte"));
  if (cartes.length <= PAS) return; // rien à cacher, le bouton reste absent

  let montrees = PAS;
  const appliquer = () => {
    cartes.forEach((c, i) => c.classList.toggle("nv-carte--masquee", i >= montrees));
    const reste = cartes.length - montrees;
    bouton.hidden = reste <= 0;
    bouton.textContent = reste > 0 ? `Voir plus d'articles (${reste})` : "";
  };

  bouton.addEventListener("click", () => {
    const premiere = montrees; // la première carte qui va apparaître
    montrees = Math.min(montrees + PAS, cartes.length);
    appliquer();
    // Le clavier et les lecteurs d'écran atterrissent sur ce qui vient d'apparaître, et non au
    // début du fil : sans ça, le bouton semble n'avoir rien fait.
    const cible = cartes[premiere];
    if (cible) {
      cible.setAttribute("tabindex", "-1");
      cible.focus({ preventScroll: true });
      cible.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });

  appliquer();
}

initVoirPlus();
