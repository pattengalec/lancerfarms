/* LFG SITE ENGINE v1
   Load deferred at end of <body>. Pre-paint theme snippet lives inline in <head>.
   INTEGRATION SLOT 1: set CONFIG_URL to the "LFG Public Config API" /exec URL. */

var CONFIG_URL = 'https://script.google.com/macros/s/AKfycbx6rHobDjnx5PC4LI6zKQRmcTyhqDQVj1eDAEXXJcyNwBFW6B33P4Q5JIkaAEfp_7HBIw/exec';

(function () {
  'use strict';
  var CACHE_KEY = 'lfg-config-v1';
  var cfg = null;

  /* ── config: cached render, background refresh ── */
  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch (e) { return null; }
  }
  function fetchConfig() {
    return fetch(CONFIG_URL).then(function (r) { return r.json(); }).then(function (j) {
      var c = (j && j.config) ? j.config : j;
      localStorage.setItem(CACHE_KEY, JSON.stringify(c));
      return c;
    });
  }
  function val(key, fallback) {
    if (!cfg || !(key in cfg)) return fallback;
    var v = cfg[key];
    if (v === 'TRUE' || v === true) return true;
    if (v === 'FALSE' || v === false) return false;
    return v;
  }

  /* ── theme application + announce ── */
  var live;
  function announce(msg) {
    if (!live) { live = document.createElement('div'); live.className = 'sr-live'; live.setAttribute('aria-live', 'polite'); document.body.appendChild(live); }
    live.textContent = msg;
  }
  var THEME_NAMES = { inland: 'Inland Empire', citrus: 'Citrus Grove', night: 'Night Garden', phosphor: 'Phosphor' };
  function applyTheme(t, opts) {
    opts = opts || {};
    var doc = document.documentElement;
    var swap = function () {
      doc.setAttribute('data-theme', t);
      doc.setAttribute('data-scanlines', (t === 'phosphor' && val('phosphor_scanlines', false)) ? 'on' : 'off');
      document.body.classList.toggle('craft', !!val('craft_layer_enabled', true) && t !== 'phosphor');
      doc.style.setProperty('--tilt', (parseFloat(val('card_tilt_deg', 0.35)) || 0) + 'deg');
    };
    sessionStorage.setItem('lfg-theme', t);
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!opts.animate || reduced) { swap(); }
    else if (document.startViewTransition) { document.startViewTransition(swap); }
    else { swap(); }
    announce('Theme set to ' + (THEME_NAMES[t] || t));
  }

  /* ── sun mode ── */
  function initSun() {
    if (!val('sun_mode_available', true)) return;
    var doc = document.documentElement;
    var saved = localStorage.getItem('lfg-vis');
    var auto = window.matchMedia('(prefers-contrast: more)').matches;
    if (saved === 'high' || (saved === null && auto)) doc.setAttribute('data-vis', 'high');
    var b = document.createElement('button');
    b.className = 'sun-toggle'; b.setAttribute('aria-label', 'Toggle high-visibility sun mode');
    b.textContent = doc.getAttribute('data-vis') === 'high' ? '\u263E' : '\u2600';
    b.onclick = function () {
      var on = doc.getAttribute('data-vis') !== 'high';
      if (on) doc.setAttribute('data-vis', 'high'); else doc.removeAttribute('data-vis');
      localStorage.setItem('lfg-vis', on ? 'high' : 'normal');
      b.textContent = on ? '\u263E' : '\u2600';
      announce(on ? 'Sun mode on' : 'Sun mode off');
    };
    document.body.appendChild(b);
  }

  /* ── gate ── */
  function sha256(str) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }
  function runGate() {
    return new Promise(function (resolve) {
      var el = document.getElementById('gate'); if (!el) return resolve();
      var form = el.querySelector('.gate-form');
      var dismiss = function () {
        el.classList.add('leaving');
        setTimeout(function () { el.hidden = true; }, 420);
        resolve();
      };
      if (!val('gate_enabled', true) || sessionStorage.getItem('lfg-gate') === 'open') return dismiss();
      if (form) form.hidden = false;
      var input = el.querySelector('input'), msg = el.querySelector('.gate-msg');
      function attempt() {
        sha256(input.value.trim()).then(function (h) {
          if (h === String(val('gate_password_hash', ''))) {
            sessionStorage.setItem('lfg-gate', 'open');
            dismiss();
          } else { msg.textContent = 'Not quite — try again.'; input.select(); }
        });
      }
      el.querySelector('button').onclick = attempt;
      input.onkeydown = function (e) { if (e.key === 'Enter') attempt(); };
      input.focus();
    });
  }

  /* ── mood quadrant ── */
  var MOOD_MAP = { PE: 'citrus', PC: 'inland', LE: 'phosphor', LC: 'night' };
  var GREET = { PE: 'sunny and bright \u2014 let\u2019s go', PC: 'good steady soil under your boots', LE: 'a little mischief it is\u2026', LC: 'soft light coming right up' };
  var ACTIVITY = {
    PE: 'Bright and blooming \u2014 perfect time to wander the photo album.',
    PC: 'Good steady light \u2014 a fine moment to explore a garden bed.',
    LE: 'Feeling playful? Tap around \u2014 the garden has secrets.',
    LC: 'Easy does it \u2014 the bed blessings read beautifully at this pace.'
  };
  function runMood() {
    return new Promise(function (resolve) {
      var el = document.getElementById('mood'); if (!el) return resolve();
      if (!val('mood_picker_enabled', true) || sessionStorage.getItem('lfg-theme')) return resolve();
      el.hidden = false;
      var box = el.querySelector('.mood-box'), dot = el.querySelector('.dot');
      var greet = el.querySelector('.mood-greet');
      var prompt = el.querySelector('.mood-prompt');
      var blw = el.querySelector('.mw-bl');
      if (blw) {
        var hr = new Date().getHours();
        var isNight = (hr >= 21 || hr < 6);
        var label = isNight ? 'quiet night (try night mode)' : 'quiet ' + (hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening');
        blw.textContent = label;
        blw.style.fontSize = isNight ? '11px' : '';
      }
      if (prompt) prompt.textContent = val('welcome_line', 'Plot your mood for a custom theme and recommended activities');
      function pick(x, y, rect) {
        var nx = (x - rect.left) / rect.width * 2 - 1;   /* -1 easygoing … +1 productive */
        var ny = 1 - (y - rect.top) / rect.height * 2;   /* -1 calm … +1 energetic  */
        dot.style.left = ((nx + 1) / 2 * 100) + '%'; dot.style.top = ((1 - ny) / 2 * 100) + '%';
        dot.classList.add('show');
        var quad = (nx >= 0 ? 'P' : 'L') + (ny >= 0 ? 'E' : 'C');
        if (greet && GREET[quad]) greet.textContent = GREET[quad];
        var theme;
        if (Math.sqrt(nx * nx + ny * ny) < 0.15) theme = val('default_theme', 'inland');
        else theme = MOOD_MAP[quad];
        var enabled = String(val('themes_enabled', 'inland,citrus,night,phosphor')).split(',');
        if (enabled.indexOf(theme) === -1) theme = val('default_theme', 'inland');
        setTimeout(function () {
          el.classList.add('leaving');
          applyTheme(theme, { animate: true });
          setTimeout(function () {
            el.hidden = true; resolve();
            if (window.showToast && ACTIVITY[quad]) setTimeout(function () { window.showToast(ACTIVITY[quad]); }, 600);
          }, 420);
        }, 650);
      }
      box.addEventListener('pointerdown', function (e) { pick(e.clientX, e.clientY, box.getBoundingClientRect()); }, { once: true });
      var skip = el.querySelector('.mood-skip');
      if (skip) skip.onclick = function () {
        el.classList.add('leaving');
        applyTheme(val('default_theme', 'inland'), { animate: false });
        setTimeout(function () { el.hidden = true; resolve(); }, 420);
      };
    });
  }

  /* ── feedback (honeypot + min-time) ── */
  function initFeedback() {
    if (!val('feedback_enabled', true)) return;
    var tab = document.createElement('button');
    tab.className = 'fb-tab'; tab.textContent = 'thoughts?';
    var panel = document.createElement('div');
    panel.className = 'fb-panel';
    panel.innerHTML = '<label for="fb-msg">Tell the garden crew</label>' +
      '<textarea id="fb-msg" rows="3"></textarea>' +
      '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<button class="btn" type="button">send</button><div class="fb-status"></div>';
    document.body.appendChild(tab); document.body.appendChild(panel);
    var openedAt = 0;
    tab.onclick = function () { panel.classList.toggle('open'); openedAt = Date.now(); };
    panel.querySelector('.btn').onclick = function () {
      var msg = panel.querySelector('textarea').value.trim();
      var status = panel.querySelector('.fb-status');
      if (!msg) { status.textContent = 'Write something first.'; return; }
      if (panel.querySelector('.hp').value || Date.now() - openedAt < 3000) { status.textContent = 'Thanks!'; return; } /* silent bot drop */
      status.textContent = 'Sending\u2026';
      fetch(CONFIG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          message: msg,
          theme: document.documentElement.getAttribute('data-theme'),
          mood: sessionStorage.getItem('lfg-theme') ? 'picked' : 'default',
          sun_mode: document.documentElement.getAttribute('data-vis') === 'high',
          viewport: window.innerWidth + 'x' + window.innerHeight,
          page: location.pathname,
          ua: navigator.userAgent
        })
      }).then(function () {
        status.textContent = 'Received \u2014 thank you.';
        panel.querySelector('textarea').value = '';
        setTimeout(function () { panel.classList.remove('open'); }, 1500);
      }).catch(function () { status.textContent = 'Could not send \u2014 try later.'; });
    };
  }

  /* ── footer mood re-plot ── */
  function initFooterMood() {
    var link = document.getElementById('mood-again');
    if (!link) return;
    if (!val('footer_mood_link', true)) { link.hidden = true; return; }
    link.onclick = function (e) {
      e.preventDefault();
      sessionStorage.removeItem('lfg-theme');
      var el = document.getElementById('mood');
      el.classList.remove('leaving'); el.hidden = false;
      runMood();
    };
  }

  /* ── boot ── */
  cfg = readCache();
  var booted = false;
  function boot() {
    if (booted) return; booted = true;
    var saved = sessionStorage.getItem('lfg-theme');
    if (saved) applyTheme(saved, { animate: false });
    runGate().then(runMood).then(function () {
      if (!sessionStorage.getItem('lfg-theme')) applyTheme(val('default_theme', 'inland'), { animate: false });
      initSun(); initFeedback(); initFooterMood();
      var h = document.getElementById('home'); if (h) h.hidden = false;
    });
  }
  if (cfg) { boot(); fetchConfig().then(function (f) { cfg = f; }).catch(function () {}); }
  else {
    fetchConfig().then(function (f) { cfg = f; boot(); })
      .catch(function () { cfg = {}; boot(); }); /* offline fail-soft: defaults, gate skipped only if disabled */
  }
})();


