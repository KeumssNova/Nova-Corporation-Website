export function initMarker() {
  const nav = document.querySelector("header nav"); // ou ajoute un id si plus précis
  const links = nav.querySelectorAll("a");
  const marker = document.getElementById("marker");

  if (!nav || !marker || links.length === 0) return;

  function moveMarker(link) {
    marker.style.left = link.offsetLeft + "px";
    marker.style.width = link.offsetWidth + "px";
  }

  links.forEach((link) => {
    link.addEventListener("mouseenter", () => moveMarker(link));
    link.addEventListener("click", () => {
      links.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      moveMarker(link);
    });
  });

  const current = [...links].find((l) => l.href === location.href) || links[0];
  current.classList.add("active");
  moveMarker(current);
}
