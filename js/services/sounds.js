/* ==========================================================================
   sounds.js — نغمات المنبّه (تُولَّد بالمتصفح عبر Web Audio — بدون ملفات صوت)
   لإضافة نغمة: أضف عنصرًا إلى SOUNDS بنفس الشكل.
   [تردد, بداية بالثواني, مدة بالثواني]
   ========================================================================== */
(function (G) {
  'use strict';

  const SOUNDS = {
    chime: { name: 'رنين هادئ', wave: 'sine', gain: 0.18, every: 1.9, notes: [[880, 0, 0.5], [1320, 0.18, 0.6], [1760, 0.36, 0.9]] },
    bell: { name: 'جرس', wave: 'triangle', gain: 0.22, every: 1.7, notes: [[660, 0, 1.3], [990, 0, 1.3], [1320, 0, 0.8]] },
    classic: { name: 'منبّه كلاسيكي', wave: 'square', gain: 0.06, every: 1.2, notes: [[1000, 0, 0.12], [1000, 0.2, 0.12], [1000, 0.4, 0.12], [1000, 0.6, 0.12]] },
    soft: { name: 'ناعم', wave: 'sine', gain: 0.16, every: 2.4, notes: [[523, 0, 0.7], [659, 0.28, 0.7], [784, 0.56, 1.0]] },
    birds: { name: 'عصافير', wave: 'sine', gain: 0.12, every: 2.0, notes: [[2600, 0, 0.08], [3100, 0.1, 0.08], [2800, 0.22, 0.1], [3300, 0.5, 0.07], [2900, 0.6, 0.09]] },
  };

  let ctx = null;

  function audio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // المتصفحات تمنع الصوت قبل أول تفاعل — نجهّز السياق عند أول نقرة
  ['pointerdown', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, () => audio(), { once: true, passive: true });
  });

  function tone(ac, freq, start, dur, wave, gain) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    const t0 = ac.currentTime + start;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  const sounds = {
    SOUNDS,

    list() {
      return Object.keys(SOUNDS).map((id) => ({ value: id, label: SOUNDS[id].name }));
    },

    /** تشغيل النغمة مرة واحدة (للمعاينة) */
    play(id) {
      const s = SOUNDS[id] || SOUNDS.chime;
      const ac = audio();
      if (!ac) return;
      s.notes.forEach(([f, st, d]) => tone(ac, f, st, d, s.wave, s.gain));
    },

    /** تشغيل متكرر حتى الإيقاف — يعيد دالة الإيقاف */
    loop(id) {
      const s = SOUNDS[id] || SOUNDS.chime;
      sounds.play(id);
      const timer = setInterval(() => sounds.play(id), s.every * 1000);
      return () => clearInterval(timer);
    },
  };

  G.sounds = sounds;
})(window.Ghars = window.Ghars || {});
