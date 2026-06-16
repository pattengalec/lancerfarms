/* LANCER FARMS & GARDENS — SITE ENGINE v2 */

(function () {
  'use strict';

  var CONFIG_URL = 'https://script.google.com/macros/s/AKfycbxuAEG3tAoInCRnmhBOnJ8Wufk3exdLqxc_kcyJuF4cvAZKenBXihb1398Ovp2fCAw1/exec';
  var CACHE_KEY = 'lfg-config-v2';
  var cfg = null;

  /* ── config ── */
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

  /* ── theme ── */
  var THEMES = ['spa', 'meadow', 'ballpark', 'fire', 'mono'];

  function applyTheme(t, opts) {
    opts = opts || {};
    if (THEMES.indexOf(t) === -1) t = 'spa';
    var swap = function () {
      document.documentElement.setAttribute('data-theme', t);
    };
    sessionStorage.setItem('lfg-theme', t);
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!opts.animate || reduced) { swap(); }
    else if (document.startViewTransition) { document.startViewTransition(swap); }
    else { swap(); }
  }

  /* ── mood picker ── */
  var MOOD_MAP = {
    tl: 'ballpark',  /* energetic + lingering */
    tr: 'fire',      /* energetic + passing   */
    bl: 'spa',       /* relaxed  + lingering  */
    br: 'meadow'     /* relaxed  + passing    */
  };

  var MOOD_GREET = {
    tl: 'Game day energy — let\'s dig in.',
    tr: 'Moving fast — we\'ll keep it quick.',
    bl: 'Take your time — the garden isn\'t going anywhere.',
    br: 'Drifting through — enjoy the view.'
  };

  function runMood() {
    return new Promise(function (resolve) {
      var el = document.getElementById('mood');
      if (!el) return resolve();
      el.hidden = false;

      var greet = el.querySelector('.mood-greet');
      var quads = el.querySelectorAll('.mood-quadrant');

      quads.forEach(function (q) {
        q.addEventListener('click', function () {
          var key = q.getAttribute('data-quad');
          var theme = MOOD_MAP[key] || 'spa';
          if (greet) greet.textContent = MOOD_GREET[key] || '';
          setTimeout(function () {
            el.classList.add('leaving');
            applyTheme(theme, { animate: true });
            setTimeout(function () { el.hidden = true; resolve(); }, 420);
          }, 500);
        });
      });

      var skip = el.querySelector('.mood-skip');
      if (skip) skip.addEventListener('click', function () {
        el.classList.add('leaving');
        applyTheme('mono', { animate: false });
        setTimeout(function () { el.hidden = true; resolve(); }, 420);
      });
    });
  }

  /* ── theme toggle button ── */
  function initThemeButton() {
    var b = document.createElement('button');
    b.className = 'theme-toggle';
    b.setAttribute('aria-label', 'Change mood theme');
    b.textContent = '🎨';
    b.onclick = function () {
      var el = document.getElementById('mood');
      if (!el || !el.hidden) return;
      el.classList.remove('leaving');
      el.hidden = false;
      var greet = el.querySelector('.mood-greet');
      if (greet) greet.textContent = 'tap a mood to change the theme';
    };
    document.body.appendChild(b);
  }

  /* ── feedback tab ── */
  function initFeedback() {
    var tab = document.createElement('button');
    tab.className = 'fb-tab';
    tab.textContent = 'thoughts?';
    var panel = document.createElement('div');
    panel.className = 'fb-panel';
    panel.innerHTML =
      '<label for="fb-msg">Tell the garden crew</label>' +
      '<textarea id="fb-msg" rows="3" style="width:100%;margin:6px 0;"></textarea>' +
      '<input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="display:none;">' +
      '<button class="btn" type="button" style="width:100%;">send</button>' +
      '<div class="fb-status" style="font-size:12px;margin-top:6px;"></div>';
    document.body.appendChild(tab);
    document.body.appendChild(panel);
    var openedAt = 0;
    tab.onclick = function () { panel.classList.toggle('open'); openedAt = Date.now(); };
    panel.querySelector('.btn').onclick = function () {
      var msg = panel.querySelector('textarea').value.trim();
      var status = panel.querySelector('.fb-status');
      if (!msg) { status.textContent = 'Write something first.'; return; }
      if (panel.querySelector('.hp').value || Date.now() - openedAt < 3000) { status.textContent = 'Thanks!'; return; }
      status.textContent = 'Sending…';
      fetch(CONFIG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          message: msg,
          theme: document.documentElement.getAttribute('data-theme'),
          page: location.pathname,
          ua: navigator.userAgent
        })
      }).then(function () {
        status.textContent = 'Received — thank you.';
        panel.querySelector('textarea').value = '';
        setTimeout(function () { panel.classList.remove('open'); }, 1500);
      }).catch(function () { status.textContent = 'Could not send — try later.'; });
    };
  }

  /* ── boot ── */
  cfg = readCache();
  var booted = false;
  function boot() {
    if (booted) return; booted = true;
    var saved = sessionStorage.getItem('lfg-theme');
    if (saved) applyTheme(saved);
    runMood().then(function () {
      if (!sessionStorage.getItem('lfg-theme')) applyTheme('spa');
      initThemeButton();
      initFeedback();
    });
  }
  if (cfg) { boot(); fetchConfig().then(function (f) { cfg = f; }).catch(function () {}); }
  else { fetchConfig().then(function (f) { cfg = f; boot(); }).catch(function () { cfg = {}; boot(); }); }

})();

