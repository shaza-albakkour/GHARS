/* ==========================================================================
   tasks.js — كل المهام: البحث والتصفية + إدارة تعريفات المهام
   ========================================================================== */
(function (G) {
  'use strict';

  const { $, $$, esc } = G.dom;
  const D = G.date;
  const T = G.tasks;

  const state = {
    tab: 'occ',
    q: '',
    range: 'week',
    anchor: D.today(),
    cat: '',
    priority: '',
    status: '',
    period: '',
  };

  G.boot({ page: 'tasks', title: 'كل المهام' }).then((user) => {
    if (!user) return;

    $('#search-box').insertAdjacentHTML('afterbegin', G.icon('search'));
    $('#f-priority').innerHTML = `<option value="">كل الأولويات</option>${G.dom.options(Object.keys(T.PRIORITY).map((k) => ({ value: k, label: T.PRIORITY[k] })))}`;
    $('#f-status').innerHTML = `<option value="">كل الحالات</option>${G.dom.options(Object.keys(T.STATUS).map((k) => ({ value: k, label: T.STATUS[k] })))}`;
    $('#f-period').innerHTML = `<option value="">كل الأنواع</option>${G.dom.options(Object.keys(T.PERIODS).map((k) => ({ value: k, label: `مهام ${T.PERIODS[k]}` })))}`;
    $('#anchor').value = state.anchor;

    $('#q').addEventListener('input', G.dom.debounce((e) => { state.q = e.target.value.trim(); render(); }, 180));
    $('#range').addEventListener('click', (e) => {
      const b = e.target.closest('[data-range]');
      if (!b) return;
      state.range = b.dataset.range;
      $$('#range button').forEach((x) => x.classList.toggle('is-active', x === b));
      render();
    });
    $('#anchor').addEventListener('change', (e) => { state.anchor = e.target.value || D.today(); render(); });
    [['#f-cat', 'cat'], ['#f-priority', 'priority'], ['#f-status', 'status'], ['#f-period', 'period']].forEach(([sel, k]) => {
      $(sel).addEventListener('change', (e) => { state[k] = e.target.value; render(); });
    });

    $$('.tabs [data-tab]').forEach((b) => b.addEventListener('click', () => {
      state.tab = b.dataset.tab;
      $$('.tabs [data-tab]').forEach((x) => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-selected', x === b); });
      $('#range').hidden = state.tab !== 'occ';
      $('#anchor').hidden = state.tab !== 'occ';
      $('#f-status').hidden = state.tab !== 'occ';
      render();
    }));

    G.taskItem.bind($('#results'));
    G.dom.on($('#results'), 'click', '[data-def]', (e, b) => {
      const task = T.get(b.closest('[data-id]').dataset.id);
      if (!task) return;
      if (b.dataset.def === 'edit') G.taskForm.open({ task });
      if (b.dataset.def === 'history') G.taskActions.history(task);
      if (b.dataset.def === 'delete') G.taskActions.remove(task);
    });

    G.live(render);
  });

  function textMatch(task) {
    if (!state.q) return true;
    const q = state.q.toLowerCase();
    return task.name.toLowerCase().includes(q) || (task.description || '').toLowerCase().includes(q);
  }

  function baseMatch(task) {
    if (!textMatch(task)) return false;
    if (state.cat && task.categoryId !== state.cat) return false;
    if (state.priority && task.priority !== state.priority) return false;
    if (state.period && task.period !== state.period) return false;
    return true;
  }

  function rangeBounds() {
    const ws = G.auth.user().settings.weekStart;
    const p = state.range;
    return { start: D.periodStart(p, state.anchor, ws), end: D.periodEnd(p, state.anchor, ws) };
  }

  function renderCats() {
    const sel = $('#f-cat');
    sel.innerHTML = `<option value="">كل التصنيفات</option>${G.categories.list().map((c) => `<option value="${esc(c.id)}" ${c.id === state.cat ? 'selected' : ''}>${esc(c.icon || '')} ${esc(c.name)}</option>`).join('')}`;
  }

  function renderOccurrences() {
    const { start, end } = rangeBounds();
    const items = T.occurrences(start, end)
      .filter((o) => baseMatch(o.task))
      .map((o) => Object.assign({ status: T.statusOf(o.task, o.key) }, o))
      .filter((o) => !state.status || o.status === state.status);

    $('#count').textContent = `${items.length} نتيجة • من ${D.formatShort(start)} إلى ${D.formatShort(end)}`;
    if (!items.length) {
      $('#results').innerHTML = `<div class="empty"><div class="empty__icon">${G.icon('search')}</div><div class="empty__title">لا نتائج</div><p class="empty__text">جرّب تغيير كلمات البحث أو التصفية.</p></div>`;
      return;
    }
    // تجميع حسب التاريخ
    const byKey = new Map();
    items.forEach((it) => { if (!byKey.has(it.key)) byKey.set(it.key, []); byKey.get(it.key).push(it); });
    const keys = Array.from(byKey.keys()).sort();
    $('#results').innerHTML = keys.map((k) => {
      const list = T.sort(byKey.get(k));
      const periodTasks = list.filter((x) => x.task.period !== 'day');
      const label = periodTasks.length === list.length ? `بداية فترة ${D.formatShort(k)}` : `${D.DAY_NAMES[D.weekday(k)]} ${D.formatShort(k)}`;
      return `<div class="date-head">${esc(label)} <small>${esc(D.hijri(k))}</small></div>${G.taskItem.list(list)}`;
    }).join('');
  }

  function renderDefinitions() {
    const list = T.list().filter(baseMatch).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    $('#count').textContent = `${list.length} مهمة`;
    if (!list.length) {
      $('#results').innerHTML = `<div class="empty"><div class="empty__icon">${G.icon('clipboard')}</div><div class="empty__title">لا مهام</div><p class="empty__text">أضف مهمة من زر "مهمة جديدة" في الأعلى.</p></div>`;
      return;
    }
    $('#results').innerHTML = `<div class="stack-sm">${list.map((t) => {
      const goal = t.goalId ? G.goals.get(t.goalId) : null;
      const alarm = G.reminders.get(t.id, 'alarm');
      const notif = G.reminders.get(t.id, 'notification');
      const ended = t.endDate && t.endDate < D.today();
      return `
        <div class="def-row" data-id="${esc(t.id)}" style="--c:${esc(G.categories.color(t.categoryId))}">
          <div>
            <div class="def-row__name">${esc(t.name)} ${ended ? '<span class="badge">انتهى التكرار</span>' : ''}</div>
            <div class="def-row__meta">
              <span class="badge badge--accent">${esc(T.PERIODS[t.period])}</span>
              <span>${G.icon('repeat')} ${esc(T.describeRepeat(t))}</span>
              <span>${G.icon('calendar')} من ${esc(D.formatShort(t.date))}${t.endDate ? ` حتى ${esc(D.formatShort(t.endDate))}` : ''}</span>
              ${t.timed ? `<span class="num">${G.icon('clock')} ${esc(D.formatTime(t.startTime))}${t.endTime ? ' – ' + esc(D.formatTime(t.endTime)) : ''}</span>` : ''}
              ${G.categories.chip(t.categoryId)}
              <span class="priority priority--${t.priority}">${T.PRIORITY[t.priority]}</span>
              ${goal ? `<span>${G.icon('target')} ${esc(goal.name)}</span>` : '<span>مستقلة</span>'}
              ${alarm && alarm.active ? `<span>${G.icon('alarm')} ${esc(G.reminders.describe(alarm))}</span>` : ''}
              ${notif && notif.active ? `<span>${G.icon('bell')} ${esc(G.reminders.describe(notif))}</span>` : ''}
            </div>
          </div>
          <div class="def-row__actions">
            <button class="icon-btn icon-btn--sm" data-def="history" aria-label="السجل" title="السجل">${G.icon('history')}</button>
            <button class="icon-btn icon-btn--sm" data-def="edit" aria-label="تعديل" title="تعديل">${G.icon('edit')}</button>
            <button class="icon-btn icon-btn--sm" data-def="delete" aria-label="حذف" title="حذف">${G.icon('trash')}</button>
          </div>
        </div>`;
    }).join('')}</div>`;
  }

  function render() {
    renderCats();
    if (state.tab === 'occ') renderOccurrences(); else renderDefinitions();
  }
})(window.Ghars);
