/* Runs in the head before first paint: marks the page as scripted, decides whether the age gate shows,
   reads the visitor's motion choice, and registers the page-transition handlers (the ship's doors).
   Everything that must be true at first paint and nothing more. */
document.documentElement.classList.add('js');
(function () {
  var html = document.documentElement;
  /* the age answer lasts one visit, as Angel's gate keeps it (Don, 13 Nov 2026): it is read from sessionStorage only, and the old
     30-day copy in localStorage is cleared, as his pages clear it. A reload asks again (the review build: the client can see the gate
     on any page with a refresh); moving between pages does not. (His pages also ask when a visit arrives from another site with the
     tab's answer still kept; these pages do not, which only matters for a visitor who types an address into a tab that has answered.) */
  var ok = 0;
  try { ok = Number(sessionStorage.getItem('sw-age-ok') || 0); } catch (e) { ok = 0; }
  try { localStorage.removeItem('sw-age-ok'); } catch (e) { /* the old 30-day memory, retired */ }
  var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
  var reload = nav ? nav.type === 'reload' : !!(performance.navigation && performance.navigation.type === 1);
  /* ---- the age gate is Angel's (design/GATE-HANDOVER.md). A visitor with no answer is sent to the page that carries it before the first
     paint, with the page they asked for kept in sw-next; that page keeps the answer (sw-age-ok). If this browser cannot keep the answer,
     or the visitor has been sent there three times this session without coming back with one, the gate in the page asks instead, so
     nobody is sent round in a loop. GATE_PAGE '' turns this off: the gate in the page asks, as it did until 13 Nov 2026 (a build with
     --nogate turns it off in its own copy of this file). ---- */
  var GATE_PAGE = 'index.html';   /* since 13 Nov 2026 the home page is Angel's gate and main room (src/board/); it was his 'gate/' page for a day */
  /* the gate page's address is read against the site's root (where this script's folder sits), not against the page's own address, so a
     folder name like 'gate/' works from any page, and the gate page is recognised wherever it is opened from */
  var gateUrl = null;
  try { if (GATE_PAGE) gateUrl = new URL(GATE_PAGE, new URL('../', document.currentScript.src)); } catch (e) { gateUrl = null; }
  var onGate = !!gateUrl && (/\/$/.test(gateUrl.pathname) ? location.pathname.indexOf(gateUrl.pathname) === 0 : location.pathname === gateUrl.pathname);
  var arrive = '';
  try { arrive = sessionStorage.getItem('sw-arrive') || ''; } catch (e) { arrive = ''; }
  if (reload || !ok) {
    var tries = 0, keeps = false;
    try {
      sessionStorage.setItem('sw-probe', '1'); sessionStorage.removeItem('sw-probe');
      tries = Number(sessionStorage.getItem('sw-gate-tries') || 0);
      keeps = true;
    } catch (e) { keeps = false; }
    if (gateUrl && !onGate && keeps && tries < 3) {
      /* sw-arrive is the site's own note to itself: it is used only when the visitor comes back with an answer (the gate page's
         animation was the entrance, so the first screen stands still), and never when they come back without one */
      try { sessionStorage.setItem('sw-gate-tries', String(tries + 1)); sessionStorage.setItem('sw-next', location.pathname + location.search + location.hash); sessionStorage.setItem('sw-arrive', 'still'); } catch (e) { /* tested just above */ }
      /* a reload asks again: the visit's answer is cleared first, or the gate page would find it and let the visitor straight through */
      if (reload) { try { sessionStorage.removeItem('sw-age-ok'); } catch (e) { /* tested just above */ } }
      location.replace(gateUrl.href);
      return;   /* the page is leaving: nothing else here matters */
    }
    try { sessionStorage.removeItem('sw-arrive'); } catch (e) { /* nothing kept */ }   /* the gate in the page asks, with its own airlock */
    html.classList.add('gate-pending');
  } else {
    if (arrive === 'still') html.classList.add('arrive-still');   /* back from the gate page with an answer: the first screen stands still */
    try { sessionStorage.removeItem('sw-arrive'); sessionStorage.removeItem('sw-gate-tries'); } catch (e) { /* nothing kept */ }
  }
  /* the gate holds the scroll, and the scrollbar that comes back when it lifts must not move the page: the page behind it is padded by
     that scrollbar's width (--sbw, read here from a box that always has one, before the first paint), so it is laid out as wide as it
     will be then, while the gate and its airlock, which are fixed, cover the window's whole width. No scrollbar to speak of (a phone,
     an overlay) reads 0 and sets nothing. */
  if (html.classList.contains('gate-pending')) {
    var probe = document.createElement('div');
    probe.style.position = 'absolute'; probe.style.top = '-9999px'; probe.style.width = '100px'; probe.style.height = '100px'; probe.style.overflow = 'scroll';
    html.appendChild(probe);
    var sbw = probe.offsetWidth - probe.clientWidth;
    html.removeChild(probe);
    if (sbw > 0) html.style.setProperty('--sbw', sbw + 'px');
  }
  /* motion: off when the visitor said so, or when the system asks for reduced motion and they have not said otherwise */
  var choice = null;
  try { choice = localStorage.getItem('sw-motion'); } catch (e) { choice = null; }
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (choice === 'off' || (choice === null && reduce)) html.classList.add('motion-off');

  /* ---- the door between pages. One door since 10 Nov 2026: whichever link you leave by, the airlock's leaves close and
     open (door), the same leaves the age gate uses. Until then a door tile grew into the next page (hatch) and the way
     back to the flight deck opened from the link you pressed (iris); both are still in the stylesheet, and the one line
     marked below chooses among them again. The old page leaves the choice and where you pressed in session storage for
     the new one, which sets the transition's type; with motion off both pages skip it. ---- */
  var lastLink = '', lastDoor = null, lastX = -1, lastY = -1;
  addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    lastLink = a.href;
    lastDoor = a.classList.contains('door') ? a : null;
    if (e.detail > 0) { lastX = e.clientX; lastY = e.clientY; }
    else { var r = a.getBoundingClientRect(); lastX = r.left + r.width / 2; lastY = r.top + r.height / 2; }
  }, true);
  function isHome(u) { return /\/(index\.html)?$/.test(u.pathname); }
  function slug(u) { return u.pathname.split('/').pop() || 'index.html'; }

  addEventListener('pageswap', function (e) {
    var vt = e.viewTransition;
    if (!vt) return;
    if (html.classList.contains('motion-off')) { vt.ready.catch(function () {}); vt.finished.catch(function () {}); vt.skipTransition(); return; }
    var toUrl = e.activation && e.activation.entry ? e.activation.entry.url : lastLink;
    if (!toUrl) return;
    var to = new URL(toUrl, location.href);
    /* one door for every way between pages. The three-way choice it replaced, to put back in this line's place:
       lastDoor && !isHome(to) && !to.hash ? 'hatch' : isHome(to) ? 'iris' : 'door'   (and 'iris' for home in pagereveal below) */
    var kind = 'door';
    try { sessionStorage.setItem('sw-vt', lastX + ',' + lastY + ',' + kind); } catch (err) { /* then the new page decides alone */ }
    if (kind === 'hatch') {
      var tile = lastDoor.querySelector('.door__frame') || document.querySelector('a.door[href$="' + slug(to) + '"] .door__frame');
      if (!tile && lastDoor.nextElementSibling && lastDoor.nextElementSibling.classList.contains('door__frame')) tile = lastDoor.nextElementSibling;   /* a door set in a wall: its leaves stand behind the picture, beside the link */
      if (tile) {
        tile.style.viewTransitionName = 'hatch';
        var clear = function () { tile.style.viewTransitionName = ''; };   /* cleared, or a bfcache restore keeps a duplicate name */
        vt.finished.then(clear, clear);
      }
    }
    if (kind === 'door') vt.types.add('door');   /* the old page shows the (transparent) leaves too, so they are named in both states */
  });

  addEventListener('pagereveal', function (e) {
    var vt = e.viewTransition;
    if (!vt) return;
    /* back from the gate page with an answer: its boarding was the way in, so the door between pages does not play on top of it (the gate
       page opts into these transitions too, and without this line the airlock's leaves would close and open after its flash) */
    /* a skipped transition rejects its promises: they are caught, or every skip logs an uncaught error */
    if (html.classList.contains('arrive-still')) { vt.ready.catch(function () {}); vt.finished.catch(function () {}); vt.skipTransition(); return; }
    if (html.classList.contains('motion-off')) { vt.ready.catch(function () {}); vt.finished.catch(function () {}); vt.skipTransition(); return; }
    var note = '';
    try { note = sessionStorage.getItem('sw-vt') || ''; sessionStorage.removeItem('sw-vt'); } catch (err) { note = ''; }
    var parts = note.split(',');
    var kind = parts[2];
    if (kind !== 'hatch' && kind !== 'iris' && kind !== 'door') kind = 'door';   /* no note from the old page (a typed address, another site): the one door */
    vt.types.add(kind);
    html.classList.add('vt');
    html.classList.add('vt-new');
    var x = parseFloat(parts[0]), y = parseFloat(parts[1]);
    if (!(x >= 0 && y >= 0)) { x = innerWidth / 2; y = innerHeight / 2; }
    html.style.setProperty('--vt-x', x + 'px');
    html.style.setProperty('--vt-y', y + 'px');
    var done = function () { html.classList.remove('vt'); html.classList.remove('vt-new'); };
    vt.finished.then(done, done);
    /* for the QA capture tools only: a session value freezes the door mid-way so a still can be taken of it */
    vt.ready.then(function () {
      var T = null;
      try { T = sessionStorage.getItem('sw-vt-freeze'); } catch (err) { T = null; }
      if (T === null) return;
      document.getAnimations().forEach(function (a) {
        var p = a.effect && a.effect.pseudoElement;
        if (!p || p.indexOf('::view-transition') !== 0) return;   /* only the door's own animations, never a scroll-driven one */
        try { a.pause(); a.currentTime = Number(T); } catch (err) { /* a progress-based animation: left alone */ }
      });
    }, function () {});
  });
})();
