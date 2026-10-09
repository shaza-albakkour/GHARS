/* ==========================================================================
   landing.js — سلوك الصفحة التعريفية
   - رسم الأيقونات [data-icon]
   - إظهار "افتح التطبيق" لمن سجّل دخوله
   - قائمة الجوال، الرابط النشط، تبديل المظهر، تاريخ اليوم في معاينة الهاتف
   ========================================================================== */
(function (G) {
  'use strict';

  const { $, $$ } = G.dom;

  // الأيقونات
  $$('[data-icon]').forEach((el) => { el.innerHTML = G.icon(el.dataset.icon); });

  // تاريخ اليوم في معاينة الهاتف
  const today = G.date.today();
  const gEl = $('[data-today-g]');
  const hEl = $('[data-today-h]');
  if (gEl) gEl.textContent = G.date.formatLong(today);
  if (hEl) hEl.textContent = G.date.hijri(today);

  // حالة الدخول
  G.auth.ready().then(() => {
    const user = G.auth.user();
    $$('[data-guest]').forEach((el) => { el.hidden = !!user; });
    $$('[data-member]').forEach((el) => {
      el.hidden = !user;
      if (user && user.role === 'admin') el.setAttribute('href', 'pages/admin.html');
    });
  }).catch(() => { /* بدون تشفير: تبقى الصفحة تعريفية */ });

  // تبديل المظهر
  const themeBtn = $('[data-theme-toggle]');
  const paintIcon = () => { themeBtn.innerHTML = G.icon(G.theme.current().resolved === 'dark' ? 'sun' : 'moon'); };
  paintIcon();
  themeBtn.addEventListener('click', () => { G.theme.toggle(); paintIcon(); });

  // قائمة الجوال
  const nav = $('#site-nav');
  const menuBtn = $('[data-menu]');
  menuBtn.innerHTML = G.icon('menu');
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.innerHTML = G.icon(open ? 'x' : 'menu');
  });
  $$('a', nav).forEach((a) => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.innerHTML = G.icon('menu');
  }));

  // الرابط النشط حسب القسم الظاهر + ظهور تدريجي
  if ('IntersectionObserver' in window) {
    const links = $$('a', nav);
    const sections = ['top', 'features', 'how', 'alarm', 'philosophy'].map((id) => document.getElementById(id)).filter(Boolean);
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === `#${e.target.id}`));
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    sections.forEach((s) => spy.observe(s));

    document.documentElement.classList.add('js-reveal');
    const targets = $$('.section-head, .feature, .phone-stage, .growth__step, .journey li, .rule__mock, .rule__text, .philosophy__inner');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    targets.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = `${(i % 4) * 80}ms`;
      io.observe(el);
    });
  }

  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
})(window.Ghars);
