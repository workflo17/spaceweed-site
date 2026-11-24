/* Space Weed music player.
   Add a song: put the mp3 in assets/audio/ and add a line to TRACKS below. Tracks play in this order and loop.
   Behaviour: off until the visitor presses play. If they leave it on, the next page they open picks up the same song at
   the same spot (browsers sometimes block sound on a new page until the visitor taps; then the dock says "tap to resume").
   Nothing loads until the first press, so the song costs page visitors nothing unless they ask for it. */
(function () {
  "use strict";

  var TRACKS = [
    { title: "Purp", file: "purp-spaceweed-rap.mp3" }
  ];

  var KEY = "sw-music";
  var VOLUME = 0.6;

  if (!TRACKS.length || !("Audio" in window)) return;
  // No music on the age gate.
  if (/\/gate(\/|$)/.test(location.pathname) || document.documentElement.classList.contains("is-gated")) return;

  var script = document.currentScript || document.querySelector('script[src*="music.v1.js"]');
  var base = script ? script.src.replace(/music\.v1\.js(\?.*)?$/, "audio/") : "assets/audio/";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* private mode: just don't remember */ }
  }

  var state = load();
  var index = Math.min(Math.max(parseInt(state.i, 10) || 0, 0), TRACKS.length - 1);
  var audio = null;
  var wantOn = false; // what the visitor asked for; the browser pausing on page exit doesn't change it

  var svgPlay = '<svg class="swm__i-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>';
  var svgPause = '<svg class="swm__i-pause" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z"/></svg>';
  var svgNext = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 2.5v11l7-5.5zM10.5 2.5h3v11h-3z"/></svg>';

  var dock = document.createElement("div");
  dock.className = "swm" + (TRACKS.length > 1 ? " swm--multi" : "");
  dock.setAttribute("role", "region");
  dock.setAttribute("aria-label", "Music");
  dock.innerHTML =
    '<button type="button" class="swm__btn" aria-pressed="false" aria-label="Play music">' + svgPlay + svgPause + "</button>" +
    '<span class="swm__meta"><span class="swm__bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
    '<span class="swm__label">Music</span><span class="swm__title"></span></span>' +
    '<button type="button" class="swm__next" aria-label="Next song">' + svgNext + "</button>";

  var btn = dock.querySelector(".swm__btn");
  var nextBtn = dock.querySelector(".swm__next");
  var titleEl = dock.querySelector(".swm__title");

  function showTitle() { titleEl.textContent = TRACKS[index].title; }

  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio();
    audio.preload = "auto";
    audio.volume = VOLUME;
    audio.addEventListener("ended", function () { go(index + 1, true); });
    audio.addEventListener("play", function () { setOn(true); });
    audio.addEventListener("pause", function () { if (!audio.ended) setOn(false); });
    audio.addEventListener("error", function () { setOn(false); });
    setSource(state.t || 0);
    return audio;
  }

  function setSource(at) {
    audio.src = base + TRACKS[index].file;
    if (at > 0) {
      audio.addEventListener("loadedmetadata", function seek() {
        audio.removeEventListener("loadedmetadata", seek);
        if (at < audio.duration - 1) audio.currentTime = at;
      });
    }
    showTitle();
    if ("mediaSession" in navigator && window.MediaMetadata) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: TRACKS[index].title, artist: "Space Weed" });
    }
  }

  function setOn(on) {
    dock.classList.toggle("is-on", on);
    if (on) dock.classList.remove("is-blocked");
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Pause music" : "Play music");
  }

  function persist(on) {
    wantOn = on;
    save({ on: on, i: index, t: audio ? Math.floor(audio.currentTime) : 0 });
  }

  function play() {
    ensureAudio();
    var p = audio.play();
    if (p && p.catch) {
      p.catch(function () { setOn(false); dock.classList.add("is-blocked"); });
    }
  }

  function go(i, keepPlaying) {
    index = (i + TRACKS.length) % TRACKS.length;
    ensureAudio();
    setSource(0);
    if (keepPlaying) play();
    persist(keepPlaying);
  }

  btn.addEventListener("click", function () {
    if (audio && !audio.paused) { audio.pause(); persist(false); }
    else { play(); persist(true); }
  });
  nextBtn.addEventListener("click", function () { go(index + 1, true); });

  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play", function () { play(); persist(true); });
      navigator.mediaSession.setActionHandler("pause", function () { if (audio) audio.pause(); persist(false); });
      if (TRACKS.length > 1) navigator.mediaSession.setActionHandler("nexttrack", function () { go(index + 1, true); });
    } catch (e) { /* older browsers */ }
  }

  // Remember the spot when leaving the page, so the next page carries on.
  window.addEventListener("pagehide", function () { if (audio) save({ on: wantOn, i: index, t: Math.floor(audio.currentTime) }); });
  setInterval(function () { if (audio && !audio.paused && wantOn) persist(true); }, 3000);

  // Stay out of the way while the "Are you 21?" screen is up; appear once it closes.
  function gateUp() {
    var h = document.documentElement.classList;
    if (h.contains("gate-pending") || h.contains("gate-open")) return true;
    var g = document.getElementById("gate");
    if (!g || g.hidden) return false;
    var cs = getComputedStyle(g);
    return cs.display !== "none" && cs.visibility !== "hidden";
  }

  function mount() {
    showTitle();
    if (document.querySelector(".dossiertab")) dock.classList.add("swm--lift");
    document.body.appendChild(dock);
    var started = false;
    function check() {
      var up = gateUp();
      dock.hidden = up;
      if (!up && !started) { started = true; if (state.on) { wantOn = true; play(); } }
    }
    check();
    if (!started) {
      var mo = new MutationObserver(function () { check(); if (started) mo.disconnect(); });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      var g = document.getElementById("gate");
      if (g) mo.observe(g, { attributes: true, attributeFilter: ["hidden", "class", "style"] });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
