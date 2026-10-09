/* ==========================================================================
   goals.js — صفحة الأهداف
   - نظرة عامة: بطاقات الأهداف الجذرية مع نسبة التقدم
   - التفاصيل (?id=): شجرة الهدف السنوي ← الشهرية ← الأسبوعية ← المهام
   ========================================================================== */
(function (G) {
  'use strict';

  const { $, $$, esc } = G.dom;
  const D = G.date;
  const GL = G.goals;
  const T = G.tasks;

  const state = { id: G.dom.param('id'), level: '', status: 'active', collapsed: new Set() };

  G.boot({ page: 'goals', title: 'الأهداف' }).then((user) => {
    if (!user) return;

    $('[data-new-goal]').addEventListener('click', () => G.goalForm.open({ level: state.level || 'yearly' }));
    G.dom.on($('#goal-grid'), 'click', '[data-first-goal]', () => G.goalForm.open({ level: 'yearly' }));

    $('#level-filter').addEventListener('click', (e) => {
      const b = e.target.closest('[data-level]');
      if (!b) return;
      state.level = b.dataset.level;
      $$('#level-filter button').forEach((x) => x.classList.toggle('is-active', x === b));
      render();
    });
    $('#status-filter').addEventListener('click', (e) => {
      const b = e.target.closest('[data-status]');
      if (!b) return;
      state.status = b.dataset.status;
      $$('#status-filter button').forEach((x) => x.classList.toggle('is-active', x === b));
      render();
    });

    // فتح هدف
    G.dom.on($('#goal-grid'), 'click', '[data-open]', (e, el) => open(el.dataset.open));
    window.addEventListener('popstate', () => { state.id = G.dom.param('id'); render(); });

    // إجراءات الشجرة
    const detail = $('#detail');
    G.dom.on(detail, 'click', '[data-act]', (e, b) => {
      e.preventDefault();
      const id = b.dataset.id;
      const goal = GL.get(id);
      switch (b.dataset.act) {
        case 'back': open(null); break;
        case 'open': open(id); break;
        case 'toggle':
          if (state.collapsed.has(id)) state.collapsed.delete(id); else state.collapsed.add(id);
          render();
          break;
        case 'sub': G.goalForm.open({ parentId: id }); break;
        case 'task': G.taskForm.open({ defaults: { goalId: id, categoryId: goal && goal.categoryId, date: goal && goal.startDate > D.today() ? goal.startDate : D.today() } }); break;
        case 'edit': G.goalForm.open({ goal }); break;
        case 'complete': GL.update(id, { status: goal.status === 'completed' ? 'active' : 'completed' }); break;
        case 'delete': remove(goal); break;
        case 'task-edit': G.taskForm.open({ task: T.get(id) }); break;
        case 'task-history': G.taskActions.history(T.get(id)); break;
        case 'task-toggle': {
          const t = T.get(id);
          const key = b.dataset.key;
          if (T.statusOf(t, key) === 'done') T.undo(t, key); else T.complete(t, key);
          break;
        }
        default:
      }
    });

    G.live(render);
  });

  function open(id) {
    state.id = id;
    history.pushState(null, '', id ? `goals.html?id=${encodeURIComponent(id)}` : 'goals.html');
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function remove(goal) {
    const subs = GL.children(goal.id).length;
    const ok = await G.modal.confirm({
      title: 'حذف الهدف؟',
      message: `سيُحذف "${goal.name}"${subs ? ` مع ${subs} من الأهداف الفرعية` : ''}. المهام المرتبطة لن تُحذف وستصبح مهامًا مستقلة.`,
      confirmText: 'حذف',
      danger: true,
    });
    if (!ok) return;
    const parent = goal.parentId;
    GL.remove(goal.id);
    if (state.id === goal.id) open(parent || null);
  }

  function render() {
    const goal = state.id ? GL.get(state.id) : null;
    $('#overview').hidden = !!goal;
    $('#detail').hidden = !goal;
    if (goal) renderDetail(goal); else renderOverview();
  }

  /* ---------- النظرة العامة ---------- */
  function renderOverview() {
    const list = GL.list()
      .filter((g) => (state.level ? g.level === state.level : !g.parentId || !GL.get(g.parentId)))
      .filter((g) => !state.status || g.status === state.status)
      .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

    if (!list.length) {
      $('#goal-grid').innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          <div class="empty__icon">${G.icon('target')}</div>
          <div class="empty__title">${GL.list().length ? 'لا أهداف مطابقة' : 'ازرع هدفك الأول'}</div>
          <p class="empty__text">ابدأ بهدف سنوي كبير، ثم قسّمه إلى أهداف شهرية وأسبوعية ومهام يومية.</p>
          <button class="btn" data-first-goal>+ هدف سنوي</button>
        </div>`;
      return;
    }

    $('#goal-grid').innerHTML = list.map((g) => {
      const pct = GL.progress(g);
      const subs = GL.children(g.id).length;
      const tasks = GL.tasksOf(g.id).length;
      return `
        <button class="goal-card" data-open="${esc(g.id)}" style="--c:${esc(G.categories.color(g.categoryId))}">
          <div class="goal-card__top">
            <span class="level-badge">${esc(GL.levelLabel(g.level))}</span>
            ${g.status !== 'active' ? `<span class="badge">${esc(GL.STATUS[g.status])}</span>` : G.categories.chip(g.categoryId)}
          </div>
          <div class="goal-card__name">${esc(g.name)}</div>
          ${g.description ? `<p class="goal-card__desc">${esc(g.description)}</p>` : ''}
          ${G.charts.progress({ pct, label: 'التقدم' })}
          <div class="goal-card__foot">
            <span>${subs} أهداف فرعية • ${tasks} مهام</span>
            <span>${esc(D.formatShort(g.startDate))} – ${esc(D.formatShort(g.endDate))}</span>
          </div>
        </button>`;
    }).join('');
  }

  /* ---------- التفاصيل والشجرة ---------- */
  function linkedTasks(goal) {
    const tasks = GL.tasksOf(goal.id);
    if (!tasks.length) return '';
    const today = D.today();
    return tasks.map((t) => {
      const items = T.occurrences(goal.startDate, goal.endDate, [t.period]).filter((o) => o.task.id === t.id);
      const s = G.progress.summarize(items);
      const todayKey = t.period === 'day' ? today : D.periodStart(t.period, today, G.auth.user().settings.weekStart);
      const occursNow = t.period === 'day' ? T.occursOn(t, today) : T.occursInPeriod(t, todayKey);
      const st = occursNow ? T.statusOf(t, todayKey) : null;
      const canTick = occursNow && !['excluded', 'cancelled', 'postponed'].includes(st);
      return `
        <div class="linked ${st === 'done' ? 'is-done' : ''}" style="--c:${esc(G.categories.color(t.categoryId))}">
          ${canTick
            ? `<button class="task__check" data-act="task-toggle" data-id="${esc(t.id)}" data-key="${esc(todayKey)}" aria-label="${st === 'done' ? 'إلغاء الإنجاز' : 'تم الإنجاز'}">${G.icon('check')}</button>`
            : '<span class="linked__dot"></span>'}
          <div>
            <div class="linked__name">${esc(t.name)}</div>
            <div class="linked__meta">${esc(T.describeRepeat(t))}${occursNow ? ` • اليوم: ${esc(T.STATUS[st])}` : ''}</div>
          </div>
          <span class="linked__stat">${s.done}/${s.total} • ${s.pct}%</span>
          <span class="node__actions">
            <button class="icon-btn icon-btn--sm" data-act="task-history" data-id="${esc(t.id)}" aria-label="السجل">${G.icon('history')}</button>
            <button class="icon-btn icon-btn--sm" data-act="task-edit" data-id="${esc(t.id)}" aria-label="تعديل المهمة">${G.icon('edit')}</button>
          </span>
        </div>`;
    }).join('');
  }

  function node(goal, depth) {
    const pct = GL.progress(goal);
    const children = GL.children(goal.id);
    const childLevel = GL.childLevel(goal.level);
    const collapsed = state.collapsed.has(goal.id);
    const body = linkedTasks(goal) + children.map((c) => node(c, depth + 1)).join('');
    return `
      <div class="node ${collapsed ? 'is-collapsed' : ''}">
        <div class="node__head">
          <button class="icon-btn icon-btn--sm node__toggle" data-act="toggle" data-id="${esc(goal.id)}" aria-expanded="${!collapsed}" aria-label="طي/توسيع">${G.icon('chevronDown')}</button>
          <div class="node__title">
            <span class="level-badge">${esc(GL.levelLabel(goal.level))}</span>
            <a href="goals.html?id=${esc(goal.id)}" data-act="open" data-id="${esc(goal.id)}">${esc(goal.name)}</a>
            ${goal.status === 'completed' ? '<span class="badge badge--done">مكتمل</span>' : ''}
            <span class="node__dates">${esc(D.formatShort(goal.startDate))} – ${esc(D.formatShort(goal.endDate))}</span>
          </div>
          ${G.charts.progress({ pct, size: 'sm', label: ' ' })}
          <div class="node__actions">
            ${childLevel ? `<button class="icon-btn icon-btn--sm" data-act="sub" data-id="${esc(goal.id)}" aria-label="إضافة هدف ${esc(GL.levelLabel(childLevel))}" title="إضافة هدف ${esc(GL.levelLabel(childLevel))}">${G.icon('target')}</button>` : ''}
            <button class="icon-btn icon-btn--sm" data-act="task" data-id="${esc(goal.id)}" aria-label="إضافة مهمة مرتبطة" title="إضافة مهمة مرتبطة">${G.icon('plus')}</button>
            <button class="icon-btn icon-btn--sm" data-act="edit" data-id="${esc(goal.id)}" aria-label="تعديل" title="تعديل">${G.icon('edit')}</button>
          </div>
        </div>
        ${body ? `<div class="node__body">${body}</div>` : ''}
      </div>`;
  }

  function renderDetail(goal) {
    const pct = GL.progress(goal);
    const ancestors = GL.ancestors(goal.id);
    const childLevel = GL.childLevel(goal.level);
    const children = GL.children(goal.id);
    const ts = GL.taskStats(goal);
    const daysLeft = D.diffDays(D.today(), goal.endDate);

    const crumbs = [`<a href="goals.html" data-act="back">الأهداف</a>`]
      .concat(ancestors.map((a) => `<a href="goals.html?id=${esc(a.id)}" data-act="open" data-id="${esc(a.id)}">${esc(a.name)}</a>`))
      .concat(`<span>${esc(goal.name)}</span>`)
      .join(G.icon('chevronLeft'));

    $('#detail').innerHTML = `
      <nav class="crumbs" aria-label="مسار الهدف">${crumbs}</nav>
      <section class="card goal-hero">
        <div>
          <span class="level-badge">هدف ${esc(GL.levelLabel(goal.level))}</span>
          <h1 class="goal-hero__title">${esc(goal.name)}</h1>
          ${goal.description ? `<p class="text-muted">${esc(goal.description)}</p>` : ''}
          <div class="goal-hero__meta mt-2">
            <span>${G.icon('calendar')} ${esc(D.formatShort(goal.startDate))} – ${esc(D.formatShort(goal.endDate))}</span>
            <span>${daysLeft >= 0 ? `بقي ${daysLeft} يومًا` : 'انتهت المدة'}</span>
            ${G.categories.chip(goal.categoryId)}
            <span class="priority priority--${goal.priority}">${T.PRIORITY[goal.priority]}</span>
            <span class="badge ${goal.status === 'completed' ? 'badge--done' : ''}">${esc(GL.STATUS[goal.status])}</span>
            ${ts ? `<span>المهام: ${ts.done}/${ts.total}</span>` : ''}
          </div>
          <div class="goal-hero__actions">
            ${childLevel ? `<button class="btn btn--sm" data-act="sub" data-id="${esc(goal.id)}">+ هدف ${esc(GL.levelLabel(childLevel))}</button>` : ''}
            <button class="btn btn--soft btn--sm" data-act="task" data-id="${esc(goal.id)}">+ مهمة مرتبطة</button>
            <button class="btn btn--ghost btn--sm" data-act="edit" data-id="${esc(goal.id)}">تعديل</button>
            <button class="btn btn--ghost btn--sm" data-act="complete" data-id="${esc(goal.id)}">${goal.status === 'completed' ? 'إعادة تنشيط' : 'تحديد كمكتمل'}</button>
            <button class="btn btn--ghost btn--sm text-danger" data-act="delete" data-id="${esc(goal.id)}">حذف</button>
          </div>
        </div>
        ${G.charts.ring(pct, { size: 150, caption: 'التقدم' })}
      </section>

      <div class="card__head">
        <h2 class="card__title"><span class="tile tile--sm tile--leaf">${G.icon('leaf')}</span>شجرة الهدف</h2>
        <span class="card__subtitle">نسبة كل مستوى = متوسط أهدافه الفرعية ومهامه المرتبطة</span>
      </div>
      <div class="tree">
        ${children.length || GL.tasksOf(goal.id).length
          ? `${linkedTasks(goal)}${children.map((c) => node(c, 1)).join('')}`
          : `<div class="empty"><div class="empty__icon">${G.icon('leaf')}</div><div class="empty__title">قسّم هدفك</div>
              <p class="empty__text">${childLevel ? `أضف أهدافًا ${GL.levelLabel(childLevel) === 'شهري' ? 'شهرية' : 'أسبوعية'} أو مهامًا مرتبطة مباشرة.` : 'أضف المهام اليومية التي تحقق هذا الهدف.'}</p></div>`}
      </div>`;
  }
})(window.Ghars);
