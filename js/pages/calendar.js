/* ==========================================================================
   calendar.js — التقويم الميلادي والهجري: أسبوع / شهر / سنة
   اختيار يوم يعرض: مهامه، حالاتها، نسبة الإنجاز، وسجل التنفيذ
   ========================================================================== */
(function (G) {
  'use strict';

  const { $, $$, esc } = G.dom;
  const D = G.date;
  const T = G.tasks;
  const P = G.progress;

  const state = { view: 'month', anchor: D.today(), selected: D.today(), primary: 'g' };

  G.boot({ page: 'calendar', title: 'التقويم' }).then((user) => {
    if (!user) return;

    $('[data-step="-1"]').innerHTML = G.icon('chevronRight');
    $('[data-step="1"]').innerHTML = G.icon('chevronLeft');
    $$('[data-step]').forEach((b) => b.addEventListener('click', () => step(Number(b.dataset.step))));

    $('#view').addEventListener('click', (e) => {
      const b = e.target.closest('[data-view]');
      if (!b) return;
      state.view = b.dataset.view;
      $$('#view button').forEach((x) => x.classList.toggle('is-active', x === b));
      render();
    });
    $('#primary').addEventListener('click', (e) => {
      const b = e.target.closest('[data-primary]');
      if (!b) return;
      state.primary = b.dataset.primary;
      $$('#primary button').forEach((x) => x.classList.toggle('is-active', x === b));
      render();
    });

    G.dom.on($('#calendar'), 'click', '[data-day]', (e, el) => {
      state.selected = el.dataset.day;
      render();
      if (window.innerWidth < 1000) $('#day-panel').scrollIntoView({ behavior: 'smooth' });
    });

    G.taskItem.bind($('#day-panel'));
    G.live(render);
  });

  function step(n) {
    if (n === 0) {
      state.anchor = D.today();
      state.selected = D.today();
    } else if (state.view === 'week') state.anchor = D.addDays(state.anchor, 7 * n);
    else if (state.view === 'month') state.anchor = D.addMonths(D.monthStart(state.anchor), n);
    else state.anchor = `${Number(state.anchor.slice(0, 4)) + n}-01-01`;
    render();
  }

  function level(pct) {
    if (pct == null) return 0;
    if (pct === 0) return 0;
    if (pct < 34) return 1;
    if (pct < 67) return 2;
    if (pct < 100) return 3;
    return 4;
  }

  function nums(key) {
    const g = String(Number(key.slice(8)));
    const h = D.hijriDay(key);
    return state.primary === 'g' ? [g, h] : [h, g];
  }

  function title() {
    const k = state.anchor;
    if (state.view === 'year') return [`سنة ${k.slice(0, 4)}`, ''];
    if (state.view === 'week') {
      const ws = D.weekStart(k, G.auth.user().settings.weekStart);
      return [`أسبوع ${D.formatShort(ws)} – ${D.formatShort(D.addDays(ws, 6))}`, `${D.hijri(ws)} – ${D.hijri(D.addDays(ws, 6))}`];
    }
    const ms = D.monthStart(k);
    return [D.formatMonth(ms), `${D.hijri(ms)} – ${D.hijri(D.monthEnd(ms))}`];
  }

  function dowHeader(ws) {
    return Array.from({ length: 7 }, (_, i) => `<div class="month-grid__dow">${D.DAY_SHORT[(ws + i) % 7]}</div>`).join('');
  }

  function renderMonth() {
    const ws = G.auth.user().settings.weekStart;
    const ms = D.monthStart(state.anchor);
    const me = D.monthEnd(ms);
    const start = D.weekStart(ms, ws);
    const end = D.weekEnd(me, ws);
    const today = D.today();
    const cells = D.range(start, end).map((k) => {
      const r = P.day(k);
      const [a, b] = nums(k);
      const cls = ['day-cell'];
      if (k < ms || k > me) cls.push('is-out');
      if (k === today) cls.push('is-today');
      if (k === state.selected) cls.push('is-selected');
      if (G.exclusions.isRestDay(k)) cls.push('is-rest');
      return `
        <button class="${cls.join(' ')}" data-day="${k}" aria-label="${esc(D.formatLong(k))}${r.items ? ` — ${r.pct}%` : ''}" ${k === state.selected ? 'aria-pressed="true"' : ''}>
          <span class="day-cell__nums"><span class="day-cell__primary">${a}</span><span class="day-cell__secondary">${b}</span></span>
          ${r.items ? `<span class="day-cell__info"><span class="day-cell__count">${r.done}/${r.total}</span><span class="day-cell__bar"><span style="width:${r.pct}%"></span></span></span>` : ''}
        </button>`;
    }).join('');
    $('#calendar').innerHTML = `<div class="month-grid">${dowHeader(ws)}${cells}</div>`;
  }

  function renderWeek() {
    const ws = D.weekStart(state.anchor, G.auth.user().settings.weekStart);
    const today = D.today();
    $('#calendar').innerHTML = `<div class="week-grid">${D.range(ws, D.addDays(ws, 6)).map((k) => {
      const items = T.sort(T.forDay(k));
      const [a, b] = nums(k);
      return `
        <button class="week-col ${k === today ? 'is-today' : ''} ${k === state.selected ? 'is-selected' : ''}" data-day="${k}">
          <span class="week-col__head"><strong>${D.DAY_NAMES[D.weekday(k)]} ${a}</strong><small>${b}</small></span>
          ${items.map((it) => {
            const s = T.statusOf(it.task, it.key);
            const time = it.task.timed ? `${D.formatTime(T.timeOf(it.task, it.key))} ` : '';
            return `<span class="week-chip ${s === 'done' ? 'is-done' : ''} ${s === 'late' ? 'is-late' : ''}" style="--c:${esc(G.categories.color(it.task.categoryId))}" title="${esc(it.task.name)} — ${esc(T.STATUS[s])}">${esc(time + it.task.name)}</span>`;
          }).join('') || '<span class="text-xs text-faint" style="text-align:center">—</span>'}
        </button>`;
    }).join('')}</div>`;
  }

  function renderYear() {
    const y = state.anchor.slice(0, 4);
    const ws = G.auth.user().settings.weekStart;
    const today = D.today();
    const months = D.MONTHS.map((name, i) => {
      const ms = `${y}-${String(i + 1).padStart(2, '0')}-01`;
      const me = D.monthEnd(ms);
      const lead = (D.weekday(ms) - ws + 7) % 7;
      const blanks = Array.from({ length: lead }, () => '<span class="heat is-empty"></span>').join('');
      const r = P.month(ms);
      const days = D.range(ms, me).map((k) => {
        const d = P.day(k);
        return `<button class="heat ${k === today ? 'is-today' : ''}" data-day="${k}" data-level="${d.total ? level(d.pct) : 0}" title="${esc(D.formatShort(k))}: ${d.total ? d.pct + '%' : 'لا مهام'}" aria-label="${esc(D.formatShort(k))}"></button>`;
      }).join('');
      return `
        <div class="mini-month">
          <div class="mini-month__title">${name}<span>${r.total ? r.pct + '%' : ''}</span></div>
          <div class="mini-month__grid">${blanks}${days}</div>
        </div>`;
    }).join('');
    $('#calendar').innerHTML = `
      <div class="year-grid">${months}</div>
      <div class="heat-legend">أقل <span class="heat" data-level="0"></span><span class="heat" data-level="1"></span><span class="heat" data-level="2"></span><span class="heat" data-level="3"></span><span class="heat" data-level="4"></span> أكثر</div>`;
  }

  function renderPanel() {
    const k = state.selected;
    const r = P.day(k);
    const items = T.sort(T.forDay(k));
    const rest = G.exclusions.isRestDay(k);

    // سجل التنفيذ لهذا اليوم
    const logs = [];
    items.forEach(({ task, key }) => {
      const e = T.exec(task.id, key);
      if (!e) return;
      (e.alarmLog || []).filter((l) => !l.day || l.day === k).forEach((l) => {
        const label = { triggered: 'ظهر المنبّه', stopped: 'أُوقف المنبّه', snoozed: `تأجيل ${l.minutes || ''} د`, completed: 'تم الإنجاز من المنبّه', notified: '🔔 إشعار' }[l.type] || l.type;
        logs.push({ at: l.at, text: `${label} — ${task.name}` });
      });
      if (e.completionTime) logs.push({ at: e.completionTime, text: `اكتملت — ${task.name}` });
    });
    logs.sort((a, b) => (a.at < b.at ? -1 : 1));
    const seen = new Set();
    const uniqueLogs = logs.filter((l) => { const id = l.at + l.text; if (seen.has(id)) return false; seen.add(id); return true; });

    $('#day-panel').innerHTML = `
      <div>
        <div class="day-panel__title">${esc(D.formatLong(k))}</div>
        <div class="day-panel__sub">${esc(D.hijri(k))}</div>
      </div>
      ${rest ? `<div class="badge badge--accent">${G.icon('leaf')} ${esc(rest)}</div>` : ''}
      ${G.charts.progress({ label: 'نسبة الإنجاز', pct: r.pct, meta: `${r.done} مكتملة من ${r.total} محتسبة${r.excluded ? ` • ${r.excluded} مستثناة` : ''}` })}
      <div class="row-between">
        <strong class="text-sm">المهام (${items.length})</strong>
        <div class="row">
          <a class="link-btn" href="today.html?date=${k}">فتح اليوم</a>
          <button class="btn btn--sm" data-add-day>+ مهمة</button>
        </div>
      </div>
      ${items.length ? G.taskItem.list(items) : '<p class="text-sm text-faint">لا مهام في هذا اليوم.</p>'}
      ${uniqueLogs.length ? `<div><strong class="text-sm">سجل التنفيذ</strong><ul class="log mt-2">${uniqueLogs.map((l) => `<li><span>${esc(l.text)}</span><span class="num">${esc(D.formatDateTime(l.at).split('—').pop().trim())}</span></li>`).join('')}</ul></div>` : ''}`;
    $('#day-panel [data-add-day]').addEventListener('click', () => G.taskForm.open({ defaults: { date: k } }));
  }

  function render() {
    const [t, s] = title();
    $('#cal-title').textContent = t;
    $('#cal-sub').textContent = s;
    if (state.view === 'month') renderMonth();
    else if (state.view === 'week') renderWeek();
    else renderYear();
    renderPanel();
  }
})(window.Ghars);
