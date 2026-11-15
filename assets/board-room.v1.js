/* Ours, on Angel's room only (linked before his board.v1.js by tools/board_sync.py, both deferred; 13 Nov 2026 round four). Four things:
   1. on a phone (the strip) the astronaut loop's address comes off the gate's picture before his script asks for it: the loop is a
      1.8 MB animated picture, the still it replaces is 13 KB, and a phone's first visit is the one that pays for it;
   2. the client's flower behind the dome's glass gets its pictures 1.2 s after load, so the room picture, the page's largest paint,
      is never queued behind it; the drift runs once the room is up and pauses while the tab is hidden (.room.is-adrift; the motion
      itself is in assets/board-room.v1.css, transform only);
   3. on a desktop with a mouse, or from the keyboard, a door opens on hover or focus and shows the room behind it, closes on leave,
      and a click goes on through the open door. The leaves are the same two his click builds, cut from the room picture. His script
      keeps the click path for touch, for the strip (a phone, a narrow window) and for Motion off, and nothing here touches his code;
   4. the six views behind the doors are warmed on idle where a hover can open one (not in the strip). */
(() => {
  'use strict';
  const html = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const strip = matchMedia('(max-width: 999px), (max-aspect-ratio: 6/5)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const moving = () => !calm.matches && !html.classList.contains('motion-off');
  const onChange = (mq, fn) => { if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); };
  const afterLoad = (ms, fn) => { const go = () => setTimeout(fn, ms); if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true }); };

  /* ---------- 1. the gate's astronaut: still on a phone, and on a slow or metered line ---------- */
  const conn = navigator.connection || null;
  const thin = !!conn && (conn.saveData || /(^|\b)(slow-)?2g\b|\b3g\b/.test(conn.effectiveType || ''));
  if (strip.matches || thin) document.querySelectorAll('.space__loop[data-loop]').forEach((im) => { im.removeAttribute('data-loop'); });

  const room = document.querySelector('.room');
  const stage = room && room.querySelector('.room__stage');
  if (!room || !stage) return;
  const roomImg = room.querySelector('.room__img');

  /* ---------- 2. the sky and the flower: pictures after load, motion once the gate is down and the tab is in front ---------- */
  const dome = stage.querySelector('.dome');
  afterLoad(1200, () => dome && dome.querySelectorAll('.nug[data-src]').forEach((im) => {
    /* a nug stays hidden until its picture is in: a loading picture with a size drew as an empty frame on a phone (seen in the
       14 Nov film), and his picture's own alpha does the rest */
    const seen = () => im.classList.add('is-in');
    im.addEventListener('load', seen, { once: true });
    im.addEventListener('error', seen, { once: true });
    if (im.dataset.srcset) im.srcset = im.dataset.srcset;
    im.src = im.dataset.src;
    im.removeAttribute('data-src');
    im.removeAttribute('data-srcset');
    if (im.complete && im.naturalWidth > 0) seen();
  }));
  const adrift = () => {
    const on = !!dome && !document.hidden && !html.classList.contains('gate-pending') && moving();
    room.classList.toggle('is-adrift', on);
  };
  adrift();
  document.addEventListener('visibilitychange', adrift);
  new MutationObserver(adrift).observe(html, { attributes: true, attributeFilter: ['class'] });
  onChange(calm, adrift);

  /* ---------- 2b. the bud that turns (assets/bud3d.v1.js, 14 Nov 2026): fetched 0.9 s after load, so nothing new stands in line before
     the room picture; its own script waits for the gate and a breath more before it builds anything ---------- */
  afterLoad(900, () => {
    if (document.querySelector('script[src$="bud3d.v1.js"]')) return;
    const s = document.createElement('script');
    s.src = 'assets/bud3d.v1.js';
    s.async = true;
    document.head.appendChild(s);
  });

  /* ---------- 3. the doors ---------- */
  const doors = [...room.querySelectorAll('a.door')];
  if (!doors.length) return;
  const can = () => !strip.matches;   // in the strip the doors are a picture to swipe and tap; his script has them
  const build = (door) => {
    let open = door.querySelector('.door__open');
    if (open) return open;
    const src = roomImg && (roomImg.currentSrc || roomImg.src);
    open = document.createElement('span');
    open.className = 'door__open';
    open.setAttribute('aria-hidden', 'true');
    const beyond = document.createElement('span');
    beyond.className = 'door__beyond';
    open.appendChild(beyond);
    ['l', 'r'].forEach((side) => {
      const leaf = document.createElement('span');
      leaf.className = `door__leaf door__leaf--${side}`;
      const pic = new Image();
      pic.alt = '';
      pic.draggable = false;
      pic.src = src;
      leaf.appendChild(pic);
      open.appendChild(leaf);
    });
    door.insertBefore(open, door.firstChild);
    return open;
  };
  const timers = new Map();
  const later = (door, ms, fn) => { clearTimeout(timers.get(door)); timers.set(door, setTimeout(fn, ms)); };
  let leaving = false;
  const peek = (door) => {
    if (leaving || !can()) return;
    clearTimeout(timers.get(door));
    doors.forEach((d) => { if (d !== door && d.classList.contains('is-peek')) shut(d); });   // one door open at a time: a skim across the row leaves none ajar
    build(door);
    void door.offsetWidth;   // the leaves start from the shut frame
    door.classList.add('is-peek');
  };
  const shut = (door) => {
    if (leaving) return;
    door.classList.remove('is-peek');
    /* once the leaves have met again the built doorway goes, so his click path finds the door as he left it */
    later(door, 520, () => { if (!door.classList.contains('is-peek') && !door.classList.contains('is-opening')) door.querySelectorAll('.door__open').forEach((el) => el.remove()); });
  };
  const wanted = (door) => (fine.matches && door.matches(':hover')) || door.matches(':focus-visible');
  doors.forEach((door) => {
    door.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || !fine.matches) return;
      if (room.classList.contains('rest')) return;   // just boarded: the pointer may be sitting on a door; his script lifts rest on the first move
      later(door, 50, () => { if (wanted(door)) peek(door); });   // a pointer only passing through opens nothing
    });
    door.addEventListener('pointerleave', () => { later(door, 90, () => { if (!wanted(door)) shut(door); }); });
    door.addEventListener('focusin', () => { if (door.matches(':focus-visible')) peek(door); });
    door.addEventListener('focusout', () => { later(door, 60, () => { if (!wanted(door)) shut(door); }); });
  });
  /* after boarding his script holds the doors still (rest) until the first move of the pointer; when that hold lifts, the door the
     pointer already stands on opens, as if it had just been entered (a one-shot pointermove listener could not do this: the first move
     of a visit happens on the gate and spends it, as the critique of 13 Nov found) */
  new MutationObserver(() => {
    if (room.classList.contains('rest') || !fine.matches) return;
    const door = doors.find((d) => d.matches(':hover'));
    if (door && !door.classList.contains('is-peek')) later(door, 50, () => { if (wanted(door)) peek(door); });
  }).observe(room, { attributes: true, attributeFilter: ['class'] });

  /* a click on an open door goes through it: the room pushes toward the light (his is-leaving) and the page opens. Capture, so his click
     handler, which would build a second doorway, never runs for a door that stands open; a click with a modifier key, in the strip or with
     Motion off is left to him and to the browser. */
  stage.addEventListener('click', (e) => {
    const door = e.target.closest('a.door');
    if (!door || !door.classList.contains('is-peek')) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!moving() || !can()) return;
    e.preventDefault();
    e.stopPropagation();
    if (leaving) return;
    leaving = true;
    const hit = door.querySelector('.door__hit');
    if (hit) {
      stage.style.setProperty('--ox', ((hit.offsetLeft + hit.offsetWidth / 2) / stage.offsetWidth * 100).toFixed(2) + '%');
      stage.style.setProperty('--oy', ((hit.offsetTop + hit.offsetHeight * 0.5) / stage.offsetHeight * 100).toFixed(2) + '%');
    }
    door.classList.add('is-opening');
    setTimeout(() => room.classList.add('is-leaving'), 90);
    setTimeout(() => { location.href = door.href; }, 540);
  }, true);
  /* back from the next page out of the cache: every door shut, as his pageshow leaves them */
  addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    leaving = false;
    doors.forEach((d) => { d.classList.remove('is-peek'); clearTimeout(timers.get(d)); });
    adrift();
  });
  onChange(strip, () => { if (strip.matches) doors.forEach((d) => { d.classList.remove('is-peek'); d.querySelectorAll('.door__open').forEach((el) => el.remove()); }); });

  /* ---------- 4. the rooms behind the doors, warmed where a hover can open one: after load, on idle, never in the strip ---------- */
  afterLoad(2500, () => {
    if (strip.matches || !fine.matches || !moving()) return;
    const warm = () => doors.forEach((d) => { const n = (d.className.match(/door--([1-6])/) || [])[1]; if (n) new Image().src = `assets/img/door-view-${n}-360.webp`; });
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 4000 }); else setTimeout(warm, 500);
  });
})();
