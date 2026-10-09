/* ==========================================================================
   storage.js — قاعدة البيانات المحلية (localStorage)
   كل البيانات في مفتاح واحد، مقسّمة إلى "مجموعات" تطابق بنية البيانات:
   users, goals, tasks, reminders, executions, weights, categories, periods
   عند إضافة خادم مستقبلًا (مزامنة سحابية) يُستبدل هذا الملف فقط.
   ========================================================================== */
(function (G) {
  'use strict';

  const KEY = 'ghars.db.v1';
  const COLLECTIONS = ['users', 'goals', 'tasks', 'reminders', 'executions', 'weights', 'categories', 'periods'];

  function empty() {
    const db = { version: 1, app: {} };
    COLLECTIONS.forEach((c) => { db[c] = []; });
    return db;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return empty();
      const parsed = JSON.parse(raw);
      const db = empty();
      Object.keys(parsed).forEach((k) => { db[k] = parsed[k]; });
      COLLECTIONS.forEach((c) => { if (!Array.isArray(db[c])) db[c] = []; });
      return db;
    } catch (err) {
      console.error('[Ghars] تعذّر قراءة البيانات المحلية', err);
      return empty();
    }
  }

  let db = load();
  const listeners = new Set();

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (err) {
      console.error('[Ghars] تعذّر حفظ البيانات', err);
      if (G.toast) G.toast('تعذّر حفظ البيانات — قد تكون مساحة التخزين ممتلئة', { type: 'danger' });
    }
    listeners.forEach((fn) => fn());
  }

  // تحديث البيانات إذا تغيّرت من تبويب آخر
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      db = load();
      listeners.forEach((fn) => fn());
    }
  });

  const uid = (prefix) => `${prefix || 'id'}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const now = () => new Date().toISOString();

  G.store = {
    uid,
    now,

    all(col) { return db[col].slice(); },
    where(col, pred) { return db[col].filter(pred); },
    find(col, pred) { return db[col].find(pred) || null; },
    get(col, id) { return db[col].find((x) => x.id === id) || null; },

    insert(col, data) {
      const rec = Object.assign({ id: uid(col.slice(0, 3)), createdAt: now(), updatedAt: now() }, data);
      db[col].push(rec);
      persist();
      return rec;
    },

    update(col, id, patch) {
      const rec = db[col].find((x) => x.id === id);
      if (!rec) return null;
      Object.assign(rec, patch, { updatedAt: now() });
      persist();
      return rec;
    },

    remove(col, id) {
      db[col] = db[col].filter((x) => x.id !== id);
      persist();
    },

    removeWhere(col, pred) {
      db[col] = db[col].filter((x) => !pred(x));
      persist();
    },

    /* إعدادات التطبيق العامة (يديرها الـAdmin) */
    app() { return db.app; },
    setApp(patch) { Object.assign(db.app, patch); persist(); },

    /** الاشتراك في أي تغيير على البيانات */
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    /* النسخ الاحتياطي لبيانات مستخدم واحد فقط */
    exportUser(userId) {
      const out = { app: 'ghars', version: 1, exportedAt: now(), data: {} };
      COLLECTIONS.filter((c) => c !== 'users').forEach((c) => {
        out.data[c] = db[c].filter((x) => x.userId === userId);
      });
      return out;
    },

    importUser(userId, payload) {
      if (!payload || payload.app !== 'ghars' || !payload.data) throw new Error('ملف غير صالح');
      COLLECTIONS.filter((c) => c !== 'users').forEach((c) => {
        const incoming = (payload.data[c] || []).map((x) => Object.assign({}, x, { userId }));
        const ids = new Set(incoming.map((x) => x.id));
        db[c] = db[c].filter((x) => !(x.userId === userId || ids.has(x.id))).concat(incoming);
      });
      persist();
    },

    /** حذف كل بيانات مستخدم (عند حذف الحساب) */
    purgeUser(userId) {
      COLLECTIONS.filter((c) => c !== 'users').forEach((c) => {
        db[c] = db[c].filter((x) => x.userId !== userId);
      });
      db.users = db.users.filter((u) => u.id !== userId);
      persist();
    },
  };
})(window.Ghars = window.Ghars || {});
