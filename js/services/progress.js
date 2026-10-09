/* ==========================================================================
   progress.js — نسب التقدم، السلاسل (Streak)، أفضل الأيام، والسلاسل الزمنية للرسوم
   قاعدة أساسية: النسبة = المهام المكتملة فعليًا ÷ المهام المحتسبة.
   إيقاف المنبّه لا يغيّر أي رقم هنا. المستثناة/الملغاة/المؤجلة لا تُحتسب.
   ========================================================================== */
(function (G) {
  'use strict';

  const D = G.date;
  const T = G.tasks;

  function weekStartDay() { return G.auth.user().settings.weekStart; }

  function summarize(items) {
    const ctx = G.exclusions.context();
    const r = { total: 0, done: 0, late: 0, postponed: 0, excluded: 0, cancelled: 0, inProgress: 0, notStarted: 0, items: items.length };
    items.forEach(({ task, key }) => {
      const s = T.statusOf(task, key, ctx);
      if (s === 'excluded') r.excluded++;
      else if (s === 'cancelled') r.cancelled++;
      else if (s === 'postponed') r.postponed++;
      else {
        r.total++;
        if (s === 'done') r.done++;
        else if (s === 'late') r.late++;
        else if (s === 'in_progress') r.inProgress++;
        else r.notStarted++;
      }
    });
    r.pct = r.total ? Math.round((r.done / r.total) * 100) : 0;
    return r;
  }

  const progress = {
    summarize,

    forRange(start, end, kinds) {
      return summarize(T.occurrences(start, end, kinds));
    },

    day(key) {
      return progress.forRange(key, key, ['day']);
    },

    week(key) {
      const ws = D.weekStart(key, weekStartDay());
      return progress.forRange(ws, D.addDays(ws, 6), ['day', 'week']);
    },

    month(key) {
      return progress.forRange(D.monthStart(key), D.monthEnd(key), ['day', 'week', 'month']);
    },

    year(key) {
      return progress.forRange(D.yearStart(key), D.yearEnd(key), ['day', 'week', 'month', 'year']);
    },

    /* ---------- سلاسل الرسوم البيانية ---------- */

    /** تقدم أيام الأسبوع */
    daysOfWeek(key) {
      const today = D.today();
      const ws = D.weekStart(key, weekStartDay());
      return D.range(ws, D.addDays(ws, 6)).map((k) => {
        const r = progress.day(k);
        return {
          key: k,
          label: D.DAY_SHORT[D.weekday(k)],
          value: r.total ? r.pct : null,
          meta: `${r.done}/${r.total}`,
          future: k > today,
          current: k === today,
        };
      });
    },

    /** تقدم أسابيع الشهر */
    weeksOfMonth(key) {
      const today = D.today();
      const ms = D.monthStart(key);
      const me = D.monthEnd(key);
      const out = [];
      let ws = D.weekStart(ms, weekStartDay());
      let i = 1;
      while (ws <= me) {
        const from = ws < ms ? ms : ws;
        const we = D.addDays(ws, 6);
        const to = we > me ? me : we;
        const r = progress.forRange(from, to, ['day', 'week']);
        out.push({
          key: from,
          label: `أسبوع ${i}`,
          value: r.total ? r.pct : null,
          meta: `${r.done}/${r.total}`,
          future: from > today,
          current: today >= from && today <= to,
        });
        ws = D.addDays(ws, 7);
        i++;
      }
      return out;
    },

    /** تقدم أشهر السنة */
    monthsOfYear(key) {
      const today = D.today();
      const y = key.slice(0, 4);
      return D.MONTHS.map((name, i) => {
        const mk = `${y}-${String(i + 1).padStart(2, '0')}-01`;
        const r = progress.month(mk);
        return {
          key: mk,
          label: name.slice(0, 3),
          fullLabel: name,
          value: r.total ? r.pct : null,
          meta: `${r.done}/${r.total}`,
          future: mk > today,
          current: mk.slice(0, 7) === today.slice(0, 7),
        };
      });
    },

    /** تطور الإنجاز عبر السنوات */
    years() {
      const first = progress.firstDate();
      const thisYear = Number(D.today().slice(0, 4));
      const startYear = first ? Number(first.slice(0, 4)) : thisYear;
      const out = [];
      for (let y = startYear; y <= thisYear; y++) {
        const r = progress.year(`${y}-01-01`);
        out.push({ key: `${y}-01-01`, label: String(y), value: r.total ? r.pct : null, meta: `${r.done}/${r.total}`, current: y === thisYear });
      }
      return out;
    },

    /** أقدم تاريخ مهمة للمستخدم */
    firstDate() {
      const list = T.list();
      if (!list.length) return null;
      return list.reduce((min, t) => (t.date < min ? t.date : min), list[0].date);
    },

    /* ---------- الاستمرارية (Streak) ---------- */

    /** نتيجة اليوم: success | fail | skip (لا مهام/راحة = لا عقوبة) */
    dayOutcome(key) {
      const r = progress.day(key);
      if (!r.total) return 'skip';
      return r.pct >= G.auth.user().settings.streakThreshold ? 'success' : 'fail';
    },

    /** السلسلة الحالية */
    currentStreak() {
      const first = progress.firstDate();
      if (!first) return 0;
      const today = D.today();
      let k = today;
      let count = 0;
      if (progress.dayOutcome(today) !== 'success') k = D.addDays(today, -1);
      let guard = 0;
      while (k >= first && guard++ < 1000) {
        const o = progress.dayOutcome(k);
        if (o === 'fail') break;
        if (o === 'success') count++;
        k = D.addDays(k, -1);
      }
      return count;
    },

    /** أطول سلسلة على الإطلاق */
    longestStreak() {
      const first = progress.firstDate();
      if (!first) return 0;
      const today = D.today();
      const start = D.diffDays(first, today) > 730 ? D.addDays(today, -730) : first;
      let best = 0;
      let run = 0;
      D.range(start, today).forEach((k) => {
        const o = progress.dayOutcome(k);
        if (o === 'success') { run++; best = Math.max(best, run); } else if (o === 'fail' && k !== today) run = 0;
      });
      return best;
    },

    /* ---------- الأفضل ---------- */

    bestDay(days) {
      const today = D.today();
      let best = null;
      D.range(D.addDays(today, -(days || 90)), today).forEach((k) => {
        const r = progress.day(k);
        if (!r.total || !r.done) return;
        if (!best || r.pct > best.pct || (r.pct === best.pct && r.done > best.done)) best = Object.assign({ key: k }, r);
      });
      return best;
    },

    bestWeek(weeks) {
      const today = D.today();
      let ws = D.weekStart(today, weekStartDay());
      let best = null;
      for (let i = 0; i < (weeks || 12); i++) {
        const r = progress.forRange(ws, D.addDays(ws, 6), ['day', 'week']);
        if (r.total && r.done && (!best || r.pct > best.pct)) best = Object.assign({ key: ws }, r);
        ws = D.addDays(ws, -7);
      }
      return best;
    },

    bestMonth(months) {
      const today = D.today();
      let mk = D.monthStart(today);
      let best = null;
      for (let i = 0; i < (months || 12); i++) {
        const r = progress.month(mk);
        if (r.total && r.done && (!best || r.pct > best.pct)) best = Object.assign({ key: mk }, r);
        mk = D.addMonths(mk, -1);
      }
      return best;
    },

    /** الإحصائيات حسب التصنيف */
    byCategory(start, end) {
      const ctx = G.exclusions.context();
      const map = new Map();
      T.occurrences(start, end).forEach(({ task, key }) => {
        const s = T.statusOf(task, key, ctx);
        if (!T.isCounted(s)) return;
        const id = task.categoryId || 'none';
        const row = map.get(id) || { id, total: 0, done: 0 };
        row.total++;
        if (s === 'done') row.done++;
        map.set(id, row);
      });
      return Array.from(map.values())
        .map((r) => Object.assign(r, { pct: Math.round((r.done / r.total) * 100) }))
        .sort((a, b) => b.total - a.total);
    },
  };

  G.progress = progress;
})(window.Ghars = window.Ghars || {});
