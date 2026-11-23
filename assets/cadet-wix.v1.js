/* Angel's Classified sign-up, sent to the client's Wix list (ours, not his; 23 Nov 2026; design/EDITS-2026-11-23-signup.md).
   His form and his script (cadet.v1.js) stay exactly as they are. This file is loaded before his and listens on the document, so it
   hears a submit ahead of his own listener. On a submit it holds the event, sends the request to Wix (the same two calls as the
   sign-up window, site.js section 9b: a visitor token, then the submission), and only when Wix accepts does it let his script run,
   which shows the Space Cadet card. If Wix refuses or cannot be reached, his form stays and a line under the button says so.
   The browser checks the required email and the 21+ box before any submit, as his form always did, and Wix refuses a request
   without the 21+ box as well. A field no person sees stops a script that fills every field, and a request made within 2 s of the
   first touch waits out the rest. When the form carries no data-wix (src/signup.json emptied) this file does nothing and his page
   works as it did before. */
(() => {
  'use strict';
  const form = document.getElementById('signup');
  if (!form || !form.dataset.wix) return;
  let wix = null;
  try { wix = JSON.parse(form.dataset.wix); } catch (e) { return; }
  const button = form.querySelector('button[type="submit"]');
  if (!wix || !wix.client || !wix.form || !wix.fields || !button) return;
  const API = 'https://www.wixapis.com';
  const firstLabel = button.textContent;

  // a line for what is happening, under the button; and the unseen field (assets/board-room.v1.css hides its box)
  const status = document.createElement('p');
  status.className = 'form__fine cadet-status';
  status.setAttribute('role', 'status');
  button.insertAdjacentElement('afterend', status);
  const trapBox = document.createElement('div');
  trapBox.className = 'cadet-trap';
  trapBox.setAttribute('aria-hidden', 'true');
  const trap = document.createElement('input');
  trap.type = 'text';
  trap.name = 'website';
  trap.id = 'su-website';
  trap.tabIndex = -1;
  trap.autocomplete = 'off';
  const trapLabel = document.createElement('label');
  trapLabel.htmlFor = 'su-website';
  trapLabel.textContent = 'Website (leave this empty)';
  trapBox.append(trapLabel, trap);
  button.insertAdjacentElement('beforebegin', trapBox);

  let armedAt = 0;
  let sending = false;
  let accepted = false;
  form.addEventListener('focusin', () => { if (!armedAt) armedAt = Date.now(); });

  const post = async (values) => {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    try {
      const tr = await fetch(`${API}/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: wix.client, grantType: 'anonymous' }), signal: ctl.signal });
      if (!tr.ok) throw new Error(`token ${tr.status}`);
      const token = (await tr.json()).access_token;
      const r = await fetch(`${API}/form-submission-service/v4/submissions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token },
        body: JSON.stringify({ submission: { formId: wix.form, submissions: values } }), signal: ctl.signal });
      if (!r.ok) throw new Error(`submit ${r.status}`);
    } finally { clearTimeout(timer); }
  };
  // hand the submit on to his script: a second submit that this file lets through
  const pass = () => {
    accepted = true;
    if (typeof form.requestSubmit === 'function') form.requestSubmit(button);
    else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  };

  document.addEventListener('submit', (e) => {
    if (e.target !== form) return;
    if (accepted) { accepted = false; return; }   // Wix has the request (or the unseen field was filled): his script takes it from here
    e.preventDefault();
    e.stopImmediatePropagation();
    if (sending) return;
    if (trap.value) { pass(); return; }
    const f = wix.fields;
    const values = { [f.email]: form.elements.email.value.trim(), [f.age]: true, [f.subscribe]: true };
    const first = (form.elements.name && form.elements.name.value || '').trim();
    if (first) values[f.first] = first;
    if (f.Cadet) values[f.Cadet] = true;   // this page's promise: signing up makes you a Space Cadet
    sending = true;
    form.setAttribute('aria-busy', 'true');
    button.textContent = 'Sending…';
    status.textContent = 'Sending your request…';
    const wait = Math.max(0, 2000 - (Date.now() - (armedAt || Date.now())));
    (async () => {
      let ok = false;
      try {
        if (wait) await new Promise((res) => setTimeout(res, wait));
        await post(values);
        ok = true;
      } catch (err) {
        status.textContent = 'That did not go through. Try again in a moment, or write to info@spaceweedusa.com.';
      } finally {
        sending = false;
        form.removeAttribute('aria-busy');
        button.textContent = firstLabel;
      }
      if (ok) { status.textContent = ''; pass(); }   // outside the try: a fault in his script is not a failed request
    })();
  }, true);
})();
