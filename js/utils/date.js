/* ==========================================================================
   date.js — التواريخ والأوقات: الميلادي والهجري، الأسابيع والأشهر
   كل التواريخ داخل التطبيق تُخزَّن كنص "YYYY-MM-DD" بالتوقيت المحلي.
   ========================================================================== */
(function (G) {
  'use strict';

  const pad = (n) => String(n).padStart(2, '0');

  const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const DAY_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  // الهجري: تقويم أم القرى عبر واجهة Intl المدمجة في المتصفح
  let hijriFmt = null;
  let hijriDayFmt = null;
  try {
    hijriFmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
    hijriDayFmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-latn', { day: 'numeric' });
  } catch (e) { /* متصفح قديم: نتجاهل الهجري */ }

  const D = {
    DAY_NAMES,
    DAY_SHORT,
    MONTHS,

    /** Date → "YYYY-MM-DD" */
    key(date) {
      const d = date || new Date();
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    },

    /** "YYYY-MM-DD" → Date (منتصف الليل المحلي) */
    parse(key) {
      const [y, m, d] = String(key).split('-').map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    },

    today() { return D.key(new Date()); },

    addDays(key, n) {
      const d = D.parse(key);
      d.setDate(d.getDate() + n);
      return D.key(d);
    },

    addMonths(key, n) {
      const d = D.parse(key);
      const day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + n);
      d.setDate(Math.min(day, D.daysInMonth(D.key(d))));
      return D.key(d);
    },

    diffDays(a, b) {
      return Math.round((D.parse(b) - D.parse(a)) / 86400000);
    },

    weekday(key) { return D.parse(key).getDay(); },

    daysInMonth(key) {
      const d = D.parse(key);
      return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    },

    /** بداية الأسبوع (افتراضيًا السبت = 6) */
    weekStart(key, startDay) {
      const s = startDay == null ? 6 : startDay;
      const wd = D.weekday(key);
      return D.addDays(key, -((wd - s + 7) % 7));
    },
    weekEnd(key, startDay) { return D.addDays(D.weekStart(key, startDay), 6); },

    monthStart(key) { return key.slice(0, 8) + '01'; },
    monthEnd(key) { return key.slice(0, 8) + pad(D.daysInMonth(key)); },
    yearStart(key) { return key.slice(0, 4) + '-01-01'; },
    yearEnd(key) { return key.slice(0, 4) + '-12-31'; },

    /** مفتاح الفترة التي يقع فيها التاريخ */
    periodStart(period, key, weekStartDay) {
      if (period === 'week') return D.weekStart(key, weekStartDay);
      if (period === 'month') return D.monthStart(key);
      if (period === 'year') return D.yearStart(key);
      return key;
    },
    periodEnd(period, key, weekStartDay) {
      if (period === 'week') return D.weekEnd(key, weekStartDay);
      if (period === 'month') return D.monthEnd(key);
      if (period === 'year') return D.yearEnd(key);
      return key;
    },
    nextPeriod(period, key) {
      if (period === 'week') return D.addDays(key, 7);
      if (period === 'month') return D.addMonths(D.monthStart(key), 1);
      if (period === 'year') return (Number(key.slice(0, 4)) + 1) + '-01-01';
      return D.addDays(key, 1);
    },

    /** كل التواريخ بين بداية ونهاية (شاملة) */
    range(start, end) {
      const out = [];
      let k = start;
      let guard = 0;
      while (k <= end && guard++ < 4000) { out.push(k); k = D.addDays(k, 1); }
      return out;
    },

    inRange(key, start, end) {
      return key >= start && (!end || key <= end);
    },

    /* ---------- التنسيق ---------- */

    /** "الخميس، 9 أكتوبر 2026" */
    formatLong(key) {
      const d = D.parse(key);
      return `${DAY_NAMES[d.getDay()]}، ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    },

    /** "9 أكتوبر" */
    formatShort(key) {
      const d = D.parse(key);
      return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    },

    formatMonth(key) {
      const d = D.parse(key);
      return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    },

    /** التاريخ الهجري الكامل */
    hijri(key) {
      if (!hijriFmt) return '';
      return hijriFmt.format(D.parse(key));
    },

    /** رقم اليوم الهجري فقط (للتقويم) */
    hijriDay(key) {
      if (!hijriDayFmt) return '';
      return hijriDayFmt.format(D.parse(key));
    },

    /** وصف نسبي: اليوم / أمس / غدًا / تاريخ */
    relative(key) {
      const diff = D.diffDays(D.today(), key);
      if (diff === 0) return 'اليوم';
      if (diff === -1) return 'أمس';
      if (diff === 1) return 'غدًا';
      return D.formatShort(key);
    },

    /* ---------- الوقت ---------- */

    /** "HH:MM" → دقائق منذ منتصف الليل */
    toMinutes(hhmm) {
      if (!hhmm) return null;
      const [h, m] = hhmm.split(':').map(Number);
      return h * 60 + (m || 0);
    },

    fromMinutes(min) {
      const m = ((min % 1440) + 1440) % 1440;
      return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    },

    nowMinutes() {
      const n = new Date();
      return n.getHours() * 60 + n.getMinutes();
    },

    nowHHMM() { return D.fromMinutes(D.nowMinutes()); },

    /** "14:30" → "2:30 م" */
    formatTime(hhmm) {
      if (!hhmm) return '';
      const [h, m] = hhmm.split(':').map(Number);
      const suffix = h < 12 ? 'ص' : 'م';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}:${pad(m)} ${suffix}`;
    },

    formatDateTime(iso) {
      if (!iso) return '—';
      const d = new Date(iso);
      return `${D.formatShort(D.key(d))} — ${D.formatTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`)}`;
    },
  };

  G.date = D;
})(window.Ghars = window.Ghars || {});
