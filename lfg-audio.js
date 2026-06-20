/* LANCER FARMS & GARDENS — AUDIO ENGINE v2
   Short, synthesized UI feedback sounds via Web Audio API.
   No external audio files — tones are generated in-browser,
   same approach as the PocketQuiz sound engine.

   Covers: .submit-btn / .manage-btn / .upload-btn /
   .login-block button clicks, and .mode-toggle clicks.
   Does NOT cover: hover states, routine nav links, .option-card
   taps (those are navigation, not a completed action).

   Mute state persists in localStorage as 'lfg-audio-muted'.
   Default: sound ON. Two mute buttons exist (one per nav bar
   variant — #audio-mute-guest, #audio-mute-staff); both stay
   in sync since they read/write the same stored state.        */

(function () {
  'use strict';

  var STORAGE_KEY = 'lfg-audio-muted';
  var ctx = null;
  var muted = localStorage.getItem(STORAGE_KEY) === 'true';

  function getCtx() {
    if (!ctx) {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration, type, peakGain) {
    if (muted) return;
    var ac = getCtx();
    if (!ac) return;

    var osc = ac.createOscillator();
    var gain = ac.createGain();

    osc.type = type || 'sine';
    osc.frequency.value = freq;

    var now = ac.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakGain || 0.08, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /* Click: short, soft, slightly percussive — two quick partials */
  function playClick() {
    tone(720, 0.09, 'sine', 0.07);
    tone(1080, 0.06, 'sine', 0.035);
  }

  /* Mode toggle: a small two-note rise, distinct from a flat click */
  function playToggle() {
    tone(540, 0.08, 'sine', 0.06);
    setTimeout(function () { tone(760, 0.10, 'sine', 0.06); }, 60);
  }

  function setMuted(val) {
    muted = val;
    localStorage.setItem(STORAGE_KEY, String(val));
    updateMuteButtons();
    document.dispatchEvent(new CustomEvent('lfg-audio-mute-change', { detail: { muted: muted } }));
  }

  function isMuted() { return muted; }

  function updateMuteButtons() {
    document.querySelectorAll('.audio-mute').forEach(function (btn) {
      btn.textContent = muted ? '🔇' : '🔊';
      btn.classList.toggle('is-muted', muted);
      btn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    });
  }

  /* Wire up listeners once DOM is ready */
  function init() {
    updateMuteButtons();

    document.addEventListener('click', function (e) {
      var actionBtn = e.target.closest('.submit-btn, .manage-btn, .upload-btn, .login-block button');
      if (actionBtn && !actionBtn.disabled) playClick();

      var modeBtn = e.target.closest('.mode-toggle');
      if (modeBtn) playToggle();

      var muteBtn = e.target.closest('.audio-mute');
      if (muteBtn) setMuted(!muted);
    });

    /* Unlock audio context on first user gesture (autoplay policy) */
    var unlock = function () {
      getCtx();
      document.removeEventListener('pointerdown', unlock);
    };
    document.addEventListener('pointerdown', unlock, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.lfgAudio = { setMuted: setMuted, isMuted: isMuted, playClick: playClick, playToggle: playToggle };
})();
