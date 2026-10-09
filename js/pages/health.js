/* ==========================================================================
   health.js — الصحة والطعام والوزن
   ========================================================================== */
(function (G) {
  'use strict';

  const { $, esc } = G.dom;
  const D = G.date;
  const T = G.tasks;

  const PRESETS = [
    { id: 'water', icon: '💧', name: 'شرب الماء', desc: '8 أكواب يوميًا', category: 'health', tasks: [{ name: 'شرب 8 أكواب ماء', priority: 'high' }] },
    { id: 'walk', icon: '🚶', name: 'المشي', desc: '30 دقيقة يوميًا', category: 'sport', tasks: [{ name: 'المشي 30 دقيقة' }] },
    { id: 'workout', icon: '🏋️', name: 'الرياضة', desc: '3 أيام أسبوعيًا', category: 'sport', tasks: [{ name: 'تمرين رياضي', repeat: 'weekdays', days: [0, 2, 4] }] },
    { id: 'sleep', icon: '😴', name: 'النوم مبكرًا', desc: 'يوميًا', category: 'health', tasks: [{ name: 'النوم قبل الساعة 11', priority: 'medium' }] },
    { id: 'sweets', icon: '🍬', name: 'تقليل الحلويات', desc: 'يوميًا', category: 'food', tasks: [{ name: 'يوم بدون حلويات' }] },
    { id: 'meal', icon: '🥗', name: 'وجبة صحية', desc: 'يوميًا', category: 'food', tasks: [{ name: 'وجبة صحية متوازنة', priority: 'low' }] },
    { id: 'weigh', icon: '⚖️', name: 'تسجيل الوزن', desc: 'مرة كل أسبوع', category: 'health', tasks: [{ name: 'تسجيل الوزن', period: 'week', repeat: 'renew' }] },
    { id: 'custom', icon: '➕', name: 'مهمة صحية أخرى', desc: 'حدّدها بنفسك', tasks: [], custom: () => {
      const c = G.categories.byKey('health');
      G.taskForm.open({ defaults: { categoryId: c ? c.id : null, repeat: 'daily' } });
    } },
  ];

  G.boot({ page: 'health', title: 'الصحة والوزن' }).then((user) => {
    if (!user) return;
    const form = $('#weight-form');
    form.querySelector('[name=date]').value = D.today();
    const latest = G.weights.latest();
    if (latest) form.querySelector('[name=weight]').placeholder = String(latest.weight);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = G.dom.formData(form);
      const err = form.querySelector('[data-error]');
      try {
        G.weights.add({ weight: f.weight, date: f.date || D.today(), notes: f.notes });
        err.textContent = '';
        form.querySelector('[name=weight]').value = '';
        form.querySelector('[name=notes]').value = '';
        G.toast('تم تسجيل الوزن.', { type: 'success' });
        // إنجاز مهمة "تسجيل الوزن" الأسبوعية تلقائيًا إن وُجدت
        T.forPeriod('week', D.today()).filter((o) => o.task.name === 'تسجيل الوزن').forEach((o) => {
          if (T.statusOf(o.task, o.key) !== 'done') T.complete(o.task, o.key);
        });
      } catch (ex) {
        err.textContent = ex.message;
      }
    });

    G.dom.on($('#weight-history'), 'click', '[data-del]', async (e, b) => {
      const ok = await G.modal.confirm({ title: 'حذف التسجيل؟', message: 'سيُحذف هذا الوزن من السجل.', confirmText: 'حذف', danger: true });
      if (ok) G.weights.remove(b.dataset.del);
    });

    G.taskItem.bind($('#health-today'));
    G.live(render);
  });

  function render() {
    const today = D.today();
    const list = G.weights.list();
    const latest = list[list.length - 1];
    const change = G.weights.change();
    const min = list.length ? Math.min(...list.map((w) => w.weight)) : null;

    $('#weight-sub').textContent = list.length ? `${list.length} تسجيل` : '';
    $('#weight-kpis').innerHTML = `
      <div class="stat-tile"><span class="stat-tile__label">الحالي</span><span class="stat-tile__value">${latest ? latest.weight : '—'}</span><span class="stat-tile__meta">${latest ? esc(D.formatShort(latest.date)) : 'كغ'}</span></div>
      <div class="stat-tile"><span class="stat-tile__label">التغيّر الكلي</span><span class="stat-tile__value ${change > 0 ? 'delta-up' : change < 0 ? 'delta-down' : ''}">${change == null ? '—' : (change > 0 ? '+' : '') + change}</span><span class="stat-tile__meta">كغ منذ أول تسجيل</span></div>
      <div class="stat-tile"><span class="stat-tile__label">الأدنى</span><span class="stat-tile__value">${min == null ? '—' : min}</span><span class="stat-tile__meta">كغ</span></div>`;

    G.charts.line($('#weight-chart'), list.slice(-40).map((w) => ({ label: D.formatShort(w.date), value: w.weight })), { unit: ' كغ', label: 'تطور الوزن' });

    const rev = list.slice().reverse();
    $('#weight-history').innerHTML = rev.length ? rev.map((w, i) => {
      const prev = rev[i + 1];
      const delta = prev ? Math.round((w.weight - prev.weight) * 10) / 10 : null;
      return `
        <div class="weight-row">
          <span>${esc(D.formatShort(w.date))}${w.notes ? `<br><span class="weight-row__note">${esc(w.notes)}</span>` : ''}</span>
          <span class="weight-row__value">${w.weight} كغ ${delta ? `<small class="${delta > 0 ? 'delta-up' : 'delta-down'}">(${delta > 0 ? '+' : ''}${delta})</small>` : ''}</span>
          <button class="icon-btn icon-btn--sm" data-del="${esc(w.id)}" aria-label="حذف">${G.icon('trash')}</button>
        </div>`;
    }).join('') : '';

    const items = T.sort(T.forDay(today).concat(T.forPeriod('week', today)).filter((o) => G.categories.isHealth(o.task.categoryId)));
    const r = G.progress.summarize(items);
    $('#health-pct').textContent = items.length ? `${r.pct}% مكتملة` : '';
    $('#health-today').innerHTML = items.length
      ? G.taskItem.list(items)
      : `<div class="empty"><div class="empty__icon">${G.icon('heartPulse')}</div><p class="empty__text">لا مهام صحية اليوم. أضف من القوالب الجاهزة.</p></div>`;

    G.presets.render($('#presets'), PRESETS);
  }
})(window.Ghars);
