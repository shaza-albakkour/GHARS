/* ==========================================================================
   charts.js — رسوم بيانية SVG خفيفة بدون مكتبات
   Ghars.charts.bar(el, data, opts)     أعمدة (تقدم الأيام/الأسابيع/الأشهر)
   Ghars.charts.line(el, data, opts)    خط (تطور الوزن)
   Ghars.charts.ring(pct, opts)         حلقة تقدم (HTML)
   Ghars.charts.progress(opts)          شريط تقدم (HTML)
   Ghars.charts.hbars(el, rows)         أعمدة أفقية (التصنيفات)
   الاتجاه من اليمين لليسار (RTL): أول عنصر زمني على اليمين.
   ========================================================================== */
(function (G) {
  'use strict';

  const esc = (s) => G.dom.esc(s);
  const NS = 'http://www.w3.org/2000/svg';

  function tooltip(el) {
    let tip = el.querySelector('.chart-tooltip');
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'chart-tooltip';
      tip.hidden = true;
      el.appendChild(tip);
    }
    return tip;
  }

  function showTip(el, svg, x, y, W, html) {
    const tip = tooltip(el);
    const scale = svg.getBoundingClientRect().width / W;
    tip.innerHTML = html;
    tip.style.left = `${x * scale}px`;
    tip.style.top = `${y * scale}px`;
    tip.hidden = false;
  }

  function hideTip(el) {
    const tip = el.querySelector('.chart-tooltip');
    if (tip) tip.hidden = true;
  }

  /** مسار عمود بزاويتين علويتين مدورتين (4px) ومثبت على خط الأساس */
  function barPath(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h);
    return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
  }

  const charts = {
    bar(el, data, opts) {
      const o = Object.assign({ height: 220, max: 100, unit: '%', onClick: null }, opts);
      el.classList.add('chart');
      if (!data.length) { el.innerHTML = '<div class="chart-empty">لا توجد بيانات بعد</div>'; return; }
      const W = Math.max(el.clientWidth || 600, 280);
      const H = o.height;
      const padTop = 22;
      const padBottom = 28;
      const padStart = 36; // مساحة محور القيم (يمين)
      const padEnd = 6;
      const plotW = W - padStart - padEnd;
      const plotH = H - padTop - padBottom;
      const step = plotW / data.length;
      const bw = Math.max(6, Math.min(30, step * 0.5));
      const yOf = (v) => padTop + plotH - (v / o.max) * plotH;

      let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="${NS}" role="img" aria-label="${esc(o.label || 'رسم بياني')}">`;
      svg += '<g class="chart__grid">';
      [0, 25, 50, 75, 100].forEach((t) => {
        const y = yOf((t / 100) * o.max);
        svg += `<line x1="${padEnd}" x2="${W - padStart}" y1="${y}" y2="${y}" ${t === 0 ? 'style="stroke:var(--border-strong)"' : ''}/>`;
      });
      svg += '</g><g class="chart__axis">';
      [0, 50, 100].forEach((t) => {
        svg += `<text x="${W - 4}" y="${yOf((t / 100) * o.max) + 4}" text-anchor="end">${Math.round((t / 100) * o.max)}${o.unit}</text>`;
      });
      svg += '</g>';

      data.forEach((d, i) => {
        const cx = W - padStart - step * (i + 0.5);
        const x = cx - bw / 2;
        const hasVal = d.value != null && !d.future;
        const v = hasVal ? Math.max(d.value, 0) : 0;
        const h = hasVal ? Math.max((v / o.max) * plotH, v > 0 ? 3 : 2) : 3;
        const y = padTop + plotH - h;
        const cls = !hasVal ? 'chart__bar chart__bar--future' : d.current ? 'chart__bar chart__bar--today' : 'chart__bar';
        svg += `<g class="chart__group" data-i="${i}">`;
        svg += `<rect class="chart__hit" x="${cx - step / 2}" y="${padTop}" width="${step}" height="${plotH + padBottom}"/>`;
        svg += `<path class="${cls}" d="${barPath(x, y, bw, h, 4)}"/>`;
        if (d.current && hasVal) svg += `<text class="chart__label" x="${cx}" y="${y - 6}" text-anchor="middle">${d.value}${o.unit}</text>`;
        svg += `<text class="chart__axis" x="${cx}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>`;
        svg += '</g>';
      });
      svg += '</svg>';
      el.innerHTML = svg;

      const svgEl = el.querySelector('svg');
      el.querySelectorAll('.chart__group').forEach((g) => {
        const i = Number(g.dataset.i);
        const d = data[i];
        g.addEventListener('mouseenter', () => {
          const cx = W - padStart - step * (i + 0.5);
          const v = d.future ? 'لم تأتِ بعد' : d.value != null ? `<strong>${d.value}${o.unit}</strong>` : 'لا مهام محتسبة';
          showTip(el, svgEl, cx, yOf(d.future ? 0 : d.value || 0), W, `${esc(d.fullLabel || d.label)} — ${v}${d.meta ? ` <span style="opacity:.75">(${esc(d.meta)})</span>` : ''}`);
        });
        g.addEventListener('mouseleave', () => hideTip(el));
        if (o.onClick) g.addEventListener('click', () => o.onClick(d));
      });
    },

    line(el, data, opts) {
      const o = Object.assign({ height: 220, unit: '' }, opts);
      el.classList.add('chart');
      if (data.length < 1) { el.innerHTML = '<div class="chart-empty">سجّل وزنك لترى التطور هنا</div>'; return; }
      const W = Math.max(el.clientWidth || 600, 280);
      const H = o.height;
      const padTop = 20;
      const padBottom = 28;
      const padStart = 44;
      const padEnd = 40; // مساحة لتسمية آخر قيمة (على اليسار)
      const vals = data.map((d) => d.value);
      let min = Math.min(...vals);
      let max = Math.max(...vals);
      if (max - min < 2) { min -= 1; max += 1; }
      const pad = (max - min) * 0.15;
      min = Math.floor(min - pad);
      max = Math.ceil(max + pad);
      const plotW = W - padStart - padEnd;
      const plotH = H - padTop - padBottom;
      const xOf = (i) => (data.length === 1 ? W - padStart - plotW / 2 : W - padStart - (i / (data.length - 1)) * plotW);
      const yOf = (v) => padTop + plotH - ((v - min) / (max - min)) * plotH;

      let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="${NS}" role="img" aria-label="${esc(o.label || 'رسم خطي')}">`;
      svg += '<g class="chart__grid">';
      const ticks = [min, (min + max) / 2, max];
      ticks.forEach((t) => { svg += `<line x1="${padEnd}" x2="${W - padStart}" y1="${yOf(t)}" y2="${yOf(t)}"/>`; });
      svg += '</g><g class="chart__axis">';
      ticks.forEach((t) => { svg += `<text x="${W - 4}" y="${yOf(t) + 4}" text-anchor="end">${Math.round(t * 10) / 10}</text>`; });
      // تسميات المحور الأفقي: بحد أقصى 6
      const every = Math.max(1, Math.ceil(data.length / 6));
      data.forEach((d, i) => {
        if (i % every === 0 || i === data.length - 1) svg += `<text x="${xOf(i)}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>`;
      });
      svg += '</g>';

      const pts = data.map((d, i) => `${xOf(i)},${yOf(d.value)}`);
      if (data.length > 1) {
        svg += `<path class="chart__area" d="M${pts[0]} L${pts.join(' L')} L${xOf(data.length - 1)},${padTop + plotH} L${xOf(0)},${padTop + plotH} Z"/>`;
        svg += `<path class="chart__line" d="M${pts.join(' L')}"/>`;
      }
      svg += `<line class="chart__cross" x1="0" x2="0" y1="${padTop}" y2="${padTop + plotH}" visibility="hidden"/>`;
      // نقطة أخيرة مميزة + تسمية مباشرة
      const last = data.length - 1;
      svg += `<circle class="chart__dot" cx="${xOf(last)}" cy="${yOf(data[last].value)}" r="5"/>`;
      svg += `<text class="chart__label" x="${xOf(last)}" y="${yOf(data[last].value) - 10}" text-anchor="middle">${data[last].value}${esc(o.unit)}</text>`;
      svg += `<circle class="chart__dot chart__hover-dot" r="5" visibility="hidden"/>`;
      svg += `<rect class="chart__hit" x="${padEnd}" y="${padTop}" width="${plotW}" height="${plotH}"/>`;
      svg += '</svg>';
      el.innerHTML = svg;

      const svgEl = el.querySelector('svg');
      const cross = svgEl.querySelector('.chart__cross');
      const dot = svgEl.querySelector('.chart__hover-dot');
      const hit = svgEl.querySelector('.chart__hit');
      hit.addEventListener('mousemove', (e) => {
        const rect = svgEl.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * W;
        let best = 0;
        data.forEach((d, i) => { if (Math.abs(xOf(i) - x) < Math.abs(xOf(best) - x)) best = i; });
        const d = data[best];
        cross.setAttribute('x1', xOf(best));
        cross.setAttribute('x2', xOf(best));
        cross.setAttribute('visibility', 'visible');
        dot.setAttribute('cx', xOf(best));
        dot.setAttribute('cy', yOf(d.value));
        dot.setAttribute('visibility', 'visible');
        showTip(el, svgEl, xOf(best), yOf(d.value), W, `${esc(d.fullLabel || d.label)} — <strong>${d.value}${esc(o.unit)}</strong>`);
      });
      hit.addEventListener('mouseleave', () => {
        cross.setAttribute('visibility', 'hidden');
        dot.setAttribute('visibility', 'hidden');
        hideTip(el);
      });
    },

    ring(pct, opts) {
      const o = Object.assign({ size: 132, stroke: 12, caption: '' }, opts);
      const r = (o.size - o.stroke) / 2;
      const c = 2 * Math.PI * r;
      const off = c * (1 - Math.min(Math.max(pct, 0), 100) / 100);
      return `
        <div class="ring" style="width:${o.size}px;height:${o.size}px" role="img" aria-label="${pct}%">
          <svg width="${o.size}" height="${o.size}" viewBox="0 0 ${o.size} ${o.size}">
            <circle class="ring__track" cx="${o.size / 2}" cy="${o.size / 2}" r="${r}" fill="none" stroke-width="${o.stroke}"/>
            <circle class="ring__bar" cx="${o.size / 2}" cy="${o.size / 2}" r="${r}" fill="none" stroke-width="${o.stroke}"
              stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
          </svg>
          <div class="ring__label">
            <span class="ring__value">${pct}%</span>
            ${o.caption ? `<span class="ring__caption">${esc(o.caption)}</span>` : ''}
          </div>
        </div>`;
    },

    progress(opts) {
      const o = Object.assign({ label: '', pct: 0, meta: '', size: '' }, opts);
      return `
        <div class="progress ${o.size ? 'progress--' + o.size : ''}">
          ${o.label ? `<div class="progress__head"><span class="progress__label">${esc(o.label)}</span><span class="progress__value">${o.pct}%</span></div>` : ''}
          <div class="progress__track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${o.pct}" aria-label="${esc(o.label)}">
            <div class="progress__fill" style="width:${o.pct}%"></div>
          </div>
          ${o.meta ? `<div class="progress__meta">${esc(o.meta)}</div>` : ''}
        </div>`;
    },

    /** بلاطة رقم: أيقونة على بلاطة ملونة + عنوان + قيمة + ملاحظة */
    stat(icon, tone, label, value, meta) {
      return `
        <div class="stat-tile">
          <span class="tile tile--${tone || 'leaf'}">${G.icon(icon)}</span>
          <span class="stat-tile__label">${esc(label)}</span>
          <span class="stat-tile__value">${value}</span>
          ${meta ? `<span class="stat-tile__meta">${esc(meta)}</span>` : ''}
        </div>`;
    },

    hbars(el, rows) {
      if (!rows.length) { el.innerHTML = '<div class="chart-empty">لا توجد بيانات في هذه الفترة</div>'; return; }
      el.innerHTML = `<div class="hbars">${rows.map((r) => `
        <div class="hbar" title="${esc(r.name)}: ${r.pct}% (${esc(r.meta || '')})">
          <span class="hbar__name"><span class="cat-chip__dot" style="background:${esc(r.color)}"></span>${esc(r.icon || '')} ${esc(r.name)}</span>
          <span class="hbar__track"><span class="hbar__fill" style="width:${r.pct}%;display:block"></span></span>
          <span class="hbar__val">${r.pct}%</span>
        </div>`).join('')}</div>`;
    },
  };

  G.charts = charts;
})(window.Ghars = window.Ghars || {});
