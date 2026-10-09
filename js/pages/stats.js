/* ==========================================================================
   stats.js — الإحصائيات والرسوم البيانية
   الأسبوع: تقدم أيامه • الشهر: تقدم أسابيعه • السنة: تقدم أشهرها
   + حسب التصنيف، أفضل يوم/أسبوع/شهر، أطول سلسلة استمرارية، تطور السنوات والوزن
   ========================================================================== */
(function (G) {
  'use strict';

  const { $, $$, esc } = G.dom;
  const D = G.date;
  const P = G.progress;

  const state = { range: 'month', table: false };

  G.boot({ page: 'stats', title: 'الإحصائيات' }).then((user) => {
    if (!user) return;
    $('#range').addEventListener('click', (e) => {
      const b = e.target.closest('[data-range]');
      if (!b) return;
      state.range = b.dataset.range;
      $$('#range button').forEach((x) => x.classList.toggle('is-active', x === b));
      render();
    });
    $('[data-table-toggle]').addEventListener('click', (e) => {
      state.table = !state.table;
      e.currentTarget.setAttribute('aria-pressed', state.table);
      e.currentTarget.textContent = state.table ? 'عرض كرسم' : 'عرض كجدول';
      render();
    });
    G.live(render);
    let t;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(render, 200); });
  });

  function tile(label, value, meta) {
    return `<div class="stat-tile"><span class="stat-tile__label">${label}</span><span class="stat-tile__value">${value}</span>${meta ? `<span class="stat-tile__meta">${esc(meta)}</span>` : ''}</div>`;
  }

  function bounds() {
    const today = D.today();
    const ws = G.auth.user().settings.weekStart;
    if (state.range === 'week') return { start: D.weekStart(today, ws), end: D.weekEnd(today, ws), r: P.week(today), name: 'هذا الأسبوع' };
    if (state.range === 'year') return { start: D.yearStart(today), end: D.yearEnd(today), r: P.year(today), name: `سنة ${today.slice(0, 4)}` };
    return { start: D.monthStart(today), end: D.monthEnd(today), r: P.month(today), name: D.formatMonth(today) };
  }

  function best(icon, label, item, fmt) {
    return `
      <div class="best">
        <span class="tile tile--gold">${G.icon(icon)}</span>
        <span><span class="best__label">${esc(label)}</span><br><span class="best__value">${item ? esc(fmt(item)) : '—'}</span></span>
        <span class="best__pct">${item ? item.pct + '%' : ''}</span>
      </div>`;
  }

  function render() {
    const today = D.today();
    const b = bounds();
    const r = b.r;

    $('#kpis').innerHTML = [
      G.charts.stat('check', 'leaf', 'المكتملة', r.done, b.name),
      G.charts.stat('chart', 'sky', 'نسبة الإنجاز', `${r.pct}%`, `${r.done} من ${r.total} محتسبة`),
      G.charts.stat('hourglass', 'rose', 'المتأخرة', r.late, r.postponed ? `${r.postponed} مؤجلة` : 'لا مؤجلة'),
      G.charts.stat('flame', 'gold', 'الاستمرارية الحالية', P.currentStreak(), `الأطول: ${P.longestStreak()} يوم`),
    ].join('');

    // الرسم الرئيسي حسب الفترة
    let data;
    if (state.range === 'week') {
      data = P.daysOfWeek(today);
      $('#chart-title').textContent = 'تقدم أيام الأسبوع';
    } else if (state.range === 'month') {
      data = P.weeksOfMonth(today);
      $('#chart-title').textContent = `تقدم أسابيع ${D.formatMonth(today)}`;
    } else {
      data = P.monthsOfYear(today);
      $('#chart-title').textContent = `تقدم أشهر ${today.slice(0, 4)}`;
    }
    $('#chart-sub').textContent = 'العمود الداكن = الفترة الحالية • الرمادي = فترة قادمة أو بلا مهام محتسبة';
    $('#main-chart').hidden = state.table;
    $('#main-table').hidden = !state.table;
    if (state.table) {
      $('#main-table').innerHTML = `
        <div class="table-wrap"><table class="table">
          <thead><tr><th>الفترة</th><th>المكتملة / المحتسبة</th><th>النسبة</th></tr></thead>
          <tbody>${data.map((d) => `<tr><td>${esc(d.fullLabel || d.label)}</td><td class="num">${esc(d.meta)}</td><td class="num">${d.future ? 'قادمة' : d.value == null ? '—' : d.value + '%'}</td></tr>`).join('')}</tbody>
        </table></div>`;
    } else {
      G.charts.bar($('#main-chart'), data, { label: $('#chart-title').textContent });
    }

    // حسب التصنيف
    const cats = P.byCategory(b.start, b.end).map((row) => {
      const c = G.categories.get(row.id);
      return { name: c ? c.name : 'بدون تصنيف', icon: c ? c.icon : '', color: c ? c.color : 'var(--text-3)', pct: row.pct, meta: `${row.done}/${row.total}` };
    });
    $('#cat-sub').textContent = b.name;
    G.charts.hbars($('#by-category'), cats);

    // الأفضل
    $('#best').innerHTML = [
      best('sparkle', 'أفضل يوم (آخر 90 يومًا)', P.bestDay(90), (x) => `${D.DAY_NAMES[D.weekday(x.key)]} ${D.formatShort(x.key)}`),
      best('calendar', 'أفضل أسبوع (آخر 12 أسبوعًا)', P.bestWeek(12), (x) => `أسبوع ${D.formatShort(x.key)}`),
      best('calendarCheck', 'أفضل شهر (آخر 12 شهرًا)', P.bestMonth(12), (x) => D.formatMonth(x.key)),
      `<div class="best"><span class="tile tile--gold">${G.icon('flame')}</span><span><span class="best__label">أطول سلسلة استمرارية</span><br><span class="best__value">${P.longestStreak()} يوم متتالٍ</span></span><span></span></div>`,
    ].join('');

    // السنوات
    G.charts.bar($('#years-chart'), P.years(), { height: 180, label: 'تطور الإنجاز عبر السنوات' });

    // الوزن
    const w = G.weights.list().slice(-30).map((x) => ({ label: D.formatShort(x.date), value: x.weight }));
    G.charts.line($('#weight-chart'), w, { unit: ' كغ', height: 180, label: 'تطور الوزن' });
  }
})(window.Ghars);
