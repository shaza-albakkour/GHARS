/* ==========================================================================
   auth.js — الحسابات: إنشاء حساب، تسجيل الدخول، الجلسة، الصلاحيات (Admin/User)
   ========================================================================== */
(function (G) {
  'use strict';

  const SESSION_KEY = 'ghars.session';
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* حساب الإدارة الافتراضي — يُنشأ مرة واحدة عند أول تشغيل.
     غيّر كلمة السر من الإعدادات بعد أول دخول. */
  const DEFAULT_ADMIN = { email: 'admin@ghars.app', password: 'Ghars@Admin1', name: 'إدارة غرس' };

  function defaultSettings() {
    return {
      theme: 'system',            // light | dark | system
      accent: 'green',            // green | pink | purple | blue | maroon | black | white
      weekStart: 6,               // السبت
      streakThreshold: 60,        // نسبة اليوم الناجح في الـStreak
      restDays: [],               // أيام راحة أسبوعية [5] = الجمعة
      restPeriods: [],            // [{start, end, note}]
      excludedCategories: [],
      notifications: {
        enabled: true,
        beforeMinutes: 15,
        lateAlerts: true,
        motivational: true,
        completion: true,
        sound: 'chime',
      },
    };
  }

  function sanitize(user) {
    if (!user) return null;
    const { password, ...safe } = user; // لا نُرجع بيانات كلمة السر أبدًا
    return safe;
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  let readyPromise = null;
  let cache = null;
  G.store.subscribe(() => { cache = null; });

  const auth = {
    DEFAULT_ADMIN_EMAIL: DEFAULT_ADMIN.email,

    /** تهيئة: إنشاء حساب الإدارة والتصنيفات العامة عند أول تشغيل */
    ready() {
      if (!readyPromise) {
        readyPromise = (async () => {
          if (!G.store.find('users', (u) => u.role === 'admin')) {
            const password = await G.crypto.hashPassword(DEFAULT_ADMIN.password);
            G.store.insert('users', {
              email: DEFAULT_ADMIN.email,
              password,
              name: DEFAULT_ADMIN.name,
              age: null,
              gender: 'm',
              role: 'admin',
              active: true,
              settings: defaultSettings(),
              lastLoginAt: null,
            });
          }
          if (G.categories) G.categories.seed();
        })();
      }
      return readyPromise;
    },

    validateEmail(email) { return EMAIL_RE.test(normalizeEmail(email)); },

    /** قواعد كلمة السر: 8 أحرف على الأقل وتحتوي حرفًا ورقمًا */
    passwordIssues(pw) {
      const issues = [];
      if (!pw || pw.length < 8) issues.push('8 أحرف على الأقل');
      if (!/[A-Za-z؀-ۿ]/.test(pw || '')) issues.push('حرف واحد على الأقل');
      if (!/\d/.test(pw || '')) issues.push('رقم واحد على الأقل');
      return issues;
    },

    emailExists(email) {
      const e = normalizeEmail(email);
      return !!G.store.find('users', (u) => u.email === e);
    },

    async register({ email, password, name, age, gender }) {
      await auth.ready();
      const e = normalizeEmail(email);
      if (!auth.validateEmail(e)) throw new Error('البريد الإلكتروني غير صالح');
      if (auth.emailExists(e)) throw new Error('هذا البريد مسجّل مسبقًا');
      if (auth.passwordIssues(password).length) throw new Error('كلمة السر لا تحقق الشروط');
      if (!String(name || '').trim()) throw new Error('الاسم مطلوب');

      const hashed = await G.crypto.hashPassword(password);
      const user = G.store.insert('users', {
        email: e,
        password: hashed,
        name: String(name).trim(),
        age: age ? Number(age) : null,
        gender: gender === 'm' ? 'm' : 'f',
        role: 'user',
        active: true,
        settings: defaultSettings(),
        lastLoginAt: G.store.now(),
      });
      auth.setSession(user.id, true);
      return sanitize(user);
    },

    async login(email, password, remember) {
      await auth.ready();
      const e = normalizeEmail(email);
      const user = G.store.find('users', (u) => u.email === e);
      // رسالة موحّدة حتى لا نكشف وجود البريد
      const fail = new Error('البريد الإلكتروني أو كلمة السر غير صحيحة');
      if (!user) throw fail;
      const ok = await G.crypto.verify(password, user.password);
      if (!ok) throw fail;
      if (!user.active) throw new Error('هذا الحساب معطّل. تواصل مع إدارة التطبيق.');
      G.store.update('users', user.id, { lastLoginAt: G.store.now() });
      auth.setSession(user.id, remember !== false);
      return sanitize(user);
    },

    setSession(userId, remember) {
      const data = JSON.stringify({ userId, at: Date.now() });
      if (remember) {
        localStorage.setItem(SESSION_KEY, data);
        sessionStorage.removeItem(SESSION_KEY);
      } else {
        sessionStorage.setItem(SESSION_KEY, data);
        localStorage.removeItem(SESSION_KEY);
      }
    },

    logout() {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      location.href = auth.loginUrl();
    },

    /** المستخدم الحالي (نسخة من المخزن بدون كلمة السر) — مخزّنة مؤقتًا حتى أي تعديل */
    user() {
      const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      if (cache && cache.raw === raw) return cache.user;
      try {
        const { userId } = JSON.parse(raw);
        const u = G.store.get('users', userId);
        if (!u || !u.active) return null;
        const copy = sanitize(u);
        copy.settings = Object.assign(defaultSettings(), u.settings || {});
        copy.settings.notifications = Object.assign(defaultSettings().notifications, (u.settings || {}).notifications || {});
        cache = { raw, user: copy };
        return copy;
      } catch (e) {
        return null;
      }
    },

    userId() {
      const u = auth.user();
      return u ? u.id : null;
    },

    isAdmin() {
      const u = auth.user();
      return !!u && u.role === 'admin';
    },

    /** رابط صفحة الدخول بالنسبة لموقع الصفحة الحالية */
    loginUrl() {
      return location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
    },

    /** حماية الصفحة: يعيد المستخدم أو يحوّل لصفحة الدخول */
    require(role) {
      const u = auth.user();
      if (!u) {
        location.replace(auth.loginUrl());
        return null;
      }
      if (role === 'admin' && u.role !== 'admin') {
        location.replace('home.html');
        return null;
      }
      return u;
    },

    /** تعديل الملف الشخصي (بدون البريد وكلمة السر) */
    updateProfile(patch) {
      const id = auth.userId();
      const allowed = {};
      ['name', 'age', 'gender'].forEach((k) => { if (k in patch) allowed[k] = patch[k]; });
      return sanitize(G.store.update('users', id, allowed));
    },

    updateSettings(patch) {
      const u = auth.user();
      const settings = Object.assign({}, u.settings, patch);
      if (patch.notifications) settings.notifications = Object.assign({}, u.settings.notifications, patch.notifications);
      G.store.update('users', u.id, { settings });
      return settings;
    },

    async changePassword(current, next) {
      const raw = G.store.get('users', auth.userId());
      const ok = await G.crypto.verify(current, raw.password);
      if (!ok) throw new Error('كلمة السر الحالية غير صحيحة');
      if (auth.passwordIssues(next).length) throw new Error('كلمة السر الجديدة لا تحقق الشروط');
      const hashed = await G.crypto.hashPassword(next);
      G.store.update('users', raw.id, { password: hashed });
    },

    defaultSettings,
    sanitize,
  };

  G.auth = auth;
})(window.Ghars = window.Ghars || {});
