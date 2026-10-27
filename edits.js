const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// hand-drawn wavy frame around a video window
function drawWobble(el) {
  const gap = 12, amp = 4.5, wave = 26;
  const w = el.offsetWidth + gap * 2, h = el.offsetHeight + gap * 2;
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280) - .5;

  const corners = [[0, 0], [w, 0], [w, h], [0, h], [0, 0]];
  let d = `M${corners[0]}`;
  let flip = 1;
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = corners[i], [x2, y2] = corners[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(2, Math.round(len / wave));
    const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
    for (let k = 1; k <= n; k++) {
      const t0 = (k - .5) / n, t1 = k / n;
      const a = amp * (1 + rand() * .5) * flip;
      const cx = x1 + (x2 - x1) * t0 + nx * a * 2;
      const cy = y1 + (y2 - y1) * t0 + ny * a * 2;
      const ex = x1 + (x2 - x1) * t1 + rand() * 2;
      const ey = y1 + (y2 - y1) * t1 + rand() * 2;
      d += ` Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`;
      flip = -flip;
    }
  }

  let svg = el.querySelector('.wobble-line');
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'wobble-line');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<path fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>';
    el.prepend(svg);
  }
  svg.style.left = svg.style.top = `${-gap}px`;
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.querySelector('path').setAttribute('d', d);
}
document.querySelectorAll('.wobble').forEach(el => {
  drawWobble(el);
  if ('ResizeObserver' in window) new ResizeObserver(() => drawWobble(el)).observe(el);
});

// reels: play while on screen, one with sound at a time
const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const windows = [...document.querySelectorAll('.reel .window')];
const videos = windows.map(w => w.querySelector('video'));

const io = !calm && 'IntersectionObserver' in window
  ? new IntersectionObserver(entries => {
      entries.forEach(e => e.isIntersecting ? e.target.play().catch(() => {}) : e.target.pause());
    }, { threshold: .35 })
  : null;

windows.forEach(win => {
  const video = win.querySelector('video');
  const sound = win.querySelector('.sound');
  const scrub = win.querySelector('.scrub');
  const fill = scrub.querySelector('.fill');

  if (io) io.observe(video);
  video.addEventListener('click', () => (video.paused ? video.play() : video.pause()));

  sound.addEventListener('click', () => {
    const turnOn = video.muted;
    windows.forEach(w => {
      const v = w.querySelector('video'), b = w.querySelector('.sound');
      v.muted = true;
      b.textContent = 'Sound off';
      b.setAttribute('aria-pressed', 'false');
    });
    if (turnOn) {
      video.muted = false;
      sound.textContent = 'Sound on';
      sound.setAttribute('aria-pressed', 'true');
      video.play().catch(() => {});
    }
  });

  video.addEventListener('loadedmetadata', () => scrub.setAttribute('aria-valuemax', Math.round(video.duration)));
  video.addEventListener('timeupdate', () => {
    const t = video.currentTime;
    fill.style.width = `${(t / (video.duration || 1)) * 100}%`;
    scrub.setAttribute('aria-valuenow', Math.round(t));
    scrub.setAttribute('aria-valuetext', fmt(t));
  });

  const seek = t => {
    video.currentTime = Math.max(0, Math.min(t, (video.duration || t) - .1));
    video.play().catch(() => {});
  };
  scrub.addEventListener('click', e => {
    const r = scrub.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * (video.duration || 0));
  });
  scrub.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { seek(video.currentTime + 5); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { seek(video.currentTime - 5); e.preventDefault(); }
  });
});

