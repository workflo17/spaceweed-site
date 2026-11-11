/* The gate page always asks. Runs in the head before first paint: marks the page as scripted, shows the gate,
   reads the visitor's motion choice. Yes stores the answer the way the flight deck reads it, then goes there. */
(function () {
  var html = document.documentElement;
  html.classList.add('js');
  html.classList.add('gate-pending');
  var mo = null;
  try { mo = localStorage.getItem('sw-motion'); } catch (e) { mo = null; }
  if (mo === 'off') html.classList.add('motion-off');
})();
