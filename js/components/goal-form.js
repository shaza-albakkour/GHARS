/* ==========================================================================
   goal-form.js — نموذج إنشاء/تعديل الهدف
   Ghars.goalForm.open({ goal })                 تعديل
   Ghars.goalForm.open({ parentId })             هدف فرعي (المستوى يُحدَّد تلقائيًا)
   Ghars.goalForm.open({ level: 'yearly' })      هدف جديد بمستوى محدد
   ========================================================================== */
(function (G) {
  'use strict';

  const esc = (s) => G.dom.esc(s);
  const GL = G.goals;

  G.goalForm = {
    open(opts) {
      const o = opts || {};
      const editing = o.goal || null;
      const parent = o.parentId ? GL.get(o.parentId) : (editing && editing.parentId ? GL.get(editing.parentId) : null);
      const level = editing ? editing.level : (parent ? GL.childLevel(parent.level) : (o.level || 'yearly'));
      const range = editing ? { startDate: editing.startDate, endDate: editing.endDate } : GL.defaultRange(level, parent ? (parent.startDate > G.date.today() ? parent.startDate : G.date.today()) : null);
      const g = Object.assign({ priority: 'medium', status: 'active', categoryId: parent ? parent.categoryId : null }, range, editing || {});
      const cats = G.categories.list();

      const form = G.dom.el(`
        <form class="form" novalidate autocomplete="off">
          ${parent ? `<div class="badge badge--accent">ضمن: ${esc(GL.levelLabel(parent.level))} — ${esc(parent.name)}</div>` : ''}
          <div class="field">
            <label for="gf-name">اسم الهدف *</label>
            <input id="gf-name" class="input" name="name" maxlength="120" required value="${esc(g.name || '')}" placeholder="${level === 'yearly' ? 'مثل: حفظ القرآن كاملًا' : level === 'monthly' ? 'مثل: حفظ سورة البقرة' : 'مثل: حفظ 5 صفحات'}">
          </div>
          <div class="field">
            <label for="gf-desc">الوصف</label>
            <textarea id="gf-desc" class="textarea" name="description" maxlength="500">${esc(g.description || '')}</textarea>
          </div>
          <div class="form-row">
            <div class="field">
              <label for="gf-level">مستوى الهدف</label>
              <select id="gf-level" class="select" name="level" ${parent || editing ? 'disabled' : ''}>
                ${Object.keys(GL.LEVELS).map((l) => `<option value="${l}" ${l === level ? 'selected' : ''}>${GL.LEVELS[l].label}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label for="gf-cat">التصنيف</label>
              <select id="gf-cat" class="select" name="categoryId">
                <option value="">بدون تصنيف</option>
                ${cats.map((c) => `<option value="${esc(c.id)}" ${c.id === g.categoryId ? 'selected' : ''}>${esc(c.icon || '')} ${esc(c.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field"><label for="gf-start">تاريخ البداية</label><input id="gf-start" class="input" type="date" name="startDate" value="${esc(g.startDate)}"></div>
            <div class="field"><label for="gf-end">تاريخ النهاية</label><input id="gf-end" class="input" type="date" name="endDate" value="${esc(g.endDate)}"></div>
          </div>
          <div class="form-row">
            <div class="field">
              <span class="field-label">الأولوية</span>
              <div class="chip-group">
                ${Object.keys(G.tasks.PRIORITY).map((p) => `<label class="chip-option"><input type="radio" name="priority" value="${p}" ${g.priority === p ? 'checked' : ''}><span class="priority priority--${p}">${G.tasks.PRIORITY[p]}</span></label>`).join('')}
              </div>
            </div>
            ${editing ? `<div class="field"><label for="gf-status">الحالة</label><select id="gf-status" class="select" name="status">${Object.keys(GL.STATUS).map((s) => `<option value="${s}" ${g.status === s ? 'selected' : ''}>${GL.STATUS[s]}</option>`).join('')}</select></div>` : ''}
          </div>
          <div class="field-error" data-error role="alert"></div>
        </form>`);

      const m = G.modal.open({
        title: editing ? 'تعديل الهدف' : parent ? `هدف ${GL.levelLabel(level)} جديد` : 'هدف جديد',
        body: form,
        foot: `<button class="btn" data-save>${editing ? 'حفظ' : 'إضافة الهدف'}</button><button class="btn btn--ghost" data-close>إلغاء</button>`,
      });

      // تحديث التواريخ تلقائيًا عند تغيير المستوى
      const levelSel = form.querySelector('[name=level]');
      levelSel.addEventListener('change', () => {
        const r = GL.defaultRange(levelSel.value);
        form.querySelector('[name=startDate]').value = r.startDate;
        form.querySelector('[name=endDate]').value = r.endDate;
      });

      const submit = (e) => {
        if (e) e.preventDefault();
        const f = G.dom.formData(form);
        const data = {
          name: f.name,
          description: f.description,
          categoryId: f.categoryId || null,
          startDate: f.startDate,
          endDate: f.endDate,
          priority: f.priority,
        };
        try {
          let saved;
          if (editing) {
            if (f.status) data.status = f.status;
            saved = GL.update(editing.id, data);
          } else {
            data.level = parent ? level : levelSel.value;
            data.parentId = parent ? parent.id : null;
            saved = GL.create(data);
          }
          m.close();
          G.toast(editing ? 'تم حفظ الهدف.' : 'زُرع هدف جديد 🌱', { type: 'success' });
          if (o.onSave) o.onSave(saved);
        } catch (ex) {
          form.querySelector('[data-error]').textContent = ex.message;
        }
      };
      form.addEventListener('submit', submit);
      m.el.querySelector('[data-save]').addEventListener('click', submit);
    },
  };
})(window.Ghars = window.Ghars || {});
