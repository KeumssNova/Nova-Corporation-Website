// Google Analytics (GA4), seulement avec le consentement du visiteur.
// Google Analytics dépose des cookies : en France, la CNIL impose de demander l'accord avant (Vercel Web Analytics, lui,
// n'en dépose pas et reste actif sans bandeau). Rien de Google n'est chargé avant un clic sur "Accepter".
// Refuser est aussi simple qu'accepter, et le choix se modifie depuis la page Mentions légales.
// Vider GA_ID pour couper Google Analytics.
const GA_ID = "G-PBX41BCP5L"; // propriété GA4 de novacorporation.fr (2026-10-04)
const CLE = "nova-consentement"; // "oui" ou "non", gardé 13 mois au plus (recommandation CNIL)
const DUREE = 13 * 30 * 24 * 3600 * 1000;

function lireChoix() {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) || "null");
    return v && Date.now() - v.le < DUREE ? v.choix : null;
  } catch {
    return null;
  }
}

function ecrireChoix(choix) {
  try {
    localStorage.setItem(CLE, JSON.stringify({ choix, le: Date.now() }));
  } catch {
    /* navigation privée : le bandeau reviendra, rien n'est chargé sans accord */
  }
}

function chargerGA() {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID);
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

function bandeau() {
  if (document.getElementById("nv-consentement")) return;
  const b = document.createElement("div");
  b.id = "nv-consentement";
  b.setAttribute("role", "dialog");
  b.setAttribute("aria-label", "Mesure d'audience");
  b.style.cssText = "position:fixed;left:16px;right:16px;bottom:16px;z-index:60;max-width:560px;margin:0 auto;background:#050506;" +
    "border:1px solid #fff;padding:16px;font-family:Cousine,monospace;font-size:14px;line-height:1.5;color:#fff";
  b.innerHTML =
    '<p style="margin:0 0 12px">Nova utilise Google Analytics pour savoir quelles pages sont lues. Cela dépose des cookies : ' +
    'tu acceptes ? <a href="/mentions-legales" style="color:#FF5B5B">En savoir plus</a></p>' +
    '<div style="display:flex;gap:12px">' +
    '<button type="button" data-choix="non" style="flex:1;padding:10px;border:1px solid #fff;background:transparent;color:#fff;font:inherit;cursor:pointer">Refuser</button>' +
    '<button type="button" data-choix="oui" style="flex:1;padding:10px;border:1px solid #fff;background:#fff;color:#000;font:inherit;cursor:pointer">Accepter</button>' +
    "</div>";
  b.addEventListener("click", (ev) => {
    const choix = ev.target?.dataset?.choix;
    if (!choix) return;
    ecrireChoix(choix);
    b.remove();
    if (choix === "oui") chargerGA();
  });
  document.body.appendChild(b);
}

export function initConsentement() {
  if (!GA_ID || location.hostname !== "novacorporation.fr") return;
  const choix = lireChoix();
  if (choix === "oui") chargerGA();
  else if (choix === null) bandeau();
  // lien "Modifier mon choix" de la page Mentions légales
  window.novaConsentement = () => {
    try { localStorage.removeItem(CLE); } catch { /* rien */ }
    bandeau();
  };
}
