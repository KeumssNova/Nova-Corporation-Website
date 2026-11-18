// Liste officielle du site : remplis DEFAULT_ITEMS au fil du jeu, les visiteurs les verront pré-cochables.
const CATS = ['Défis des codes de triche', 'Missions', 'Missions secondaires', 'Collectibles', 'Activités'];
const DEFAULT_ITEMS = [
 {
  "id": "tri00",
  "cat": "Défis des codes de triche",
  "label": "Terminer l'histoire principale ($250,000)"
 },
 {
  "id": "tri01",
  "cat": "Défis des codes de triche",
  "label": "Dépenser 2 500 $ en alcool (Drunk (ivresse))"
 },
 {
  "id": "tri02",
  "cat": "Défis des codes de triche",
  "label": "Semer 25 fois un avis de recherche 3 étoiles (Raise Heat Level)"
 },
 {
  "id": "tri03",
  "cat": "Défis des codes de triche",
  "label": "Semer 50 fois un avis de recherche 3 étoiles (Raise Wanted Level)"
 },
 {
  "id": "tri04",
  "cat": "Défis des codes de triche",
  "label": "Terminer l'histoire principale (Unlimited Focus)"
 },
 {
  "id": "tri05",
  "cat": "Défis des codes de triche",
  "label": "Survivre 20 fois à une chute libre de 40 pieds (environ 12 m) (No Fall Damage)"
 },
 {
  "id": "tri06",
  "cat": "Défis des codes de triche",
  "label": "Faire 50 sauts en parachute ou BASE jumps depuis 300 pieds (environ 90 m) ou plus (Parachute)"
 },
 {
  "id": "tri07",
  "cat": "Défis des codes de triche",
  "label": "Faire 100 séances de sport (Body Armor)"
 },
 {
  "id": "tri08",
  "cat": "Défis des codes de triche",
  "label": "Gagner 10 courses à Gellhorn Raceway, Thrillbilly Mud Club et Boone Speedway (Repair Vehicle)"
 },
 {
  "id": "tri09",
  "cat": "Défis des codes de triche",
  "label": "Réussir 50 cascades (stunt jumps) (Unlimited Nitrous)"
 },
 {
  "id": "tri10",
  "cat": "Défis des codes de triche",
  "label": "Obtenir 25 médailles de bronze ou mieux au stand de tir (Max Ammo)"
 },
 {
  "id": "tri11",
  "cat": "Défis des codes de triche",
  "label": "Obtenir 25 médailles d'argent ou mieux au stand de tir (Infinite Ammo)"
 },
 {
  "id": "tri12",
  "cat": "Défis des codes de triche",
  "label": "Obtenir 25 médailles d'or au stand de tir (No Reload)"
 },
 {
  "id": "tri13",
  "cat": "Défis des codes de triche",
  "label": "Lancer 100 grenades (All Explosive Weapons)"
 },
 {
  "id": "tri14",
  "cat": "Défis des codes de triche",
  "label": "Brûler 100 ennemis (Incendiary Ammo)"
 },
 {
  "id": "tri15",
  "cat": "Défis des codes de triche",
  "label": "Lancer 100 cocktails Molotov (Exploding Bottles)"
 },
 {
  "id": "tri16",
  "cat": "Défis des codes de triche",
  "label": "Blesser 100 ennemis avec des explosifs (Explosive Shotgun)"
 },
 {
  "id": "tri17",
  "cat": "Défis des codes de triche",
  "label": "Détruire 100 véhicules (Hauners H-AT)"
 },
 {
  "id": "tri18",
  "cat": "Défis des codes de triche",
  "label": "Terminer l'histoire principale (Attack Force)"
 },
 {
  "id": "tri19",
  "cat": "Défis des codes de triche",
  "label": "Blesser 20 ennemis avec des explosifs (Exploding Balls)"
 },
 {
  "id": "tri20",
  "cat": "Défis des codes de triche",
  "label": "Tuer 25 ennemis ou civils avec un véhicule (Vehicle Force)"
 },
 {
  "id": "tri21",
  "cat": "Défis des codes de triche",
  "label": "Collecter 10 montres (Move Time Forward)"
 },
 {
  "id": "tri22",
  "cat": "Défis des codes de triche",
  "label": "Collecter 20 montres (Pause Time of Day)"
 },
 {
  "id": "tri23",
  "cat": "Défis des codes de triche",
  "label": "Révéler toute la carte (Cycle Weather)"
 },
 {
  "id": "tri24",
  "cat": "Défis des codes de triche",
  "label": "Le découvrir dans le menu Progression (Interstate Ambulance)"
 },
 {
  "id": "tri25",
  "cat": "Défis des codes de triche",
  "label": "Réussir 5 défis de survie (Airboat 09)"
 },
 {
  "id": "tri26",
  "cat": "Défis des codes de triche",
  "label": "Réussir tous les défis de combat (Bravado Banshee)"
 },
 {
  "id": "tri27",
  "cat": "Défis des codes de triche",
  "label": "Réussir 5 défis de fitness (Tuff BMX)"
 },
 {
  "id": "tri28",
  "cat": "Défis des codes de triche",
  "label": "Réussir 5 défis de shopping (Maibatsu Boomazoom)"
 },
 {
  "id": "tri29",
  "cat": "Défis des codes de triche",
  "label": "Réussir tous les défis d'exploration (Nagasaki Carbon RS)"
 },
 {
  "id": "tri30",
  "cat": "Défis des codes de triche",
  "label": "Réussir tous les défis de fitness ('65 Vapid Dominator)"
 },
 {
  "id": "tri31",
  "cat": "Défis des codes de triche",
  "label": "Réussir tous les défis de véhicules (Progen Emerus)"
 },
 {
  "id": "tri32",
  "cat": "Défis des codes de triche",
  "label": "Détruire 50 flamants de cocaïne (Inflatable Flamingo)"
 },
 {
  "id": "tri33",
  "cat": "Défis des codes de triche",
  "label": "Le découvrir dans le menu Progression (MTL Pumper)"
 },
 {
  "id": "tri34",
  "cat": "Défis des codes de triche",
  "label": "Réussir 5 défis sportifs (Vapid Stainer G2 Taxi)"
 },
 {
  "id": "tri35",
  "cat": "Défis des codes de triche",
  "label": "Réussir tous les défis (Hauners P-996 Lazer)"
 },
 {
  "id": "tri36",
  "cat": "Défis des codes de triche",
  "label": "Le découvrir dans le menu Progression (HVY Bulldozer)"
 },
 {
  "id": "tri37",
  "cat": "Défis des codes de triche",
  "label": "Réussir 5 défis de véhicules (Lapwing Mallard)"
 },
 {
  "id": "tri38",
  "cat": "Défis des codes de triche",
  "label": "Réussir tous les défis sportifs (Brimstone Golfer)"
 },
 {
  "id": "tri39",
  "cat": "Défis des codes de triche",
  "label": "Réussir tous les défis de survie (Hauners Rhino Tank)"
 },
 {
  "id": "tri40",
  "cat": "Défis des codes de triche",
  "label": "Réussir 5 défis criminels (Maibatsu Sanchez)"
 },
 {
  "id": "tri41",
  "cat": "Défis des codes de triche",
  "label": "Réussir 5 défis d'exploration (Nagasaki Sea Sparrow)"
 },
 {
  "id": "tri42",
  "cat": "Défis des codes de triche",
  "label": "Réussir 5 défis de combat (Speeder 700 GT)"
 },
 {
  "id": "tri43",
  "cat": "Défis des codes de triche",
  "label": "Réussir tous les défis de shopping (Truffade Thrax)"
 },
 {
  "id": "tri44",
  "cat": "Défis des codes de triche",
  "label": "Réussir tous les défis criminels (Western Zombie Bobber)"
 },
 {
  "id": "tri45",
  "cat": "Défis des codes de triche",
  "label": "Passer 4 heures main dans la main (Golden Hour)"
 },
 {
  "id": "tri46",
  "cat": "Défis des codes de triche",
  "label": "Scanner tous les débris spatiaux avec WAiNK (Powdered Sugar)"
 },
 {
  "id": "tri47",
  "cat": "Défis des codes de triche",
  "label": "Nettoyer 25 opérations de gang avec ton partenaire (Pinhole)"
 },
 {
  "id": "tri48",
  "cat": "Défis des codes de triche",
  "label": "Découvrir les 16 véhicules Girlypop (Neon Jungle)"
 },
 {
  "id": "tri49",
  "cat": "Défis des codes de triche",
  "label": "Découvrir la Ridgway (Yesteryear)"
 },
 {
  "id": "tri50",
  "cat": "Défis des codes de triche",
  "label": "Découvrir la Vamos de Martha dans le menu Progression (Cataclysm)"
 },
 {
  "id": "tri51",
  "cat": "Défis des codes de triche",
  "label": "Faire 50 activités avec ton partenaire (Videotape)"
 },
 {
  "id": "tri52",
  "cat": "Défis des codes de triche",
  "label": "Gagner 500 000 $ en vendant des véhicules (Dark Mirror)"
 },
 {
  "id": "tri53",
  "cat": "Défis des codes de triche",
  "label": "Survivre 6 minutes avec 6 étoiles de recherche (Migraine)"
 },
 {
  "id": "tri54",
  "cat": "Défis des codes de triche",
  "label": "Passer 8 heures avec ton partenaire (Dollhouse)"
 },
 {
  "id": "tri55",
  "cat": "Défis des codes de triche",
  "label": "Collecter les 24 cartes Vice City Flamingos (Bubblegum)"
 },
 {
  "id": "tri56",
  "cat": "Défis des codes de triche",
  "label": "Faire 50 méditations (Fast Forward)"
 },
 {
  "id": "tri57",
  "cat": "Défis des codes de triche",
  "label": "Pêcher 100 poissons (Fisheye)"
 },
 {
  "id": "tri58",
  "cat": "Défis des codes de triche",
  "label": "Braquer 50 magasins avec ton partenaire (Faded Glory)"
 },
 {
  "id": "tri59",
  "cat": "Défis des codes de triche",
  "label": "Gagner 250 000 $ en vendant des objets de collection (Pixel Art)"
 },
 {
  "id": "tri60",
  "cat": "Défis des codes de triche",
  "label": "Voler 100 véhicules de police (Hellscape)"
 }
];
const KEY = 'gta6fr-tracker-v1';

