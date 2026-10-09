/* ==========================================================================
   periods.js — وضع فترة الحيض
   - إيقاف احتساب المهام التعبدية كمهام فائتة خلال الفترة
   - لا تؤثر على نسبة الإنجاز، والمهام الأخرى تستمر طبيعيًا
   - تحديد البداية والنهاية أو الإنهاء اليدوي
   ========================================================================== */
(function (G) {
  'use strict';

  const periods = {
    list() {
      const uid = G.auth.userId();
      return G.store.where('periods', (p) => p.userId === uid).sort((a, b) => (a.start < b.start ? 1 : -1));
    },

    /** الفترة النشطة حاليًا (بدون نهاية أو نهايتها لم تأتِ) */
    active() {
      const today = G.date.today();
      return periods.list().find((p) => p.start <= today && (!p.end || p.end >= today)) || null;
    },

    /** هل التاريخ داخل أي فترة؟ */
    covers(dateKey, list) {
      return (list || periods.list()).some((p) => p.start <= dateKey && (!p.end || p.end >= dateKey));
    },

    start(startDate, endDate) {
      if (periods.active()) throw new Error('يوجد وضع فعّال بالفعل');
      return G.store.insert('periods', {
        userId: G.auth.userId(),
        start: startDate || G.date.today(),
        end: endDate || null,
      });
    },

    /** إنهاء يدوي: النهاية = اليوم */
    end(id) {
      return G.store.update('periods', id, { end: G.date.today() });
    },

    update(id, patch) { return G.store.update('periods', id, patch); },

    remove(id) { G.store.remove('periods', id); },
  };

  G.periods = periods;
})(window.Ghars = window.Ghars || {});
