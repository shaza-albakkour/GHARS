/* ==========================================================================
   dom.js — أدوات مساعدة للتعامل مع عناصر الصفحة
   ========================================================================== */
(function (G) {
  'use strict';

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  G.dom = {
    /** عنصر واحد */
    $(sel, root) { return (root || document).querySelector(sel); },

    /** كل العناصر كمصفوفة */
    $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); },

    /** تهريب النص قبل إدخاله في HTML — يُستخدم مع كل نص يكتبه المستخدم */
    esc(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ESC[c]);
    },

    /** تحويل نص HTML إلى عنصر */
    el(html) {
      const t = document.createElement('template');
      t.innerHTML = html.trim();
      return t.content.firstElementChild;
    },

    /** ربط حدث مع تفويض (Delegation) */
    on(root, event, selector, handler) {
      root.addEventListener(event, (e) => {
        const target = e.target.closest(selector);
        if (target && root.contains(target)) handler(e, target);
      });
    },

    /** قراءة قيم النموذج ككائن */
    formData(form) {
      const data = {};
      new FormData(form).forEach((value, key) => {
        if (key in data) {
          data[key] = [].concat(data[key], value);
        } else {
          data[key] = value;
        }
      });
      return data;
    },

    /** خيارات <select> من مصفوفة */
    options(items, selected) {
      return items.map((it) => {
        const v = typeof it === 'object' ? it.value : it;
        const l = typeof it === 'object' ? it.label : it;
        return `<option value="${G.dom.esc(v)}" ${String(v) === String(selected) ? 'selected' : ''}>${G.dom.esc(l)}</option>`;
      }).join('');
    },

    /** الحرف الأول للاسم (للصورة الرمزية) */
    initial(name) {
      return (String(name || '؟').trim()[0] || '؟').toUpperCase();
    },

    /** تأخير تنفيذ دالة (للبحث أثناء الكتابة) */
    debounce(fn, ms) {
      let t;
      return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms || 200); };
    },

    /** قراءة معامل من رابط الصفحة */
    param(name) {
      return new URLSearchParams(location.search).get(name);
    },
  };
})(window.Ghars = window.Ghars || {});
