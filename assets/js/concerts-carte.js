// Agenda des concerts rap : carte interactive de la France (une étoile par ville) + filtres + liste.
// Données : assets/data/concerts.json (écrit chaque semaine par l'outil concerts de nova-brain)
// Contour de la France : assets/data/france.json (Natural Earth, domaine public).
// Sans JavaScript, la page garde sa liste "Cette semaine" et ses liens vers les pages par ville.

const fmtMois = new Intl.DateTimeFormat("fr-FR", { month: "short" });
const fmtJour = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const PAR_PAGE = 20;
const TAILLE = 600;
const LON = [-5.2, 9.7];
const LAT = [41.3, 51.15];
const COS = Math.cos((46.5 * Math.PI) / 180);
const NS = "http://www.w3.org/2000/svg";

const echappe = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const nomVille = (z) => z.replace(" et Île-de-France", "");

function proj(lon, lat) {
  const lx = (LON[1] - LON[0]) * COS;
  const ly = LAT[1] - LAT[0];
  const k = (TAILLE - 40) / Math.max(lx, ly);
  const ox = (TAILLE - lx * k) / 2;
  const oy = (TAILLE - ly * k) / 2;
  return [ox + (lon - LON[0]) * COS * k, oy + (LAT[1] - lat) * k];
}

function el(nom, attrs = {}, parent) {
  const n = document.createElementNS(NS, nom);
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
  if (parent) parent.appendChild(n);
  return n;
}

function ligne(c) {
  const d = new Date(c.d + "T12:00:00");
  const img = c.i ? `<img src="${echappe(c.i)}" alt="" loading="lazy" decoding="async" />` : "";
  const billets = c.u ? `<a class="nv-billets" href="${echappe(c.u)}" target="_blank" rel="noopener nofollow">Billets</a>` : "<span></span>";
  const report = c.r ? " · reporté" : "";
  return `<li>
    <div class="nv-date"><b>${d.getDate()}</b><span>${fmtMois.format(d)}</span></div>
    <div class="nv-liste-concerts__img">${img}</div>
    <div><strong>${echappe(c.a)}</strong><small>${fmtJour.format(d)}${c.h ? " " + c.h.replace(":", "h") : ""} · ${echappe(c.s)}, ${echappe(c.v)}${report}</small></div>
    ${billets}
  </li>`;
}