// stamps: drag one onto the postcard (or tap it to stick it in the corner)
const stage = document.querySelector('.stage');
if (stage) {
  const card = stage.querySelector('.postcard');
  const slot = stage.querySelector('.stamp-slot');
  const spots = [...stage.querySelectorAll('.spot')];
  const tilt = [-4, 3, -2];
  const stamps = [...stage.querySelectorAll('.stamp')].map((el, i) => ({ el, i, where: 'tray' }));

  const box = el => {
    const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
  };
  const centre = st => ({ x: st.el.offsetLeft + st.el.offsetWidth / 2, y: st.el.offsetTop + st.el.offsetHeight / 2 });
  const inside = (p, b, pad = 0) => p.x > b.x - pad && p.x < b.x + b.w + pad && p.y > b.y - pad && p.y < b.y + b.h + pad;

  const place = st => {
    const w = st.el.offsetWidth, h = st.el.offsetHeight;
    let x, y, rot;
    if (st.where === 'slot') {
      const b = box(slot);
      x = b.x + (b.w - w) / 2; y = b.y + (b.h - h) / 2; rot = 2;
    } else if (st.where === 'card') {
      const b = box(card);
      x = b.x + st.rx * b.w - w / 2; y = b.y + st.ry * b.h - h / 2; rot = st.rot;
    } else {
      const b = box(spots[st.i]);
      x = b.x; y = b.y; rot = tilt[st.i];
    }
    st.el.style.left = `${x}px`;
    st.el.style.top = `${y}px`;
    st.el.style.transform = `rotate(${rot}deg)`;
    slot.style.visibility = stamps.some(s => s.where === 'slot') ? 'hidden' : '';
    st.el.setAttribute('aria-label', st.el.getAttribute('aria-label').replace(/Press to .*$/,
      st.where === 'tray' ? 'Press to stick it on the postcard' : 'Press to take it off the postcard'));
  };
  const layout = () => stamps.forEach(place);

  const toSlot = st => {
    stamps.forEach(o => { if (o !== st && o.where === 'slot') { o.where = 'tray'; place(o); } });
    st.where = 'slot';
    place(st);
  };

  stamps.forEach(st => {
    const el = st.el;
    let start = null, moved = false;

    el.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      start = { px: e.clientX, py: e.clientY, x: el.offsetLeft, y: el.offsetTop };
      moved = false;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', e => {
      if (!start) return;
      const dx = e.clientX - start.px, dy = e.clientY - start.py;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      moved = true;
      el.classList.add('is-dragging');
      el.style.left = `${start.x + dx}px`;
      el.style.top = `${start.y + dy}px`;
      el.style.transform = 'rotate(0deg) scale(1.08)';
      slot.classList.toggle('is-hot', inside(centre(st), box(slot), 24));
    });
    const drop = () => {
      if (!start) return;
      start = null;
      el.classList.remove('is-dragging');
      slot.classList.remove('is-hot');
      if (!moved) return;
      const c = centre(st), b = box(card);
      if (inside(c, box(slot), 24)) return toSlot(st);
      if (inside(c, b)) {
        st.where = 'card';
        st.rx = (c.x - b.x) / b.w;
        st.ry = (c.y - b.y) / b.h;
        st.rot = Math.round(Math.random() * 12 - 6);
      } else {
        st.where = 'tray';
      }
      place(st);
    };
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);

    // a tap or Enter/Space: stick it in the corner, or take it off again
    el.addEventListener('click', e => {
      if (moved) { moved = false; e.preventDefault(); return; }
      if (st.where === 'tray') toSlot(st);
      else { st.where = 'tray'; place(st); }
    });
  });

  // place everything without animating, then turn the animation on
  stamps.forEach(st => st.el.style.transition = 'none');
  layout();
  requestAnimationFrame(() => requestAnimationFrame(() => stamps.forEach(st => st.el.style.transition = '')));
  stage.querySelectorAll('.stamp img').forEach(img => img.complete || img.addEventListener('load', layout, { once: true }));
  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(stage);
  addEventListener('load', layout);
}

// copy email
document.querySelectorAll('[data-copy]').forEach(btn => {
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.textContent = 'Copied ✓';
    } catch {
      btn.textContent = 'Select it';
    }
    setTimeout(() => (btn.textContent = 'Copy'), 1800);
  });
});

document.getElementById('year').textContent = new Date().getFullYear();
