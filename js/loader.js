/* ==========================================================================
   loader.js — يحمّل ملفات JavaScript بالترتيب الصحيح لكل صفحة
   الاستخدام في HTML:
     <script src="../js/loader.js" data-page="home"></script>
   لإضافة ملف جديد للتطبيق: أضفه في القائمة MODULES مرة واحدة فقط،
   ولا حاجة لتعديل أي صفحة HTML.
   ========================================================================== */
(function () {
  'use strict';

  const MODULES = [
    // أدوات
    'utils/dom.js',
    'utils/date.js',
    'utils/icons.js',
    // النواة
    'core/storage.js',
    'core/events.js',
    'core/crypto.js',
    'core/auth.js',
    // الخدمات (منطق التطبيق)
    'services/categories.js',
    'services/periods.js',
    'services/exclusions.js',
    'services/tasks.js',
    'services/progress.js',
    'services/goals.js',
    'services/reminders.js',
    'services/weights.js',
    'services/sounds.js',
    'services/messages.js',
    'services/notify.js',
    'services/alarm.js',
    // مكوّنات الواجهة
    'components/toast.js',
    'components/modal.js',
    'components/brand.js',
    'components/charts.js',
    'components/task-item.js',
    'components/task-actions.js',
    'components/task-form.js',
    'components/goal-form.js',
    'components/presets.js',
    'components/layout.js',
  ];

  const self = document.currentScript;
  const base = self.src.replace(/loader\.js(\?.*)?$/, '');
  const page = self.dataset.page;
  const list = page ? MODULES.concat(`pages/${page}.js`) : MODULES;

  list.forEach((file) => {
    const s = document.createElement('script');
    s.src = base + file;
    s.async = false; // يضمن التنفيذ بالترتيب
    document.body.appendChild(s);
  });
})();
