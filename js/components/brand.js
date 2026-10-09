/* ==========================================================================
   brand.js — شعار غَرْس داخل الواجهة
   ورقتان تنبتان معًا (الهدف ← الإنجاز) وفوقهما شمس ذهبية = "الآن"
   ألوان الورقتين من المتغيرات --mark-a و --mark-b لتناسب أي خلفية.
   نسخ الملفات الثابتة في assets/images/
   ========================================================================== */
(function (G) {
  'use strict';

  G.brand = {
    /** علامة الشعار فقط */
    mark() {
      return `
        <svg viewBox="0 0 64 64" role="img" aria-label="شعار غَرْس">
          <circle cx="32" cy="12" r="6.5" fill="var(--gold, #e0ad45)"/>
          <path d="M31 55 C19 53 8 43 7 25 C20 25 30 34 31 55 Z" fill="var(--mark-a, #4f9a63)"/>
          <path d="M33 55 C45 53 56 43 57 25 C44 25 34 34 33 55 Z" fill="var(--mark-b, #2a6b45)"/>
          <path d="M32 50 V60" stroke="var(--mark-b, #2a6b45)" stroke-width="3.2" stroke-linecap="round"/>
        </svg>`;
    },

    /** العلامة + الاسم */
    full(href) {
      return `
        <a class="brand" href="${href || 'home.html'}" aria-label="غَرْس — الصفحة الرئيسية">
          <span class="brand__mark">${G.brand.mark()}</span>
          <span class="brand__name">غَرْس</span>
        </a>`;
    },
  };
})(window.Ghars = window.Ghars || {});
