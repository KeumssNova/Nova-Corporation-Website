// Liste officielle du site : remplis DEFAULT_ITEMS au fil du jeu, les visiteurs les verront pré-cochables.
const CATS = ['Missions', 'Missions secondaires', 'Collectibles', 'Activités', 'Défis'];
const DEFAULT_ITEMS = [
  // { id: 'm01', cat: 'Missions', label: 'Nom de la mission' },
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
