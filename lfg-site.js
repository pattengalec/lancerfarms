/* LANCER FARMS & GARDENS — SITE ENGINE v3
   The old 5-theme mood system, mood-box chooser, floating
   theme-toggle button, and floating feedback tab have all
   been removed — superseded by the unified top nav bar and
   data-mode light/dark toggle in index.html / lfg-theme.css.
   Feedback now lives at screen-feedback, reachable from the
   nav bar, posting to the same CONFIG_URL endpoint as before.

   Only the creature animation survives from the old engine. */

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
