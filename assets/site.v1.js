(() => {
  'use strict';
  const html = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const motionOn = () => !html.classList.contains('motion-off') && !calm.matches;
  const launch = { fired: false, listeners: [] };
  const onLaunch = (fn) => { if (launch.fired) fn(); else launch.listeners.push(fn); };
  const fireLaunch = () => { if (launch.fired) return; launch.fired = true; launch.listeners.forEach((fn) => fn()); launch.listeners = []; };
  (() => {
    const gate = document.getElementById('gate');
    if (!gate) { html.classList.remove('gate-pending'); fireLaunch(); return; }   // a copy built without the gate must not stay locked
    const chip = document.querySelector('.deck__item--age');
    if (chip && !chip.querySelector('button')) {
      const again = document.createElement('button');
      again.type = 'button'; again.className = 'deck__again'; again.textContent = chip.textContent.trim();
      again.setAttribute('aria-label', `${again.textContent} · show the age check again`);
      chip.replaceChildren(again);
      again.addEventListener('click', () => {
        try { localStorage.removeItem('sw-age-ok'); } catch {  }
        try { sessionStorage.removeItem('sw-age-ok'); } catch {  }
        location.reload();
      });
    }
    if (!html.classList.contains('gate-pending')) { fireLaunch(); return; }
    const behind = [...document.body.children].filter((el) => el !== gate && el.tagName !== 'SCRIPT');
    const write = () => {
      const stamp = String(Date.now());
      try { localStorage.setItem('sw-age-ok', stamp); } catch { try { sessionStorage.setItem('sw-age-ok', stamp); } catch {  } }
    };
    const q = gate.querySelector('.gate__q');
    const buttons = gate.querySelector('.gate__buttons');
    const denied = gate.querySelector('.gate__denied');
    behind.forEach((el) => { el.inert = true; });
    gate.querySelector('[data-gate="yes"]')?.focus();
    gate.addEventListener('click', (e) => {
      const b = e.target.closest('[data-gate]');
      if (!b) return;
      if (b.dataset.gate === 'yes') {
        write();
        behind.forEach((el) => { el.inert = false; });
        gate.setAttribute('aria-hidden', 'true');
        if (motionOn()) {
          const status = gate.querySelector('[data-gate-status]');
          if (status) status.textContent = 'Transporter · energising';
          html.classList.add('gate-opening');
          setTimeout(() => html.classList.add('gate-arriving'), 1100);
          setTimeout(() => { html.classList.remove('gate-pending'); html.classList.remove('gate-opening'); fireLaunch(); }, 1400);
          setTimeout(() => html.classList.remove('gate-arriving'), 2900);
        } else {
          html.classList.remove('gate-pending');
          fireLaunch();
        }
        document.getElementById('main')?.focus({ preventScroll: true });
        return;
      }
      if (b.dataset.gate === 'back') {
        denied.hidden = true; q.hidden = false; buttons.hidden = false;
        gate.querySelector('[data-gate="yes"]')?.focus();
        return;
      }
      q.hidden = true; buttons.hidden = true; denied.hidden = false;
      denied.querySelector('p').tabIndex = -1;
      denied.querySelector('p').focus();
    });
    gate.addEventListener('keydown', (e) => { if (e.key === 'Escape') e.preventDefault(); });
  })();
  (() => {
    const nav = document.getElementById('nav');
    const btn = document.querySelector('.menu-btn');
    if (!nav || !btn) return;
    nav.addEventListener('toggle', (e) => btn.setAttribute('aria-expanded', e.newState === 'open' ? 'true' : 'false'));
    nav.addEventListener('focusout', (e) => { if (nav.matches(':popover-open') && e.relatedTarget && !nav.contains(e.relatedTarget)) nav.hidePopover?.(); });
    if ('command' in HTMLButtonElement.prototype) return;
    document.querySelectorAll('[commandfor="nav"]').forEach((b) => {
      b.addEventListener('click', () => { if (b.getAttribute('command') === 'hide-popover') nav.hidePopover?.(); else nav.togglePopover?.(); });
    });
  })();
  (() => {
    const btns = [...document.querySelectorAll('.motion-btn')];
    if (!btns.length) return;
    const show = () => { const off = html.classList.contains('motion-off'); btns.forEach((btn) => { btn.setAttribute('aria-pressed', off ? 'false' : 'true'); btn.textContent = off ? 'Motion: off' : 'Motion: on'; }); };
    show();
    btns.forEach((btn) => btn.addEventListener('click', () => {
      const off = !html.classList.contains('motion-off');
      html.classList.toggle('motion-off', off);
      try { localStorage.setItem('sw-motion', off ? 'off' : 'on'); } catch {  }
      show();
    }));
  })();
  (() => {
    const pc = document.querySelector('canvas.sky-photo');
    if (!pc) return;
    const paint = () => {
      const img = new Image();
      img.src = 'assets/img/milky-way-1200.webp';
      img.decode().then(() => {
        const draw = () => {
          const W = pc.clientWidth, H = pc.clientHeight;
          pc.width = W; pc.height = H;
          const c = pc.getContext('2d');
          const s = Math.max(W / img.width, H / img.height);
          const w = img.width * s, h = img.height * s;
          c.globalAlpha = 0.22;
          c.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
          pc.classList.add('is-in');
        };
        draw();
        let lastW = innerWidth;
        addEventListener('resize', () => { if (innerWidth !== lastW) { lastW = innerWidth; draw(); } }, { passive: true });
      }).catch(() => {});
    };
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
    const later = () => setTimeout(() => idle(paint, { timeout: 2000 }), 1200);
    if (document.readyState === 'complete') later();
    else addEventListener('load', later, { once: true });
  })();
  (() => {
    const voyage = document.getElementById('deck-voyage');
    const utc = document.getElementById('deck-utc');
    const stage = document.getElementById('deck-stage');
    if (!voyage) return;
    let raf = 0;
    const tick = () => { raf = 0; const max = document.documentElement.scrollHeight - innerHeight; voyage.textContent = String(Math.round(max > 0 ? scrollY / max * 100 : 0)).padStart(2, '0'); };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
    tick();
    const clock = () => { if (utc) utc.textContent = new Date().toISOString().slice(11, 16); };
    clock(); setInterval(clock, 20000);
    if (stage && !document.querySelector('.phase')) stage.closest('.deck__item').hidden = true;
  })();
  (() => {
    const main = document.getElementById('main');
    if (!main) return;
    const secs = [...main.querySelectorAll(':scope > section')];
    if (secs.length < 2) return;
    const nameOf = (s) => {
      if (s.dataset.deck) return s.dataset.deck;
      const h = document.getElementById(s.getAttribute('aria-labelledby') || '') || s.querySelector('h1, h2');
      const t = [...s.querySelectorAll('.tag')].find((el) => !el.closest('figure, form') && (!h || (el.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING)));
      const raw = (t ? t.textContent : h ? h.textContent : '').trim();
      return raw.split('·')[0].replace(/[.?!]$/, '').trim();
    };
    const decks = secs.map((s, i) => ({ el: s, n: String(i + 1).padStart(2, '0'), name: nameOf(s) }));
    const el = (tag, cls, text) => { const e = document.createElement(tag); e.className = cls; if (text != null) e.textContent = text; return e; };
    const scope = document.getElementById('scope');
    let blips = [], marker = null;
    const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
    if (scope) {
      marker = el('span', 'scope__marker');
      scope.append(el('span', 'scope__rail'), el('span', 'scope__ticks'), marker);
      blips = decks.map((d) => {
        const a = el('a', 'scope__blip');
        a.href = '#' + (d.el.getAttribute('aria-labelledby') || d.el.id);
        a.setAttribute('aria-label', `Deck ${d.n} · ${d.name}`);
        scope.append(a); return a;
      });
      const place = () => {
        const max = maxScroll(), H = scope.clientHeight || 1; let last = -Infinity;
        decks.forEach((d, i) => { let y = Math.min(1, d.el.offsetTop / max) * H; if (y < last + 28) y = last + 28; last = y; blips[i].style.top = `${Math.min(100, (y / H) * 100)}%`; });
      };
      place();
      addEventListener('resize', place, { passive: true });
      addEventListener('load', place, { once: true });
    }
    const where = document.getElementById('deck-where');
    const deckName = document.getElementById('deck-name');
    let cur = -1;
    const update = () => {
      if (marker) marker.style.top = `${Math.min(1, scrollY / maxScroll()) * 100}%`;
      const y = scrollY + innerHeight * 0.4;
      let k = 0; decks.forEach((d, i) => { if (d.el.offsetTop <= y) k = i; });
      if (k === cur) return; cur = k;
      if (where) where.textContent = decks[k].n;
      if (deckName && decks[k].el.dataset.deck) deckName.textContent = decks[k].el.dataset.deck;
      blips.forEach((b, i) => b.classList.toggle('is-here', i === k));
    };
    let raf = 0;
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); }, { passive: true });
    update();
    const fields = document.querySelectorAll('.field--frost, .field--paper');
    if (fields.length && 'IntersectionObserver' in window) {
      [['lit-top', 5], ['lit-mid', 50], ['lit-bot', 95]].forEach(([cls, p]) => {
        const under = new Set();
        const io = new IntersectionObserver((es) => { es.forEach((e) => (e.isIntersecting ? under.add(e.target) : under.delete(e.target))); html.classList.toggle(cls, under.size > 0); }, { rootMargin: `-${p}% 0px -${100 - p}% 0px` });
        fields.forEach((f) => io.observe(f));
      });
    }
  })();
  (() => {
    const r = document.querySelector('.reticle');
    if (!r || !fine.matches) return;
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, raf = 0, on = false;
    const tick = () => {
      raf = 0;
      x += (tx - x) * 0.22; y += (ty - y) * 0.22;
      r.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      if (Math.abs(tx - x) > 0.3 || Math.abs(ty - y) > 0.3) raf = requestAnimationFrame(tick);
    };
    document.addEventListener('pointermove', (e) => {
      if (!motionOn()) return;
      tx = e.clientX; ty = e.clientY;
      if (!on) { on = true; r.classList.add('is-on'); }
      r.classList.toggle('is-aim', !!e.target.closest('a, button, input, [role="button"]'));
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    document.addEventListener('pointerleave', () => { on = false; r.classList.remove('is-on'); });
    document.documentElement.addEventListener('mouseleave', () => { on = false; r.classList.remove('is-on'); });
  })();
  (() => {
    document.querySelectorAll('.tag[data-type]').forEach((t) => t.style.setProperty('--n', String(t.textContent.trim().length)));
    const els = [...document.querySelectorAll('[data-reveal], .tag[data-type], .how__figure')];
    if (!els.length) return;
    if (!('IntersectionObserver' in window) || !motionOn()) { els.forEach((el) => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
    els.forEach((el) => io.observe(el));
    setTimeout(() => els.forEach((el) => { el.classList.add('is-in'); io.unobserve(el); }), 1200);
  })();
  (() => {
    if (!motionOn() || !CSS.supports('selector(html:active-view-transition-type(door))')) return;
    const warm = () => {
      const narrow = matchMedia('(max-width: 700px)').matches;
      [narrow ? 'assets/img/airlock-leaves-tall-768.webp' : 'assets/img/airlock-leaves-1280.webp', 'assets/img/port-glass-320.webp', 'assets/img/frost-640.webp']
        .forEach((src) => { const im = new Image(); im.src = src; });
    };
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
    const later = () => setTimeout(() => idle(warm, { timeout: 3000 }), 1400);
    if (html.classList.contains('gate-pending')) warm();   // the gate's arrival is through these leaves, within seconds
    else if (document.readyState === 'complete') later();
    else addEventListener('load', later, { once: true });
  })();
  (() => {
    const els = [...document.querySelectorAll('.room, .travel, .intro, .section, .band')];
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-near')); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) {
        e.target.classList.add('is-near');
        for (const im of e.target.querySelectorAll('.chamber img[loading="lazy"]')) im.loading = 'eager';
        io.unobserve(e.target);
      }
    }, { rootMargin: '150% 0px 150% 0px' });
    els.forEach((el) => io.observe(el));
  })();
  (() => {
    if (!CSS.supports('width', 'calc(sibling-index() * 1px)')) {
      document.querySelectorAll('.proof__facts, .engine__stages, .cargo__bays, .cargo__notes, .file__ledger').forEach((list) => {
        [...list.children].forEach((li, i) => li.style.setProperty('--i', String(i)));
      });
    }
    const plates = [...document.querySelectorAll('main .plate')];
    if (!plates.length) return;
    const on = (p) => p.classList.add('is-online');
    if (!('IntersectionObserver' in window) || !motionOn()) { plates.forEach(on); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { on(e.target); io.unobserve(e.target); }
    }, { threshold: 0.35 });
    plates.forEach((p) => io.observe(p));
    setTimeout(() => plates.forEach((p) => { on(p); io.unobserve(p); }), 1500);
  })();
  onLaunch(() => {
    if (!motionOn() || !window.sky) return;
    const bud = document.querySelector('.hero__pic img');
    let fx = 0.72, fy = 0.5;
    if (bud) { const r = bud.getBoundingClientRect(); fx = (r.left + r.width / 2) / innerWidth; fy = (r.top + r.height / 2) / innerHeight; }
    window.sky.warp(fx, fy);
  });
  if (!document.querySelector('canvas.sky')) fireLaunch();
  addEventListener('load', () => { if (!html.classList.contains('gate-pending')) fireLaunch(); });
  (() => {
    if (!fine.matches) return;
    const hero = document.querySelector('.hero__pic');
    const buttons = [...document.querySelectorAll('.button')].map((b) => {
      const inner = b.querySelector('.button__in');
      return { b, inner, x: 0, y: 0, tx: 0, ty: 0, rect: null };
    });
    let raf = 0, mx = 0, my = 0;
    const measure = () => buttons.forEach((o) => { o.rect = o.b.getBoundingClientRect(); });
    const tick = () => {
      raf = 0;
      let busy = false;
      for (const o of buttons) {
        if (!o.inner) continue;
        o.x += (o.tx - o.x) * 0.16; o.y += (o.ty - o.y) * 0.16;
        if (Math.abs(o.tx - o.x) > 0.05 || Math.abs(o.ty - o.y) > 0.05) busy = true;
        o.inner.style.transform = `translate(${o.x.toFixed(2)}px, ${o.y.toFixed(2)}px)`;
      }
      if (busy) raf = requestAnimationFrame(tick);
    };
    document.addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      if (hero) {
        const r = hero.getBoundingClientRect();
        if (my > r.top - 200 && my < r.bottom + 200) { hero.style.setProperty('--lx', `${((mx - r.left) / r.width * 100).toFixed(1)}%`); hero.style.setProperty('--ly', `${((my - r.top) / r.height * 100).toFixed(1)}%`); }
      }
      if (!motionOn()) return;
      for (const o of buttons) {
        if (!o.rect) continue;
        const r = o.rect;
        const dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2);
        const near = mx > r.left - 72 && mx < r.right + 72 && my > r.top - 72 && my < r.bottom + 72;
        if (near) {
          o.tx = Math.max(-10, Math.min(10, dx * 0.28)); o.ty = Math.max(-6, Math.min(6, dy * 0.28));
          o.b.style.setProperty('--mx', `${((mx - r.left) / r.width * 100).toFixed(1)}%`); o.b.style.setProperty('--my', `${((my - r.top) / r.height * 100).toFixed(1)}%`);
        } else { o.tx = 0; o.ty = 0; }
      }
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
    measure();
    addEventListener('resize', measure, { passive: true });
    addEventListener('scroll', () => { clearTimeout(measure._t); measure._t = setTimeout(measure, 120); }, { passive: true });
  })();
  (() => {
    const svg = document.querySelector('.phase');
    const route = document.getElementById('phase-route');
    const you = document.getElementById('phase-you');
    const halo = document.getElementById('phase-halo');
    const along = document.getElementById('phase-along');
    const word = document.getElementById('phase-state');
    const line = document.getElementById('phase-line');
    const chipRow = document.querySelector('.chips');
    const stages = [...document.querySelectorAll('.stage')];
    if (!svg || !route || !you || !along || !word || !line || !chipRow || !route.getTotalLength) return;
    const T0 = -60, T1 = 100, L0 = 0, L1 = 6, W = 1000, H = 660, ML = 150, MR = 48, MT = 64, MB = 110;
    const TT = 273.16, PT = 611.657;
    const tempOf = (x) => T0 + (x - ML) / (W - ML - MR) * (T1 - T0);
    const pressOf = (y) => Math.pow(10, L1 - (y - MT) / (H - MT - MB) * (L1 - L0));
    const pIce = (T) => Math.exp(9.550426 - 5723.265 / T + 3.53068 * Math.log(T) - 0.00728332 * T);
    const pLiq = (T) => Math.exp(54.842763 - 6763.22 / T - 4.210 * Math.log(T) + 0.000367 * T
      + Math.tanh(0.0415 * (T - 218.8)) * (53.878 - 1331.22 / T - 9.44523 * Math.log(T) + 0.014025 * T));
    const pMelt = (T) => { const th = T / TT; return PT * (1 - 0.626000e6 * (1 - Math.pow(th, -3)) + 0.197135e6 * (1 - Math.pow(th, 21.2))); };
    const region = (x, y) => {
      const T = tempOf(x) + 273.15, p = pressOf(y);
      if (T >= TT) return p >= pLiq(T) ? 'liquid' : 'vapour';
      if (p < PT) return p >= pIce(T) ? 'ice' : 'vapour';
      return p <= pMelt(T) ? 'ice' : 'liquid';
    };
    const pts = route.getAttribute('d').replace(/^M/, '').split(/\s*L\s*/).map((s) => s.split(',').map(Number));
    const total = route.getTotalLength();
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const stops = cum.map((c) => c / cum[cum.length - 1]);
    const words = { liquid: 'Liquid water', ice: 'Ice', vapour: 'Vapour' };
    const lines = {
      liquid: 'At harvest the water in the flower is liquid.',
      ice: 'Frozen within an hour of harvest, the water in the flower is ice.',
      vapour: 'Below the triple point, ice turns straight to vapour and is pulled out of the chamber. It does not melt.',
    };
    const legWords = { 2: { ice: 'Ice, drying' } };
    const legLines = { 2: { ice: 'Still ice. The pressure is now below the triple point, so as the flower warms the ice can only leave as vapour.' } };
    const names = stages.map((s) => s.querySelector('.stage__title')?.textContent.trim() || '');
    const step = Number(along.step) || 1;
    const chips = names.map((name, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = name;
      b.addEventListener('click', () => { along.value = Math.min(1000, Math.ceil((stops[i] ?? 1) * 1000 / step) * step); update(); svg.classList.add('is-drawn'); });
      chipRow.appendChild(b);
      return b;
    });
    const update = () => {
      const t = along.value / 1000;
      const p = route.getPointAtLength(t * total);
      you.setAttribute('cx', p.x.toFixed(1)); you.setAttribute('cy', p.y.toFixed(1));
      if (halo) { halo.setAttribute('cx', p.x.toFixed(1)); halo.setAttribute('cy', p.y.toFixed(1)); }
      let stage = 0;
      for (let i = 0; i < stops.length; i++) if (t >= stops[i] - 0.001) stage = i;
      stage = Math.min(stage, names.length - 1);
      const r = region(p.x, p.y);
      if (t >= 0.999) { word.textContent = 'Gone as vapour'; line.textContent = 'Over 80% of the water has left as vapour. The flower goes into the jar.'; }
      else { word.textContent = (legWords[stage] && legWords[stage][r]) || words[r]; line.textContent = (legLines[stage] && legLines[stage][r]) || lines[r]; }
      stages.forEach((li, i) => li.classList.toggle('is-on', i === stage));
      chips.forEach((b, i) => b.setAttribute('aria-pressed', i === stage ? 'true' : 'false'));
      const deck = document.getElementById('deck-stage');
      if (deck) deck.textContent = `${String(stage + 1).padStart(2, '0')} ${names[stage]}`;
      along.setAttribute('aria-valuetext', `${names[stage]}: ${word.textContent.toLowerCase()}`);
    };
    along.addEventListener('input', update);
    update();
    window.swPhase = { stops, set(t) { along.value = String(Math.min(1000, Math.round(t * 1000 / step) * step)); update(); svg.classList.add('is-drawn'); }, word: () => word.textContent };
  })();
  (() => {
    const hosts = [...document.querySelectorAll('[data-run], [data-poster]')];
    for (const host of hosts) {
      const line = host.querySelector('.chamber');
      const rail = host.querySelector('[data-rail]');
      if (!line || !rail) continue;
      const names = (host.dataset.stations || '').split(',').map((s) => s.trim()).filter(Boolean);
      const stages = [...host.querySelectorAll('[data-stages] .stage')];
      const hud = line.querySelector('[data-hud]');
      const track = host.querySelector('.run__track');
      const live = () => !!track && getComputedStyle(host).getPropertyValue('--live').trim() === '1';
      const pad = (i) => String(i + 1).padStart(2, '0');
      const holds = [0.17, 0.37, 0.62, 0.83];
      let current = -1;
      const buttons = names.map((name, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'rail__btn';
        b.textContent = `${pad(i)} ${name}`;
        b.setAttribute('aria-label', `Station ${pad(i)} · ${name}`);
        b.addEventListener('click', () => go(i));
        rail.appendChild(b);
        return b;
      });
      const setOn = (i, state) => {
        if (i === current && !state) return;
        current = i;
        stages.forEach((s, k) => s.classList.toggle('is-on', k === i));
        buttons.forEach((b, k) => b.setAttribute('aria-current', k === i ? 'true' : 'false'));
        if (hud) hud.textContent = `Stage ${pad(i)} of 04${state ? ` · ${state}` : ''}`;
        const deck = document.getElementById('deck-stage');
        if (deck && names[i]) deck.textContent = `${pad(i)} ${names[i]}`;
      };
      const go = (i) => {
        if (live()) {
          const top = track.getBoundingClientRect().top + scrollY + holds[i] * (track.offsetHeight - innerHeight);
          scrollTo({ top, behavior: motionOn() ? 'smooth' : 'auto' });
          return;
        }
        line.classList.remove('chamber--go-1', 'chamber--go-2', 'chamber--go-3', 'chamber--go-4');
        line.classList.add(`chamber--go-${i + 1}`);
        setOn(i);
      };
      if (!live()) { buttons.forEach((b) => b.setAttribute('aria-current', 'false')); continue; }
      const readout = document.querySelector('.readout[aria-live]');
      if (readout) readout.setAttribute('aria-live', 'off');
      const stops = window.swPhase?.stops || [0, 0.33, 0.67, 1];
      const map = [[0, 0], [0.24, 0], [0.44, stops[1]], [0.52, stops[1]], [0.58, stops[2]], [0.72, 1], [1, 1]];
      const tOf = (p) => {
        for (let k = 1; k < map.length; k++) {
          if (p <= map[k][0]) { const [p0, t0] = map[k - 1], [p1, t1] = map[k]; return t0 + (t1 - t0) * ((p - p0) / (p1 - p0 || 1)); }
        }
        return 1;
      };
      let raf = 0, lastT = -1;
      const onScroll = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = track.getBoundingClientRect();
          const span = track.offsetHeight - innerHeight;
          if (r.bottom < 0 || r.top > innerHeight || span <= 0) return;
          const p = Math.min(1, Math.max(0, -r.top / span));
          const i = p < 0.26 ? 0 : p < 0.48 ? 1 : p < 0.74 ? 2 : 3;
          const t = Math.round(tOf(p) * 100) / 100;
          if (window.swPhase && t !== lastT) { lastT = t; window.swPhase.set(t); }
          setOn(i, window.swPhase ? window.swPhase.word() : '');
        });
      };
      addEventListener('scroll', onScroll, { passive: true });
      addEventListener('resize', onScroll, { passive: true });
      onScroll();
    }
  })();
  (() => {
    const travels = [...document.querySelectorAll('main > .travel')];
    if (!travels.length || !CSS.supports('animation-timeline: view()')) return;
    const pinnedMq = matchMedia('(prefers-reduced-motion: no-preference) and (min-height: 520px)');
    const live = () => pinnedMq.matches && !html.classList.contains('motion-off') && !html.classList.contains('gate-pending');
    const roomBefore = (t) => { let el = t.previousElementSibling; while (el && !el.classList.contains('room')) el = el.previousElementSibling; return el; };
    const roomAfter = (t) => { let el = t.nextElementSibling; while (el && !el.classList.contains('room')) el = el.nextElementSibling; return el; };
    let riding = false, ridingIn = null, quiet = null, raf = 0, lastWheel = 0, lastTouch = 0, prevY = scrollY;
    const inZone = (t, y, vh) => y > t.offsetTop - vh * 0.6 && y < t.offsetTop + t.offsetHeight;
    const stop = () => { riding = false; ridingIn = null; if (raf) cancelAnimationFrame(raf); raf = 0; html.classList.remove('is-riding'); };
    const handBack = () => { if (riding) { quiet = ridingIn; stop(); } };
    addEventListener('wheel', () => { lastWheel = performance.now(); handBack(); }, { passive: true });
    addEventListener('touchstart', () => { lastTouch = performance.now(); handBack(); }, { passive: true });
    addEventListener('touchmove', () => { lastTouch = performance.now(); }, { passive: true });
    addEventListener('touchend', () => { lastTouch = performance.now(); }, { passive: true });
    addEventListener('keydown', (e) => { if (/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End|Escape| )$/.test(e.key)) { lastWheel = performance.now(); handBack(); } });
    addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.clientX > innerWidth - 24) handBack(); }, { passive: true });   // the scrollbar
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const ride = (t, to, ms) => {
      stop();
      const from = scrollY, t0 = performance.now();
      riding = true; ridingIn = t;
      window.swRideLast = { from, to, ms };   // read by tools/ride.mjs
      html.classList.add('is-riding');
      const step = (now) => {
        if (!riding) return;
        const p = Math.min(1, (now - t0) / ms);
        scrollTo({ top: from + (to - from) * ease(p), behavior: 'instant' });
        prevY = scrollY;
        if (p < 1) raf = requestAnimationFrame(step); else stop();
      };
      raf = requestAnimationFrame(step);
    };
    const onScroll = () => {
      const y = scrollY, dir = y > prevY ? 1 : y < prevY ? -1 : 0;
      prevY = y;
      if (riding || !dir || !live()) return;
      const now = performance.now();
      if (now - lastWheel > 400 && now - lastTouch > 1600) return;   // not the visitor's own scroll
      const vh = innerHeight;
      if (quiet) { if (inZone(quiet, y, vh)) return; quiet = null; }
      for (const t of travels) {
        const top = t.offsetTop, bottom = top + t.offsetHeight;
        const ms = 1300 + (t.offsetHeight / vh) * 420;
        if (dir > 0 && y > top - vh * 0.6 && y < bottom - vh) { const next = roomAfter(t); if (next) ride(t, next.offsetTop, ms); return; }
        if (dir < 0 && y < bottom - vh * 0.4 && y > top) { const prev = roomBefore(t); if (prev) ride(t, prev.offsetTop, ms); return; }
      }
    };
    addEventListener('scroll', onScroll, { passive: true });
  })();
  (() => {
    const clips = [...document.querySelectorAll('video[data-clip], video[data-sky]')];
    if (!clips.length) return;
    const inView = new Set();
    const held = new Set();
    let ready = false;   // no clip fetches a byte until the page has loaded and settled: the first picture comes first
    let readySky = false;   // the sky footage is the first window's largest paint: it starts at load, without the beat
    const sync = (v) => {
      const ok = v.hasAttribute('data-sky') ? readySky : ready;
      if (!ok || held.has(v) || !inView.has(v) || !motionOn()) { v.pause(); v.classList.remove('is-playing'); return; }
      v.play().then(() => v.classList.add('is-playing')).catch(() => {});
    };
    if ('IntersectionObserver' in window) {
      const watch = new IntersectionObserver((entries) => { for (const e of entries) { if (e.isIntersecting) inView.add(e.target); else inView.delete(e.target); sync(e.target); } }, { threshold: 0.2 });
      clips.forEach((v) => watch.observe(v));
    }
    const arm = () => { ready = true; clips.forEach(sync); };
    const armSky = () => { readySky = true; clips.forEach(sync); setTimeout(arm, 1200); };
    const slow = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));
    if (slow) {  }
    else if (document.readyState === 'complete') armSky();
    else addEventListener('load', armSky, { once: true });
    clips.forEach((v) => {
      const toggle = v.closest('figure, section')?.querySelector('[data-clip-toggle]');
      if (!toggle) return;
      const show = () => { const off = held.has(v) || !motionOn(); toggle.setAttribute('aria-pressed', off ? 'true' : 'false'); toggle.textContent = off ? 'Play the clip' : 'Pause the clip'; };
      toggle.hidden = false; show();
      toggle.addEventListener('click', () => {
        if (!motionOn() && !held.has(v)) { held.add(v); }
        if (held.has(v)) { held.delete(v); if (!motionOn()) { v.play().then(() => v.classList.add('is-playing')).catch(() => {}); toggle.setAttribute('aria-pressed', 'false'); toggle.textContent = 'Pause the clip'; return; } }
        else held.add(v);
        show(); sync(v);
      });
    });
    const resync = () => clips.forEach(sync);
    calm.addEventListener('change', resync);
    new MutationObserver(resync).observe(html, { attributes: true, attributeFilter: ['class'] });
  })();
  (() => {
    document.querySelectorAll('[data-file]').forEach((fig) => {
      const sheets = [...fig.querySelectorAll('.sheet')];
      const rows = [...fig.querySelectorAll('.file__row')];
      const ticks = [...fig.querySelectorAll('.file__tick')];
      const n = sheets.length;
      if (!n) return;
      const front = (k) => {
        sheets.forEach((s, i) => { const pos = (i - k + n) % n; s.style.setProperty('--i', String(pos)); s.classList.toggle('is-front', pos === 0); });
        rows.forEach((r, i) => r.classList.toggle('is-front', i === k));
        ticks.forEach((t, i) => t.classList.toggle('is-front', i === k));
      };
      fig.addEventListener('click', (e) => { const b = e.target.closest('[data-sheet]'); if (!b) return; front(Number(b.dataset.sheet)); });
    });
  })();
  (() => {
    const form = document.querySelector('.form[data-mailto]:not([data-compose])');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get('name') || '').toString().trim();
      const about = (data.get('about') || '').toString().trim();
      const message = (data.get('message') || '').toString().trim();
      const subject = about ? `Space Weed: ${about}` : 'Space Weed';
      const body = `${message}\n\n${name ? `From ${name}` : ''}`.trim();
      location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const note = form.querySelector('[data-form-note]');
      if (note) note.textContent = 'Your mail app should have opened with the message filled in. If it did not, write to info@spaceweedusa.com.';
    });
  })();
  (() => {
    const form = document.querySelector('form[data-compose]');
    if (!form) return;
    const store = form.querySelector('#c-store');
    const city = form.querySelector('#c-city');
    const entry = form.querySelector('[data-entry]');
    const note = form.querySelector('[data-compose-note]');
    const copy = form.querySelector('[data-copy]');
    if (!store || !city || !entry || !note) return;
    const fills = { store: [...form.querySelectorAll('[data-fill="store"]')], city: [...form.querySelectorAll('[data-fill="city"]')] };
    const blank = { store: 'your store’s name', city: 'your city' };
    const clean = (v) => v.replace(/\s+/g, ' ').trim();
    const render = () => {
      const s = clean(store.value), c = clean(city.value);
      fills.store.forEach((el) => { el.textContent = s || blank.store; el.classList.toggle('is-empty', !s); });
      fills.city.forEach((el) => { el.textContent = c || blank.city; el.classList.toggle('is-empty', !c); });
      entry.textContent = s ? (c ? `${s}, ${c}` : s) : 'Nothing written yet';
      form.classList.toggle('is-ready', !!s);   // the little hatch shuts once an entry is written; the caption says it is only written here
    };
    const letter = () => {
      const s = clean(store.value), c = clean(city.value);
      const lines = ['Hello Space Weed,', '', 'Here is a store for your list.', '', `Store: ${s}`];
      if (c) lines.push(`City: ${c}`);
      lines.push('', 'Thank you.');
      return lines.join('\r\n');
    };
    form.addEventListener('input', render);
    render();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      location.href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent('A store for the Space Weed list')}&body=${encodeURIComponent(letter())}`;
      form.classList.add('is-filed');
      note.textContent = 'Your mail app should have opened with the message filled in. Nothing was sent from this page. If it did not open, write to info@spaceweedusa.com.';
    });
    if (copy) {
      copy.hidden = false;
      copy.addEventListener('click', async () => {
        if (!form.reportValidity()) return;
        const text = `To: info@spaceweedusa.com\r\nSubject: A store for the Space Weed list\r\n\r\n${letter()}`;
        try {
          await navigator.clipboard.writeText(text);
          form.classList.add('is-filed');
          note.textContent = 'Copied. Paste it into an email to info@spaceweedusa.com. Nothing was sent from this page.';
        } catch {
          const box = form.querySelector('.compose__letter');
          if (box && getSelection) getSelection().selectAllChildren(box);
          note.textContent = 'Copying was blocked, so the message is selected instead: press Ctrl+C, or Cmd+C on a Mac.';
        }
      });
    }
  })();
  (() => {
    if (!motionOn() || !('IntersectionObserver' in window)) return;
    const targets = [...document.querySelectorAll('main .head, main .statement')].filter((el) => !el.closest('.hero') && !el.closest('.intro') && el.getBoundingClientRect().top > innerHeight * 0.9);
    if (!targets.length) return;
    const load = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    const go = async () => {
      try {
        await load('assets/vendor/gsap.min.js');
        await Promise.all([load('assets/vendor/ScrollTrigger.min.js'), load('assets/vendor/SplitText.min.js')]);
      } catch { return; }
      if (!window.gsap || !window.SplitText || !window.ScrollTrigger || !motionOn()) return;
      gsap.registerPlugin(ScrollTrigger, SplitText);
      await document.fonts.ready;
      const tweens = [];
      targets.forEach((el) => {
        if (el.getBoundingClientRect().top < innerHeight * 0.85) return;
        el.classList.add('is-split');
        SplitText.create(el, {
          type: 'lines', mask: 'lines', aria: 'none', autoSplit: true,   
          onSplit: (self) => { const t = gsap.from(self.lines, { yPercent: 105, duration: 0.6, stagger: 0.06, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 96%', once: true } }); tweens.push(t); return t; },
        });
      });
      ScrollTrigger.refresh();
      const finish = () => tweens.forEach((t) => { if (t.progress() < 1) t.progress(1); });
      addEventListener('resize', () => { if (innerHeight > 1800) finish(); }, { passive: true });
      addEventListener('beforeprint', finish);
      if (innerHeight > 1800) finish();
    };
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 600));
    const later = () => setTimeout(() => idle(go, { timeout: 1500 }), 1200);
    if (document.readyState === 'complete') later();
    else addEventListener('load', later, { once: true });
  })();
})();
