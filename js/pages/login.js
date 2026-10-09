/* ==========================================================================
   login.js — صفحة تسجيل الدخول (البريد + كلمة السر فقط)
   ========================================================================== */
(function (G) {
  'use strict';

  const { $ } = G.dom;
  const form = $('#login-form');
  const alertBox = form.querySelector('[data-alert]');

  // من سجّل دخوله مسبقًا ينتقل مباشرة
  G.auth.ready().then(() => {
    const u = G.auth.user();
    if (u) location.replace(u.role === 'admin' ? 'admin.html' : 'home.html');
  }).catch((err) => showError(err.message));

  setupPasswordToggle(form);

  function showError(msg) {
    alertBox.textContent = msg;
    alertBox.hidden = !msg;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const f = G.dom.formData(form);
    if (!f.email || !f.password) return showError('أدخل البريد الإلكتروني وكلمة السر');
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'جارٍ الدخول…';
    try {
      const user = await G.auth.login(f.email, f.password, !!f.remember);
      location.replace(user.role === 'admin' ? 'admin.html' : 'home.html');
    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.textContent = 'دخول';
    }
  });

  /** زر إظهار/إخفاء كلمة السر (مشترك مع صفحة التسجيل) */
  function setupPasswordToggle(root) {
    root.querySelectorAll('[data-toggle-pw]').forEach((btn) => {
      const input = btn.parentElement.querySelector('input');
      btn.innerHTML = G.icon('eye');
      btn.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.innerHTML = G.icon(show ? 'eyeOff' : 'eye');
        btn.setAttribute('aria-label', show ? 'إخفاء كلمة السر' : 'إظهار كلمة السر');
      });
    });
  }
})(window.Ghars);
