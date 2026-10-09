/* ==========================================================================
   admin.js — لوحة الإدارة (للحسابات ذات الدور admin فقط)
   Dashboard • Users • Settings
   الخصوصية: الإدارة ترى أعدادًا مجمّعة فقط، ولا تفتح محتوى المستخدمين.
   ========================================================================== */
(function (G) {
  'use strict';

  const { $, $$, esc } = G.dom;
  const D = G.date;
  const S = G.store;

  const state = { q: '', filter: '' };

  function section() {
    const h = (location.hash || '#dashboard').slice(1);
    return ['dashboard', 'users', 'settings'].includes(h) ? h : 'dashboard';
  }

  G.boot({ page: `admin-${section()}`, title: 'لوحة الإدارة', role: 'admin' }).then((user) => {
    if (!user) return;

    $('#user-search-box').insertAdjacentHTML('afterbegin', G.icon('search'));
    $('#user-search').addEventListener('input', G.dom.debounce((e) => { state.q = e.target.value.trim().toLowerCase(); renderUsers(); }, 150));
    $('#user-filter').addEventListener('click', (e) => {
      const b = e.target.closest('[data-f]');
      if (!b) return;
      state.filter = b.dataset.f;
      $$('#user-filter button').forEach((x) => x.classList.toggle('is-active', x === b));
      renderUsers();
    });

    G.dom.on($('#users-table'), 'click', '[data-user-act]', async (e, b) => {
      const id = b.dataset.id;
      const target = S.get('users', id);
      if (!target) return;
      if (id === user.id) return G.toast('لا يمكنك تعديل حسابك الحالي من هنا.', { type: 'warning' });
      const act = b.dataset.userAct;
      if (act === 'toggle') {
        S.update('users', id, { active: !target.active });
        G.toast(target.active ? 'تم تعطيل الحساب.' : 'تم تفعيل الحساب.', { type: 'info' });
      } else if (act === 'role') {
        const ok = await G.modal.confirm({ title: 'تغيير الصلاحية؟', message: target.role === 'admin' ? `إزالة صلاحية الإدارة من ${target.name}؟` : `منح ${target.name} صلاحية الإدارة؟`, confirmText: 'تأكيد' });
        if (ok) S.update('users', id, { role: target.role === 'admin' ? 'user' : 'admin' });
      } else if (act === 'delete') {
        const ok = await G.modal.confirm({ title: 'حذف الحساب نهائيًا؟', message: `سيُحذف حساب ${target.email} وكل بياناته.`, confirmText: 'حذف', danger: true });
        if (ok) S.purgeUser(id);
      }
    });

    // الإعلان
    const announce = $('#announce-form');
    announce.announcement.value = S.app().announcement || '';
    announce.addEventListener('submit', (e) => {
      e.preventDefault();
      S.setApp({ announcement: announce.announcement.value.trim() });
      G.toast('تم حفظ الإعلان.', { type: 'success' });
    });

    // الرسائل التحفيزية
    $('#message-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = e.target.message.value.trim();
      if (!v) return;
      S.setApp({ messages: (S.app().messages || []).concat(v) });
      e.target.reset();
    });
    G.dom.on($('#messages-list'), 'click', '[data-del-msg]', (e, b) => {
      const list = (S.app().messages || []).slice();
      list.splice(Number(b.dataset.delMsg), 1);
      S.setApp({ messages: list });
    });

    // التصنيفات العامة
    $('#gcat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = G.dom.formData(e.target);
      if (!String(f.name || '').trim()) return G.toast('اسم التصنيف مطلوب', { type: 'danger' });
      G.categories.createGlobal({ name: f.name.trim(), icon: f.icon, color: f.color, worship: !!f.worship });
      e.target.reset();
    });
    G.dom.on($('#cats-table'), 'click', '[data-cat-act]', async (e, b) => {
      const c = G.categories.get(b.dataset.id);
      if (!c) return;
      if (b.dataset.catAct === 'toggle') G.categories.update(c.id, { active: c.active === false });
      if (b.dataset.catAct === 'worship') G.categories.update(c.id, { worship: !c.worship });
      if (b.dataset.catAct === 'delete') {
        const ok = await G.modal.confirm({ title: 'حذف التصنيف العام؟', message: 'المهام التي تستخدمه ستصبح بدون تصنيف. يُفضَّل الإخفاء بدل الحذف.', confirmText: 'حذف', danger: true });
        if (ok) {
          S.where('tasks', (t) => t.categoryId === c.id).forEach((t) => S.update('tasks', t.id, { categoryId: null }));
          G.categories.remove(c.id);
        }
      }
    });

    window.addEventListener('hashchange', () => { showSection(); });
    showSection();
    G.live(render);
  });

  function showSection() {
    const s = section();
    $$('[data-section]').forEach((el) => { el.hidden = el.dataset.section !== s; });
    $$('.nav__link, .bottom-nav a').forEach((a) => {
      const on = a.getAttribute('href') === `admin.html#${s}`;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function render() {
    renderDashboard();
    renderUsers();
    renderSettings();
  }

  function renderDashboard() {
    const users = S.all('users');
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const active = users.filter((u) => u.active && u.lastLoginAt && u.lastLoginAt >= weekAgo).length;
    const disabled = users.filter((u) => !u.active).length;
    const monthStart = D.monthStart(D.today());
    const newThisMonth = users.filter((u) => u.createdAt && D.key(new Date(u.createdAt)) >= monthStart).length;

    $('#admin-kpis').innerHTML = [
      ['users', 'sky', 'عدد المستخدمين', users.filter((u) => u.role === 'user').length, `${users.filter((u) => u.role === 'admin').length} حساب إدارة`],
      ['zap', 'leaf', 'النشطون', active, 'دخلوا خلال 7 أيام'],
      ['ban', 'rose', 'الحسابات المعطّلة', disabled, ''],
      ['sparkle', 'gold', 'جدد هذا الشهر', newThisMonth, D.formatMonth(D.today())],
    ].map(([i, t, l, v, m]) => G.charts.stat(i, t, l, v, m)).join('');

    // تسجيلات آخر 6 أشهر
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const mk = D.addMonths(monthStart, -i);
      const count = users.filter((u) => u.createdAt && D.key(new Date(u.createdAt)).slice(0, 7) === mk.slice(0, 7)).length;
      months.push({ key: mk, label: D.MONTHS[D.parse(mk).getMonth()].slice(0, 3), fullLabel: D.formatMonth(mk), value: count, current: i === 0, meta: `${count} مستخدم` });
    }
    const max = Math.max(4, ...months.map((m) => m.value));
    G.charts.bar($('#signups-chart'), months, { max, unit: '', height: 200, label: 'المستخدمون الجدد' });

    const tasks = S.all('tasks').length;
    const goals = S.all('goals').length;
    const execs = S.all('executions').filter((e) => e.status === 'done').length;
    const alarms = S.all('reminders').filter((r) => r.type === 'alarm' && r.active).length;
    $('#global-stats').innerHTML = [
      ['إجمالي المهام', tasks],
      ['إجمالي الأهداف', goals],
      ['مرات الإنجاز المسجلة', execs],
      ['المنبّهات المفعّلة', alarms],
      ['التصنيفات العامة', G.categories.globals().length],
    ].map(([l, v]) => `<div class="list-row"><span>${l}</span><strong class="num">${v}</strong></div>`).join('');
  }

  function renderUsers() {
    const me = G.auth.userId();
    const rows = S.all('users')
      .filter((u) => !state.q || u.name.toLowerCase().includes(state.q) || u.email.includes(state.q))
      .filter((u) => !state.filter || (state.filter === 'active' && u.active) || (state.filter === 'disabled' && !u.active) || (state.filter === 'admin' && u.role === 'admin'))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    $('#users-table').innerHTML = `
      <thead><tr><th>المستخدم</th><th>الدور</th><th>الحالة</th><th>العمر</th><th>تاريخ الإنشاء</th><th>آخر دخول</th><th>المهام</th><th>إجراءات</th></tr></thead>
      <tbody>${rows.map((u) => `
        <tr>
          <td><div class="user-cell"><span class="avatar">${esc(G.dom.initial(u.name))}</span><span>${esc(u.name)}${u.id === me ? ' <span class="badge badge--accent">أنت</span>' : ''}<small>${esc(u.email)}</small></span></div></td>
          <td>${u.role === 'admin' ? '<span class="badge badge--accent">Admin</span>' : '<span class="badge">User</span>'}</td>
          <td><span class="status-dot ${u.active ? '' : 'is-off'}">${u.active ? 'نشط' : 'معطّل'}</span></td>
          <td class="num">${u.age || '—'}</td>
          <td class="num">${u.createdAt ? esc(D.formatShort(D.key(new Date(u.createdAt)))) : '—'}</td>
          <td class="num">${u.lastLoginAt ? esc(D.formatDateTime(u.lastLoginAt)) : '—'}</td>
          <td class="num">${S.where('tasks', (t) => t.userId === u.id).length}</td>
          <td>${u.id === me ? '—' : `
            <div class="row" style="gap:4px">
              <button class="btn btn--ghost btn--sm" data-user-act="toggle" data-id="${esc(u.id)}">${u.active ? 'تعطيل' : 'تفعيل'}</button>
              <button class="btn btn--ghost btn--sm" data-user-act="role" data-id="${esc(u.id)}">${u.role === 'admin' ? 'إزالة الإدارة' : 'جعله Admin'}</button>
              <button class="icon-btn icon-btn--sm" data-user-act="delete" data-id="${esc(u.id)}" aria-label="حذف">${G.icon('trash')}</button>
            </div>`}</td>
        </tr>`).join('') || '<tr><td colspan="8" class="text-faint">لا نتائج</td></tr>'}
      </tbody>`;
  }

  function renderSettings() {
    const msgs = S.app().messages || [];
    $('#messages-list').innerHTML = msgs.length
      ? msgs.map((m, i) => `<li class="list-row"><span class="text-sm">${esc(m)}</span><button class="icon-btn icon-btn--sm" data-del-msg="${i}" aria-label="حذف">${G.icon('trash')}</button></li>`).join('')
      : '<li class="text-sm text-faint">لا رسائل مخصصة — تُستخدم مكتبة التطبيق الافتراضية.</li>';

    $('#cats-table').innerHTML = `
      <thead><tr><th>التصنيف</th><th>تعبّدي</th><th>الحالة</th><th>الاستخدام</th><th>إجراءات</th></tr></thead>
      <tbody>${G.categories.globals().map((c) => `
        <tr>
          <td><span class="swatch-mini" style="background:${esc(c.color)}"></span> ${esc(c.icon || '')} ${esc(c.name)}</td>
          <td>${c.worship ? 'نعم' : 'لا'}</td>
          <td><span class="status-dot ${c.active === false ? 'is-off' : ''}">${c.active === false ? 'مخفي' : 'ظاهر'}</span></td>
          <td class="num">${S.where('tasks', (t) => t.categoryId === c.id).length}</td>
          <td><div class="row" style="gap:4px">
            <button class="btn btn--ghost btn--sm" data-cat-act="toggle" data-id="${esc(c.id)}">${c.active === false ? 'إظهار' : 'إخفاء'}</button>
            <button class="btn btn--ghost btn--sm" data-cat-act="worship" data-id="${esc(c.id)}">${c.worship ? 'إلغاء التعبّدي' : 'جعله تعبّديًا'}</button>
            <button class="icon-btn icon-btn--sm" data-cat-act="delete" data-id="${esc(c.id)}" aria-label="حذف">${G.icon('trash')}</button>
          </div></td>
        </tr>`).join('')}</tbody>`;
  }
})(window.Ghars);
