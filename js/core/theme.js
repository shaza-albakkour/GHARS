/* ==========================================================================
   theme.js — المظهر: الوضع الفاتح/الداكن ولون التمييز
   يُحمَّل داخل <head> لتطبيق المظهر قبل ظهور الصفحة (بدون وميض).
   ========================================================================== */
(function (G) {
  'use strict';

  const CACHE_KEY = 'ghars.ui';
  const root = document.documentElement;
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  const ACCENTS = [
    { id: 'green', name: 'أخضر', color: '#2f8f5b' },
    { id: 'pink', name: 'وردي', color: '#cf3f78' },
    { id: 'purple', name: 'بنفسجي', color: '#7448cc' },
    { id: 'blue', name: 'أزرق', color: '#2c69cf' },
    { id: 'maroon', name: 'عنابي', color: '#8c2a3f' },
    { id: 'black', name: 'أسود', color: '#1d2420' },
    { id: 'white', name: 'أبيض', color: '#f2f4f2' },
  ];

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch (e) { return {}; }
  }

  function resolve(mode) {
    if (mode === 'dark' || mode === 'light') return mode;
    return media && media.matches ? 'dark' : 'light';
  }

  let current = Object.assign({ theme: 'system', accent: 'green' }, readCache());

  function paint() {
    root.setAttribute('data-theme', resolve(current.theme));
    root.setAttribute('data-accent', current.accent || 'green');
  }

  paint();
  if (media && media.addEventListener) media.addEventListener('change', () => { if (current.theme === 'system') paint(); });

  G.theme = {
    ACCENTS,

    /** تطبيق المظهر وحفظه محليًا */
    apply(prefs) {
      current = Object.assign({}, current, prefs);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(current)); } catch (e) { /* تجاهل */ }
      paint();
    },

    current() { return Object.assign({}, current, { resolved: resolve(current.theme) }); },

    /** التبديل السريع بين الفاتح والداكن */
    toggle() {
      const next = resolve(current.theme) === 'dark' ? 'light' : 'dark';
      G.theme.apply({ theme: next });
      return next;
    },
  };
})(window.Ghars = window.Ghars || {});
