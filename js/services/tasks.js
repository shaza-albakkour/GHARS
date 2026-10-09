/* ==========================================================================
   tasks.js — المهام: الإنشاء، التكرار، الحالات، الإنجاز، التأجيل، السجل
   --------------------------------------------------------------------------
   period  : 'day' | 'week' | 'month' | 'year'
             مهمة يومية تخص يومًا محددًا، أو مهمة تُنجز خلال أسبوع/شهر/سنة
   repeat  : لليومية → none | daily | weekdays | weekly | monthly | yearly
             للفترات  → none | renew (تتجدد كل فترة)
   كل تكرار للمهمة له "مفتاح" (key) = تاريخه أو بداية فترته،
   ولكل تنفيذ سجل مستقل في مجموعة executions — لا يُحذف القديم أبدًا.
   ========================================================================== */
(function (G) {
  'use strict';

  const D = G.date;

  const STATUS = {
    not_started: 'لم تبدأ',
    in_progress: 'قيد التنفيذ',
    done: 'مكتملة',
    late: 'متأخرة',
    postponed: 'مؤجلة',
    excluded: 'مستثناة',
    cancelled: 'ملغاة',
  };

  const PERIODS = { day: 'يومية', week: 'أسبوعية', month: 'شهرية', year: 'سنوية' };

  const REPEAT = {
    none: 'مرة واحدة',
    daily: 'يوميًا',
    weekdays: 'أيام محددة',
    weekly: 'أسبوعيًا',
    monthly: 'شهريًا',
    yearly: 'سنويًا',
    renew: 'تتجدد كل فترة',
  };

  const PRIORITY = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };

  /** الحالات التي لا تدخل في حساب النسبة */
  const NOT_COUNTED = ['excluded', 'cancelled', 'postponed'];

  /* ---------- فهرس سجلات التنفيذ (للأداء) ---------- */
  let execIndex = null;
  G.store.subscribe(() => { execIndex = null; });

  function index() {
    if (!execIndex) {
      execIndex = new Map();
      const uid = G.auth.userId();
      G.store.where('executions', (e) => e.userId === uid).forEach((e) => execIndex.set(`${e.taskId}|${e.date}`, e));
    }
    return execIndex;
  }

  function weekStartDay() {
    const u = G.auth.user();
    return u ? u.settings.weekStart : 6;
  }

  function normalize(data, existing) {
    const t = Object.assign({}, existing || {}, data);
    t.name = String(t.name || '').trim();
    if (!t.name) throw new Error('اسم المهمة مطلوب');
    t.period = PERIODS[t.period] ? t.period : 'day';
    t.priority = PRIORITY[t.priority] ? t.priority : 'medium';
    t.date = t.date || D.today();
    if (t.period === 'day') {
      if (!['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly'].includes(t.repeat)) t.repeat = 'none';
    } else {
      t.repeat = t.repeat === 'renew' ? 'renew' : 'none';
      t.date = D.periodStart(t.period, t.date, weekStartDay());
      t.timed = false;
    }
    t.days = (t.days || []).map(Number);
    if (t.repeat === 'weekdays' && !t.days.length) throw new Error('اختر يومًا واحدًا على الأقل للتكرار');
    t.timed = !!t.timed && !!t.startTime;
    if (!t.timed) { t.startTime = null; t.endTime = null; }
    if (t.timed && t.endTime && t.endTime <= t.startTime) throw new Error('وقت النهاية يجب أن يكون بعد وقت البداية');
    t.endDate = t.endDate || null;
    if (t.endDate && t.endDate < t.date) throw new Error('تاريخ الانتهاء قبل تاريخ البداية');
    t.goalId = t.goalId || null;
    t.categoryId = t.categoryId || null;
    t.description = String(t.description || '').trim();
    return t;
  }

  const tasks = {
    STATUS,
    PERIODS,
    REPEAT,
    PRIORITY,
    NOT_COUNTED,

    list() {
      const uid = G.auth.userId();
      return G.store.where('tasks', (t) => t.userId === uid);
    },

    get(id) {
      const t = G.store.get('tasks', id);
      return t && t.userId === G.auth.userId() ? t : null;
    },

    create(data) {
      const t = normalize(data);
      t.userId = G.auth.userId();
      t.history = [];
      return G.store.insert('tasks', t);
    },

    update(id, data) {
      const existing = tasks.get(id);
      if (!existing) throw new Error('المهمة غير موجودة');
      const t = normalize(data, existing);
      return G.store.update('tasks', id, t);
    },

    /** حذف نهائي للمهمة مع سجلاتها وتذكيراتها */
    remove(id) {
      if (!tasks.get(id)) return;
      G.store.removeWhere('executions', (e) => e.taskId === id);
      G.store.removeWhere('reminders', (r) => r.taskId === id);
      G.store.remove('tasks', id);
    },

    /** إيقاف تكرار المهمة من اليوم مع الاحتفاظ بتاريخها */
    stopRepeating(id) {
      const t = tasks.get(id);
      if (!t) return;
      G.store.update('tasks', id, { endDate: D.addDays(D.today(), -1) < t.date ? t.date : D.addDays(D.today(), -1) });
    },

    /* ---------- التكرار ---------- */

    /** هل تقع المهمة اليومية في هذا التاريخ؟ */
    occursOn(task, key) {
      if (task.period !== 'day') return false;
      if (key < task.date) return false;
      if (task.endDate && key > task.endDate) return false;
      switch (task.repeat) {
        case 'none': return key === task.date;
        case 'daily': return true;
        case 'weekdays': return task.days.includes(D.weekday(key));
        case 'weekly': return D.weekday(key) === D.weekday(task.date);
        case 'monthly': {
          const target = Number(task.date.slice(8, 10));
          const day = Number(key.slice(8, 10));
          const last = D.daysInMonth(key);
          return day === target || (target > last && day === last);
        }
        case 'yearly': return key.slice(5) === task.date.slice(5);
        default: return false;
      }
    },

    /** هل تقع مهمة الفترة في الفترة التي تبدأ بهذا المفتاح؟ */
    occursInPeriod(task, periodKey) {
      if (task.period === 'day') return false;
      if (periodKey < task.date) return false;
      if (task.repeat === 'none') return periodKey === task.date;
      return !task.endDate || periodKey <= task.endDate;
    },

    /**
     * كل تكرارات المهام في مدى زمني
     * @param periods  أنواع المهام المطلوبة ['day','week','month','year']
     * @returns [{ task, key }]
     */
    occurrences(start, end, periods) {
      const kinds = periods || ['day', 'week', 'month', 'year'];
      const all = tasks.list();
      const ws = weekStartDay();
      const out = [];
      const days = D.range(start, end);
      kinds.forEach((kind) => {
        const group = all.filter((t) => t.period === kind);
        if (!group.length) return;
        days.forEach((key) => {
          if (kind === 'day') {
            group.forEach((t) => { if (tasks.occursOn(t, key)) out.push({ task: t, key }); });
          } else if (D.periodStart(kind, key, ws) === key) {
            group.forEach((t) => { if (tasks.occursInPeriod(t, key)) out.push({ task: t, key }); });
          }
        });
      });
      return out;
    },

    /** مهام يوم محدد (اليومية فقط) */
    forDay(key) {
      return tasks.list().filter((t) => tasks.occursOn(t, key)).map((t) => ({ task: t, key }));
    },

    /** مهام الفترة (أسبوع/شهر/سنة) التي تحتوي التاريخ */
    forPeriod(period, dateKey) {
      const pk = D.periodStart(period, dateKey, weekStartDay());
      return tasks.list().filter((t) => t.period === period && tasks.occursInPeriod(t, pk)).map((t) => ({ task: t, key: pk }));
    },

    /* ---------- الحالة ---------- */

    exec(taskId, key) {
      return index().get(`${taskId}|${key}`) || null;
    },

    timeOf(task, key) {
      const e = tasks.exec(task.id, key);
      return (e && e.timeOverride) || task.startTime || null;
    },

    /** الحالة الفعلية لتكرار المهمة */
    statusOf(task, key, ctx) {
      const e = tasks.exec(task.id, key);
      if (e && ['done', 'cancelled', 'postponed'].includes(e.status)) return e.status;
      if (G.exclusions.reason(task, key, e, ctx)) return 'excluded';

      const today = D.today();
      const end = D.periodEnd(task.period, key, weekStartDay());
      if (end < today) return 'late';
      if (task.period === 'day' && key === today && task.timed) {
        const start = D.toMinutes((e && e.timeOverride) || task.startTime);
        const span = task.endTime ? D.toMinutes(task.endTime) - D.toMinutes(task.startTime) : 0;
        const finish = start + Math.max(span, 0);
        if (D.nowMinutes() > finish + (span ? 0 : 60)) return 'late';
      }
      return (e && e.status) || 'not_started';
    },

    exclusionReason(task, key, ctx) {
      return G.exclusions.reason(task, key, tasks.exec(task.id, key), ctx);
    },

    isCounted(status) { return !NOT_COUNTED.includes(status); },

    /** إنشاء/تحديث سجل التنفيذ */
    upsertExec(task, key, patch) {
      const existing = tasks.exec(task.id, key);
      if (existing) return G.store.update('executions', existing.id, patch);
      return G.store.insert('executions', Object.assign({
        taskId: task.id,
        userId: task.userId,
        date: key,
        status: 'not_started',
        reminderTriggeredAt: null,
        reminderStoppedAt: null,
        snoozeCount: 0,
        completionTime: null,
        excluded: false,
        exceptionReason: null,
      }, patch));
    },

    setStatus(task, key, status) {
      const patch = { status };
      patch.completionTime = status === 'done' ? G.store.now() : null;
      const rec = tasks.upsertExec(task, key, patch);
      G.bus.emit('task:status', { task, key, status });
      return rec;
    },

    /** "تم الإنجاز" — الطريقة الوحيدة لاعتبار المهمة مكتملة */
    complete(task, key) {
      const rec = tasks.setStatus(task, key, 'done');
      G.bus.emit('task:done', { task, key });
      return rec;
    },

    undo(task, key) { return tasks.setStatus(task, key, 'not_started'); },

    exclude(task, key, reason) {
      return tasks.upsertExec(task, key, { excluded: true, exceptionReason: reason || 'مستثناة يدويًا' });
    },

    unexclude(task, key) {
      return tasks.upsertExec(task, key, { excluded: false, exceptionReason: null });
    },

    /**
     * تأجيل المهمة
     *  { mode: 'time', time: 'HH:MM' }       → وقت لاحق في نفس اليوم
     *  { mode: 'date', date: 'YYYY-MM-DD' }  → يوم/أسبوع/تاريخ آخر
     */
    postpone(task, key, opts) {
      const at = G.store.now();
      if (opts.mode === 'time') {
        const e = tasks.exec(task.id, key);
        const log = ((e && e.postponeLog) || []).concat({ at, from: tasks.timeOf(task, key), to: opts.time });
        tasks.upsertExec(task, key, { timeOverride: opts.time, postponeLog: log, reminderStoppedAt: null, snoozeUntil: null });
        return task;
      }

      const target = task.period === 'day' ? opts.date : D.periodStart(task.period, opts.date, weekStartDay());
      if (target <= key) throw new Error('اختر تاريخًا بعد التاريخ الحالي للمهمة');

      // مهمة لمرة واحدة: ننقل تاريخها ونحتفظ بالتعديل في سجلها
      if (task.repeat === 'none') {
        const history = (task.history || []).concat({ at, type: 'postpone', from: key, to: target });
        G.store.update('tasks', task.id, { date: target, history, postponedCount: (task.postponedCount || 0) + 1 });
        const oldExec = tasks.exec(task.id, key);
        if (oldExec) G.store.update('executions', oldExec.id, { date: target, status: 'not_started', postponedFrom: key });
        G.bus.emit('task:status', { task, key, status: 'postponed' });
        return tasks.get(task.id);
      }

      // مهمة متكررة: نسجّل هذا التكرار كمؤجل وننشئ نسخة لمرة واحدة في التاريخ الجديد
      tasks.upsertExec(task, key, { status: 'postponed', postponedTo: target });
      const { id, createdAt, updatedAt, history, ...rest } = task;
      const copy = G.store.insert('tasks', Object.assign({}, rest, {
        repeat: 'none',
        days: [],
        endDate: null,
        date: target,
        history: [{ at, type: 'postpone', from: key, to: target }],
        postponedFrom: { taskId: task.id, key },
        postponedCount: 1,
      }));
      G.reminders.forTask(task.id).forEach((r) => {
        const { id: rid, createdAt: c1, updatedAt: u1, ...rr } = r;
        G.store.insert('reminders', Object.assign({}, rr, { taskId: copy.id, repeat: 'task' }));
      });
      G.bus.emit('task:status', { task, key, status: 'postponed' });
      return copy;
    },

    /** سجل المهمة (الأرشيف): كل التكرارات السابقة وحالاتها */
    history(task, limit) {
      const today = D.today();
      const start = task.date;
      const end = task.endDate && task.endDate < today ? task.endDate : today;
      if (end < start) return [];
      const rows = tasks.occurrences(start, end, [task.period])
        .filter((o) => o.task.id === task.id)
        .map((o) => ({ key: o.key, status: tasks.statusOf(task, o.key), exec: tasks.exec(task.id, o.key) }))
        .reverse();
      return rows.slice(0, limit || 120);
    },

    /** وصف التكرار بالعربية */
    describeRepeat(task) {
      if (task.period !== 'day') {
        return `${PERIODS[task.period]}${task.repeat === 'renew' ? ' • تتجدد' : ''}`;
      }
      if (task.repeat === 'weekdays') return task.days.map((d) => D.DAY_SHORT[d]).join('، ');
      return REPEAT[task.repeat] || '';
    },

    /** ترتيب: الوقت أولًا ثم الأولوية */
    sort(items) {
      const pr = { high: 0, medium: 1, low: 2 };
      return items.slice().sort((a, b) => {
        const ta = tasks.timeOf(a.task, a.key);
        const tb = tasks.timeOf(b.task, b.key);
        if (ta && tb && ta !== tb) return ta < tb ? -1 : 1;
        if (ta && !tb) return -1;
        if (!ta && tb) return 1;
        return pr[a.task.priority] - pr[b.task.priority];
      });
    },
  };

  G.tasks = tasks;
})(window.Ghars = window.Ghars || {});
