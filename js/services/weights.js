/* ==========================================================================
   weights.js — سجل الوزن (Weight Record)
   ========================================================================== */
(function (G) {
  'use strict';

  const weights = {
    list() {
      const uid = G.auth.userId();
      return G.store.where('weights', (w) => w.userId === uid).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    },

    /** تسجيل وزن (سجل واحد لكل يوم — يُحدَّث إن وُجد) */
    add({ weight, date, notes }) {
      const w = Number(weight);
      if (!w || w < 20 || w > 400) throw new Error('أدخل وزنًا صحيحًا بالكيلوغرام');
      const d = date || G.date.today();
      const existing = weights.list().find((x) => x.date === d);
      if (existing) return G.store.update('weights', existing.id, { weight: w, notes: notes || '' });
      return G.store.insert('weights', { userId: G.auth.userId(), weight: w, date: d, notes: notes || '' });
    },

    remove(id) {
      const w = G.store.get('weights', id);
      if (w && w.userId === G.auth.userId()) G.store.remove('weights', id);
    },

    latest() {
      const l = weights.list();
      return l.length ? l[l.length - 1] : null;
    },

    /** الفرق بين أول وآخر تسجيل */
    change() {
      const l = weights.list();
      if (l.length < 2) return null;
      return Math.round((l[l.length - 1].weight - l[0].weight) * 10) / 10;
    },
  };

  G.weights = weights;
})(window.Ghars = window.Ghars || {});
