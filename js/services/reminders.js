/* ==========================================================================
   reminders.js — إعدادات التذكير لكل مهمة (Task Reminder)
   نوعان مستقلان:
     alarm         → منبّه يستمر حتى يتفاعل المستخدم (إيقاف / تأجيل / تم الإنجاز)
     notification  → إشعار عادي قبل الموعد بدقائق، يختفي وحده
   ========================================================================== */
(function (G) {
  'use strict';

  const D = G.date;

  const TYPES = { alarm: 'منبّه', notification: 'إشعار عادي' };

  const REPEAT = {
    task: 'حسب تكرار المهمة',
    once: 'مرة واحدة',
    daily: 'يوميًا',
    weekdays: 'أيام محددة',
    weekly: 'أسبوعيًا',
    monthly: 'شهريًا',
  };

  const SNOOZE_OPTIONS = [5, 10, 15, 30];

  const reminders = {
    TYPES,
    REPEAT,
    SNOOZE_OPTIONS,

    forTask(taskId) {
      return G.store.where('reminders', (r) => r.taskId === taskId);
    },

    get(taskId, type) {
      return G.store.find('reminders', (r) => r.taskId === taskId && r.type === type);
    },

    /** حفظ (إنشاء أو تحديث) تذكير من نوع معيّن لمهمة */
    save(taskId, type, data) {
      const existing = reminders.get(taskId, type);
      const rec = {
        taskId,
        userId: G.auth.userId(),
        type,
        time: data.time || null,
        beforeMinutes: Number(data.beforeMinutes || 0),
        sound: data.sound || 'chime',
        repeat: REPEAT[data.repeat] ? data.repeat : 'task',
        days: (data.days || []).map(Number),
        date: data.date || null,
        snoozeMinutes: Number(data.snoozeMinutes || 5),
        active: data.active !== false,
      };
      if (existing) return G.store.update('reminders', existing.id, rec);
      return G.store.insert('reminders', rec);
    },

    disable(taskId, type) {
      const r = reminders.get(taskId, type);
      if (r) G.store.update('reminders', r.id, { active: false });
    },

    /** كل التذكيرات الفعّالة للمستخدم الحالي */
    active() {
      const uid = G.auth.userId();
      return G.store.where('reminders', (r) => r.userId === uid && r.active);
    },

    /** هل يجب أن يعمل التذكير في هذا اليوم؟ */
    dueOn(rem, task, dateKey) {
      if (rem.repeat === 'once') return rem.date ? rem.date === dateKey : dateKey === task.date;
      if (dateKey < task.date && task.period === 'day') return false;
      if (task.endDate && dateKey > D.periodEnd(task.period, task.endDate, G.auth.user().settings.weekStart)) return false;
      switch (rem.repeat) {
        case 'task':
          if (task.period === 'day') return G.tasks.occursOn(task, dateKey);
          return reminders.occurrenceKey(task, dateKey) === dateKey && G.tasks.occursInPeriod(task, dateKey);
        case 'daily': return true;
        case 'weekdays': return rem.days.includes(D.weekday(dateKey));
        case 'weekly': return D.weekday(dateKey) === D.weekday(task.date);
        case 'monthly': return dateKey.slice(8) === task.date.slice(8);
        default: return false;
      }
    },

    /** مفتاح تكرار المهمة الذي يخص هذا اليوم */
    occurrenceKey(task, dateKey) {
      if (task.period === 'day') return dateKey;
      return D.periodStart(task.period, dateKey, G.auth.user().settings.weekStart);
    },

    /** وقت التنبيه الفعلي (يراعي تأجيل وقت المهمة) */
    timeFor(rem, task, key) {
      const e = G.tasks.exec(task.id, key);
      return (e && e.timeOverride) || rem.time || task.startTime || null;
    },

    /* ---------- حالة المنبّه اليومية (تُحفظ داخل سجل التنفيذ) ---------- */

    state(task, key, dateKey) {
      const e = G.tasks.exec(task.id, key);
      if (!e) return {};
      if (task.period !== 'day' && e.alarmDate !== dateKey) return {};
      return e;
    },

    patchState(task, key, dateKey, patch, event) {
      const e = G.tasks.exec(task.id, key);
      const fresh = task.period !== 'day' && (!e || e.alarmDate !== dateKey);
      const p = Object.assign({}, patch);
      if (task.period !== 'day') p.alarmDate = dateKey;
      if (fresh) Object.assign(p, { reminderTriggeredAt: patch.reminderTriggeredAt || null, reminderStoppedAt: patch.reminderStoppedAt || null, snoozeCount: patch.snoozeCount || 0, snoozeUntil: null, notifiedAt: patch.notifiedAt || null });
      if (event) p.alarmLog = ((e && e.alarmLog) || []).concat(Object.assign({ at: G.store.now(), day: dateKey }, event)).slice(-60);
      return G.tasks.upsertExec(task, key, p);
    },

    describe(rem) {
      if (!rem || !rem.active) return '';
      const when = rem.type === 'notification' && rem.beforeMinutes ? `قبل ${rem.beforeMinutes} د` : (rem.time ? D.formatTime(rem.time) : 'وقت المهمة');
      return `${TYPES[rem.type]} • ${when}`;
    },
  };

  G.reminders = reminders;
})(window.Ghars = window.Ghars || {});
