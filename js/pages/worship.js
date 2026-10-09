/* ==========================================================================
   worship.js — قسم العبادة + وضع فترة الحيض
   المهام التعبدية = مهام في تصنيف مُعلَّم بـ worship (قرآن، عبادة، ...)
   ========================================================================== */
(function (G) {
  'use strict';

  const { $, esc } = G.dom;
  const D = G.date;
  const T = G.tasks;

  const PRESETS = [
    { id: 'prayers', icon: '🕌', name: 'الصلوات الخمس', desc: '5 مهام يومية', category: 'worship',
      tasks: ['صلاة الفجر', 'صلاة الظهر', 'صلاة العصر', 'صلاة المغرب', 'صلاة العشاء'].map((n) => ({ name: n, priority: 'high' })) },
    { id: 'fasting', icon: '🌙', name: 'صيام الاثنين والخميس', desc: 'أيام محددة', category: 'worship',
      tasks: [{ name: 'صيام الاثنين والخميس', repeat: 'weekdays', days: [1, 4] }] },
    { id: 'wird', icon: '📖', name: 'ورد القرآن اليومي', desc: 'قراءة يومية', category: 'quran',
      tasks: [{ name: 'ورد القرآن اليومي', priority: 'high' }] },
    { id: 'hifz', icon: '🧠', name: 'حفظ القرآن', desc: 'حفظ يومي', category: 'quran',
      tasks: [{ name: 'حفظ القرآن' }] },
    { id: 'review', icon: '🔁', name: 'مراجعة القرآن', desc: 'مراجعة يومية', category: 'quran',
      tasks: [{ name: 'مراجعة القرآن' }] },
    { id: 'listen', icon: '🎧', name: 'الاستماع للقرآن', desc: 'استماع يومي', category: 'quran',
      tasks: [{ name: 'الاستماع للقرآن', priority: 'low' }] },
    { id: 'adhkar', icon: '📿', name: 'أذكار الصباح والمساء', desc: 'مهمتان يوميتان', category: 'worship',
      tasks: [{ name: 'أذكار الصباح' }, { name: 'أذكار المساء' }] },
    { id: 'qiyam', icon: '✨', name: 'قيام الليل', desc: 'يومي', category: 'worship',
      tasks: [{ name: 'قيام الليل', priority: 'low' }] },
    { id: 'custom', icon: '➕', name: 'عبادة أخرى', desc: 'حدّدها بنفسك', tasks: [], custom: () => openCustom() },
  ];

  function openCustom() {
    const cat = G.categories.byKey('worship');
    G.taskForm.open({ defaults: { categoryId: cat ? cat.id : null, repeat: 'daily' } });
  }

  function isWorshipTask(t) { return G.categories.isWorship(t.categoryId); }

  G.boot({ page: 'worship', title: 'العبادة' }).then((user) => {
    if (!user) return;
    $('[data-custom]').addEventListener('click', openCustom);
    G.taskItem.bind($('#today-list'));

    $('#period-card').hidden = user.gender !== 'f';
    G.dom.on($('#period'), 'click', '[data-period]', async (e, b) => {
      const act = b.dataset.period;
      try {
        if (act === 'start') {
          const start = $('#p-start').value || D.today();
          const end = $('#p-end').value || null;
          if (end && end < start) throw new Error('تاريخ النهاية قبل البداية');
          G.periods.start(start, end);
          G.toast('تم تفعيل الوضع — المهام التعبدية لن تُحتسب فائتة خلال الفترة.', { type: 'success' });
        } else if (act === 'end') {
          G.periods.end(b.dataset.id);
          G.toast('تم إنهاء الوضع يدويًا.', { type: 'info' });
        } else if (act === 'delete') {
          const ok = await G.modal.confirm({ title: 'حذف الفترة؟', message: 'ستُحتسب المهام التعبدية في هذه الأيام كما لو لم يكن الوضع مفعّلًا.', confirmText: 'حذف', danger: true });
          if (ok) G.periods.remove(b.dataset.id);
        }
      } catch (err) {
        G.toast(err.message, { type: 'danger' });
      }
    });

    G.live(render);
  });

  function worshipSummary(start, end) {
    const items = T.occurrences(start, end).filter((o) => isWorshipTask(o.task));
    return G.progress.summarize(items);
  }

  function renderPeriod(user) {
    if (user.gender !== 'f') return;
    const active = G.periods.active();
    const history = G.periods.list();
    $('#period').innerHTML = `
      <div class="period-state ${active ? 'is-active' : ''}">
        <span class="tile tile--lg ${active ? 'tile--rose' : 'tile--leaf'}">${G.icon(active ? 'flower' : 'leaf')}</span>
        <span>
          <strong>${active ? 'الوضع مفعّل' : 'الوضع غير مفعّل'}</strong>
          <small>${active ? `منذ ${esc(D.formatShort(active.start))}${active.end ? ` حتى ${esc(D.formatShort(active.end))}` : ' • بدون نهاية محددة'}` : 'المهام التعبدية تُحتسب بشكل طبيعي'}</small>
        </span>
      </div>
      ${active
        ? `<button class="btn btn--block" data-period="end" data-id="${esc(active.id)}">إنهاء الوضع الآن</button>`
        : `<div class="form">
            <div class="form-row">
              <div class="field"><label for="p-start">البداية</label><input id="p-start" class="input" type="date" value="${D.today()}"></div>
              <div class="field"><label for="p-end">النهاية (اختياري)</label><input id="p-end" class="input" type="date"></div>
            </div>
            <button class="btn btn--block" data-period="start">تفعيل الوضع</button>
          </div>`}
      <p class="field-hint mt-4">خلال الفترة: المهام التعبدية لا تُعتبر فائتة ولا تؤثر على نسبة الإنجاز أو الـStreak، وباقي المهام تستمر طبيعيًا.</p>
      ${history.length ? `
        <div class="period-history">
          <h3>السجل</h3>
          <ul class="list">${history.slice(0, 8).map((p) => `
            <li class="list-row">
              <span class="text-sm">${esc(D.formatShort(p.start))} — ${p.end ? esc(D.formatShort(p.end)) : 'مستمرة'}${p.end ? ` <span class="text-faint">(${D.diffDays(p.start, p.end) + 1} أيام)</span>` : ''}</span>
              <button class="icon-btn icon-btn--sm" data-period="delete" data-id="${esc(p.id)}" aria-label="حذف">${G.icon('trash')}</button>
            </li>`).join('')}</ul>
        </div>` : ''}`;
  }

  function render() {
    const user = G.auth.user();
    const today = D.today();
    const ws = user.settings.weekStart;

    const d = worshipSummary(today, today);
    const w = worshipSummary(D.weekStart(today, ws), D.weekEnd(today, ws));
    const m = worshipSummary(D.monthStart(today), D.monthEnd(today));
    $('#progress').innerHTML = [
      ['اليوم', d], ['هذا الأسبوع', w], ['هذا الشهر', m],
    ].map(([label, r]) => `<div class="card card--tight">${G.charts.progress({ label: `عبادات ${label}`, pct: r.pct, meta: `${r.done} من ${r.total}${r.excluded ? ` • ${r.excluded} مستثناة` : ''}` })}</div>`).join('');

    $('#today-date').textContent = `${D.formatShort(today)} • ${D.hijri(today)}`;
    const items = T.sort(T.forDay(today).concat(T.forPeriod('week', today)).filter((o) => isWorshipTask(o.task)));
    $('#today-list').innerHTML = items.length
      ? G.taskItem.list(items)
      : `<div class="empty"><div class="empty__icon">${G.icon('crescent')}</div><p class="empty__text">لا عبادات مضافة لليوم. استخدم الإضافة السريعة بالأسفل.</p></div>`;

    renderPeriod(user);
    G.presets.render($('#presets'), PRESETS);
  }
})(window.Ghars);
