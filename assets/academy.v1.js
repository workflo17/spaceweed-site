/* Space Academy: the budtender certification quiz.
   One question per screen. A wrong pick greys out with a hint and the budtender tries again, so everyone who
   finishes has seen every right answer. No score and no fail screen. At the end, a short form claims the certificate.
   PREVIEW BUILD: the form does not send anything yet. Once Don adds the store and source fields to the Wix signup
   form, the claim will post there (same path as the site's signup) and every finisher becomes a lead. */
(() => {
  'use strict';
  const Q = window.SW_ACADEMY || [];
  const root = document.getElementById('academy');
  if (!root || !Q.length) return;

  const $ = (sel) => root.querySelector(sel);
  const intro = $('[data-step="intro"]');
  const quiz = $('[data-step="quiz"]');
  const claim = $('[data-step="claim"]');
  const done = $('[data-step="done"]');
  const bar = $('.ac-progress__fill');
  const count = $('[data-count]');
  const qText = $('[data-q]');
  const list = $('[data-options]');
  const msg = $('[data-msg]');
  const next = $('[data-next]');
  const form = document.getElementById('claim');
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  let i = 0;

  const show = (step) => {
    [intro, quiz, claim, done].forEach((s) => { s.hidden = s !== step; });
    const focusEl = step.querySelector('[data-focus]');
    if (focusEl) focusEl.focus();
  };

  const render = () => {
    const item = Q[i];
    count.textContent = `${i + 1} of ${Q.length}`;
    bar.style.width = `${(i / Q.length) * 100}%`;
    qText.textContent = item.q;
    msg.textContent = '';
    msg.className = 'ac-msg';
    next.hidden = true;
    list.textContent = '';
    item.options.forEach((text, n) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ac-option';
      b.textContent = text;
      b.addEventListener('click', () => pick(n, b));
      li.appendChild(b);
      list.appendChild(li);
    });
    qText.focus();
  };

  const pick = (n, b) => {
    const item = Q[i];
    if (n === item.answer) {
      b.classList.add('is-right');
      list.querySelectorAll('.ac-option').forEach((o) => { o.disabled = true; });
      b.disabled = false;
      b.setAttribute('aria-pressed', 'true');
      msg.textContent = `Nice. ${item.nice}`;
      msg.className = 'ac-msg is-right';
      bar.style.width = `${((i + 1) / Q.length) * 100}%`;
      next.textContent = i === Q.length - 1 ? 'Finish' : 'Next question';
      next.hidden = false;
      next.focus();
    } else {
      b.classList.add('is-wrong');
      b.disabled = true;
      msg.textContent = `Not quite. ${item.hint} Try again.`;
      msg.className = 'ac-msg is-wrong';
    }
  };

  next.addEventListener('click', () => {
    if (i < Q.length - 1) { i += 1; render(); } else { show(claim); }
  });

  $('[data-start]').addEventListener('click', () => { i = 0; show(quiz); render(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const d = new Date();
    const name = form.elements.first.value.trim().slice(0, 24);
    const store = form.elements.store.value.trim().slice(0, 40);
    const issued = `${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]} ${d.getFullYear()}`;
    done.querySelector('[data-card-name]').textContent = name;
    done.querySelector('[data-card-store]').textContent = store;
    done.querySelector('[data-card-issued]').textContent = issued;
    done.querySelector('.card').setAttribute('aria-label', `Space Weed certified budtender card, ${name}, ${store}, issued ${issued}`);
    show(done);
  });

  $('[data-restart]') && $('[data-restart]').addEventListener('click', () => { form.reset(); i = 0; show(intro); });
})();
