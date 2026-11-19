// Moteur de la carte schématique de Leonida.
//
// SVG écrit à la main plutôt qu'une bibliothèque de cartographie : celles-ci sont faites pour des
// tuiles d'images, pas pour du vectoriel avec marqueurs, et la plus légère pèse dix fois les assets
// de la branche jeux. Ici le pan et le zoom tiennent dans une centaine de lignes et la carte hérite
// directement de la DA Nova.
//
// Les données sont dans carte-data.js (ZONES, CATEGORIES, POINTS).
// Ce que le visiteur coche est gardé dans son navigateur, comme le tracker 100 %.

(() => {
  const svg = document.getElementById('carte');
  if (!svg || typeof ZONES === 'undefined') return;

  const W = 1000, H = 1400;
  const KEY = 'gta6fr-carte-v1';
  const ns = 'http://www.w3.org/2000/svg';

  let etat = { vus: {}, filtres: {} };
  try { etat = Object.assign(etat, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
  const sauver = () => { try { localStorage.setItem(KEY, JSON.stringify(etat)); } catch (e) {} };

  const el = (n, attrs = {}) => {
    const e = document.createElementNS(ns, n);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };
  const centre = (z) => {
    if (z.iles) return [z.iles[0][0], z.iles[0][1]];
    const n = z.points.split(' ').map((p) => p.split(',').map(Number));
    return [n.reduce((s, p) => s + p[0], 0) / n.length, n.reduce((s, p) => s + p[1], 0) / n.length];
  };
  const couleur = (cat) => (CATEGORIES.find((c) => c.id === cat) || {}).couleur || '#fff';

  // ---- Dessin du fond -------------------------------------------------------
  const gFond = el('g', { class: 'c-fond' });
  const gPoints = el('g', { class: 'c-points' });
  svg.append(gFond, gPoints);

  ZONES.forEach((z) => {
    const g = el('g', { class: 'c-zone', 'data-zone': z.id });
    if (z.iles) {
      // le chapelet : les ponts d'abord, les îles par-dessus
      for (let i = 0; i < z.iles.length - 1; i++) {
        const [x1, y1] = z.iles[i], [x2, y2] = z.iles[i + 1];
        g.append(el('line', { x1, y1, x2, y2, class: 'c-pont' }));
      }
      z.iles.forEach(([cx, cy, r]) => g.append(el('circle', { cx, cy, r, class: 'c-ile' })));
    } else {
      g.append(el('polygon', { points: z.points }));
    }
    const [tx, ty] = z.etiquette;
    const t = el('text', { x: tx, y: ty, class: 'c-nom' });
    t.textContent = z.court.toUpperCase();
    const s = el('text', { x: tx, y: ty + 26, class: 'c-sous' });
    s.textContent = z.sous;
    g.append(t, s);
    g.addEventListener('click', () => ouvrirZone(z));
    gFond.append(g);
  });

  // repères d'orientation : ce sont les nôtres, pas des lieux du jeu
  const rep = el('g', { class: 'c-reperes' });
  [[70, 760, 'GOLFE'], [930, 560, 'OCÉAN']].forEach(([x, y, txt]) => {
    const t = el('text', { x, y, class: 'c-repere' });
    t.textContent = txt;
    rep.append(t);
  });
  const nord = el('text', { x: 930, y: 110, class: 'c-nord' });
  nord.textContent = 'N';
  rep.append(nord, el('line', { x1: 930, y1: 125, x2: 930, y2: 175, class: 'c-fleche' }));
  gFond.append(rep);

  // ---- Points ---------------------------------------------------------------
  // Plusieurs points dans la même zone : on les dispose en petit arc autour du centre,
  // parce qu'aucune position exacte n'est connue et qu'empilés ils seraient illisibles.
  const parZone = {};
  POINTS.forEach((p) => (parZone[p.zone] = parZone[p.zone] || []).push(p));
  const place = {};
  Object.entries(parZone).forEach(([zid, liste]) => {
    const z = ZONES.find((x) => x.id === zid);
    if (!z) return;
    // l'ancre est posee sous l'etiquette de la zone : au centroide, les points passaient
    // par-dessus le nom de la region et les deux devenaient illisibles
    const [cx, cy] = z.etiquette ? [z.etiquette[0], z.etiquette[1] + 78] : centre(z);
    // le rayon suit le nombre de points : a 46 fixe, cinq points dans Vice City se chevauchaient
    const r = liste.length === 1 ? 0 : 26 + liste.length * 11;
    liste.forEach((p, i) => {
      // demi-cercle vers le bas plutot que cercle complet, pour la meme raison
      const a = liste.length === 1 ? 0 : Math.PI * (i / (liste.length - 1));
      place[p.id] = p.precis && p.x != null ? [p.x, p.y] : [cx - Math.cos(a) * r, cy + Math.sin(a) * r * 0.6];
    });
  });

  POINTS.forEach((p) => {
    const [x, y] = place[p.id];
    const g = el('g', { class: 'c-pt', 'data-cat': p.cat, 'data-id': p.id, tabindex: '0',
                        role: 'button', 'aria-label': p.nom });
    g.append(el('circle', { cx: x, cy: y, r: 16, class: 'c-halo' }));
    g.append(el('circle', { cx: x, cy: y, r: 7, fill: couleur(p.cat), class: 'c-coeur' }));
    g.addEventListener('click', (e) => { e.stopPropagation(); ouvrirPoint(p); });
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrirPoint(p); } });
    gPoints.append(g);
  });

  // ---- Pan et zoom ----------------------------------------------------------
  let vue = { x: 0, y: 0, w: W, h: H };
  const appliquer = () => svg.setAttribute('viewBox', `${vue.x} ${vue.y} ${vue.w} ${vue.h}`);
  const borner = () => {
    vue.w = Math.min(W, Math.max(W / 4, vue.w));
    vue.h = (vue.w * H) / W;
    vue.x = Math.min(W - vue.w, Math.max(0, vue.x));
    vue.y = Math.min(H - vue.h, Math.max(0, vue.y));
  };
  const zoomer = (f, ox = 0.5, oy = 0.5) => {
    const ax = vue.x + vue.w * ox, ay = vue.y + vue.h * oy;
    vue.w /= f;
    borner();
    vue.x = ax - vue.w * ox; vue.y = ay - vue.h * oy;
    borner(); appliquer();
  };
  appliquer();

  let glisse = null;
  const pos = (e) => (e.touches ? e.touches[0] : e);
  svg.addEventListener('pointerdown', (e) => {
    glisse = { x: pos(e).clientX, y: pos(e).clientY, vx: vue.x, vy: vue.y, bouge: false };
    svg.setPointerCapture?.(e.pointerId);
  });
  svg.addEventListener('pointermove', (e) => {
    if (!glisse) return;
    const r = svg.getBoundingClientRect();
    const dx = (pos(e).clientX - glisse.x) * (vue.w / r.width);
    const dy = (pos(e).clientY - glisse.y) * (vue.h / r.height);
    if (Math.abs(dx) + Math.abs(dy) > 2) glisse.bouge = true;
    vue.x = glisse.vx - dx; vue.y = glisse.vy - dy;
    borner(); appliquer();
  });
  const fin = () => { glisse = null; };
  svg.addEventListener('pointerup', fin);
  svg.addEventListener('pointercancel', fin);
  svg.addEventListener('pointerleave', fin);
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    zoomer(e.deltaY < 0 ? 1.2 : 1 / 1.2, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  }, { passive: false });

  document.getElementById('c-plus').onclick = () => zoomer(1.4);
  document.getElementById('c-moins').onclick = () => zoomer(1 / 1.4);
  document.getElementById('c-reset').onclick = () => { vue = { x: 0, y: 0, w: W, h: H }; appliquer(); };

  // ---- Panneau --------------------------------------------------------------
  const panneau = document.getElementById('c-panneau');
  const fermer = () => { panneau.hidden = true; svg.querySelectorAll('.c-pt.on').forEach((n) => n.classList.remove('on')); };
  document.getElementById('c-fermer').onclick = fermer;

  function ouvrirZone(z) {
    if (glisse && glisse.bouge) return;
    const n = POINTS.filter((p) => p.zone === z.id).length;
    panneau.hidden = false;
    panneau.querySelector('.c-titre').textContent = z.nom;
    panneau.querySelector('.c-sstitre').textContent = z.sous;
    panneau.querySelector('.c-texte').innerHTML =
      `<p>${z.texte}</p><p class="c-compte">${n} point${n > 1 ? 's' : ''} référencé${n > 1 ? 's' : ''} dans cette zone.</p>`;
    panneau.querySelector('.c-actions').innerHTML = '';
  }

  function ouvrirPoint(p) {
    if (glisse && glisse.bouge) return;
    svg.querySelectorAll('.c-pt.on').forEach((n) => n.classList.remove('on'));
    svg.querySelector(`.c-pt[data-id="${p.id}"]`)?.classList.add('on');
    const z = ZONES.find((x) => x.id === p.zone);
    const cat = CATEGORIES.find((c) => c.id === p.cat);
    panneau.hidden = false;
    panneau.querySelector('.c-titre').textContent = p.nom;
    panneau.querySelector('.c-sstitre').textContent = `${cat ? cat.nom : ''} · ${z ? z.nom : ''}`;
    panneau.querySelector('.c-texte').innerHTML =
      `<p>${p.texte}</p>` +
      (p.precis === false ? '<p class="c-approx">Situé à la zone. La position exacte n\'est pas encore établie.</p>' : '');
    const coche = etat.vus[p.id] ? 'checked' : '';
    panneau.querySelector('.c-actions').innerHTML =
      `<label class="c-vu"><input type="checkbox" data-vu="${p.id}" ${coche}> Trouvé</label>` +
      (p.lien ? ` <a class="c-lien" href="${p.lien}">En savoir plus →</a>` : '');
  }

  panneau.addEventListener('change', (e) => {
    const id = e.target.dataset.vu;
    if (!id) return;
    e.target.checked ? (etat.vus[id] = 1) : delete etat.vus[id];
    sauver(); majVus();
  });

  function majVus() {
    svg.querySelectorAll('.c-pt').forEach((n) => n.classList.toggle('vu', !!etat.vus[n.dataset.id]));
    const n = Object.keys(etat.vus).length;
    document.getElementById('c-compteur').textContent = `${n} / ${POINTS.length} trouvés`;
  }

  // ---- Filtres --------------------------------------------------------------
  const barre = document.getElementById('c-filtres');
  CATEGORIES.forEach((c) => {
    const actif = etat.filtres[c.id] !== 0;
    const b = document.createElement('button');
    b.className = 'c-filtre' + (actif ? ' on' : '');
    b.dataset.cat = c.id;
    b.innerHTML = `<i style="background:${c.couleur}"></i>${c.nom}`;
    b.onclick = () => {
      const on = b.classList.toggle('on');
      etat.filtres[c.id] = on ? 1 : 0;
      sauver(); majFiltres();
    };
    barre.append(b);
  });
  function majFiltres() {
    svg.querySelectorAll('.c-pt').forEach((n) => {
      n.style.display = etat.filtres[n.dataset.cat] === 0 ? 'none' : '';
    });
  }

  majVus(); majFiltres();
})();
