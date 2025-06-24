async function loadComponent(containerId, url) {
  const container = document.getElementById(containerId);
  const res = await fetch(url);
  const html = await res.text();
  container.innerHTML = html;
  return Promise.resolve();
}

import { initMarker } from "./marker.js";

Promise.all([
  loadComponent("header-container", "/components/header.html"),
  loadComponent("footer-container", "/components/footer.html"),
]).then(() => {
  initMarker();

  const burgerBtn = document.getElementById("burger-btn");
  const mobileNav = document.getElementById("mobile-nav");

  if (burgerBtn && mobileNav) {
    burgerBtn.addEventListener("click", () => {
      mobileNav.classList.toggle("hidden");
    });

    // Ferme le menu après clic sur un lien (mobile)
    const links = mobileNav.querySelectorAll("a");
    links.forEach(link => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 768) {
          mobileNav.classList.add("hidden");
        }
      });
    });
  }
});



// carousel services
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
