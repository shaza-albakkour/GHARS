/* ==========================================================================
   goals.js — الأهداف والتسلسل الهرمي
   سنوي → شهري → أسبوعي → (مهام يومية مرتبطة بالهدف)
   تقدم الهدف = متوسط تقدم أهدافه الفرعية + نسبة إنجاز مهامه المرتبطة.
   ========================================================================== */
(function (G) {
  'use strict';

  const D = G.date;

  const LEVELS = {
    yearly: { label: 'سنوي', child: 'monthly', period: 'year' },
    monthly: { label: 'شهري', child: 'weekly', period: 'month' },
    weekly: { label: 'أسبوعي', child: null, period: 'week' },
  };

  const STATUS = {
    active: 'نشط',
    completed: 'مكتمل',
    paused: 'متوقف مؤقتًا',
    cancelled: 'ملغى',
  };

  const goals = {
    LEVELS,
    STATUS,

    list() {
      const uid = G.auth.userId();
      return G.store.where('goals', (g) => g.userId === uid);
    },

    get(id) {
      const g = G.store.get('goals', id);
      return g && g.userId === G.auth.userId() ? g : null;
    },

    children(id) {
      return goals.list().filter((g) => g.parentId === id).sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
    },

    /** الأهداف الجذرية (بدون أب) */
    roots() {
      const order = { yearly: 0, monthly: 1, weekly: 2 };
      return goals.list().filter((g) => !g.parentId || !goals.get(g.parentId))
        .sort((a, b) => order[a.level] - order[b.level] || (a.createdAt < b.createdAt ? 1 : -1));
    },

    /** سلسلة الآباء (لمسار التنقل) */
    ancestors(id) {
      const out = [];
      let g = goals.get(id);
      let guard = 0;
      while (g && g.parentId && guard++ < 10) {
        g = goals.get(g.parentId);
        if (g) out.unshift(g);
      }
      return out;
    },

    tasksOf(id) {
      return G.tasks.list().filter((t) => t.goalId === id);
    },

    /** التواريخ الافتراضية حسب المستوى */
    defaultRange(level, fromKey) {
      const k = fromKey || D.today();
      const ws = G.auth.user().settings.weekStart;
      const period = LEVELS[level].period;
      return { startDate: D.periodStart(period, k, ws), endDate: D.periodEnd(period, k, ws) };
    },

    create(data) {
      const name = String(data.name || '').trim();
      if (!name) throw new Error('اسم الهدف مطلوب');
      const level = LEVELS[data.level] ? data.level : 'yearly';
      const range = goals.defaultRange(level, data.startDate);
      const g = {
        userId: G.auth.userId(),
        name,
        description: String(data.description || '').trim(),
        categoryId: data.categoryId || null,
        level,
        parentId: data.parentId || null,
        startDate: data.startDate || range.startDate,
        endDate: data.endDate || range.endDate,
        priority: data.priority || 'medium',
        status: data.status || 'active',
      };
      if (g.endDate < g.startDate) throw new Error('تاريخ النهاية قبل تاريخ البداية');
      return G.store.insert('goals', g);
    },

    update(id, data) {
      if (!goals.get(id)) throw new Error('الهدف غير موجود');
      const patch = Object.assign({}, data);
      if ('name' in patch) {
        patch.name = String(patch.name).trim();
        if (!patch.name) throw new Error('اسم الهدف مطلوب');
      }
      if (patch.startDate && patch.endDate && patch.endDate < patch.startDate) throw new Error('تاريخ النهاية قبل تاريخ البداية');
      return G.store.update('goals', id, patch);
    },

    /** حذف الهدف وأهدافه الفرعية — المهام تبقى وتصبح مستقلة */
    remove(id) {
      goals.children(id).forEach((c) => goals.remove(c.id));
      goals.tasksOf(id).forEach((t) => G.store.update('tasks', t.id, { goalId: null }));
      G.store.remove('goals', id);
    },

    /** إحصائية مهام الهدف ضمن مدته */
    taskStats(goal) {
      const linked = goals.tasksOf(goal.id);
      if (!linked.length) return null;
      const ids = new Set(linked.map((t) => t.id));
      const items = G.tasks.occurrences(goal.startDate, goal.endDate).filter((o) => ids.has(o.task.id));
      return G.progress.summarize(items);
    },

    /** نسبة تقدم الهدف (0-100) */
    progress(goal, depth) {
      if (!goal) return 0;
      if (goal.status === 'completed') return 100;
      if ((depth || 0) > 6) return 0;
      const parts = goals.children(goal.id)
        .filter((c) => c.status !== 'cancelled')
        .map((c) => goals.progress(c, (depth || 0) + 1));
      const ts = goals.taskStats(goal);
      if (ts && ts.total) parts.push(ts.pct);
      if (!parts.length) return 0;
      return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
    },

    levelLabel(level) { return (LEVELS[level] || {}).label || ''; },
    childLevel(level) { return (LEVELS[level] || {}).child || null; },
  };

  G.goals = goals;
})(window.Ghars = window.Ghars || {});
