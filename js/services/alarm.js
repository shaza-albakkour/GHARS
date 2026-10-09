/* ==========================================================================
   alarm.js — Task Alarm Reminder: جدولة المنبّهات وشاشة التنبيه
   --------------------------------------------------------------------------
   قاعدة جوهرية:
     ظهور المنبّه   → المهمة غير مكتملة
     إيقاف المنبّه  → المهمة غير مكتملة (المستخدم أصبح على علم فقط)
     تأجيل المنبّه  → المهمة غير مكتملة
     "تم الإنجاز"   → المهمة مكتملة ✅  (الطريقة الوحيدة)
   كل تفاعل يُسجَّل في سجل التنفيذ: وقت الظهور، وقت الإيقاف، عدد التأجيلات.
   ملاحظة: في المتصفح يعمل المنبّه طالما إحدى صفحات التطبيق مفتوحة.
   ========================================================================== */
(function (G) {
  'use strict';

  const D = G.date;
  const TICK_MS = 10000;
  const WINDOW_MIN = 180; // لا نُطلق منبّهًا مضى على موعده أكثر من 3 ساعات

  let started = false;
  let current = null; // المنبّه الظاهر حاليًا
  const originalTitle = document.title;

  function tick() {
    const user = G.auth.user();
    if (!user || current) return;
    const today = D.today();
    const now = D.nowMinutes();
    const ns = user.settings.notifications;

    for (const rem of G.reminders.active()) {
      const task = G.tasks.get(rem.taskId);
      if (!task || !G.reminders.dueOn(rem, task, today)) continue;

      const key = G.reminders.occurrenceKey(task, today);
      const status = G.tasks.statusOf(task, key);
      if (['done', 'cancelled', 'excluded', 'postponed'].includes(status)) continue;

      const time = G.reminders.timeFor(rem, task, key);
      if (!time) continue;
      const at = D.toMinutes(time);
      const st = G.reminders.state(task, key, today);

      // ---- إشعار عادي (قبل الموعد) ----
      if (rem.type === 'notification') {
        if (!ns.enabled || st.notifiedAt) continue;
        const fireAt = at - (rem.beforeMinutes || 0);
        if (now >= fireAt && now <= at + 30) {
          G.reminders.patchState(task, key, today, { notifiedAt: G.store.now() }, { type: 'notified' });
          const msg = rem.beforeMinutes ? G.messages.beforeTask(user, task, rem.beforeMinutes) : `حان موعد: ${task.name}`;
          G.notify.show('تذكير', msg, 'info');
        }
        continue;
      }

      // ---- المنبّه ----
      if (st.reminderStoppedAt) continue;
      if (st.snoozeUntil) {
        if (Date.now() < Date.parse(st.snoozeUntil)) continue;
      } else if (now < at || now > at + WINDOW_MIN) {
        continue;
      }
      show(task, rem, key, today);
      return; // منبّه واحد في كل مرة
    }

    lateAlerts(user, today);
  }

  /** إشعار عند تأخر مهمة موقوتة اليوم (مرة واحدة) */
  function lateAlerts(user, today) {
    if (!user.settings.notifications.lateAlerts || !user.settings.notifications.enabled) return;
    G.tasks.forDay(today).forEach(({ task, key }) => {
      if (!task.timed) return;
      if (G.tasks.statusOf(task, key) !== 'late') return;
      const e = G.tasks.exec(task.id, key);
      if (e && e.lateNotifiedAt) return;
      G.tasks.upsertExec(task, key, { lateNotifiedAt: G.store.now() });
      G.notify.show('مهمة متأخرة', G.messages.lateTask(user, task), 'warning');
    });
  }

  function show(task, rem, key, dateKey, demo) {
    const user = G.auth.user();
    const esc = G.dom.esc;
    const time = demo ? D.nowHHMM() : G.reminders.timeFor(rem, task, key);

    if (!demo) {
      const st = G.reminders.state(task, key, dateKey);
      G.reminders.patchState(task, key, dateKey, st.reminderTriggeredAt ? { snoozeUntil: null } : { reminderTriggeredAt: G.store.now(), snoozeUntil: null }, { type: 'triggered' });
    }

    const snoozeBtns = G.reminders.SNOOZE_OPTIONS.map((m) => `<button class="btn btn--ghost btn--sm" data-snooze="${m}">${m} د</button>`).join('');
    const el = G.dom.el(`
      <div class="alarm" role="alertdialog" aria-modal="true" aria-labelledby="alarm-title" aria-describedby="alarm-note">
        <div class="alarm__card">
          <div class="alarm__bell">${G.icon('bell')}</div>
          <div class="alarm__time num">${esc(D.formatTime(time))}</div>
          <div>
            <div class="alarm__title" id="alarm-title">${esc(G.messages.alarmTitle(user, task))}</div>
            <div class="alarm__task mt-2">${G.categories.chip(task.categoryId)}${task.timed && task.endTime ? ` • ${esc(D.formatTime(time))} – ${esc(D.formatTime(task.endTime))}` : ''}</div>
          </div>
          <div class="alarm__actions">
            <button class="btn btn--ghost btn--lg" data-act="stop">${G.icon('pause')} إيقاف التذكير</button>
            <button class="btn btn--soft btn--lg" data-act="snooze">${G.icon('clock')} تأجيل</button>
            <button class="btn btn--success btn--lg" data-act="done">${G.icon('check')} تم الإنجاز</button>
          </div>
          <div class="stack-sm" data-snooze-panel hidden>
            <div class="alarm__snooze">${snoozeBtns}</div>
            <div class="alarm__custom">
              <input class="input" type="number" min="1" max="720" placeholder="دقائق" aria-label="مدة تأجيل مخصصة بالدقائق" value="${rem.snoozeMinutes || ''}">
              <button class="btn btn--sm" data-act="snooze-custom">تأجيل</button>
            </div>
          </div>
          <p class="alarm__note" id="alarm-note">إيقاف المنبّه أو تأجيله لا يعني إنجاز المهمة — تصبح مكتملة فقط عند الضغط على "تم الإنجاز".</p>
        </div>
      </div>`);

    document.body.appendChild(el);
    const stopSound = G.sounds.loop(rem.sound || user.settings.notifications.sound);
    // الاهتزاز (في الجوال) — المتصفح يسمح به فقط بعد أول تفاعل مع الصفحة
    const canVibrate = () => navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive);
    const vib = navigator.vibrate ? setInterval(() => { if (canVibrate()) navigator.vibrate([400, 200, 400]); }, 2000) : null;
    let flash = false;
    const titleTimer = setInterval(() => { flash = !flash; document.title = flash ? `⏰ ${task.name}` : originalTitle; }, 1000);
    const sys = G.notify.system(`⏰ ${G.messages.alarmTitle(user, task)}`, task.description || 'افتح غرس للتفاعل مع المنبّه', { requireInteraction: true, tag: `alarm-${task.id}` });

    current = { el, task, rem, key };
    el.querySelector('[data-act="done"]').focus();

    function close() {
      stopSound();
      if (vib) { clearInterval(vib); if (canVibrate()) navigator.vibrate(0); }
      clearInterval(titleTimer);
      document.title = originalTitle;
      if (sys) sys.close();
      el.remove();
      current = null;
      setTimeout(tick, 400);
    }

    function snooze(minutes) {
      const m = Math.max(1, Math.min(720, Number(minutes) || 5));
      if (!demo) {
        const st = G.reminders.state(task, key, dateKey);
        G.reminders.patchState(task, key, dateKey, {
          snoozeCount: (st.snoozeCount || 0) + 1,
          snoozeUntil: new Date(Date.now() + m * 60000).toISOString(),
          reminderStoppedAt: null,
        }, { type: 'snoozed', minutes: m });
      }
      close();
      G.toast(`سيعود المنبّه بعد ${m} دقيقة. المهمة ما زالت غير مكتملة.`, { title: 'تم التأجيل', type: 'warning' });
    }

    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.snooze) return snooze(b.dataset.snooze);
      switch (b.dataset.act) {
        case 'stop':
          if (!demo) G.reminders.patchState(task, key, dateKey, { reminderStoppedAt: G.store.now(), snoozeUntil: null }, { type: 'stopped' });
          close();
          G.toast(`${G.messages.g(user, 'أصبحتِ', 'أصبحت')} على علم بالمهمة — ستبقى غير مكتملة حتى ${G.messages.g(user, 'تضغطي', 'تضغط')} "تم الإنجاز".`, { title: 'تم إيقاف المنبّه', type: 'info' });
          break;
        case 'snooze':
          el.querySelector('[data-snooze-panel]').hidden = false;
          break;
        case 'snooze-custom':
          snooze(el.querySelector('.alarm__custom input').value);
          break;
        case 'done':
          if (!demo) {
            G.reminders.patchState(task, key, dateKey, { reminderStoppedAt: G.store.now() }, { type: 'completed' });
            G.tasks.complete(task, key);
          }
          close();
          if (demo) G.toast('هذه كانت تجربة للمنبّه فقط.', { title: 'تجربة ناجحة', type: 'success' });
          break;
        default:
      }
    });
  }

  G.alarm = {
    start() {
      if (started) return;
      started = true;
      setTimeout(tick, 1500);
      setInterval(tick, TICK_MS);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
      G.store.subscribe(() => setTimeout(tick, 300));
    },

    /** تجربة شكل المنبّه وصوته دون تسجيل أي شيء */
    demo(sound) {
      if (current) return;
      const user = G.auth.user();
      const fake = { id: 'demo', name: 'مهمة تجريبية', categoryId: null, timed: false, description: '' };
      show(fake, { sound: sound || user.settings.notifications.sound, snoozeMinutes: 5 }, null, D.today(), true);
    },

    tick,
  };
})(window.Ghars = window.Ghars || {});
