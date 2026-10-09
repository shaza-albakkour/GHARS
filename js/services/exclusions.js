/* ==========================================================================
   exclusions.js — أيام الراحة والاستثناءات
   تُعيد سبب الاستثناء (نص) أو null. المهمة المستثناة:
   - لا تُعتبر فائتة
   - لا تدخل في حساب نسبة الإنجاز
   - لا تكسر الـStreak
   ========================================================================== */
(function (G) {
  'use strict';

  let cached = null;
  G.store.subscribe(() => { cached = null; });

  const exclusions = {
    /** سياق الاستثناءات — يُحسب مرة ويُعاد استخدامه حتى أي تعديل (للأداء) */
    context() {
      if (cached) return cached;
      const u = G.auth.user();
      if (!u) return { restDays: [], restPeriods: [], excludedCategories: [], periods: [] };
      const s = u.settings;
      cached = {
        restDays: (s.restDays || []).map(Number),
        restPeriods: s.restPeriods || [],
        excludedCategories: s.excludedCategories || [],
        periods: u.gender === 'f' ? G.periods.list() : [],
      };
      return cached;
    },

    /** هل اليوم كله يوم راحة؟ */
    isRestDay(dateKey, ctx) {
      const c = ctx || exclusions.context();
      if (c.restDays.includes(G.date.weekday(dateKey))) return 'يوم راحة';
      const p = c.restPeriods.find((r) => r.start <= dateKey && (!r.end || r.end >= dateKey));
      if (p) return p.note ? `فترة راحة: ${p.note}` : 'فترة راحة';
      return null;
    },

    /**
     * سبب استثناء مهمة في تاريخ معيّن
     * @param task  المهمة
     * @param key   مفتاح التكرار (تاريخ اليوم أو بداية الفترة)
     * @param exec  سجل التنفيذ إن وجد
     */
    reason(task, key, exec, ctx) {
      const c = ctx || exclusions.context();
      if (exec && exec.excluded) return exec.exceptionReason || 'مستثناة يدويًا';
      if (c.excludedCategories.includes(task.categoryId)) return 'تصنيف مستثنى';
      if (task.period === 'day') {
        const rest = exclusions.isRestDay(key, c);
        if (rest) return rest;
      }
      if (c.periods.length && G.categories.isWorship(task.categoryId) && G.periods.covers(key, c.periods)) {
        return 'وضع فترة الحيض';
      }
      return null;
    },
  };

  G.exclusions = exclusions;
})(window.Ghars = window.Ghars || {});
