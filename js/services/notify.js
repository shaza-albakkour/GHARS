/* ==========================================================================
   notify.js — الإشعارات العادية (داخل التطبيق + إشعارات النظام)
   الإشعار العادي يظهر ويختفي دون تفاعل مستمر — بخلاف المنبّه.
   ========================================================================== */
(function (G) {
  'use strict';

  const supported = 'Notification' in window;

  const notify = {
    supported,

    permission() { return supported ? Notification.permission : 'unsupported'; },

    async request() {
      if (!supported) return 'unsupported';
      try { return await Notification.requestPermission(); } catch (e) { return 'denied'; }
    },

    /** إشعار نظام (يظهر خارج المتصفح) */
    system(title, body, opts) {
      if (!supported || Notification.permission !== 'granted') return null;
      try {
        const n = new Notification(title, Object.assign({
          body,
          icon: (location.pathname.includes('/pages/') ? '../' : '') + 'assets/images/favicon.svg',
          lang: 'ar',
          dir: 'rtl',
        }, opts || {}));
        n.onclick = () => { window.focus(); n.close(); };
        return n;
      } catch (e) {
        return null;
      }
    },

    /** إشعار عادي: داخل التطبيق دائمًا + النظام إذا كانت الصفحة في الخلفية */
    show(title, body, type) {
      const u = G.auth.user();
      if (u && !u.settings.notifications.enabled) return;
      G.toast(body, { title, type: type || 'info', timeout: 6000 });
      if (document.hidden) notify.system(title, body);
    },
  };

  G.notify = notify;
})(window.Ghars = window.Ghars || {});
