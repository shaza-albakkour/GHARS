/* ==========================================================================
   register.js — إنشاء الحساب على خطوتين
   1) البريد الإلكتروني + كلمة السر + التأكيد
   2) الاسم + العمر (+ صيغة المخاطبة) → الحساب جاهز
   ========================================================================== */
(function (G) {
  'use strict';

  const { $ } = G.dom;
  const step1 = $('#step-1');
  const step2 = $('#step-2');
  let credentials = null;

  G.auth.ready().then(() => {
    if (G.auth.user()) location.replace('home.html');
  }).catch((err) => showError(step1, err.message));

  // إظهار/إخفاء كلمة السر
  step1.querySelectorAll('[data-toggle-pw]').forEach((btn) => {
    const input = btn.parentElement.querySelector('input');
    btn.innerHTML = G.icon('eye');
    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = G.icon(show ? 'eyeOff' : 'eye');
    });
  });

  // مؤشر شروط كلمة السر أثناء الكتابة
  const pw = step1.querySelector('[name=password]');
  pw.addEventListener('input', () => {
    const v = pw.value;
    const rules = { len: v.length >= 8, letter: /[A-Za-z؀-ۿ]/.test(v), digit: /\d/.test(v) };
    Object.keys(rules).forEach((k) => step1.querySelector(`[data-rule="${k}"]`).classList.toggle('is-ok', rules[k]));
  });

  function showError(form, msg) {
    const box = form.querySelector('[data-alert]');
    box.textContent = msg;
    box.hidden = !msg;
  }

  function goTo(step) {
    step1.hidden = step !== 1;
    step2.hidden = step !== 2;
    $('[data-step-bar="2"]').classList.toggle('is-done', step === 2);
    $('[data-step-label]').textContent = step === 1 ? 'الخطوة 1 من 2 — بيانات الدخول' : 'الخطوة 2 من 2 — تعريف بسيط';
    $('[data-step-title]').textContent = step === 1 ? 'إنشاء حساب جديد' : 'لنتعرّف عليك';
    $('[data-step-desc]').textContent = step === 1 ? 'البريد الإلكتروني وكلمة السر.' : 'الاسم والعمر — ثم يصبح حسابك جاهزًا.';
    (step === 1 ? step1 : step2).querySelector('input').focus();
  }

  step1.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError(step1, '');
    const f = G.dom.formData(step1);
    try {
      await G.auth.ready();
      if (!G.auth.validateEmail(f.email)) throw new Error('البريد الإلكتروني غير صالح');
      if (G.auth.emailExists(f.email)) throw new Error('هذا البريد مسجّل مسبقًا — جرّب تسجيل الدخول');
      const issues = G.auth.passwordIssues(f.password);
      if (issues.length) throw new Error(`كلمة السر تحتاج: ${issues.join('، ')}`);
      if (f.password !== f.confirm) throw new Error('كلمتا السر غير متطابقتين');
      credentials = { email: f.email, password: f.password };
      goTo(2);
    } catch (err) {
      showError(step1, err.message);
    }
  });

  step2.querySelector('[data-back]').addEventListener('click', () => goTo(1));

  step2.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError(step2, '');
    const f = G.dom.formData(step2);
    const age = Number(f.age);
    if (!String(f.name || '').trim()) return showError(step2, 'الاسم مطلوب');
    if (!age || age < 7 || age > 120) return showError(step2, 'أدخل عمرًا صحيحًا');
    const btn = step2.querySelector('[type=submit]');
    btn.disabled = true;
    btn.textContent = 'جارٍ إنشاء الحساب…';
    try {
      await G.auth.register(Object.assign({}, credentials, { name: f.name, age, gender: f.gender }));
      location.replace('home.html?welcome=1');
    } catch (err) {
      showError(step2, err.message);
      btn.disabled = false;
      btn.textContent = 'إنشاء الحساب';
    }
  });
})(window.Ghars);
