// Pearl Tide's site: loops that play like GIFs while they're on screen
// (silent, round and round, no buttons; the opening's iPhone is one), one
// video with sound at a time (none once the page is left), the viewer for
// pictures and clips, the phone's dock, and the tour's iPhone, playing each
// step's clip.
// Everything is served from this site; nothing loads from anywhere else.
(() => {
  // Where motion is unwelcome or data is being saved, loops hold on their
  // posters (a clip opened in the viewer still plays).
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches || !!navigator.connection?.saveData;

  // Loops: <video class="loop" data-src poster>. The file loads once it's
  // near; it plays while on screen.
  const seen = new IntersectionObserver((es) => {
    for (const e of es) {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v.getAttribute('src')) { v.src = srcOf(v); v.preload = 'auto'; }
        v.play().catch(() => {});
      } else v.pause();
    }
  }, { rootMargin: '120px 0px', threshold: 0.2 });
  // (data-src-small instead where the screen is under 1600 pixels across.)
  const srcOf = (v) => (v.dataset.srcSmall && innerWidth * (devicePixelRatio || 1) < 1600 ? v.dataset.srcSmall : v.dataset.src);
  const loop = (v) => {
    v.muted = true; v.loop = true; v.playsInline = true; v.disablePictureInPicture = true; v.setAttribute('aria-hidden', 'true');
    if (!calm) seen.observe(v);
  };
  document.querySelectorAll('video.loop').forEach(loop);

  // One video with sound at a time: starting one (the trailer, a highlight)
  // pauses the others; and leaving the page (another tab or app, the home
  // screen, closing it) stops it.
  document.addEventListener('play', (e) => {
    const a = e.target;
    if (!(a instanceof HTMLVideoElement) || a.muted) return;
    for (const b of document.querySelectorAll('video')) if (b !== a && !b.muted) b.pause();
  }, true);
  const hush = () => { for (const v of document.querySelectorAll('video')) if (!v.muted) v.pause(); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) hush(); });
  addEventListener('pagehide', hush);

  // The viewer: anything with data-view opens over the page among the
  // page's other such things (one stop per file; arrows, swipes and the
  // arrow keys go through them, Escape or the background closes it):
  // data-full or a link's href a picture, data-loop a clip, data-video a
  // video with sound. A .watch button opens its video alone.
  const box = document.createElement('div');
  box.className = 'viewer'; box.hidden = true;
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Viewer');
  box.innerHTML = '<figure><div class="v-media"></div><figcaption></figcaption></figure>'
    + '<button class="v-close" type="button" aria-label="Close">×</button>'
    + '<button class="v-prev" type="button" aria-label="Previous">‹</button>'
    + '<button class="v-next" type="button" aria-label="Next">›</button>'
    + '<span class="v-count" aria-live="polite"></span>';
  document.body.append(box);
  const media = box.querySelector('.v-media'), cap = box.querySelector('figcaption'), count = box.querySelector('.v-count');
  let list = [], at = 0, back = null;
  const show = (k) => {
    at = (k + list.length) % list.length;
    const it = list[at];
    media.textContent = '';
    let el;
    if (it.kind === 'img') { el = new Image(); el.src = it.src; el.alt = it.cap || ''; }
    else {
      el = document.createElement('video'); el.playsInline = true; el.src = it.src;
      if (it.kind === 'loop') { el.muted = true; el.loop = true; } else el.controls = true;
      if (it.poster) el.poster = it.poster;
      el.play().catch(() => {});
    }
    media.append(el);
    cap.textContent = it.cap || '';
    const many = list.length > 1;
    for (const b of box.querySelectorAll('.v-prev, .v-next')) b.hidden = !many;
    count.textContent = many ? `${at + 1} of ${list.length}` : '';
    // (The next picture ready before it's asked for.)
    const nx = list[(at + 1) % list.length];
    if (many && nx.kind === 'img') new Image().src = nx.src;
  };
  const view = (items, k = 0) => {
    list = items; back = document.activeElement;
    show(k); box.hidden = false; document.documentElement.classList.add('viewing');
    box.querySelector('.v-close').focus();
  };
  const close = () => { box.hidden = true; document.documentElement.classList.remove('viewing'); media.textContent = ''; back?.focus(); };
  box.querySelector('.v-close').addEventListener('click', close);
  box.querySelector('.v-prev').addEventListener('click', () => show(at - 1));
  box.querySelector('.v-next').addEventListener('click', () => show(at + 1));
  box.addEventListener('click', (e) => { if (e.target === box || e.target.tagName === 'FIGURE' || e.target.classList.contains('v-media')) close(); });
  addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' && list.length > 1) show(at - 1);
    else if (e.key === 'ArrowRight' && list.length > 1) show(at + 1);
    else if (e.key === 'Tab') { // (Focus stays in the viewer.)
      const f = [...box.querySelectorAll('button:not([hidden]), video[controls]')], i = f.indexOf(document.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  });
  let x0 = null;
  box.addEventListener('touchstart', (e) => { x0 = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
  box.addEventListener('touchend', (e) => {
    if (x0 == null || list.length < 2) return; const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
  });
  const itemOf = (el) => ({
    kind: el.dataset.video ? 'video' : el.dataset.loop ? 'loop' : 'img',
    src: el.dataset.video || el.dataset.loop || el.dataset.full || el.getAttribute('href'), cap: el.dataset.cap, poster: el.dataset.poster,
  });
  document.addEventListener('click', (e) => {
    const w = e.target.closest('.watch[data-video]');
    if (w) { e.preventDefault(); view([itemOf(w)]); return; }
    const el = e.target.closest('[data-view]');
    if (!el || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const all = [...new Map([...document.querySelectorAll('[data-view]')].map((x) => [itemOf(x).src, itemOf(x)])).values()];
    view(all, all.findIndex((x) => x.src === itemOf(el).src));
  });

  // The phone's dock: on once the opening's badge has gone by, off at the close.
  const dock = document.querySelector('.dock'), from = document.querySelector('[data-dock-from]'), to = document.querySelector('.closing');
  if (dock && from) {
    let past = false, near = false;
    const set = () => dock.classList.toggle('on', past && !near);
    new IntersectionObserver(([e]) => { past = !e.isIntersecting && e.boundingClientRect.top < 0; set(); }).observe(from);
    if (to) new IntersectionObserver(([e]) => { near = e.isIntersecting; set(); }).observe(to);
  }

  // The tour: the held phone plays the clip of the step crossing the middle
  // of the window; on narrower screens each step carries its own phone.
  const steps = [...document.querySelectorAll('.step')];
  const screens = document.querySelector('[data-screens]'), heldCap = document.querySelector('[data-hold-cap]');
  if (steps.length && screens) {
    const clips = new Map();
    for (const s of steps) {
      const n = s.dataset.screen;
      if (!clips.has(n)) {
        const v = document.createElement('video');
        v.muted = true; v.loop = true; v.playsInline = true; v.disablePictureInPicture = true; v.preload = 'none';
        v.poster = `/media/phone/${n}.jpg`; v.dataset.src = `/media/phone/${n}.mp4`; v.setAttribute('aria-hidden', 'true');
        screens.append(v); clips.set(n, v);
      }
      const mini = document.createElement('div'); mini.className = 'mini';
      mini.innerHTML = `<div class="phone"><div class="screen"><video class="loop" data-src="/media/phone/${n}.mp4" poster="/media/phone/${n}.jpg" preload="none"></video></div></div>`;
      s.prepend(mini);
      loop(mini.querySelector('video'));
    }
    let cur = null, shown = false;
    const play = () => {
      for (const v of clips.values()) {
        if (v === cur && shown && !calm) { if (!v.getAttribute('src')) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause();
      }
    };
    const pick = (s) => {
      for (const x of steps) x.classList.toggle('on', x === s);
      cur = clips.get(s.dataset.screen);
      for (const v of clips.values()) v.classList.toggle('on', v === cur);
      heldCap.textContent = s.dataset.cap;
      play();
    };
    pick(steps[0]);
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) pick(e.target); }, { rootMargin: '-48% 0px -48% 0px' });
    steps.forEach((s) => io.observe(s));
    const phone = screens.parentElement;
    new IntersectionObserver(([e]) => { shown = e.isIntersecting; play(); }).observe(phone);
  }

  // The postcards' arrows.
  const strip = document.querySelector('[data-strip]');
  for (const b of document.querySelectorAll('.arrows button')) {
    b.addEventListener('click', () => strip.scrollBy({ left: +b.dataset.dir * strip.clientWidth * 0.8, behavior: calm ? 'auto' : 'smooth' }));
  }
})();
