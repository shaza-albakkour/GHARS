/* ==========================================================================
   modal.js — النوافذ المنبثقة + نافذة التأكيد
   Ghars.modal.open({ title, body, foot, size })  → { el, close }
   Ghars.modal.confirm({ title, message, confirmText, danger }) → Promise<boolean>
   ========================================================================== */
(function (G) {
  'use strict';

  const open = [];

  function onKey(e) {
    if (e.key === 'Escape' && open.length) open[open.length - 1].close();
  }
  document.addEventListener('keydown', onKey);

  const modal = {
    open(opts) {
      const o = Object.assign({ title: '', body: '', foot: '', size: '', onClose: null }, opts);
      const prevFocus = document.activeElement;
      const backdrop = G.dom.el(`
        <div class="modal-backdrop">
          <div class="modal ${o.size ? 'modal--' + o.size : ''}" role="dialog" aria-modal="true" aria-label="${G.dom.esc(o.title)}">
            <div class="modal__head">
              <h2 class="modal__title">${G.dom.esc(o.title)}</h2>
              <button class="icon-btn" data-close aria-label="إغلاق">${G.icon('x')}</button>
            </div>
            <div class="modal__body"></div>
            ${o.foot ? '<div class="modal__foot"></div>' : ''}
          </div>
        </div>`);
      const body = backdrop.querySelector('.modal__body');
      if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
      if (o.foot) {
        const foot = backdrop.querySelector('.modal__foot');
        if (typeof o.foot === 'string') foot.innerHTML = o.foot; else foot.appendChild(o.foot);
      }

      const api = {
        el: backdrop.querySelector('.modal'),
        close() {
          const i = open.indexOf(api);
          if (i >= 0) open.splice(i, 1);
          backdrop.remove();
          if (!open.length) document.body.style.overflow = '';
          if (prevFocus && prevFocus.focus) prevFocus.focus();
          if (o.onClose) o.onClose();
        },
      };

      backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) api.close(); });
      backdrop.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', api.close));

      document.body.appendChild(backdrop);
      document.body.style.overflow = 'hidden';
      open.push(api);

      const first = backdrop.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select');
      setTimeout(() => (first || backdrop.querySelector('[data-close]')).focus(), 30);
      return api;
    },

    confirm(opts) {
      const o = Object.assign({ title: 'تأكيد', message: '', confirmText: 'تأكيد', cancelText: 'إلغاء', danger: false }, opts);
      return new Promise((resolve) => {
        let answered = false;
        const m = modal.open({
          title: o.title,
          size: 'sm',
          body: `<p class="text-muted">${G.dom.esc(o.message)}</p>`,
          foot: `<button class="btn ${o.danger ? 'btn--danger' : ''}" data-yes>${G.dom.esc(o.confirmText)}</button>
                 <button class="btn btn--ghost" data-close>${G.dom.esc(o.cancelText)}</button>`,
          onClose: () => { if (!answered) resolve(false); },
        });
        m.el.querySelector('[data-yes]').addEventListener('click', () => {
          answered = true;
          m.close();
          resolve(true);
        });
      });
    },
  };

  G.modal = modal;
})(window.Ghars = window.Ghars || {});