async function init() {
  const racine = document.getElementById("nv-agenda");
  if (!racine) return;
  const [data, contour] = await Promise.all([
    fetch(racine.dataset.src, { cache: "no-cache" }).then((r) => r.json()),
    fetch(racine.dataset.contour).then((r) => r.json()),
  ]).catch(() => [null, null]);
  if (!data) return; // la liste écrite dans la page reste affichée

  const auj = iso(new Date());
  const concerts = data.concerts.filter((c) => c.d >= auj);
  // l'état des filtres vit dans l'adresse : une recherche ou une ville se partage par lien
  const params = new URLSearchParams(location.search);
  const etat = {
    periode: ["semaine", "mois", "tout"].includes(params.get("periode")) ? params.get("periode") : "mois",
    ville: params.get("ville") || null,
    q: norm(params.get("q") || ""),
    limite: PAR_PAGE,
  };
  function majAdresse() {
    const p = new URLSearchParams();
    if (etat.periode !== "mois") p.set("periode", etat.periode);
    if (etat.ville) p.set("ville", etat.ville);
    if (recherche.value.trim()) p.set("q", recherche.value.trim());
    history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : ""));
  }

  // villes : position moyenne des salles, nombre de concerts à venir
  const villes = new Map();
  concerts.forEach((c) => {
    if (c.lon == null) return;
    const v = villes.get(c.z) || { nom: c.z, n: 0, lon: 0, lat: 0 };
    v.n += 1;
    v.lon += c.lon;
    v.lat += c.lat;
    villes.set(c.z, v);
  });
  const listeVilles = [...villes.values()].map((v) => ({ ...v, lon: v.lon / v.n, lat: v.lat / v.n })).sort((a, b) => b.n - a.n);
  const max = listeVilles[0]?.n || 1;

  // ---------- carte ----------
  const svg = racine.querySelector("svg");
  svg.setAttribute("viewBox", `0 0 ${TAILLE} ${TAILLE}`);
  svg.innerHTML = "";
  const fond = el("g", { "aria-hidden": "true" }, svg);
  contour.forEach((anneau) => {
    const d = "M" + anneau.map(([lo, la]) => proj(lo, la).map((x) => x.toFixed(1)).join(" ")).join(" L") + " Z";
    el("path", { d, fill: "none", stroke: "#8a8a93", "stroke-width": "2.2", "stroke-dasharray": "0.1 7", "stroke-linecap": "round" }, fond);
  });
  const groupe = el("g", {}, svg);
  const noeuds = new Map();
  // les grosses villes en dernier, pour qu'elles passent au-dessus
  [...listeVilles].reverse().forEach((v) => {
    const [x, y] = proj(v.lon, v.lat);
    const r = 3.5 + 11 * Math.sqrt(v.n / max);
    const g = el("g", { class: "nv-ville", tabindex: "0", role: "button", "aria-label": `${nomVille(v.nom)} : ${v.n} concert${v.n > 1 ? "s" : ""}` }, groupe);
    el("circle", { class: "nv-ville__halo", cx: x, cy: y, r: Math.max(16, r * 2.2) }, g);
    el("circle", { class: "nv-ville__point", cx: x, cy: y, r }, g);
    if (v.n >= 12) {
      const t = el("text", { x: x + r + 6, y: y + 4 }, g);
      t.textContent = nomVille(v.nom);
    }
    const choisir = () => choisirVille(etat.ville === v.nom ? null : v.nom);
    g.addEventListener("click", choisir);
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        choisir();
      }
    });
    noeuds.set(v.nom, g);
  });

  // ---------- filtres ----------
  const recherche = racine.querySelector("input[type=search]");
  const groupePeriode = racine.querySelector("[data-filtre=periode]");
  const groupeVilles = racine.querySelector("[data-filtre=villes]");
  const resultat = racine.querySelector(".nv-resultat");
  const liste = racine.querySelector(".nv-liste-concerts");
  const plus = racine.querySelector(".nv-plus");

  groupeVilles.innerHTML =
    `<button type="button" class="nv-pastille" data-ville="" aria-pressed="true">Toutes les villes</button>` +
    listeVilles
      .slice(0, 14)
      .map((v) => `<button type="button" class="nv-pastille" data-ville="${echappe(v.nom)}" aria-pressed="false">${echappe(nomVille(v.nom))} (${v.n})</button>`)
      .join("");

  function choisirVille(nom) {
    etat.ville = nom || null;
    etat.limite = PAR_PAGE;
    noeuds.forEach((g, n) => g.classList.toggle("is-actif", n === etat.ville));
    groupeVilles.querySelectorAll(".nv-pastille").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.ville || null) === etat.ville)));
    rendre();
  }

  groupeVilles.addEventListener("click", (e) => {
    const b = e.target.closest(".nv-pastille");
    if (b) choisirVille(b.dataset.ville || null);
  });
  groupePeriode.addEventListener("click", (e) => {
    const b = e.target.closest(".nv-pastille");
    if (!b) return;
    etat.periode = b.dataset.periode;
    etat.limite = PAR_PAGE;
    groupePeriode.querySelectorAll(".nv-pastille").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    rendre();
  });
  recherche.addEventListener("input", () => {
    etat.q = norm(recherche.value.trim());
    etat.limite = PAR_PAGE;
    rendre();
  });
  plus.addEventListener("click", () => {
    etat.limite += PAR_PAGE;
    rendre();
  });

  function filtrer() {
    const now = new Date();
    const fin =
      etat.periode === "semaine" ? iso(new Date(now.getTime() + 7 * 864e5)) : etat.periode === "mois" ? iso(new Date(now.getTime() + 31 * 864e5)) : "9999";
    return concerts.filter(
      (c) =>
        c.d <= fin &&
        (!etat.ville || c.z === etat.ville) &&
        (!etat.q || norm(c.a).includes(etat.q) || norm(c.v).includes(etat.q) || norm(c.z).includes(etat.q) || norm(c.s).includes(etat.q))
    );
  }

  function rendre() {
    majAdresse();
    const r = filtrer();
    const lieu = etat.ville ? ` à ${nomVille(etat.ville)}` : "";
    const quand = { semaine: "cette semaine", mois: "dans le mois qui vient", tout: "à venir" }[etat.periode];
    resultat.textContent = r.length ? `${r.length} concert${r.length > 1 ? "s" : ""}${lieu} ${quand}` : "";
    liste.innerHTML = r.length
      ? r.slice(0, etat.limite).map(ligne).join("")
      : `<li class="nv-vide" style="display:block">Aucun concert${lieu} ${quand} pour cette recherche. Essayez une autre période ou une autre ville.</li>`;
    plus.hidden = r.length <= etat.limite;
  }

  // état initial venu de l'adresse
  recherche.value = params.get("q") || "";
  groupePeriode.querySelectorAll(".nv-pastille").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.periode === etat.periode)));
  racine.classList.add("is-pret");
  if (etat.ville && villes.has(etat.ville)) choisirVille(etat.ville);
  else {
    etat.ville = null;
    rendre();
  }
}

init();
