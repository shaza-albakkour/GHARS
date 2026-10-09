/* ==========================================================================
   task-form.js — نموذج إنشاء/تعديل المهمة مع إعداد المنبّه والإشعار
   Ghars.taskForm.open()                         مهمة جديدة
   Ghars.taskForm.open({ task })                 تعديل
   Ghars.taskForm.open({ defaults: {...} })      قيم مبدئية (تاريخ، هدف، تصنيف...)
   ========================================================================== */
(function (G) {
  'use strict';

  const esc = (s) => G.dom.esc(s);
  const D = G.date;
  const T = G.tasks;
  const R = G.reminders;

  const DAY_REPEATS = ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly'];
  const PERIOD_REPEATS = ['none', 'renew'];
  const DATE_LABEL = { day: 'التاريخ', week: 'خلال الأسبوع الذي يحتوي', month: 'خلال الشهر الذي يحتوي', year: 'خلال السنة التي تحتوي' };

  function daysChips(name, selected) {
    // ترتيب يبدأ من السبت
    return [6, 0, 1, 2, 3, 4, 5].map((d) => `
      <label class="chip-option"><input type="checkbox" name="${name}" value="${d}" ${selected.includes(d) ? 'checked' : ''}><span>${D.DAY_SHORT[d]}</span></label>`).join('');
  }

  function goalOptions(selected) {
    const list = G.goals.list().filter((g) => g.status !== 'cancelled');
    const order = { yearly: 0, monthly: 1, weekly: 2 };
    list.sort((a, b) => order[a.level] - order[b.level]);
    return `<option value="">مهمة مستقلة (بدون هدف)</option>` + list.map((g) => `<option value="${esc(g.id)}" ${g.id === selected ? 'selected' : ''}>${esc(G.goals.levelLabel(g.level))} — ${esc(g.name)}</option>`).join('');
  }

  function template(t, alarm, notif) {
    const cats = G.categories.list();
    const ns = G.auth.user().settings.notifications;
    return `
      <form class="form" novalidate autocomplete="off">
        <div class="field">
          <label for="tf-name">اسم المهمة *</label>
          <input id="tf-name" class="input" name="name" required maxlength="120" value="${esc(t.name || '')}" placeholder="مثل: دراسة JavaScript، قراءة 10 صفحات">
        </div>

        <div class="field">
          <label for="tf-desc">الوصف</label>
          <textarea id="tf-desc" class="textarea" name="description" maxlength="500" placeholder="تفاصيل اختيارية">${esc(t.description || '')}</textarea>
        </div>

        <div class="form-row">
          <div class="field">
            <label for="tf-cat">التصنيف</label>
            <select id="tf-cat" class="select" name="categoryId">
              <option value="">بدون تصنيف</option>
              ${cats.map((c) => `<option value="${esc(c.id)}" ${c.id === t.categoryId ? 'selected' : ''}>${esc(c.icon || '')} ${esc(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <span class="field-label">الأولوية</span>
            <div class="chip-group">
              ${Object.keys(T.PRIORITY).map((p) => `<label class="chip-option"><input type="radio" name="priority" value="${p}" ${(t.priority || 'medium') === p ? 'checked' : ''}><span class="priority priority--${p}">${T.PRIORITY[p]}</span></label>`).join('')}
            </div>
          </div>
        </div>

        <div class="field">
          <span class="field-label">نوع المهمة</span>
          <div class="chip-group">
            ${Object.keys(T.PERIODS).map((p) => `<label class="chip-option"><input type="radio" name="period" value="${p}" ${(t.period || 'day') === p ? 'checked' : ''}><span>${T.PERIODS[p]}</span></label>`).join('')}
          </div>
          <span class="field-hint" data-period-hint></span>
        </div>

        <div class="form-row">
          <div class="field">
            <label for="tf-date" data-date-label>التاريخ</label>
            <input id="tf-date" class="input" type="date" name="date" value="${esc(t.date || D.today())}">
          </div>
          <div class="field">
            <label for="tf-repeat">التكرار</label>
            <select id="tf-repeat" class="select" name="repeat"></select>
          </div>
        </div>

        <div class="field" data-weekdays hidden>
          <span class="field-label">أيام التكرار</span>
          <div class="chip-group">${daysChips('days', (t.days || []).map(Number))}</div>
        </div>

        <div class="field" data-enddate hidden>
          <label for="tf-end">ينتهي التكرار في (اختياري)</label>
          <input id="tf-end" class="input" type="date" name="endDate" value="${esc(t.endDate || '')}">
        </div>

        <div class="form-section" data-timed-section>
          <div class="form-section__head">
            <div>
              <div class="form-section__title">${G.icon('clock')} مرتبطة بوقت</div>
              <div class="form-section__desc">مثل: الدراسة من 8:00 إلى 10:00</div>
            </div>
            <label class="switch"><input type="checkbox" name="timed" ${t.timed ? 'checked' : ''}><span class="switch-track"></span><span class="sr-only">مرتبطة بوقت</span></label>
          </div>
          <div class="form-row" data-times ${t.timed ? '' : 'hidden'}>
            <div class="field"><label for="tf-start">من</label><input id="tf-start" class="input" type="time" name="startTime" value="${esc(t.startTime || '08:00')}"></div>
            <div class="field"><label for="tf-endt">إلى (اختياري)</label><input id="tf-endt" class="input" type="time" name="endTime" value="${esc(t.endTime || '')}"></div>
          </div>
        </div>

        <div class="field">
          <label for="tf-goal">الهدف المرتبط</label>
          <select id="tf-goal" class="select" name="goalId">${goalOptions(t.goalId)}</select>
        </div>

        <!-- المنبّه -->
        <div class="form-section">
          <div class="form-section__head">
            <div>
              <div class="form-section__title">${G.icon('alarm')} منبّه المهمة</div>
              <div class="form-section__desc">يستمر حتى تتفاعل معه: إيقاف / تأجيل / تم الإنجاز</div>
            </div>
            <label class="switch"><input type="checkbox" name="alarmOn" ${alarm && alarm.active ? 'checked' : ''}><span class="switch-track"></span><span class="sr-only">تفعيل المنبّه</span></label>
          </div>
          <div class="stack" data-alarm ${alarm && alarm.active ? '' : 'hidden'}>
            <div class="form-row">
              <div class="field"><label for="tf-atime">وقت التنبيه</label><input id="tf-atime" class="input" type="time" name="alarmTime" value="${esc((alarm && alarm.time) || t.startTime || '')}"></div>
              <div class="field">
                <label for="tf-sound">النغمة</label>
                <div class="row">
                  <select id="tf-sound" class="select" name="alarmSound">${G.dom.options(G.sounds.list(), (alarm && alarm.sound) || ns.sound)}</select>
                  <button type="button" class="icon-btn" data-preview aria-label="معاينة النغمة" title="معاينة">${G.icon('play')}</button>
                </div>
              </div>
            </div>
            <div class="form-row">
              <div class="field"><label for="tf-arep">تكرار التنبيه</label><select id="tf-arep" class="select" name="alarmRepeat">${G.dom.options(Object.keys(R.REPEAT).map((k) => ({ value: k, label: R.REPEAT[k] })), (alarm && alarm.repeat) || 'task')}</select></div>
              <div class="field"><label for="tf-snooze">مدة التأجيل الافتراضية</label><select id="tf-snooze" class="select" name="snoozeMinutes">${G.dom.options(R.SNOOZE_OPTIONS.map((m) => ({ value: m, label: `${m} دقائق` })), (alarm && alarm.snoozeMinutes) || 5)}</select></div>
            </div>
            <div class="field" data-alarm-days hidden>
              <span class="field-label">أيام التنبيه</span>
              <div class="chip-group">${daysChips('alarmDays', ((alarm && alarm.days) || []).map(Number))}</div>
            </div>
          </div>
        </div>

        <!-- الإشعار العادي -->
        <div class="form-section">
          <div class="form-section__head">
            <div>
              <div class="form-section__title">${G.icon('bell')} إشعار عادي</div>
              <div class="form-section__desc">يظهر قبل الموعد ويختفي وحده</div>
            </div>
            <label class="switch"><input type="checkbox" name="notifOn" ${notif && notif.active ? 'checked' : ''}><span class="switch-track"></span><span class="sr-only">تفعيل الإشعار</span></label>
          </div>
          <div class="form-row" data-notif ${notif && notif.active ? '' : 'hidden'}>
            <div class="field"><label for="tf-before">قبل الموعد بـ</label><select id="tf-before" class="select" name="beforeMinutes">${G.dom.options([0, 5, 10, 15, 30, 60].map((m) => ({ value: m, label: m ? `${m} دقيقة` : 'في الموعد نفسه' })), notif ? notif.beforeMinutes : ns.beforeMinutes)}</select></div>
            <div class="field"><label for="tf-ntime">الموعد</label><input id="tf-ntime" class="input" type="time" name="notifTime" value="${esc((notif && notif.time) || t.startTime || '')}"></div>
          </div>
        </div>

        <div class="field-error" data-error role="alert"></div>
      </form>`;
  }

  function sync(form) {
    const period = form.querySelector('[name=period]:checked').value;
    const repeatSel = form.querySelector('[name=repeat]');
    const current = repeatSel.value || repeatSel.dataset.initial;
    const allowed = period === 'day' ? DAY_REPEATS : PERIOD_REPEATS;
    repeatSel.innerHTML = G.dom.options(allowed.map((k) => ({ value: k, label: T.REPEAT[k] })), allowed.includes(current) ? current : 'none');
    form.querySelector('[data-date-label]').textContent = DATE_LABEL[period];
    form.querySelector('[data-period-hint]').textContent = period === 'day'
      ? 'تظهر في يوم محدد (ويمكن أن تتكرر).'
      : `تُنجز مرة واحدة خلال ${period === 'week' ? 'الأسبوع' : period === 'month' ? 'الشهر' : 'السنة'} في أي يوم.`;
    form.querySelector('[data-weekdays]').hidden = !(period === 'day' && repeatSel.value === 'weekdays');
    form.querySelector('[data-enddate]').hidden = repeatSel.value === 'none';
    form.querySelector('[data-timed-section]').hidden = period !== 'day';
    const timed = form.querySelector('[name=timed]').checked;
    form.querySelector('[data-times]').hidden = !timed;
    form.querySelector('[data-alarm]').hidden = !form.querySelector('[name=alarmOn]').checked;
    form.querySelector('[data-notif]').hidden = !form.querySelector('[name=notifOn]').checked;
    form.querySelector('[data-alarm-days]').hidden = form.querySelector('[name=alarmRepeat]').value !== 'weekdays';
  }

  G.taskForm = {
    open(opts) {
      const o = opts || {};
      const editing = o.task || null;
      const t = Object.assign({}, o.defaults || {}, editing || {});
      const alarm = editing ? R.get(editing.id, 'alarm') : null;
      const notif = editing ? R.get(editing.id, 'notification') : null;

      const form = G.dom.el(template(t, alarm, notif));
      form.querySelector('[name=repeat]').dataset.initial = t.repeat || 'none';
      const m = G.modal.open({
        title: editing ? 'تعديل المهمة' : 'مهمة جديدة',
        size: 'lg',
        body: form,
        foot: `<button class="btn" data-save>${editing ? 'حفظ التعديلات' : 'إضافة المهمة'}</button><button class="btn btn--ghost" data-close>إلغاء</button>`,
      });
      sync(form);
      form.addEventListener('change', () => sync(form));
      form.querySelector('[data-preview]').addEventListener('click', () => G.sounds.play(form.querySelector('[name=alarmSound]').value));

      // نسخ وقت البداية إلى المنبّه تلقائيًا
      form.querySelector('[name=startTime]').addEventListener('change', (e) => {
        const at = form.querySelector('[name=alarmTime]');
        const nt = form.querySelector('[name=notifTime]');
        if (!at.value) at.value = e.target.value;
        if (!nt.value) nt.value = e.target.value;
      });

      const submit = (e) => {
        if (e) e.preventDefault();
        const err = form.querySelector('[data-error]');
        err.textContent = '';
        const f = G.dom.formData(form);
        const data = {
          name: f.name,
          description: f.description,
          categoryId: f.categoryId || null,
          priority: f.priority,
          period: f.period,
          date: f.date || D.today(),
          repeat: f.repeat,
          days: [].concat(f.days || []).map(Number),
          endDate: f.repeat !== 'none' ? (f.endDate || null) : null,
          timed: f.period === 'day' && !!f.timed,
          startTime: f.startTime || null,
          endTime: f.endTime || null,
          goalId: f.goalId || null,
        };
        const alarmOn = !!f.alarmOn;
        const notifOn = !!f.notifOn;
        const alarmTime = f.alarmTime || (data.timed ? data.startTime : '');
        const notifTime = f.notifTime || (data.timed ? data.startTime : '');
        try {
          if (alarmOn && !alarmTime) throw new Error('حدّد وقت المنبّه');
          if (notifOn && !notifTime) throw new Error('حدّد موعد الإشعار');
          if (alarmOn && f.alarmRepeat === 'weekdays' && ![].concat(f.alarmDays || []).length) throw new Error('اختر أيام المنبّه');
          const saved = editing ? T.update(editing.id, data) : T.create(data);
          if (alarmOn) {
            R.save(saved.id, 'alarm', { time: alarmTime, sound: f.alarmSound, repeat: f.alarmRepeat, days: [].concat(f.alarmDays || []), snoozeMinutes: f.snoozeMinutes, date: saved.date, active: true });
          } else {
            R.disable(saved.id, 'alarm');
          }
          if (notifOn) {
            R.save(saved.id, 'notification', { time: notifTime, beforeMinutes: f.beforeMinutes, repeat: 'task', active: true });
          } else {
            R.disable(saved.id, 'notification');
          }
          m.close();
          G.toast(editing ? 'تم حفظ التعديلات.' : 'أُضيفت المهمة 🌱', { type: 'success' });
          if (o.onSave) o.onSave(saved);
        } catch (ex) {
          err.textContent = ex.message;
        }
      };
      form.addEventListener('submit', submit);
      m.el.querySelector('[data-save]').addEventListener('click', submit);
    },
  };
})(window.Ghars = window.Ghars || {});
