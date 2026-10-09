/* ==========================================================================
   messages.js — الرسائل المخصّصة باسم المستخدم (ترحيب، تحفيز، إنجاز، نهاية اليوم)
   - تُراعي صيغة المخاطبة (مؤنث/مذكر)
   - تتنوع حسب اليوم حتى لا تتكرر
   - يمكن للـAdmin إضافة رسائل تحفيزية عامة (تدعم {name})
   ========================================================================== */
(function (G) {
  'use strict';

  /** اختيار صيغة حسب الجنس */
  function g(user, fem, masc) {
    return user && user.gender === 'm' ? masc : fem;
  }

  /** اختيار ثابت خلال اليوم ومتغيّر بين الأيام */
  function pickDaily(list, salt) {
    const seed = (G.date.today() + (salt || '')).split('').reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    return list[seed % list.length];
  }

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  /** "مهمة واحدة"، "مهمتان"، "7 مهام"، "12 مهمة" */
  function countTasks(n) {
    if (n === 0) return 'لا مهام';
    if (n === 1) return 'مهمة واحدة';
    if (n === 2) return 'مهمتان';
    if (n <= 10) return `${n} مهام`;
    return `${n} مهمة`;
  }

  function firstName(user) {
    return String((user && user.name) || '').trim().split(/\s+/)[0] || '';
  }

  const messages = {
    countTasks,
    g,

    greeting(user) {
      const h = new Date().getHours();
      const name = firstName(user);
      if (h < 5) return `ليلة هادئة ${name} 🌙`;
      if (h < 12) return `صباح الخير ${name} 🌷`;
      if (h < 17) return `نهارك سعيد ${name} ☀️`;
      return `مساء الخير ${name} 🌙`;
    },

    /** سطر ملخص اليوم تحت الترحيب */
    todayLine(user, r) {
      const remaining = r.total - r.done;
      if (!r.items) {
        return pickDaily([
          `لا مهام لديك اليوم بعد — ${g(user, 'ازرعي', 'ازرع')} أول بذرة بإضافة مهمة صغيرة.`,
          `يومك صفحة بيضاء، ${g(user, 'ابدئي', 'ابدأ')} بمهمة واحدة فقط.`,
        ]);
      }
      if (!r.total) return `اليوم يوم راحة 🌿 ${g(user, 'استمتعي', 'استمتع')} به دون أن يُحتسب عليك شيء.`;
      if (r.pct === 100) {
        return pickDaily([
          `${g(user, 'أنجزتِ', 'أنجزت')} كل مهام اليوم! 🎉 هذا هو الغرس الذي يُثمر.`,
          `يوم مكتمل بنسبة 100% — ${g(user, 'فخورون بكِ', 'فخورون بك')} 🌳`,
        ]);
      }
      if (r.done === 0) {
        return pickDaily([
          `${g(user, 'لديكِ', 'لديك')} ${countTasks(r.total)} اليوم، لنبدأ بخطوة صغيرة.`,
          `${countTasks(r.total)} في انتظارك اليوم — أصغر خطوة تكفي للبداية.`,
          `${g(user, 'ابدئي', 'ابدأ')} بأسهل مهمة، والباقي سيتبعها. ${g(user, 'لديكِ', 'لديك')} ${countTasks(r.total)}.`,
        ], 'start');
      }
      if (r.pct >= 70) return `${g(user, 'رائعة', 'رائع')}! ${g(user, 'أنجزتِ', 'أنجزت')} ${r.pct}% — ${g(user, 'بقيت لكِ', 'بقيت لك')} ${countTasks(remaining)} فقط.`;
      return pickDaily([
        `${g(user, 'أنجزتِ', 'أنجزت')} ${r.done} من ${r.total} — ${g(user, 'استمري', 'استمر')} بهدوء.`,
        `خطوة بعد خطوة… ${g(user, 'بقيت لكِ', 'بقيت لك')} ${countTasks(remaining)} اليوم.`,
      ], 'mid');
    },

    /** رسالة عند الضغط على "تم الإنجاز" */
    completion(user, dayPct) {
      const name = firstName(user);
      const base = [
        `${g(user, 'أحسنتِ', 'أحسنت')} ${name}! 🎉`,
        `عمل جميل يا ${name} ✨`,
        `بذرة جديدة نبتت يا ${name} 🌱`,
        `خطوة أقرب إلى هدفك يا ${name} 🎯`,
      ];
      return { title: pickRandom(base), msg: `${g(user, 'أنجزتِ', 'أنجزت')} ${dayPct}% من مهام اليوم.` };
    },

    /** نص شاشة المنبّه */
    alarmTitle(user, task) {
      return `حان الآن موعد ${task.name} يا ${firstName(user)}`;
    },

    beforeTask(user, task, minutes) {
      return `بعد ${minutes} دقيقة ${g(user, 'لديكِ', 'لديك')}: ${task.name}`;
    },

    lateTask(user, task) {
      return `${task.name} ما زالت غير مكتملة — لا بأس، ${g(user, 'يمكنكِ', 'يمكنك')} إنجازها أو تأجيلها.`;
    },

    /** رسالة نهاية اليوم */
    endOfDay(user, r) {
      if (!r.total) return `انتهى يومك يا ${firstName(user)} 🌙 غدًا فرصة جديدة.`;
      if (r.pct >= 80) return `يوم مثمر يا ${firstName(user)} 🌳 ${g(user, 'أنجزتِ', 'أنجزت')} ${r.pct}%.`;
      return `انتهى اليوم بنسبة ${r.pct}% يا ${firstName(user)} — عدم إنجاز مهمة لا يعني الفشل، ${g(user, 'عدّلي', 'عدّل')} خطتك ${g(user, 'واستمري', 'واستمر')} 💚`;
    },

    /** رسالة تحفيزية (من مكتبة التطبيق + رسائل الإدارة) */
    motivation(user) {
      const name = firstName(user);
      const builtIn = [
        'الإنجاز اليومي الصغير يتراكم ليصنع إنجازًا سنويًا كبيرًا.',
        'لا تنتظر الحماس، ابدأ وسيلحق بك.',
        'التقدم البطيء ما زال تقدمًا.',
        'ما تزرعه اليوم بصبر، تحصده غدًا بفرح.',
        'أحب الأعمال إلى الله أدومها وإن قلّ.',
        'ركّز على الخطوة التالية فقط.',
        'كل مهمة مكتملة هي ورقة جديدة في شجرتك.',
      ];
      const custom = ((G.store.app().messages) || []).filter(Boolean);
      return pickDaily(builtIn.concat(custom), 'motivation').replace(/\{name\}/g, name);
    },

    firstName,
  };

  G.messages = messages;
})(window.Ghars = window.Ghars || {});
