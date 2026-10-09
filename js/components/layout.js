/* ==========================================================================
   layout.js — هيكل التطبيق المشترك + تشغيل الصفحة (boot)
   كل صفحة داخل التطبيق تستدعي:
       Ghars.boot({ page: 'home', title: 'الرئيسية' }).then((user) => { ... })
   فيتم: التحقق من الدخول → تطبيق المظهر → بناء الشريط الجانبي والعلوي → تشغيل المنبّه
   لتعديل روابط التنقل: عدّل مصفوفة NAV فقط.
   ========================================================================== */
(function (G) {
  'use strict';

  const NAV = [
    { id: 'home', href: 'home.html', label: 'الرئيسية', icon: 'home', mobile: true },
    { id: 'today', href: 'today.html', label: 'اليوم', icon: 'today', mobile: true },
    { id: 'tasks', href: 'tasks.html', label: 'كل المهام', icon: 'list' },
    { id: 'goals', href: 'goals.html', label: 'الأهداف', icon: 'target', mobile: true },
    { id: 'calendar', href: 'calendar.html', label: 'التقويم', icon: 'calendar' },
    { section: 'حياتي' },
    { id: 'worship', href: 'worship.html', label: 'العبادة', icon: 'crescent' },
    { id: 'health', href: 'health.html', label: 'الصحة والوزن', icon: 'heart' },
    { section: 'المتابعة' },
    { id: 'stats', href: 'stats.html', label: 'الإحصائيات', icon: 'chart', mobile: true },
    { id: 'settings', href: 'settings.html', label: 'الإعدادات', icon: 'settings', mobile: true },
  ];

  const ADMIN_NAV = [
    { id: 'admin-dashboard', href: 'admin.html#dashboard', label: 'لوحة المعلومات', icon: 'chart', mobile: true },
    { id: 'admin-users', href: 'admin.html#users', label: 'المستخدمون', icon: 'users', mobile: true },
    { id: 'admin-settings', href: 'admin.html#settings', label: 'إعدادات التطبيق', icon: 'settings', mobile: true },
    { section: 'التطبيق' },
    { id: 'home', href: 'home.html', label: 'واجهة المستخدم', icon: 'home' },
  ];

  function navLinks(items, active) {
    return items.map((n) => {
      if (n.section) return `<div class="nav__section">${n.section}</div>`;
      return `<a class="nav__link ${n.id === active ? 'is-active' : ''}" href="${n.href}" ${n.id === active ? 'aria-current="page"' : ''}>${G.icon(n.icon)}<span>${n.label}</span></a>`;
    }).join('');
  }

  function mount(user, page, title, isAdminArea) {
    const esc = G.dom.esc;
    const D = G.date;
    const today = D.today();
    const items = isAdminArea ? ADMIN_NAV : NAV;
    const content = document.getElementById('page');

    const shell = G.dom.el(`
      <div class="app">
        <aside class="sidebar" id="sidebar" aria-label="القائمة الرئيسية">
          ${G.brand.full(isAdminArea ? 'admin.html' : 'home.html')}
          <nav class="nav">
            ${navLinks(items, page)}
            ${!isAdminArea && user.role === 'admin' ? `<div class="nav__section">الإدارة</div><a class="nav__link" href="admin.html">${G.icon('shield')}<span>لوحة الإدارة</span></a>` : ''}
          </nav>
          <div class="sidebar__foot">
            <div class="user-card">
              <span class="avatar" aria-hidden="true">${esc(G.dom.initial(user.name))}</span>
              <span class="user-card__info">
                <span class="user-card__name">${esc(user.name)}</span>
                <span class="user-card__email">${esc(user.email)}</span>
              </span>
              <button class="icon-btn icon-btn--sm" data-logout aria-label="تسجيل الخروج" title="تسجيل الخروج">${G.icon('logout')}</button>
            </div>
          </div>
        </aside>
        <div class="app__main">
          <header class="topbar">
            <button class="icon-btn topbar__menu" data-menu aria-label="فتح القائمة" aria-controls="sidebar" aria-expanded="false">${G.icon('menu')}</button>
            <div class="topbar__heading">
              <span class="topbar__title">${esc(title)}</span>
              <span class="topbar__dates"><span>${esc(D.formatLong(today))}</span><span>${esc(D.hijri(today))}</span></span>
            </div>
            <div class="topbar__actions">
              <button class="icon-btn" data-notif hidden aria-label="تفعيل إشعارات المتصفح" title="تفعيل إشعارات المتصفح">${G.icon('bell')}</button>
              <button class="icon-btn" data-theme-toggle aria-label="تبديل الوضع الفاتح/الداكن" title="الوضع الفاتح/الداكن">${G.icon('moon')}</button>
              ${isAdminArea ? '' : `<button class="btn btn--sm" data-quick-add>${G.icon('plus')}<span>مهمة جديدة</span></button>`}
            </div>
          </header>
        </div>
        <nav class="bottom-nav" aria-label="التنقل السريع">
          ${items.filter((n) => n.mobile).map((n) => `<a href="${n.href}" class="${n.id === page ? 'is-active' : ''}">${G.icon(n.icon)}<span>${n.label}</span></a>`).join('')}
        </nav>
        ${isAdminArea ? '' : `<button class="fab" data-quick-add aria-label="إضافة مهمة">${G.icon('plus')}</button>`}
      </div>`);

    shell.querySelector('.app__main').appendChild(content);
    document.body.prepend(shell);

    // تبديل المظهر
    const themeBtn = shell.querySelector('[data-theme-toggle]');
    const setThemeIcon = () => { themeBtn.innerHTML = G.icon(G.theme.current().resolved === 'dark' ? 'sun' : 'moon'); };
    setThemeIcon();
    themeBtn.addEventListener('click', () => {
      const next = G.theme.toggle();
      G.auth.updateSettings({ theme: next });
      setThemeIcon();
    });

    // زر طلب إذن الإشعارات
    const notifBtn = shell.querySelector('[data-notif]');
    if (G.notify.permission() === 'default') notifBtn.hidden = false;
    notifBtn.addEventListener('click', async () => {
      const p = await G.notify.request();
      notifBtn.hidden = p !== 'default';
      G.toast(p === 'granted' ? 'ستصلك التنبيهات حتى عندما تكون الصفحة في الخلفية.' : 'لم يتم منح الإذن — ستظهر التنبيهات داخل التطبيق فقط.', { type: p === 'granted' ? 'success' : 'warning' });
    });

    // القائمة في الجوال
    const sidebar = shell.querySelector('#sidebar');
    const menuBtn = shell.querySelector('[data-menu]');
    let scrim = null;
    const closeMenu = () => {
      sidebar.classList.remove('is-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      if (scrim) { scrim.remove(); scrim = null; }
    };
    menuBtn.addEventListener('click', () => {
      sidebar.classList.add('is-open');
      menuBtn.setAttribute('aria-expanded', 'true');
      scrim = G.dom.el('<div class="scrim"></div>');
      scrim.addEventListener('click', closeMenu);
      document.body.appendChild(scrim);
    });

    shell.querySelector('[data-logout]').addEventListener('click', () => G.auth.logout());
    shell.querySelectorAll('[data-quick-add]').forEach((b) => b.addEventListener('click', () => G.taskForm.open()));
  }

  /** رسالة الإنجاز عند الضغط على "تم الإنجاز" في أي مكان */
  function listenCompletions() {
    G.bus.on('task:done', () => {
      const user = G.auth.user();
      if (!user.settings.notifications.completion) return;
      const r = G.progress.day(G.date.today());
      const m = G.messages.completion(user, r.pct);
      G.toast(m.msg, { title: m.title, type: 'success', icon: 'sparkle' });
    });
  }

  /**
   * تشغيل صفحة داخل التطبيق
   * @param {{page:string, title:string, role?:'admin'}} opts
   * @returns {Promise<object|null>} المستخدم الحالي
   */
  G.boot = async function (opts) {
    const o = Object.assign({ page: '', title: '', role: null }, opts);
    try {
      await G.auth.ready();
    } catch (err) {
      document.body.innerHTML = `<div class="empty" style="margin:40px"><div class="empty__icon">!</div><div class="empty__title">تعذّر تشغيل التطبيق</div><p class="empty__text">${G.dom.esc(err.message)}</p></div>`;
      return null;
    }
    const user = G.auth.require(o.role);
    if (!user) return null;
    G.theme.apply({ theme: user.settings.theme, accent: user.settings.accent });
    mount(user, o.page, o.title, o.role === 'admin');
    // رسم الأيقونات المكتوبة في HTML كـ data-icon
    document.querySelectorAll('[data-icon]').forEach((el) => { if (!el.firstElementChild) el.innerHTML = G.icon(el.dataset.icon); });
    if (o.role !== 'admin') {
      G.alarm.start();
      listenCompletions();
    }
    document.body.classList.add('is-ready');
    return user;
  };

  /** إعادة رسم الصفحة عند تغيّر البيانات (مجمّعة في إطار واحد) */
  G.live = function (render) {
    let queued = false;
    const run = () => { queued = false; render(); };
    G.store.subscribe(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(run);
    });
    render();
  };
})(window.Ghars = window.Ghars || {});
