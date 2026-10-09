/* ==========================================================================
   presets.js — قوالب المهام الجاهزة (إضافة بنقرة واحدة)
   Ghars.presets.render(container, list)  يرسم البطاقات ويفعّل الإضافة
   كل قالب: { id, icon, name, desc, category, tasks: [ {بيانات مهمة} ] }
   ========================================================================== */
(function (G) {
  'use strict';

  const esc = (s) => G.dom.esc(s);

  function exists(name) {
    return G.tasks.list().some((t) => t.name === name && (!t.endDate || t.endDate >= G.date.today()));
  }

  G.presets = {
    render(container, list) {
      container.innerHTML = `<div class="preset-grid">${list.map((p) => {
        const added = p.tasks.length && p.tasks.every((t) => exists(t.name));
        return `
          <button class="preset ${added ? 'is-added' : ''}" data-preset="${esc(p.id)}" ${added ? 'aria-disabled="true"' : ''}>
            <span class="preset__icon" aria-hidden="true">${p.icon}</span>
            <span class="preset__name">${esc(p.name)}</span>
            <span class="preset__desc">${added ? 'مضافة' : esc(p.desc)}</span>
          </button>`;
      }).join('')}</div>`;

      if (container.dataset.presetsBound) return;
      container.dataset.presetsBound = '1';
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-preset]');
        if (!btn) return;
        const preset = list.find((p) => p.id === btn.dataset.preset);
        if (!preset) return;
        if (preset.custom) return preset.custom();
        const cat = G.categories.byKey(preset.category);
        let added = 0;
        preset.tasks.forEach((t) => {
          if (exists(t.name)) return;
          G.tasks.create(Object.assign({ categoryId: cat ? cat.id : null, date: G.date.today(), priority: 'medium', period: 'day', repeat: 'daily' }, t));
          added++;
        });
        G.toast(added ? `أُضيفت ${G.messages.countTasks(added)} — يمكنك تعديل الأوقات وإضافة منبّه من "كل المهام".` : 'هذه المهام موجودة بالفعل.', { type: added ? 'success' : 'info' });
      });
    },
  };
})(window.Ghars = window.Ghars || {});
