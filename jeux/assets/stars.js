// Starfield léger dans l'esprit de la home Nova Corporation
(() => {
  const c = document.createElement('canvas'); c.id = 'stars'; document.body.prepend(c);
  const x = c.getContext('2d'); let w, h, stars = [];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function size() {
    w = c.width = innerWidth * devicePixelRatio; h = c.height = innerHeight * devicePixelRatio;
    stars = Array.from({ length: Math.round(w * h / 9000) }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.3 * devicePixelRatio, s: Math.random() * .15 + .03, a: Math.random() }));
  }
  function draw() {
    x.clearRect(0, 0, w, h);
    for (const s of stars) {
      s.y += reduce ? 0 : s.s; if (s.y > h) s.y = 0;
      s.a += (Math.random() - .5) * .05; s.a = Math.min(1, Math.max(.2, s.a));
      x.fillStyle = `rgba(255,255,255,${s.a})`; x.beginPath(); x.arc(s.x, s.y, s.r, 0, 7); x.fill();
    }
    requestAnimationFrame(draw);
  }
  addEventListener('resize', size); size(); draw();
})();