/* ════════════════════════════════════════════════
   LFG CREATURES — bees & butterflies drift across
   the page from time to time. Site-wide, harmless,
   click-through, reduced-motion aware. On the
   phosphor theme they render terminal-green.
   ════════════════════════════════════════════════ */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var style = document.createElement('style');
  style.textContent =
    '.lfg-creature{position:fixed;left:-70px;font-size:22px;z-index:60;pointer-events:none;' +
    'will-change:transform;animation:lfg-cross linear forwards;}' +
    '.lfg-creature span{display:inline-block;animation:lfg-bob ease-in-out infinite alternate;}' +
    '.lfg-creature.flip{left:auto;right:-70px;animation-name:lfg-cross-back;}' +
    '.lfg-creature.flip span{transform:scaleX(-1);}' +
    '@keyframes lfg-cross{to{transform:translateX(calc(100vw + 140px));}}' +
    '@keyframes lfg-cross-back{to{transform:translateX(calc(-100vw - 140px));}}' +
    '@keyframes lfg-bob{from{transform:translateY(-7px);}to{transform:translateY(7px);}}' +
    '[data-theme="phosphor"] .lfg-creature{filter:grayscale(1) sepia(1) hue-rotate(70deg) saturate(5) brightness(1.15);}';
  document.head.appendChild(style);

  var CREATURES = ['🐝', '🦋', '🐝', '🦋', '🐞', '🦋'];

  function visit() {
    var el = document.createElement('div');
    el.className = 'lfg-creature' + (Math.random() < 0.5 ? ' flip' : '');
    el.setAttribute('aria-hidden', 'true');
    var inner = document.createElement('span');
    inner.textContent = CREATURES[Math.floor(Math.random() * CREATURES.length)];
    el.appendChild(inner);
    el.style.top = (12 + Math.random() * 60) + 'vh';
    var travel = 14 + Math.random() * 12;             // 14–26s across the screen
    el.style.animationDuration = travel + 's';
    inner.style.animationDuration = (0.8 + Math.random() * 0.9).toFixed(2) + 's';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, travel * 1000 + 500);
  }

  function schedule() {
    var wait = 45000 + Math.random() * 75000;          // every 45s–2min
    setTimeout(function () {
      if (!document.hidden) visit();
      schedule();
    }, wait);
  }

  setTimeout(visit, 12000 + Math.random() * 8000);     // first visitor ~12–20s in
  schedule();
})();
