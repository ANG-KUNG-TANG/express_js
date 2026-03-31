/* auth.canvas.js
   Shared cursor tracking + particle canvas animation for login & register.
   Load as a regular <script> (NOT module) so it runs immediately before the module. */

(function () {
  /* ── Custom cursor ── */
  const cur  = document.getElementById('cur');
  const curR = document.getElementById('curR');
  if (!cur || !curR) return;

  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
  (function tick() {
    rx += (mx - rx) * .12;
    ry += (my - ry) * .12;
    cur.style.cssText  = `left:${mx}px;top:${my}px`;
    curR.style.cssText = `left:${rx}px;top:${ry}px`;
    requestAnimationFrame(tick);
  })();

  document.querySelectorAll('a,button,input').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cur.style.width = '14px'; cur.style.height = '14px';
      curR.style.width = '48px'; curR.style.height = '48px';
      curR.style.borderColor = 'var(--gold)';
    });
    el.addEventListener('mouseleave', () => {
      cur.style.width = '8px'; cur.style.height = '8px';
      curR.style.width = '32px'; curR.style.height = '32px';
      curR.style.borderColor = 'rgba(200,168,75,.4)';
    });
  });

  /* ── Particle canvas ── */
  const cv  = document.getElementById('bg');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H, pts = [];

  function rsz() { W = cv.width = innerWidth; H = cv.height = innerHeight; }
  rsz();
  addEventListener('resize', rsz);

  const N = Math.min(55, Math.floor(innerWidth / 20));
  const COLORS = ['rgba(58,125,90,', 'rgba(200,168,75,', 'rgba(45,97,71,'];
  for (let i = 0; i < N; i++) {
    pts.push({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      vx: (Math.random() - .5) * .2,
      vy: (Math.random() - .5) * .2,
      r: Math.random() * 1.3 + .3,
      o: Math.random() * .4 + .1,
      c: COLORS[Math.floor(Math.random() * COLORS.length)]
    });
  }

  let mX = W / 2, mY = H / 2;
  document.addEventListener('mousemove', e => { mX = e.clientX; mY = e.clientY; });

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createRadialGradient(mX, mY, 0, mX, mY, 260);
    g.addColorStop(0, 'rgba(58,125,90,.04)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    pts.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.c + p.o + ')';
      ctx.fill();
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j], dx = p.x - q.x, dy = p.y - q.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 110) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(58,125,90,${.06 * (1 - d / 110)})`;
          ctx.lineWidth = .5;
          ctx.stroke();
        }
      }
    });
    requestAnimationFrame(draw);
  }
  draw();
})();