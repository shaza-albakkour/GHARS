/* ==========================================================================
   task-item.js — عرض صف المهمة وإجراءاته (يُستخدم في كل الصفحات)
   Ghars.taskItem.list(items, opts)  → HTML لقائمة مهام
   Ghars.taskItem.bind(container)    → تفعيل الأزرار والقائمة داخل الحاوية
   ========================================================================== */
(function (G) {
  'use strict';

  const esc = (s) => G.dom.esc(s);
  const D = G.date;
  const T = G.tasks;

  function meta(task, key, status, opts) {
    const parts = [];
    parts.push(`<span class="badge badge--${status}">${T.STATUS[status]}</span>`);
    const time = T.timeOf(task, key);
    if (task.timed && time) {
      parts.push(`<span class="task__meta-item num">${G.icon('clock')}${esc(D.formatTime(time))}${task.endTime ? ' – ' + esc(D.formatTime(task.endTime)) : ''}</span>`);
    }
    if (opts.showDate) parts.push(`<span class="task__meta-item">${G.icon('calendar')}${esc(task.period === 'day' ? D.relative(key) : `${T.PERIODS[task.period]} • ${D.formatShort(key)}`)}</span>`);
    if (task.categoryId) parts.push(G.categories.chip(task.categoryId));
    parts.push(`<span class="priority priority--${task.priority}">${T.PRIORITY[task.priority]}</span>`);
    if (task.repeat !== 'none') parts.push(`<span class="task__meta-item">${G.icon('repeat')}${esc(T.describeRepeat(task))}</span>`);
    const alarm = G.reminders.get(task.id, 'alarm');
    if (alarm && alarm.active) parts.push(`<span class="task__meta-item" title="منبّه مفعّل">${G.icon('alarm')}منبّه</span>`);
    if (task.goalId) {
      const goal = G.goals.get(task.goalId);
      if (goal) parts.push(`<span class="task__meta-item">${G.icon('target')}${esc(goal.name)}</span>`);
    }
    if (status === 'excluded') {
      const reason = T.exclusionReason(task, key);
      if (reason) parts.push(`<span class="task__meta-item">${esc(reason)}</span>`);
    }
    if (task.postponedCount) parts.push(`<span class="task__meta-item text-warning">أُجّلت ${task.postponedCount === 1 ? 'مرة' : task.postponedCount + ' مرات'}</span>`);
    const e = T.exec(task.id, key);
    if (status === 'postponed' && e && e.postponedTo) parts.push(`<span class="task__meta-item">إلى ${esc(D.formatShort(e.postponedTo))}</span>`);
    if (e && e.timeOverride) parts.push('<span class="task__meta-item text-warning">وقت مؤجل</span>');
    return parts.join('');
  }

  const taskItem = {
    html({ task, key }, opts) {
      const o = opts || {};
      const status = T.statusOf(task, key);
      const locked = ['excluded', 'cancelled', 'postponed'].includes(status);
      const cls = ['task', `is-${status === 'done' ? 'done' : status}`].join(' ');
      return `
        <li class="${cls}" data-task="${esc(task.id)}" data-key="${esc(key)}" style="--c:${esc(G.categories.color(task.categoryId))}">
          <button class="task__check" data-act="toggle" ${locked ? 'disabled' : ''}
            aria-label="${status === 'done' ? 'إلغاء الإنجاز' : 'تم الإنجاز'}: ${esc(task.name)}" title="${status === 'done' ? 'إلغاء الإنجاز' : 'تم الإنجاز'}">${G.icon('check')}</button>
          <div class="task__body">
            <div class="task__name">${esc(task.name)}</div>
            <div class="task__meta">${meta(task, key, status, o)}</div>
          </div>
          <div class="task__actions">
            <button class="icon-btn icon-btn--sm" data-act="menu" aria-label="خيارات المهمة" aria-haspopup="menu">${G.icon('more')}</button>
          </div>
        </li>`;
    },

    list(items, opts) {
      if (!items.length) return '';
      return `<ul class="task-list">${items.map((it) => taskItem.html(it, opts)).join('')}</ul>`;
    },

    /** تفعيل الإجراءات داخل حاوية (مرة واحدة لكل حاوية) */
    bind(container) {
      if (container.dataset.tasksBound) return;
      container.dataset.tasksBound = '1';
      G.dom.on(container, 'click', '[data-act]', (e, btn) => {
        const li = btn.closest('[data-task]');
        if (!li) return;
        const task = T.get(li.dataset.task);
        const key = li.dataset.key;
        if (!task) return;
        if (btn.dataset.act === 'toggle') {
          const status = T.statusOf(task, key);
          if (status === 'done') {
            T.undo(task, key);
            G.toast('أُعيدت المهمة إلى غير مكتملة.', { type: 'info' });
          } else {
            T.complete(task, key);
          }
        } else if (btn.dataset.act === 'menu') {
          e.stopPropagation();
          taskItem.menu(btn, task, key);
        }
      });
    },

    /** قائمة الإجراءات المنسدلة */
    menu(anchor, task, key) {
      document.querySelectorAll('.menu').forEach((m) => m.remove());
      const status = T.statusOf(task, key);
      const e = T.exec(task.id, key);
      const items = [];
      if (status !== 'done' && status !== 'excluded' && status !== 'cancelled' && status !== 'postponed') {
        items.push(['progress', status === 'in_progress' ? 'pause' : 'play', status === 'in_progress' ? 'إرجاع إلى "لم تبدأ"' : 'قيد التنفيذ']);
        items.push(['postpone', 'clock', 'تأجيل المهمة']);
      }
      items.push(['edit', 'edit', 'تعديل']);
      if (e && e.excluded) items.push(['unexclude', 'skip', 'إلغاء الاستثناء']);
      else if (status !== 'done') items.push(['exclude', 'skip', 'استثناء هذا اليوم']);
      if (status === 'cancelled') items.push(['restore', 'repeat', 'استعادة']);
      else if (status !== 'done') items.push(['cancel', 'ban', task.repeat === 'none' ? 'إلغاء المهمة' : 'إلغاء هذا التكرار']);
      items.push(['history', 'history', 'سجل المهمة']);
      items.push('-');
      if (task.repeat !== 'none' && (!task.endDate || task.endDate >= D.today())) items.push(['stop', 'pause', 'إيقاف التكرار من اليوم']);
      items.push(['delete', 'trash', 'حذف نهائي', true]);

      const menu = G.dom.el(`<div class="menu" role="menu">${items.map((it) => (it === '-' ? '<hr>' : `<button role="menuitem" data-m="${it[0]}" class="${it[3] ? 'is-danger' : ''}">${G.icon(it[1])}${it[2]}</button>`)).join('')}</div>`);
      document.body.appendChild(menu);
      const r = anchor.getBoundingClientRect();
      const mw = menu.offsetWidth;
      const mh = menu.offsetHeight;
      let top = r.bottom + window.scrollY + 4;
      if (r.bottom + mh > window.innerHeight - 8) top = r.top + window.scrollY - mh - 4;
      let left = r.left + window.scrollX;
      if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
      menu.style.top = `${Math.max(8, top)}px`;
      menu.style.left = `${Math.max(8, left)}px`;
      const first = menu.querySelector('button');
      if (first) first.focus();

      const close = () => { menu.remove(); document.removeEventListener('click', outside, true); document.removeEventListener('keydown', onKey); };
      const outside = (ev) => { if (!menu.contains(ev.target)) close(); };
      const onKey = (ev) => { if (ev.key === 'Escape') { close(); anchor.focus(); } };
      setTimeout(() => { document.addEventListener('click', outside, true); document.addEventListener('keydown', onKey); });

      menu.addEventListener('click', async (ev) => {
        const b = ev.target.closest('[data-m]');
        if (!b) return;
        close();
        const A = G.taskActions;
        switch (b.dataset.m) {
          case 'progress': T.setStatus(task, key, status === 'in_progress' ? 'not_started' : 'in_progress'); break;
          case 'postpone': A.postpone(task, key); break;
          case 'edit': G.taskForm.open({ task }); break;
          case 'exclude': A.exclude(task, key); break;
          case 'unexclude': T.unexclude(task, key); break;
          case 'cancel': T.setStatus(task, key, 'cancelled'); G.toast('أُلغيت المهمة ولن تُحتسب في نسبة الإنجاز.'); break;
          case 'restore': T.setStatus(task, key, 'not_started'); break;
          case 'history': A.history(task); break;
          case 'stop': T.stopRepeating(task.id); G.toast('توقف تكرار المهمة، وبقي سجلها السابق محفوظًا.'); break;
          case 'delete': A.remove(task); break;
          default:
        }
      });
    },
  };

  G.taskItem = taskItem;
})(window.Ghars = window.Ghars || {});
