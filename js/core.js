/* =========================================================
   核心工具：顏色、工具提示、圖表骨架、控制項綁定
   設計系統：Fable「世代帳本」（css/style.css）
   ========================================================= */
window.CORE = (function () {
  'use strict';
  const root = document.documentElement;

  /* 圖表色票：一律用 CSS 變數，切換主題時 SVG 會自動跟著變 */
  const P = {
    s1: 'var(--chart-1)', s2: 'var(--chart-2)', s3: 'var(--chart-3)', s4: 'var(--chart-4)',
    pos: 'var(--chart-pos)', neg: 'var(--chart-neg)',
    hl: 'var(--accent)',                 // 互動中的「目前位置」記號
    hlFill: 'var(--chart-highlight)',    // 只能當底色
    hlInk: 'var(--chart-highlight-ink)',
    muted: 'var(--chart-muted)', ink: 'var(--chart-text-strong)', ink2: 'var(--chart-annot)',
    grid: 'var(--chart-grid)', surface: 'var(--chart-bg)', band: 'var(--chart-band)'
  };

  /* ---------- 格式化 ---------- */
  const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const fmt = {
    int: v => nf0.format(Math.round(v)).replace('-', '−'),
    one: v => nf1.format(v).replace('-', '−'),
    usd: v => (v < 0 ? '−$' : '$') + nf0.format(Math.abs(Math.round(v))),
    pct: (v, d = 1) => (v * 100).toFixed(d).replace('-', '−') + '%',
    age: v => {
      const y = Math.floor(v + 1e-9), m = Math.round((v - y) * 12);
      return m === 0 ? `${y} 歲` : `${y} 歲 ${m} 個月`;
    }
  };

  /* ---------- 工具提示（全頁共用一個 .tooltip） ---------- */
  let tipEl = null;
  function tip() {
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'tooltip';
      tipEl.setAttribute('role', 'status');
      tipEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  /* rows: [{label, value, color, dash}] — 文字一律用 textContent */
  function showTip(evt, title, rows) {
    const el = tip();
    el.textContent = '';
    if (title) {
      const t = document.createElement('div');
      t.className = 'tooltip__title';
      t.textContent = title;
      el.appendChild(t);
    }
    rows.forEach(r => {
      const row = document.createElement('div');
      row.className = 'tooltip__row';
      if (r.color) {
        const k = document.createElement('span');
        k.className = 'swatch ' + (r.dash ? 'swatch--dash' : 'swatch--line');
        k.style.setProperty('--c', r.color);
        row.appendChild(k);
      }
      const l = document.createElement('span');
      l.textContent = r.label || '';
      row.appendChild(l);
      const v = document.createElement('span');
      v.textContent = r.value;
      row.appendChild(v);
      el.appendChild(row);
    });
    el.classList.add('is-visible');
    placeTip(evt);
  }
  function placeTip(evt) {
    const el = tip();
    let x = 0, y = 0;
    const isFocus = evt && evt.type && (evt.type === 'focus' || evt.type === 'keydown');
    if (evt && evt.clientX != null && !isFocus) { x = evt.clientX; y = evt.clientY; }
    else if (evt && evt.target && evt.target.getBoundingClientRect) {
      const r = evt.target.getBoundingClientRect();
      x = r.left + r.width / 2; y = r.top + Math.min(r.height / 2, 40);
    }
    const w = el.offsetWidth, h = el.offsetHeight;
    let left = x + 14, top = y - h - 14;
    if (left + w > window.innerWidth - 8) left = x - w - 14;
    if (left < 8) left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2));
    if (top < 8) top = y + 20;
    if (top + h > window.innerHeight - 8) top = window.innerHeight - h - 8;
    el.style.left = left + 'px';
    el.style.top = top + 'px';
  }
  function hideTip() { if (tipEl) tipEl.classList.remove('is-visible'); }
  // 觸控：點圖外任何地方就收起
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest || !e.target.closest('.chart')) hideTip();
  }, { passive: true });
  window.addEventListener('scroll', () => { if (tipEl && tipEl.classList.contains('is-visible')) hideTip(); }, { passive: true });

  /* ---------- 圖表骨架：SVG 填滿 .chart 盒子，尺寸改變就重畫 ---------- */
  const registry = [];
  function chart(el, opts, draw) {
    if (typeof el === 'string') el = document.querySelector(el);
    if (!el) { console.warn('missing chart', opts && opts.label); return { render() {}, state: {} }; }
    const o = Object.assign({ margin: { t: 30, r: 20, b: 36, l: 48 } }, opts);
    const svg = d3.select(el).append('svg').attr('role', 'img');
    if (o.label) svg.attr('aria-label', o.label);
    const g = svg.append('g');
    const api = { el, svg, g, o, w: 0, h: 0, W: 0, H: 0, state: {} };
    api.render = function () {
      const W = Math.max(280, el.clientWidth || 600);
      const H = Math.max(180, el.clientHeight || Math.round(W * 0.56));
      const mobile = W < 520;
      const m = Object.assign({}, o.margin, mobile && o.marginMobile ? o.marginMobile : {});
      svg.attr('viewBox', `0 0 ${W} ${H}`).attr('width', W).attr('height', H);
      g.attr('transform', `translate(${m.l},${m.t})`);
      api.W = W; api.H = H; api.m = m; api.mobile = mobile;
      api.w = W - m.l - m.r; api.h = H - m.t - m.b;
      g.selectAll('*').remove();
      svg.selectAll('defs').remove();
      draw(api);
    };
    registry.push(api);
    api.render();
    let lastW = el.clientWidth, lastH = el.clientHeight;
    if ('ResizeObserver' in window) {
      let raf = 0;
      new ResizeObserver(() => {
        const cw = el.clientWidth, chh = el.clientHeight;
        if (Math.abs(cw - lastW) > 2 || Math.abs(chh - lastH) > 2) {
          lastW = cw; lastH = chh;
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => { hideTip(); api.render(); });
        }
      }).observe(el);
    }
    return api;
  }

  /* 坐標軸：x 軸畫基線；y 軸只留數字＋水平格線 */
  function axes(api, x, y, o = {}) {
    const { g, w, h } = api;
    const yAxis = d3.axisLeft(y).ticks(o.yTicks || 5).tickSize(-w).tickPadding(8);
    if (o.yFormat) yAxis.tickFormat(o.yFormat);
    const gy = g.append('g').attr('class', 'axis axis--y').call(yAxis);
    gy.select('.domain').remove();
    gy.selectAll('.tick line').attr('class', 'gridline');
    const xAxis = (o.xBand ? d3.axisBottom(x) : d3.axisBottom(x).ticks(o.xTicks || 6)).tickSizeOuter(0).tickPadding(8);
    if (o.xFormat) xAxis.tickFormat(o.xFormat);
    const gx = g.append('g').attr('class', 'axis axis--x').attr('transform', `translate(0,${h})`).call(xAxis);
    gx.selectAll('.tick line').attr('y2', 4);
    if (o.xLabel) {
      g.append('text').attr('class', 'axis-label').attr('x', w).attr('y', h + 40).attr('text-anchor', 'end').text(o.xLabel);
    }
    if (o.yLabel) {
      g.append('text').attr('class', 'axis-label').attr('x', -api.m.l + 2).attr('y', -12).attr('text-anchor', 'start').text(o.yLabel);
    }
    if (o.zero && y.domain()[0] < 0 && y.domain()[1] > 0) {
      g.append('line').attr('class', 'zero-line').attr('x1', 0).attr('x2', w).attr('y1', y(0)).attr('y2', y(0));
    }
    return { gx, gy };
  }
  /* 水平長條用：值在 x 軸（垂直格線），類別在 y 軸 */
  function axesH(api, x, y, o = {}) {
    const { g, w, h } = api;
    const xAxis = d3.axisBottom(x).ticks(o.xTicks || 5).tickSize(-h).tickPadding(6);
    if (o.xFormat) xAxis.tickFormat(o.xFormat);
    const gx = g.append('g').attr('class', 'axis axis--x').attr('transform', `translate(0,${h})`).call(xAxis);
    gx.select('.domain').remove();
    gx.selectAll('.tick line').attr('class', 'gridline');
    const gy = g.append('g').attr('class', 'axis axis--y axis--cat').call(d3.axisLeft(y).tickSize(0).tickPadding(10));
    gy.select('.domain').remove();
    if (x.domain()[0] < 0) g.append('line').attr('class', 'zero-line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', 0).attr('y2', h);
    return { gx, gy };
  }

  /* 折線圖十字準線：找最近的 x；鍵盤左右鍵可移動 */
  function crosshair(api, xs, x, onMove) {
    const { g, w, h } = api;
    const line = g.append('line').attr('class', 'crosshair').attr('y1', 0).attr('y2', h).style('opacity', 0);
    const overlay = g.append('rect').attr('data-hit', '').attr('width', w).attr('height', h)
      .attr('tabindex', 0).attr('role', 'slider')
      .attr('aria-label', '查看數值：移動游標，或用左右方向鍵');
    let idx = -1;
    function at(i, evt) {
      idx = Math.max(0, Math.min(xs.length - 1, i));
      const px = x(xs[idx]);
      line.attr('x1', px).attr('x2', px).style('opacity', 1);
      onMove(idx, evt);
    }
    function fromPointer(evt, node) {
      const [mx] = d3.pointer(evt, node);
      const xv = x.invert(mx);
      at(d3.bisector(d => d).center(xs, xv), evt);
    }
    overlay
      .on('pointermove', function (evt) { fromPointer(evt, this); })
      .on('pointerdown', function (evt) { fromPointer(evt, this); })
      .on('pointerleave', evt => { if (evt.pointerType !== 'touch') { line.style('opacity', 0); hideTip(); } })
      .on('keydown', function (evt) {
        if (evt.key === 'ArrowRight' || evt.key === 'ArrowLeft') {
          evt.preventDefault();
          at((idx < 0 ? 0 : idx) + (evt.key === 'ArrowRight' ? 1 : -1), evt);
        }
      })
      .on('focus', evt => at(idx < 0 ? xs.length - 1 : idx, evt))
      .on('blur', () => { line.style('opacity', 0); hideTip(); });
    return { line, overlay };
  }

  /* 長條/點的 hover、觸控與鍵盤 focus */
  function hoverable(sel, getTip, opt = {}) {
    if (opt.focus !== false) sel.attr('tabindex', 0);
    sel.style('cursor', 'pointer')
      .on('pointerenter pointermove pointerdown', function (evt, d) { const t = getTip(d); showTip(evt, t.title, t.rows); d3.select(this).classed('is-hover', true); })
      .on('pointerleave', function (evt) { if (evt.pointerType !== 'touch') hideTip(); d3.select(this).classed('is-hover', false); })
      .on('focus', function (evt, d) { const t = getTip(d); showTip(evt, t.title, t.rows); d3.select(this).classed('is-hover', true); })
      .on('blur', function () { hideTip(); d3.select(this).classed('is-hover', false); });
  }

  /* 只有上方圓角的長條（貼齊基線） */
  function roundedTop(x, y, w, h, r) {
    if (h <= 0) return '';
    r = Math.min(r, h, w / 2);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }

  /* ---------- 控制項 ---------- */
  function range(id, onInput, format) {
    const el = document.getElementById(id);
    if (!el) { console.warn('missing range', id); return null; }
    const out = document.querySelector(`output[for="${id}"]`);
    const update = () => {
      const v = parseFloat(el.value);
      const pct = (v - el.min) / (el.max - el.min) * 100;
      el.style.setProperty('--fill', pct + '%');
      if (out && format) out.textContent = format(v);
      if (format) el.setAttribute('aria-valuetext', format(v));
      onInput && onInput(v);
    };
    el.addEventListener('input', update);
    el._update = update;
    update();
    return el;
  }
  function setRange(id, v) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = v;
    el._update && el._update();
  }
  /* 分段按鈕或分頁：容器 [data-seg="name"] 內的 button[data-value] */
  function seg(name, onChange) {
    const wrap = document.querySelector(`[data-seg="${name}"]`);
    if (!wrap) { console.warn('missing seg', name); return null; }
    const btns = Array.from(wrap.querySelectorAll('button[data-value]'));
    const isTabs = wrap.classList.contains('tabs');
    function set(v, fire = true) {
      btns.forEach(b => {
        const on = b.dataset.value === String(v);
        if (isTabs) { b.setAttribute('aria-selected', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; }
        else b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      wrap.dataset.current = v;
      if (fire && onChange) onChange(v);
    }
    btns.forEach(b => b.addEventListener('click', () => set(b.dataset.value)));
    if (isTabs) {
      wrap.addEventListener('keydown', e => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const i = btns.findIndex(b => b.dataset.value === wrap.dataset.current);
        const n = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
        n.focus(); set(n.dataset.value);
      });
    }
    const init = (btns.find(b => b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true') || btns[0]).dataset.value;
    set(init, false);
    return { set, get: () => wrap.dataset.current };
  }
  function toggle(id, onChange) {
    const el = document.getElementById(id);
    if (!el) { console.warn('missing toggle', id); return null; }
    el.addEventListener('change', () => onChange(el.checked));
    return el;
  }
  function btn(id, onClick) {
    const el = document.getElementById(id);
    if (!el) { console.warn('missing button', id); return null; }
    el.addEventListener('click', onClick);
    return el;
  }
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el && el.textContent !== text) {
      el.textContent = text;
      if (el.classList.contains('readout__value')) {
        el.classList.remove('is-updated'); void el.offsetWidth; el.classList.add('is-updated');
      }
    }
  }
  /* 狀態：'pos' | 'neg' | null，套在 .readout 或 .verdict 上 */
  function setState(id, state) {
    const el = document.getElementById(id);
    if (!el) return;
    const target = el.closest('.readout') || el;
    target.classList.toggle('is-pos', state === 'pos');
    target.classList.toggle('is-neg', state === 'neg');
  }

  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return { P, fmt, showTip, hideTip, chart, axes, axesH, crosshair, hoverable, roundedTop, range, setRange, seg, toggle, btn, setText, setState, reducedMotion, registry };
})();
