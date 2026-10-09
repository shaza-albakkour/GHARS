/* ==========================================================================
   categories.js — التصنيفات: عامة (يديرها الـAdmin) + خاصة بكل مستخدم
   worship: true  → التصنيف تعبّدي (يتأثر بوضع فترة الحيض)
   ========================================================================== */
(function (G) {
  'use strict';

  const DEFAULTS = [
    { key: 'study', name: 'دراسة', icon: '📚', color: '#2c69cf' },
    { key: 'work', name: 'عمل', icon: '💼', color: '#5f6b7a' },
    { key: 'code', name: 'برمجة', icon: '💻', color: '#7448cc' },
    { key: 'quran', name: 'قرآن', icon: '📖', color: '#21724a', worship: true },
    { key: 'worship', name: 'عبادة', icon: '🕌', color: '#2f8f5b', worship: true },
    { key: 'health', name: 'صحة', icon: '❤️', color: '#cf3f36' },
    { key: 'food', name: 'طعام', icon: '🥗', color: '#c97d10' },
    { key: 'sport', name: 'رياضة', icon: '🏃', color: '#e0662f' },
    { key: 'home', name: 'منزل', icon: '🏠', color: '#8a6a4a' },
    { key: 'personal', name: 'شخصي', icon: '🌱', color: '#cf3f78' },
  ];

  const HEALTH_KEYS = ['health', 'food', 'sport'];

  const categories = {
    DEFAULTS,

    /** إنشاء التصنيفات العامة مرة واحدة */
    seed() {
      if (G.store.find('categories', (c) => c.userId == null)) return;
      DEFAULTS.forEach((c, i) => G.store.insert('categories', Object.assign({ userId: null, order: i, worship: false, active: true }, c)));
    },

    /** التصنيفات المتاحة للمستخدم الحالي: العامة + الخاصة به */
    list() {
      const uid = G.auth.userId();
      return G.store
        .where('categories', (c) => (c.userId == null && c.active !== false) || c.userId === uid)
        .sort((a, b) => (a.userId == null ? 0 : 1) - (b.userId == null ? 0 : 1) || (a.order || 0) - (b.order || 0));
    },

    globals() {
      return G.store.where('categories', (c) => c.userId == null).sort((a, b) => (a.order || 0) - (b.order || 0));
    },

    get(id) { return G.store.get('categories', id); },

    byKey(key) { return G.store.find('categories', (c) => c.userId == null && c.key === key); },

    isWorship(id) {
      const c = categories.get(id);
      return !!(c && c.worship);
    },

    isHealth(id) {
      const c = categories.get(id);
      return !!(c && (HEALTH_KEYS.includes(c.key) || c.health));
    },

    create({ name, icon, color, worship }) {
      if (!String(name || '').trim()) throw new Error('اسم التصنيف مطلوب');
      return G.store.insert('categories', {
        userId: G.auth.userId(),
        name: String(name).trim(),
        icon: icon || '🏷️',
        color: color || '#2f8f5b',
        worship: !!worship,
        active: true,
      });
    },

    /** إنشاء تصنيف عام (للـAdmin فقط) */
    createGlobal({ name, icon, color, worship }) {
      if (!G.auth.isAdmin()) throw new Error('غير مصرّح');
      const order = categories.globals().length;
      return G.store.insert('categories', { userId: null, name, icon: icon || '🏷️', color: color || '#2f8f5b', worship: !!worship, active: true, order, key: 'c' + order });
    },

    update(id, patch) {
      const c = categories.get(id);
      if (!c) return null;
      if (c.userId == null && !G.auth.isAdmin()) throw new Error('غير مصرّح');
      if (c.userId != null && c.userId !== G.auth.userId()) throw new Error('غير مصرّح');
      return G.store.update('categories', id, patch);
    },

    remove(id) {
      const c = categories.get(id);
      if (!c) return;
      if (c.userId == null && !G.auth.isAdmin()) throw new Error('غير مصرّح');
      if (c.userId != null && c.userId !== G.auth.userId()) throw new Error('غير مصرّح');
      G.store.remove('categories', id);
    },

    /** شريحة HTML صغيرة للتصنيف */
    chip(id) {
      const c = categories.get(id);
      if (!c) return '';
      return `<span class="cat-chip" style="--c:${G.dom.esc(c.color)}"><span class="cat-chip__dot"></span>${G.dom.esc(c.icon || '')} ${G.dom.esc(c.name)}</span>`;
    },

    color(id) {
      const c = categories.get(id);
      return c ? c.color : 'var(--accent)';
    },
  };

  G.categories = categories;
})(window.Ghars = window.Ghars || {});
