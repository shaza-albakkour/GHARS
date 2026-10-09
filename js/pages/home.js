/* ==========================================================================
   home.js — الصفحة الرئيسية
   الاسم، التاريخ الميلادي والهجري، نسبة اليوم، القادمة، المتبقية، المتأخرة،
   تقدم الأسبوع/الشهر/السنة، رسالة تحفيزية، ملخص الأهداف
   ========================================================================== */
(function (G) {
  'use strict';

  const { $, esc } = G.dom;
  const D = G.date;
  const T = G.tasks;
  const P = G.progress;

  G.boot({ page: 'home', title: 'الرئيسية' }).then((user) => {
    if (!user) return;

    if (G.dom.param('welcome')) {
      G.toast(`حسابك جاهز يا ${G.messages.firstName(user)} — ${G.messages.g(user, 'ابدئي', 'ابدأ')} بزرع أول هدف 🌱`, { title: 'مرحبًا بك في غَرْس', type: 'success', timeout: 7000 });
      history.replaceState(null, '', 'home.html');
    }

    $('[data-add]').addEventListener('click', () => G.taskForm.open());
    G.taskItem.bind($('#upcoming'));
    G.taskItem.bind($('#late'));

    G.live(() => render(G.auth.user()));
  });

  const kpi = G.charts.stat;

  function empty(icon, text) {
    return `<div class="empty"><div class="empty__icon">${G.icon(icon)}</div><p class="empty__text">${esc(text)}</p></div>`;
  }

  function render(user) {
    const today = D.today();
    const day = P.day(today);

    // إعلان الإدارة
    const note = G.store.app().announcement;
    $('#announce').hidden = !note;
    $('#announce').innerHTML = note ? `${G.icon('megaphone')}<span>${esc(note)}</span>` : '';

    // الترحيب
    $('#welcome-dates').textContent = `${D.formatLong(today)} • ${D.hijri(today)}`;
    $('#greeting').textContent = G.messages.greeting(user);
    $('#today-line').textContent = G.messages.todayLine(user, day);
    $('#today-ring').innerHTML = G.charts.ring(day.pct, { size: 140, caption: 'إنجاز اليوم' });

    // المهام: المتبقية / القادمة / المتأخرة
    const todays = T.sort(T.forDay(today).concat(T.forPeriod('week', today)));
    const withStatus = todays.map((it) => Object.assign({ status: T.statusOf(it.task, it.key) }, it));
    const remaining = withStatus.filter((it) => ['not_started', 'in_progress'].includes(it.status));
    const now = D.nowMinutes();
    const nextTimed = remaining.filter((it) => it.task.timed && D.toMinutes(T.timeOf(it.task, it.key)) >= now);

    const late = [];
    for (let i = 0; i <= 7; i++) {
      const k = D.addDays(today, -i);
      T.forDay(k).forEach((it) => { if (T.statusOf(it.task, it.key) === 'late') late.push(it); });
    }

    $('#kpis').innerHTML = [
      kpi('clipboard', 'leaf', 'المتبقية اليوم', remaining.length, `من ${day.total} محتسبة`),
      kpi('clock', 'sky', 'القادمة', nextTimed.length, nextTimed[0] ? `التالية ${D.formatTime(T.timeOf(nextTimed[0].task, nextTimed[0].key))}` : 'لا مواعيد قادمة'),
      kpi('hourglass', 'rose', 'المتأخرة', late.length, 'آخر 7 أيام'),
      kpi('flame', 'gold', 'الاستمرارية', P.currentStreak(), 'يوم متتالٍ'),
    ].join('');

    $('#upcoming').innerHTML = remaining.length
      ? G.taskItem.list(remaining.slice(0, 6))
      : empty(day.items ? 'sparkle' : 'leaf', day.items ? 'لا مهام متبقية اليوم — عمل رائع!' : `لا مهام اليوم بعد. ${G.messages.g(user, 'أضيفي', 'أضف')} أول مهمة.`);

    $('#late').innerHTML = late.length
      ? G.taskItem.list(late.slice(0, 6), { showDate: true })
      : empty('check', `لا مهام متأخرة. ${G.messages.g(user, 'واصلي', 'واصل')} على هذا الإيقاع.`);

    // التقدم
    const w = P.week(today);
    const m = P.month(today);
    const y = P.year(today);
    $('#progress').innerHTML = [
      G.charts.progress({ label: 'هذا الأسبوع', pct: w.pct, meta: `${w.done} من ${w.total} مهمة` }),
      G.charts.progress({ label: `شهر ${D.MONTHS[D.parse(today).getMonth()]}`, pct: m.pct, meta: `${m.done} من ${m.total} مهمة` }),
      G.charts.progress({ label: `سنة ${today.slice(0, 4)}`, pct: y.pct, meta: `${y.done} من ${y.total} مهمة` }),
    ].join('');

    // التحفيز + رسالة نهاية اليوم بعد الثامنة مساءً
    let msg = G.messages.motivation(user);
    if (new Date().getHours() >= 20) msg = G.messages.endOfDay(user, day);
    $('#motivation').textContent = msg;

    // الأهداف
    const roots = G.goals.roots().filter((g) => g.status === 'active').slice(0, 4);
    $('#goals-mini').innerHTML = roots.length
      ? roots.map((g) => {
        const pct = G.goals.progress(g);
        return `
          <div class="goal-mini">
            <div class="goal-mini__name"><a href="goals.html?id=${esc(g.id)}">${esc(g.name)}</a><span class="text-faint text-xs">${esc(G.goals.levelLabel(g.level))}</span></div>
            ${G.charts.progress({ pct, size: 'sm' })}
          </div>`;
      }).join('')
      : `<div class="empty"><div class="empty__icon">${G.icon('target')}</div><p class="empty__text">لا أهداف بعد.</p><a class="btn btn--sm" href="goals.html">ازرع هدفك الأول</a></div>`;
  }
})(window.Ghars);
