/* ==========================================================================
   settings.js — الإعدادات: الملف الشخصي، كلمة السر، المظهر، الإشعارات،
   أيام الراحة والاستثناءات، التصنيفات، التقدم، النسخ الاحتياطي
   ========================================================================== */
(function (G) {
  'use strict';

  const { $, $$, esc } = G.dom;
  const D = G.date;
  const A = G.auth;

  G.boot({ page: 'settings', title: 'الإعدادات' }).then((user) => {
    if (!user) return;
    setupProfile(user);
    setupPassword();
    setupAppearance();
    setupCategories();
    setupData();
    renderNotifications();
    renderRest();
    renderProgress();
    renderCategories();

    // إعادة رسم الأجزاء الديناميكية فقط عند تغيّر البيانات
    G.store.subscribe(() => requestAnimationFrame(() => {
      renderCategories();
      renderRestLists();
    }));
  });

  /* ---------- الملف الشخصي ---------- */
  function setupProfile(user) {
    const form = $('#profile-form');
    form.name.value = user.name;
    form.age.value = user.age || '';
    form.email.value = user.email;
    form.querySelector(`[name=gender][value="${user.gender === 'm' ? 'm' : 'f'}"]`).checked = true;
    $('#created-at').textContent = `تاريخ إنشاء الحساب: ${D.formatLong(D.key(new Date(user.createdAt)))}`;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = G.dom.formData(form);
      if (!String(f.name).trim()) return G.toast('الاسم مطلوب', { type: 'danger' });
      A.updateProfile({ name: String(f.name).trim(), age: f.age ? Number(f.age) : null, gender: f.gender });
      G.toast('تم حفظ الملف الشخصي.', { type: 'success' });
    });
  }

  /* ---------- كلمة السر ---------- */
  function setupPassword() {
    const form = $('#password-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = G.dom.formData(form);
      const err = form.querySelector('[data-error]');
      err.textContent = '';
      try {
        if (f.next !== f.confirm) throw new Error('كلمتا السر الجديدتان غير متطابقتين');
        await A.changePassword(f.current, f.next);
        form.reset();
        G.toast('تم تغيير كلمة السر.', { type: 'success' });
      } catch (ex) {
        err.textContent = ex.message;
      }
    });
  }

  /* ---------- المظهر ---------- */
  function setupAppearance() {
    const paint = () => {
      const s = A.user().settings;
      $$('#theme-mode button').forEach((b) => b.classList.toggle('is-active', b.dataset.mode === s.theme));
      $('#accents').innerHTML = G.theme.ACCENTS.map((a) => `
        <button class="swatch ${s.accent === a.id ? 'is-active' : ''}" data-accent="${a.id}" role="radio" aria-checked="${s.accent === a.id}" style="--sw:${a.color}">
          <span class="swatch__dot">${G.icon('check')}</span>${a.name}
        </button>`).join('');
    };
    paint();
    $('#theme-mode').addEventListener('click', (e) => {
      const b = e.target.closest('[data-mode]');
      if (!b) return;
      A.updateSettings({ theme: b.dataset.mode });
      G.theme.apply({ theme: b.dataset.mode });
      paint();
    });
    $('#accents').addEventListener('click', (e) => {
      const b = e.target.closest('[data-accent]');
      if (!b) return;
      A.updateSettings({ accent: b.dataset.accent });
      G.theme.apply({ accent: b.dataset.accent });
      paint();
    });
  }

  /* ---------- الإشعارات ---------- */
  function row(title, desc, control) {
    return `<div class="setting-row"><div class="setting-row__text"><strong>${title}</strong>${desc ? `<small>${desc}</small>` : ''}</div>${control}</div>`;
  }
  function toggle(name, checked) {
    return `<label class="switch"><input type="checkbox" data-n="${name}" ${checked ? 'checked' : ''}><span class="switch-track"></span><span class="sr-only">${name}</span></label>`;
  }

  function renderNotifications() {
    const n = A.user().settings.notifications;
    const perm = G.notify.permission();
    const permText = { granted: 'مسموح', denied: 'مرفوض — غيّره من إعدادات المتصفح', default: 'لم يُطلب بعد', unsupported: 'غير مدعوم في هذا المتصفح' }[perm];
    $('#notif-settings').innerHTML = [
      row('تفعيل الإشعارات العادية', 'تذكير قبل المهمة، إشعار التأخر، رسائل التحفيز', toggle('enabled', n.enabled)),
      row('إشعارات المتصفح', `الحالة: ${permText}`, perm === 'default' ? '<button class="btn btn--soft btn--sm" data-perm>طلب الإذن</button>' : ''),
      row('التذكير قبل المهمة (افتراضي)', 'يُستخدم عند إنشاء إشعار جديد', `<select class="select" data-n="beforeMinutes">${G.dom.options([5, 10, 15, 30, 60].map((m) => ({ value: m, label: `${m} دقيقة` })), n.beforeMinutes)}</select>`),
      row('إشعار عند التأخر', 'مرة واحدة عند تجاوز موعد مهمة موقوتة', toggle('lateAlerts', n.lateAlerts)),
      row('رسالة الإنجاز', 'رسالة تهنئة باسمك عند "تم الإنجاز"', toggle('completion', n.completion)),
      row('الرسائل التحفيزية', 'في الصفحة الرئيسية', toggle('motivational', n.motivational)),
      row('نغمة المنبّه الافتراضية', '', `<div class="row"><select class="select" data-n="sound">${G.dom.options(G.sounds.list(), n.sound)}</select><button class="icon-btn" data-preview aria-label="معاينة">${G.icon('play')}</button></div>`),
      row('تجربة المنبّه', 'اعرض شاشة المنبّه واسمع النغمة — بدون تسجيل أي شيء', `<button class="btn btn--ghost btn--sm" data-demo>${G.icon('alarm')} جرّب الآن</button>`),
    ].join('') + '<p class="field-hint">ملاحظة: في نسخة الويب يعمل المنبّه طالما إحدى صفحات غرس مفتوحة في المتصفح. تطبيق الجوال (Flutter) سيدعم المنبّه في الخلفية.</p>';

    const box = $('#notif-settings');
    if (box.dataset.bound) return;
    box.dataset.bound = '1';
    box.addEventListener('change', (e) => {
      const el = e.target.closest('[data-n]');
      if (!el) return;
      const val = el.type === 'checkbox' ? el.checked : el.dataset.n === 'beforeMinutes' ? Number(el.value) : el.value;
      A.updateSettings({ notifications: { [el.dataset.n]: val } });
      G.toast('تم الحفظ.', { type: 'success', timeout: 1500 });
    });
    box.addEventListener('click', async (e) => {
      if (e.target.closest('[data-preview]')) G.sounds.play(box.querySelector('[data-n=sound]').value);
      if (e.target.closest('[data-demo]')) G.alarm.demo(box.querySelector('[data-n=sound]').value);
      if (e.target.closest('[data-perm]')) { await G.notify.request(); renderNotifications(); }
    });
  }

  /* ---------- أيام الراحة والاستثناءات ---------- */
  function renderRest() {
    const s = A.user().settings;
    $('#rest-settings').innerHTML = `
      <div class="field">
        <span class="field-label">أيام راحة أسبوعية</span>
        <div class="chip-group" id="rest-days">
          ${[6, 0, 1, 2, 3, 4, 5].map((d) => `<label class="chip-option"><input type="checkbox" value="${d}" ${s.restDays.map(Number).includes(d) ? 'checked' : ''}><span>${D.DAY_NAMES[d]}</span></label>`).join('')}
        </div>
      </div>
      <div class="field">
        <span class="field-label">فترات راحة (سفر، إجازة، مرض…)</span>
        <div class="stack-sm" id="rest-periods"></div>
        <div class="form-row mt-2">
          <input class="input" type="date" id="rp-start" aria-label="بداية الفترة" value="${D.today()}">
          <input class="input" type="date" id="rp-end" aria-label="نهاية الفترة" value="${D.addDays(D.today(), 2)}">
          <input class="input" id="rp-note" placeholder="السبب (اختياري)" maxlength="40" aria-label="السبب">
          <button class="btn btn--soft" data-add-rest>+ إضافة فترة</button>
        </div>
      </div>
      <div class="field">
        <span class="field-label">تصنيفات مستثناة من الحساب</span>
        <div class="chip-group" id="excluded-cats"></div>
      </div>`;
    renderRestLists();

    $('#rest-days').addEventListener('change', () => {
      const days = $$('#rest-days input:checked').map((i) => Number(i.value));
      A.updateSettings({ restDays: days });
      G.toast('تم تحديث أيام الراحة.', { type: 'success', timeout: 1500 });
    });
    $('[data-add-rest]').addEventListener('click', () => {
      const start = $('#rp-start').value;
      const end = $('#rp-end').value;
      if (!start || !end || end < start) return G.toast('حدّد بداية ونهاية صحيحتين.', { type: 'danger' });
      const list = (A.user().settings.restPeriods || []).concat({ id: G.store.uid('rest'), start, end, note: $('#rp-note').value.trim() });
      A.updateSettings({ restPeriods: list });
      $('#rp-note').value = '';
    });
    G.dom.on($('#rest-settings'), 'click', '[data-del-rest]', (e, b) => {
      A.updateSettings({ restPeriods: A.user().settings.restPeriods.filter((p) => p.id !== b.dataset.delRest) });
    });
    $('#excluded-cats').addEventListener('change', () => {
      A.updateSettings({ excludedCategories: $$('#excluded-cats input:checked').map((i) => i.value) });
    });
  }

  function renderRestLists() {
    const s = A.user().settings;
    const rp = $('#rest-periods');
    if (!rp) return;
    rp.innerHTML = (s.restPeriods || []).length
      ? s.restPeriods.map((p) => `<div class="rest-period"><span>${esc(D.formatShort(p.start))} – ${esc(D.formatShort(p.end))}${p.note ? ` • ${esc(p.note)}` : ''}</span><button class="icon-btn icon-btn--sm" data-del-rest="${esc(p.id)}" aria-label="حذف">${G.icon('trash')}</button></div>`).join('')
      : '<p class="text-xs text-faint">لا فترات راحة.</p>';
    $('#excluded-cats').innerHTML = G.categories.list().map((c) => `
      <label class="chip-option"><input type="checkbox" value="${esc(c.id)}" ${s.excludedCategories.includes(c.id) ? 'checked' : ''}><span>${esc(c.icon || '')} ${esc(c.name)}</span></label>`).join('');
  }

  /* ---------- التصنيفات ---------- */
  function setupCategories() {
    const form = $('#cat-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = G.dom.formData(form);
      const err = form.querySelector('[data-error]');
      try {
        G.categories.create({ name: f.name, icon: f.icon, color: f.color, worship: !!f.worship });
        form.reset();
        err.textContent = '';
        G.toast('أُضيف التصنيف.', { type: 'success' });
      } catch (ex) {
        err.textContent = ex.message;
      }
    });
    G.dom.on($('#cat-list'), 'click', '[data-del-cat]', async (e, b) => {
      const c = G.categories.get(b.dataset.delCat);
      const used = G.tasks.list().filter((t) => t.categoryId === c.id).length;
      const ok = await G.modal.confirm({ title: 'حذف التصنيف؟', message: used ? `يوجد ${used} مهام في هذا التصنيف وستصبح بدون تصنيف.` : `حذف "${c.name}"؟`, confirmText: 'حذف', danger: true });
      if (!ok) return;
      G.tasks.list().filter((t) => t.categoryId === c.id).forEach((t) => G.store.update('tasks', t.id, { categoryId: null }));
      G.categories.remove(c.id);
    });
  }

  function renderCategories() {
    $('#cat-list').innerHTML = G.categories.list().map((c) => `
      <span class="cat-pill" style="border-color:${esc(c.color)}55">
        <span class="cat-chip__dot" style="background:${esc(c.color)}"></span>
        ${esc(c.icon || '')} ${esc(c.name)}${c.worship ? ' <small class="text-faint">(تعبّدي)</small>' : ''}
        ${c.userId == null ? '<span class="cat-pill__lock" title="تصنيف عام">عام</span>' : `<button class="icon-btn icon-btn--sm" data-del-cat="${esc(c.id)}" aria-label="حذف ${esc(c.name)}">${G.icon('x')}</button>`}
      </span>`).join('');
  }

  /* ---------- التقدم ---------- */
  function renderProgress() {
    const s = A.user().settings;
    $('#progress-settings').innerHTML = [
      row('بداية الأسبوع', 'تؤثر على حساب الأسبوع والتقويم', `<select class="select" data-p="weekStart">${G.dom.options([{ value: 6, label: 'السبت' }, { value: 0, label: 'الأحد' }, { value: 1, label: 'الاثنين' }], s.weekStart)}</select>`),
      row('اليوم الناجح في الـStreak', `اليوم يُحتسب ضمن السلسلة إذا بلغت نسبته <b id="thr-val">${s.streakThreshold}%</b> أو أكثر`, `<input type="range" min="10" max="100" step="5" value="${s.streakThreshold}" data-p="streakThreshold" style="max-width:200px" aria-label="نسبة اليوم الناجح">`),
    ].join('');
    const box = $('#progress-settings');
    box.addEventListener('input', (e) => { if (e.target.dataset.p === 'streakThreshold') $('#thr-val').textContent = `${e.target.value}%`; });
    box.addEventListener('change', (e) => {
      const el = e.target.closest('[data-p]');
      if (!el) return;
      A.updateSettings({ [el.dataset.p]: Number(el.value) });
      G.toast('تم الحفظ.', { type: 'success', timeout: 1500 });
    });
  }

  /* ---------- البيانات ---------- */
  function setupData() {
    $('[data-export]').addEventListener('click', () => {
      const data = G.store.exportUser(A.userId());
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `ghars-backup-${D.today()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    });

    $('#import-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const ok = await G.modal.confirm({ title: 'استعادة النسخة؟', message: 'ستُستبدل بياناتك الحالية (المهام، الأهداف، السجل، الوزن) بمحتوى الملف.', confirmText: 'استعادة' });
      if (!ok) { e.target.value = ''; return; }
      try {
        const json = JSON.parse(await file.text());
        G.store.importUser(A.userId(), json);
        G.toast('تمت استعادة البيانات.', { type: 'success' });
      } catch (ex) {
        G.toast(`تعذّرت الاستعادة: ${ex.message}`, { type: 'danger' });
      }
      e.target.value = '';
    });

    $('[data-logout]').addEventListener('click', () => A.logout());

    $('[data-delete-account]').addEventListener('click', async () => {
      const u = A.user();
      if (u.role === 'admin') return G.toast('لا يمكن حذف حساب الإدارة من هنا.', { type: 'warning' });
      const ok = await G.modal.confirm({ title: 'حذف الحساب نهائيًا؟', message: 'سيتم حذف حسابك وكل بياناتك من هذا الجهاز ولا يمكن التراجع. ننصح بتصدير نسخة احتياطية أولًا.', confirmText: 'حذف الحساب', danger: true });
      if (!ok) return;
      G.store.purgeUser(u.id);
      A.logout();
    });
  }
})(window.Ghars);
