// Pearl Tide's site: the home page's moving picture, and the picture viewer.
// Everything is served from this site; nothing loads from anywhere else.
(() => {
  // The opening's lineup loop: played only where motion is welcome and data
  // isn't being saved; the poster (a still of the same scene) otherwise.
  const v = document.querySelector('.hero-video');
  if (v) {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData;
    if (!calm) {
      const wide = innerWidth * (devicePixelRatio || 1) >= 1600;
      v.src = wide ? v.dataset.srcWide : v.dataset.src;
      v.preload = 'auto';
      v.play().catch(() => {});
      v.addEventListener('playing', () => v.classList.add('on'), { once: true });
    }
  }

  // The viewer: any picture link (a.shot) opens its full-size picture over
  // the page; arrows, swipes and the arrow keys go through the pictures on
  // the page, Escape or the background closes it.
  const shots = [...document.querySelectorAll('a.shot')];
  if (!shots.length) return;
  // (A picture shown twice on a page is one stop.)
  const list = [...new Map(shots.map((a) => [a.getAttribute('href'), a])).values()];
  const box = document.createElement('div');
  box.className = 'viewer'; box.hidden = true;
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Picture viewer');
  box.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure>'
    + '<button class="v-close" type="button" aria-label="Close">×</button>'
    + '<button class="v-prev" type="button" aria-label="Previous picture">‹</button>'
    + '<button class="v-next" type="button" aria-label="Next picture">›</button>'
    + '<span class="v-count" aria-live="polite"></span>';
  document.body.append(box);
  const img = box.querySelector('img'), cap = box.querySelector('figcaption'), count = box.querySelector('.v-count');
  let at = 0, back = null;
  const show = (k) => {
    at = (k + list.length) % list.length;
    const a = list[at];
    img.src = a.getAttribute('href'); img.alt = a.dataset.cap || '';
    cap.textContent = a.dataset.cap || '';
    count.textContent = `${at + 1} of ${list.length}`;
    // (The next one ready before it's asked for.)
    new Image().src = list[(at + 1) % list.length].getAttribute('href');
  };
  const open = (a) => {
    back = document.activeElement;
    show(list.findIndex((x) => x.getAttribute('href') === a.getAttribute('href')));
    box.hidden = false; document.documentElement.classList.add('viewing');
    box.querySelector('.v-close').focus();
  };
  const close = () => { box.hidden = true; document.documentElement.classList.remove('viewing'); img.removeAttribute('src'); back?.focus(); };
  for (const a of shots) a.addEventListener('click', (e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); open(a); });
  box.querySelector('.v-close').addEventListener('click', close);
  box.querySelector('.v-prev').addEventListener('click', () => show(at - 1));
  box.querySelector('.v-next').addEventListener('click', () => show(at + 1));
  box.addEventListener('click', (e) => { if (e.target === box || e.target.tagName === 'FIGURE') close(); });
  addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(at - 1);
    else if (e.key === 'ArrowRight') show(at + 1);
    else if (e.key === 'Tab') { // (Focus stays in the viewer.)
      const f = [...box.querySelectorAll('button')], i = f.indexOf(document.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  let x0 = null;
  box.addEventListener('touchstart', (e) => { x0 = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
  box.addEventListener('touchend', (e) => {
    if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
  });
})();
