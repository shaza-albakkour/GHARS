/* ==========================================================================
   toast.js — إشعار داخل التطبيق يختفي تلقائيًا
   الاستخدام: Ghars.toast('تم الحفظ', { type: 'success', title: 'أحسنت' })
   ========================================================================== */
(function (G) {
  'use strict';

  const ICONS = { info: 'bell', success: 'check', warning: 'clock', danger: 'ban' };

  function stack() {
    let s = document.querySelector('.toast-stack');
    if (!s) {
      s = document.createElement('div');
      s.className = 'toast-stack';
      s.setAttribute('role', 'status');
      s.setAttribute('aria-live', 'polite');
      document.body.appendChild(s);
    }
    return s;
  }

  G.toast = function (message, opts) {
    const o = Object.assign({ type: 'info', title: '', timeout: 4200, icon: null }, opts || {});
    const esc = G.dom.esc;
    const el = G.dom.el(`
      <div class="toast toast--${o.type}">
        <div class="toast__icon" aria-hidden="true">${G.icon(o.icon || ICONS[o.type] || ICONS.info)}</div>
        <div>
          ${o.title ? `<div class="toast__title">${esc(o.title)}</div>` : ''}
          <div class="toast__msg">${esc(message)}</div>
        </div>
        <button class="icon-btn icon-btn--sm" aria-label="إغلاق">${G.icon('x')}</button>
      </div>`);
    const close = () => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 220);
    };
    el.querySelector('button').addEventListener('click', close);
    stack().prepend(el);
    if (o.timeout) setTimeout(close, o.timeout);
    return close;
  };
})(window.Ghars = window.Ghars || {});