/* ── CREATURES ────────────────────────────────────────── */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var style = document.createElement('style');
  style.textContent =
    '.lfg-creature{position:fixed;left:-70px;z-index:60;pointer-events:none;' +
    'will-change:transform;animation:lfg-cross linear forwards;}' +
    '.lfg-creature span{display:inline-block;animation:lfg-bob ease-in-out infinite alternate;}' +
    '.lfg-creature.flip{left:auto;right:-70px;animation-name:lfg-cross-back;}' +
    '@keyframes lfg-bob{from{transform:translateY(-7px);}to{transform:translateY(7px);}}';
  document.head.appendChild(style);

  var CREATURES = ['🐝','🦋','🐞','🪲','🦗','🐜','🪱','🕷️','🐿️','👼','🌿','🍃'];

  var creatureStyleEl = null;

  function visit() {
    var el = document.createElement('div');
    el.className = 'lfg-creature' + (Math.random() < 0.5 ? ' flip' : '');
    el.setAttribute('aria-hidden', 'true');
    var inner = document.createElement('span');
    inner.textContent = CREATURES[Math.floor(Math.random() * CREATURES.length)];
    el.appendChild(inner);
    el.style.top = (5 + Math.random() * 80) + 'vh';
    el.style.fontSize = (14 + Math.random() * 20) + 'px';
    var drift = (Math.floor(Math.random() * 3) - 1) * 80;
    var flip = el.classList.contains('flip');
    var crossAnim = flip
      ? '@keyframes lfg-cross-back{to{transform:translateX(calc(-100vw - 140px)) translateY(' + drift + 'px);}}'
      : '@keyframes lfg-cross{to{transform:translateX(calc(100vw + 140px)) translateY(' + drift + 'px);}}';
    if (!creatureStyleEl) {
      creatureStyleEl = document.createElement('style');
      creatureStyleEl.id = 'lfg-creature-anim';
      document.head.appendChild(creatureStyleEl);
    }
    creatureStyleEl.textContent = crossAnim;
    var travel = 14 + Math.random() * 12;
    el.style.animationDuration = travel + 's';
    inner.style.animationDuration = (0.8 + Math.random() * 0.9).toFixed(2) + 's';
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, travel * 1000 + 500);
  }

  function schedule() {
    var wait = 45000 + Math.random() * 75000;
    setTimeout(function () {
      if (!document.hidden) visit();
      schedule();
    }, wait);
  }

  setTimeout(visit, 12000 + Math.random() * 8000);
  schedule();
})();
