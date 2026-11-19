// Façade YouTube : affiche la miniature, charge le lecteur (youtube-nocookie) au clic.
document.querySelectorAll('.yt[data-id]').forEach(el => {
  const id = el.dataset.id;
  el.style.backgroundImage = `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)`;
  el.addEventListener('click', () => {
    el.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="${el.dataset.t || 'Vidéo'}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  }, { once: true });
});
