/* ==========================================================================
   events.js — ناقل أحداث بسيط بين أجزاء التطبيق
   أمثلة: 'task:done' عند إنجاز مهمة، 'data:changed' عند أي تعديل
   ========================================================================== */
(function (G) {
  'use strict';

  const handlers = {};

  G.bus = {
    on(name, fn) {
      (handlers[name] = handlers[name] || []).push(fn);
      return () => G.bus.off(name, fn);
    },
    off(name, fn) {
      handlers[name] = (handlers[name] || []).filter((h) => h !== fn);
    },
    emit(name, payload) {
      (handlers[name] || []).slice().forEach((fn) => {
        try { fn(payload); } catch (err) { console.error(`[Ghars] خطأ في معالج الحدث ${name}`, err); }
      });
    },
  };
})(window.Ghars = window.Ghars || {});