let state = { done: {}, custom: [] };
try { state = Object.assign(state, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} };

const $ = id => document.getElementById(id);
$('cat').innerHTML = CATS.map(c => `<option>${c}</option>`).join('');

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function render() {
  const items = [...DEFAULT_ITEMS, ...state.custom];
  const total = items.length, done = items.filter(i => state.done[i.id]).length;
  const pct = total ? Math.round(done / total * 100) : 0;
  $('pct').textContent = pct + ' %';
  $('bar').style.width = pct + '%';
  if (!total) { $('list').innerHTML = '<div class="note">Aucun élément pour l\'instant. Ajoute tes missions et collectibles ci-dessus.</div>'; return; }
  $('list').innerHTML = CATS.map(cat => {
    const its = items.filter(i => i.cat === cat);
    if (!its.length) return '';
    const d = its.filter(i => state.done[i.id]).length;
    return `<div class="cat"><h3><span>${cat}</span><span>${d}/${its.length}</span></h3>` +
      its.map(i => `<label class="item ${state.done[i.id] ? 'done' : ''}">
        <input type="checkbox" data-id="${i.id}" ${state.done[i.id] ? 'checked' : ''}>
        <span>${esc(i.label)}</span>
        ${i.custom ? `<button class="del" data-del="${i.id}" title="Supprimer">×</button>` : ''}
      </label>`).join('') + '</div>';
  }).join('');
}

