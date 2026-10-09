/* ==========================================================================
   crypto.js — تشفير كلمات السر (لا تُخزَّن كنص واضح أبدًا)
   PBKDF2 + SHA-256 + ملح عشوائي لكل مستخدم + 150,000 تكرار.
   ملاحظة: عند ربط التطبيق بخادم، يجب أن يتم التشفير والتحقق على الخادم.
   ========================================================================== */
(function (G) {
  'use strict';

  const ITERATIONS = 150000;

  const toHex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const fromHex = (hex) => new Uint8Array(hex.match(/.{2}/g).map((h) => parseInt(h, 16)));

  function ensureSupport() {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('المتصفح لا يدعم التشفير الآمن. افتح الموقع عبر localhost أو https أو كملف محلي في متصفح حديث.');
    }
  }

  async function derive(password, saltBytes, iterations) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: saltBytes, iterations },
      key,
      256
    );
    return toHex(bits);
  }

  G.crypto = {
    /** يعيد { salt, hash, iterations } للتخزين */
    async hashPassword(password) {
      ensureSupport();
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hash = await derive(password, salt, ITERATIONS);
      return { salt: toHex(salt), hash, iterations: ITERATIONS, algo: 'PBKDF2-SHA256' };
    },

    /** مقارنة كلمة السر المدخلة مع المخزّنة */
    async verify(password, record) {
      ensureSupport();
      if (!record || !record.salt || !record.hash) return false;
      const hash = await derive(password, fromHex(record.salt), record.iterations || ITERATIONS);
      // مقارنة بزمن ثابت
      if (hash.length !== record.hash.length) return false;
      let diff = 0;
      for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ record.hash.charCodeAt(i);
      return diff === 0;
    },
  };
})(window.Ghars = window.Ghars || {});
