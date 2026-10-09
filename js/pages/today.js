/* ==========================================================================
   today.js — صفحة اليوم: المهام الموقوتة، غير الموقوتة، ومهام الأسبوع/الشهر/السنة
   ========================================================================== */
(function (G) {
  'use strict';

  const { $, $$, esc } = G.dom;
  const D = G.date;
  const T = G.tasks;

  const state = {
    date: G.dom.param('date') || D.today(),
    filter: 'all',
    cat: '',
  };

  G.boot({ page: 'today', title: 'اليوم' }).then((user) => {
    if (!user) return;

    $('[data-nav="-1"]').innerHTML = G.icon('chevronRight');
    $('[data-nav="1"]').innerHTML = G.icon('chevronLeft');
    $$('[data-nav]').forEach((b) => b.addEventListener('click', () => {
      const n = Number(b.dataset.nav);
      state.date = n === 0 ? D.today() : D.addDays(state.date, n);
      render();
    }));
    $('#day-picker').addEventListener('change', (e) => { if (e.target.value) { state.date = e.target.value; render(); } });

    $('#status-filter').addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b) return;
      state.filter = b.dataset.filter;
      $$('#status-filter button').forEach((x) => x.classList.toggle('is-active', x === b));
      render();
    });
    $('#cat-filter').addEventListener('change', (e) => { state.cat = e.target.value; render(); });

    G.taskItem.bind($('#groups'));
    G.live(render);
  });

  function matches(it) {
    if (state.cat && it.task.categoryId !== state.cat) return false;
    const s = it.status;
    if (state.filter === 'open') return s === 'not_started' || s === 'in_progress';
    if (state.filter === 'done') return s === 'done';
    if (state.filter === 'late') return s === 'late';
    return true;
  }

  const head = (icon, tone, text) => `<span class="tile tile--sm tile--${tone}">${G.icon(icon)}</span>${text}`;

  function group(title, items, opts) {
    const o = opts || {};
    if (!items.length) return '';
    const list = o.timeline
      ? `<ul class="task-list timeline">${items.map((it) => G.taskItem.html(it).replace('<li ', `<li data-time="${esc(D.formatTime(T.timeOf(it.task, it.key)))}" `)).join('')}</ul>`
      : G.taskItem.list(items);
    return `
      <section class="task-group">
        <div class="task-group__head">${title}<span class="task-group__count">${items.length}</span></div>
        ${list}
      </section>`;
  }

  function render() {
    const user = G.auth.user();
    const key = state.date;
    const isToday = key === D.today();

    $('#day-title').textContent = isToday ? 'اليوم' : D.relative(key) === D.formatShort(key) ? D.DAY_NAMES[D.weekday(key)] : D.relative(key);
    $('#day-hijri').textContent = `${D.formatLong(key)} • ${D.hijri(key)}`;
    $('#day-picker').value = key;

    // قائمة التصنيفات للتصفية
    const catSel = $('#cat-filter');
    const cats = G.categories.list();
    catSel.innerHTML = `<option value="">كل التصنيفات</option>${cats.map((c) => `<option value="${esc(c.id)}" ${c.id === state.cat ? 'selected' : ''}>${esc(c.icon || '')} ${esc(c.name)}</option>`).join('')}`;

    // الملخص
    const r = G.progress.day(key);
    const rest = G.exclusions.isRestDay(key);
    $('#summary').innerHTML = `
      <div>
        ${G.charts.progress({ label: isToday ? 'إنجاز اليوم' : `إنجاز ${D.formatShort(key)}`, pct: r.pct, size: 'lg' })}
        <div class="day-summary__counts">
          <span class="badge badge--done">مكتملة ${r.done}</span>
          <span class="badge badge--not_started">متبقية ${r.notStarted + r.inProgress}</span>
          ${r.late ? `<span class="badge badge--late">متأخرة ${r.late}</span>` : ''}
          ${r.postponed ? `<span class="badge badge--postponed">مؤجلة ${r.postponed}</span>` : ''}
          ${r.excluded ? `<span class="badge badge--excluded">مستثناة ${r.excluded}</span>` : ''}
        </div>
        ${isToday ? `<p class="day-summary__msg">${esc(G.messages.todayLine(user, r))}</p>` : ''}
      </div>
      <button class="btn" data-add-here>${G.icon('plus')} مهمة ${isToday ? 'لليوم' : 'لهذا اليوم'}</button>`;
    $('#summary [data-add-here]').addEventListener('click', () => G.taskForm.open({ defaults: { date: key } }));

    // المهام
    const decorate = (list) => list.map((it) => Object.assign({ status: T.statusOf(it.task, it.key) }, it)).filter(matches);
    const day = decorate(T.sort(T.forDay(key)));
    const timed = day.filter((it) => it.task.timed);
    const untimed = day.filter((it) => !it.task.timed);
    const week = decorate(T.forPeriod('week', key));
    const month = decorate(T.forPeriod('month', key));
    const year = decorate(T.forPeriod('year', key));

    const html = [
      rest ? `<div class="rest-banner">${G.icon('leaf')}<span>${esc(rest)} — مهام هذا اليوم لا تُحتسب ولا تُعتبر فائتة.</span></div>` : '',
      group(head('clock', 'sky', 'مهام مرتبطة بوقت'), timed, { timeline: true }),
      group(head('list', 'leaf', 'مهام بدون وقت'), untimed),
      group(head('calendar', 'plum', 'مهام هذا الأسبوع'), week),
      group(head('calendarCheck', 'gold', 'مهام هذا الشهر'), month),
      group(head('target', 'rose', 'مهام هذه السنة'), year),
    ].join('');

    const any = timed.length + untimed.length + week.length + month.length + year.length;
    $('#groups').innerHTML = any ? html : `${html}
      <div class="empty">
        <div class="empty__icon">${G.icon('leaf')}</div>
        <div class="empty__title">${state.filter === 'all' && !state.cat ? 'لا مهام في هذا اليوم' : 'لا نتائج مطابقة'}</div>
        <p class="empty__text">${state.filter === 'all' && !state.cat ? 'أضف مهمة صغيرة — الإنجاز اليومي الصغير يصنع الكبير.' : 'جرّب تغيير التصفية.'}</p>
      </div>`;
  }
})(window.Ghars);
