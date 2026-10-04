async function loadComponent(containerId, url) {
  const container = document.getElementById(containerId);
  const res = await fetch(url);
  const html = await res.text();
  container.innerHTML = html;
  return Promise.resolve();
}

import { initMarker } from "./marker.js";
import { initConsentement } from "./consentement.js";

// Mesure d'audience Vercel Web Analytics : sans cookie, donc sans bandeau de consentement.
// Chargée ici, une seule fois pour toutes les pages (y compris celles générées par les scripts du média),
// et seulement sur le domaine de production pour ne pas compter les aperçus ni le local.
if (location.hostname === "novacorporation.fr") {
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  const va = document.createElement("script");
  va.defer = true;
  va.src = "/_vercel/insights/script.js";
  document.head.appendChild(va);
}

// Google Analytics : seulement après accord (bandeau), inactif tant qu'aucun identifiant n'est réglé (consentement.js)
initConsentement();

Promise.all([
  loadComponent("header-container", "/components/header.html"),
  loadComponent("footer-container", "/components/footer.html"),
]).then(() => {
  initMarker();

  const burgerBtn = document.getElementById("burger-btn");
  const mobileNav = document.getElementById("mobile-nav");

  if (burgerBtn && mobileNav) {
    const setOpen = (open) => {
      burgerBtn.classList.toggle("open", open);
      mobileNav.classList.toggle("open", open);
      burgerBtn.setAttribute("aria-expanded", String(open));
      mobileNav.setAttribute("aria-hidden", String(!open));
      burgerBtn.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      document.body.classList.toggle("no-scroll", open);
    };

    burgerBtn.addEventListener("click", () => {
      setOpen(!mobileNav.classList.contains("open"));
    });

    // Ferme le menu au clic sur un lien, sur le fond, ou via Echap
    mobileNav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => setOpen(false));
    });

    mobileNav.addEventListener("click", (e) => {
      if (e.target === mobileNav) setOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }
});



// carousel services (uniquement présent sur services.html, qui charge Swiper)
if (typeof Swiper !== "undefined" && document.querySelector(".default-carousel")) {
  let swiper = new Swiper(".default-carousel", {
    loop: true,
    pagination: {
      el: ".swiper-pagination",
      clickable: true,
    },
    navigation: {
      nextEl: ".swiper-button-next",
      prevEl: ".swiper-button-prev",
    },
  });
}
