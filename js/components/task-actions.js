/* ==========================================================================
   task-actions.js — نوافذ إجراءات المهمة: التأجيل، الاستثناء، السجل، الحذف
   ========================================================================== */
(function (G) {
  'use strict';

  const esc = (s) => G.dom.esc(s);
  const D = G.date;
  const T = G.tasks;

  const actions = {
    /** تأجيل: وقت لاحق / غدًا / الأسبوع القادم / تاريخ مخصص */
    postpone(task, key) {
      const isDay = task.period === 'day';
      const nowPlus = (m) => D.fromMinutes(Math.min(D.nowMinutes() + m, 23 * 60 + 59));
      const body = G.dom.el(`
        <form class="form" novalidate>
          ${isDay && key === D.today() ? `
          <div class="field">
            <span class="field-label">وقت لاحق اليوم</span>
            <div class="chip-group">
              ${[30, 60, 120].map((m) => `<label class="chip-option"><input type="radio" name="opt" value="time:${nowPlus(m)}"><span>بعد ${m === 30 ? 'نصف ساعة' : m === 60 ? 'ساعة' : 'ساعتين'}</span></label>`).join('')}
            </div>
          </div>` : ''}
          <div class="field">
            <span class="field-label">${isDay ? 'يوم آخر' : 'فترة أخرى'}</span>
            <div class="chip-group">
              ${isDay ? `<label class="chip-option"><input type="radio" name="opt" value="date:${D.addDays(key, 1)}"><span>اليوم التالي</span></label>` : ''}
              <label class="chip-option"><input type="radio" name="opt" value="date:${D.nextPeriod(isDay ? 'week' : task.period, key)}"><span>${isDay ? 'الأسبوع القادم' : 'الفترة القادمة'}</span></label>
              <label class="chip-option"><input type="radio" name="opt" value="custom"><span>تاريخ مخصص</span></label>
              ${isDay && key === D.today() ? '<label class="chip-option"><input type="radio" name="opt" value="customTime"><span>وقت مخصص</span></label>' : ''}
            </div>
          </div>
          <div class="form-row">
            <div class="field" data-custom hidden><label for="pp-date">التاريخ</label><input id="pp-date" class="input" type="date" name="date" min="${D.addDays(key, 1)}" value="${D.addDays(key, 1)}"></div>
            <div class="field" data-custom-time hidden><label for="pp-time">الوقت</label><input id="pp-time" class="input" type="time" name="time" value="${nowPlus(60)}"></div>
          </div>
          <p class="field-hint">يُحتفظ بتاريخ التأجيل في سجل المهمة. ${task.repeat !== 'none' ? 'بما أن المهمة متكررة، سيُسجَّل هذا التكرار "مؤجلًا" وتُنشأ نسخة في الموعد الجديد.' : ''}</p>
          <div class="field-error" data-error></div>
        </form>`);
      const m = G.modal.open({
        title: `تأجيل: ${task.name}`,
        body,
        foot: '<button class="btn" data-save>تأجيل</button><button class="btn btn--ghost" data-close>إلغاء</button>',
      });
      body.addEventListener('change', () => {
        const v = (body.querySelector('[name=opt]:checked') || {}).value;
        body.querySelector('[data-custom]').hidden = v !== 'custom';
        body.querySelector('[data-custom-time]').hidden = v !== 'customTime';
      });
      m.el.querySelector('[data-save]').addEventListener('click', () => {
        const v = (body.querySelector('[name=opt]:checked') || {}).value;
        const err = body.querySelector('[data-error]');
        try {
          if (!v) throw new Error('اختر موعد التأجيل');
          if (v.startsWith('time:')) T.postpone(task, key, { mode: 'time', time: v.slice(5) });
          else if (v === 'customTime') T.postpone(task, key, { mode: 'time', time: body.querySelector('[name=time]').value });
          else if (v === 'custom') T.postpone(task, key, { mode: 'date', date: body.querySelector('[name=date]').value });
          else T.postpone(task, key, { mode: 'date', date: v.slice(5) });
          m.close();
          G.toast('تم تأجيل المهمة — لن تُحتسب فائتة.', { title: 'تأجيل', type: 'warning' });
        } catch (ex) {
          err.textContent = ex.message;
        }
      });
    },

    /** استثناء تكرار (لا يُحتسب ولا يُعتبر فائتًا) */
    exclude(task, key) {
      const body = G.dom.el(`
        <form class="form">
          <div class="field">
            <label for="ex-reason">سبب الاستثناء (اختياري)</label>
            <input id="ex-reason" class="input" name="reason" placeholder="مثل: سفر، مرض، ظرف طارئ" maxlength="80">
          </div>
          <p class="field-hint">المهمة المستثناة لا تُعتبر فائتة ولا تؤثر على نسبة الإنجاز أو الـStreak.</p>
        </form>`);
      const m = G.modal.open({
        title: 'استثناء المهمة',
        size: 'sm',
        body,
        foot: '<button class="btn" data-save>استثناء</button><button class="btn btn--ghost" data-close>إلغاء</button>',
      });
      const save = (e) => {
        if (e) e.preventDefault();
        T.exclude(task, key, body.querySelector('[name=reason]').value.trim());
        m.close();
      };
      body.addEventListener('submit', save);
      m.el.querySelector('[data-save]').addEventListener('click', save);
    },

    /** الأرشيف: تاريخ كل تكرارات المهمة + سجل المنبّه */
    history(task) {
      const rows = T.history(task, 120);
      const done = rows.filter((r) => r.status === 'done').length;
      const counted = rows.filter((r) => T.isCounted(r.status)).length;
      const changes = (task.history || []).map((h) => `<li class="list-row"><span>أُجّلت من ${esc(D.formatShort(h.from))} إلى ${esc(D.formatShort(h.to))}</span><span class="text-xs text-faint">${esc(D.formatDateTime(h.at))}</span></li>`).join('');
      const table = rows.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>التاريخ</th><th>الحالة</th><th>ظهور المنبّه</th><th>الإيقاف</th><th>التأجيلات</th><th>وقت الإنجاز</th></tr></thead>
            <tbody>${rows.map((r) => `
              <tr>
                <td>${esc(task.period === 'day' ? D.formatShort(r.key) : `${T.PERIODS[task.period]} ${D.formatShort(r.key)}`)}</td>
                <td><span class="badge badge--${r.status}">${T.STATUS[r.status]}</span></td>
                <td class="num">${r.exec && r.exec.reminderTriggeredAt ? esc(D.formatDateTime(r.exec.reminderTriggeredAt)) : '—'}</td>
                <td class="num">${r.exec && r.exec.reminderStoppedAt ? esc(D.formatDateTime(r.exec.reminderStoppedAt)) : '—'}</td>
                <td class="num">${r.exec && r.exec.snoozeCount ? r.exec.snoozeCount : '—'}</td>
                <td class="num">${r.exec && r.exec.completionTime ? esc(D.formatDateTime(r.exec.completionTime)) : '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `<div class="empty"><div class="empty__icon">${G.icon('history')}</div><div class="empty__text">لا يوجد سجل بعد — سيظهر هنا تاريخ كل تنفيذ للمهمة.</div></div>`;
      G.modal.open({
        title: `سجل: ${task.name}`,
        size: 'lg',
        body: `
          <div class="stack">
            <div class="grid-3">
              <div class="stat-tile"><span class="stat-tile__label">مرات الإنجاز</span><span class="stat-tile__value">${done}</span></div>
              <div class="stat-tile"><span class="stat-tile__label">المحتسبة</span><span class="stat-tile__value">${counted}</span></div>
              <div class="stat-tile"><span class="stat-tile__label">نسبة الالتزام</span><span class="stat-tile__value">${counted ? Math.round((done / counted) * 100) : 0}%</span></div>
            </div>
            ${table}
            ${changes ? `<div><h3 class="text-sm mb-4">سجل التعديلات</h3><ul class="list">${changes}</ul></div>` : ''}
          </div>`,
      });
    },

    async remove(task) {
      const ok = await G.modal.confirm({
        title: 'حذف المهمة نهائيًا؟',
        message: `سيتم حذف "${task.name}" مع كل سجلها السابق وتذكيراتها. إذا أردت الاحتفاظ بالسجل استخدم "إيقاف التكرار" بدلًا من الحذف.`,
        confirmText: 'حذف نهائي',
        danger: true,
      });
      if (!ok) return;
      T.remove(task.id);
      G.toast('تم حذف المهمة.', { type: 'info' });
    },
  };

  G.taskActions = actions;
})(window.Ghars = window.Ghars || {});