$('list').addEventListener('change', e => {
  const id = e.target.dataset.id; if (!id) return;
  e.target.checked ? state.done[id] = 1 : delete state.done[id];
  save(); render();
});
$('list').addEventListener('click', e => {
  const id = e.target.dataset.del; if (!id) return;
  e.preventDefault();
  state.custom = state.custom.filter(i => i.id !== id); delete state.done[id];
  save(); render();
});
function add() {
  const label = $('txt').value.trim(); if (!label) return;
  state.custom.push({ id: 'c' + Date.now(), cat: $('cat').value, label, custom: true });
  $('txt').value = ''; save(); render();
}
$('add').onclick = add;
$('txt').addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
let armed = false;
$('rst').onclick = () => {
  if (!armed) { armed = true; $('rst').textContent = 'Confirmer la réinitialisation'; setTimeout(() => { armed = false; $('rst').textContent = 'Tout réinitialiser'; }, 3000); return; }
  armed = false; $('rst').textContent = 'Tout réinitialiser';
  state = { done: {}, custom: [] }; save(); render();
};
const flash = (btn, txt, orig) => { btn.textContent = txt; setTimeout(() => btn.textContent = orig, 2000); };
$('exp').onclick = async () => {
  try { await navigator.clipboard.writeText(JSON.stringify(state)); flash($('exp'), 'Copié !', 'Copier ma sauvegarde'); }
  catch (e) { flash($('exp'), 'Copie impossible', 'Copier ma sauvegarde'); }
};
$('imp').onclick = () => {
  const t = window.__importBox; t.hidden = !t.hidden; if (!t.hidden) t.focus();
};
window.__importBox = Object.assign(document.createElement('textarea'), { hidden: true, placeholder: 'Colle ta sauvegarde ici' });
Object.assign(window.__importBox.style, { width: '100%', minHeight: '80px', background: 'var(--card)', color: 'var(--txt)', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px' });
$('imp').parentNode.after(window.__importBox);
window.__importBox.addEventListener('input', e => {
  try { const s = JSON.parse(e.target.value); if (s && s.done) { state = Object.assign({ done: {}, custom: [] }, s); save(); render(); e.target.value = ''; e.target.hidden = true; } } catch (err) {}
});
render();
