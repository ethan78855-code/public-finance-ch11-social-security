/* =========================================================
   §06 長期壓力
   ========================================================= */
(function () {
  'use strict';
  const { P, fmt, chart, axes, crosshair, showTip, range, seg, setText, setState } = window.CORE;
  const D = window.DATA;

  function interp(series, yr) {
    for (let i = 0; i < series.length - 1; i++) {
      const [x0, y0] = series[i], [x1, y1] = series[i + 1];
      if (yr >= x0 && yr <= x1) return y0 + (y1 - y0) * (yr - x0) / (x1 - x0);
    }
    return series[series.length - 1][1];
  }

  /* ---------- 圖 11.6 收支預估 ---------- */
  function fig116() {
    let showGap = true;
    const c = chart('#chart-fig116', { label: '圖 11.6 社會安全收支占 GDP', margin: { t: 30, r: 20, b: 36, l: 44 } }, api => {
      const { g, w, h } = api;
      const yrs = d3.range(1990, 2091);
      const rows = yrs.map(y => ({ y, rev: interp(D.fig116.revenue, y), pay: interp(D.fig116.payment, y) }));
      const x = d3.scaleLinear().domain([1990, 2090]).range([0, w]);
      const y = d3.scaleLinear().domain([3, 7]).range([h, 0]);
      axes(api, x, y, { xFormat: d3.format('d'), xTicks: api.mobile ? 5 : 10, yFormat: v => v + '%', yTicks: 4, yLabel: '占 GDP 比重（%）' });
      g.append('rect').attr('class', 'band').attr('x', x(2011)).attr('y', 0).attr('width', w - x(2011)).attr('height', h);
      g.append('text').attr('class', 'annot').attr('x', x(2011) - 6).attr('y', h - 8).attr('text-anchor', 'end').text('歷史');
      g.append('text').attr('class', 'annot').attr('x', x(2011) + 6).attr('y', h - 8).text('預估 →');
      if (showGap) {
        g.append('path').datum(rows).attr('class', 'gap-area').attr('d', d3.area().x(d => x(d.y)).y0(d => y(d.rev)).y1(d => y(Math.max(d.rev, d.pay))).curve(d3.curveMonotoneX));
        g.append('path').datum(rows).attr('class', 'surplus-area').attr('d', d3.area().x(d => x(d.y)).y0(d => y(d.pay)).y1(d => y(Math.max(d.rev, d.pay))).curve(d3.curveMonotoneX));
        g.append('text').attr('class', 'annot annot--accent halo').attr('x', x(2062)).attr('y', y(5.38)).attr('text-anchor', 'middle').text('赤字：無限期持續');
        if (!api.mobile) g.append('text').attr('class', 'annot halo').attr('x', x(1997)).attr('y', y(5.25)).attr('text-anchor', 'middle').text('盈餘 → 信託基金');
      }
      const ln = k => d3.line().x(d => x(d.y)).y(d => y(d[k])).curve(d3.curveMonotoneX);
      g.append('path').datum(rows).attr('class', 'line series-1').attr('d', ln('pay'));
      g.append('path').datum(rows).attr('class', 'line line--dash series-2').attr('d', ln('rev'));
      g.append('text').attr('class', 'series-label series-1 halo').attr('x', x(2089)).attr('y', y(6.1) - 10).attr('text-anchor', 'end').text('給付支出');
      g.append('text').attr('class', 'series-label series-2 halo').attr('x', x(2089)).attr('y', y(4.55) + 20).attr('text-anchor', 'end').text('薪資稅收入');
      // 2033 信託基金用罄
      const mx = x(2033);
      g.append('line').attr('class', 'marker-line').attr('x1', mx).attr('x2', mx).attr('y1', 8).attr('y2', h);
      const flag = g.append('g').attr('class', 'marker-flag').attr('transform', `translate(${mx},${-14})`);
      const label = api.mobile ? '2033 基金用罄' : '2033 信託基金用罄';
      const fw = label.length * 11 + 14;
      flag.append('rect').attr('x', -fw / 2).attr('y', 0).attr('width', fw).attr('height', 20).attr('rx', 2);
      flag.append('text').attr('x', 0).attr('y', 14).attr('text-anchor', 'middle').text(label);
      const d1 = g.append('circle').attr('class', 'dot series-1').attr('r', 4.5).style('opacity', 0);
      const d2 = g.append('circle').attr('class', 'dot series-2').attr('r', 4.5).style('opacity', 0);
      crosshair(api, yrs, x, (i, evt) => {
        const r = rows[i];
        d1.attr('cx', x(r.y)).attr('cy', y(r.pay)).style('opacity', 1);
        d2.attr('cx', x(r.y)).attr('cy', y(r.rev)).style('opacity', 1);
        const gap = r.rev - r.pay;
        showTip(evt, r.y + (r.y > 2011 ? '（預估）' : ''), [
          { value: r.pay.toFixed(2) + '%', label: '給付支出', color: P.s1 },
          { value: r.rev.toFixed(2) + '%', label: '薪資稅收入', color: P.s2, dash: true },
          { value: (gap >= 0 ? '+' : '−') + Math.abs(gap).toFixed(2) + '%', label: gap >= 0 ? '盈餘' : '赤字', color: gap >= 0 ? P.pos : P.neg }
        ]);
      });
    });
    seg('fig116', v => { showGap = v === 'gap'; c.render(); });
  }

  /* ---------- t = (Nb/Nw) × (B/w)：人口老化的壓力 ---------- */
  function dependency() {
    const st = { year: 2012, mode: 'keepB', scen: 'us' };
    const scen = {
      us: { from: 2012, to: 2030, d0: 0.35, d1: 0.48, t0: 0.124, label: '美國' },
      uk: { from: 1990, to: 2050, d0: 0.267, d1: 0.458, t0: 0.124, label: '英國（課後題 3）' }
    };
    const dep = (s, yr) => s.d0 + (s.d1 - s.d0) * (yr - s.from) / (s.to - s.from);
    const c = chart('#chart-dep', { label: '扶養比上升的後果', margin: { t: 30, r: 24, b: 36, l: 48 } }, api => {
      const { g, w, h } = api;
      const s = scen[st.scen];
      const yrs = d3.range(s.from, s.to + 1);
      const rr0 = s.t0 / s.d0;
      const val = yr => st.mode === 'keepB' ? dep(s, yr) * rr0 : s.t0 / dep(s, yr);
      const x = d3.scaleLinear().domain([s.from, s.to]).range([0, w]);
      const vals = yrs.map(val);
      const lo = d3.min(vals), hi = d3.max(vals), pad = (hi - lo) * 0.25;
      const y = d3.scaleLinear().domain([Math.max(0, lo - pad), hi + pad]).nice().range([h, 0]);
      axes(api, x, y, { xFormat: d3.format('d'), xTicks: api.mobile ? 4 : 6, yFormat: d3.format('.0%'), yTicks: 4, yLabel: st.mode === 'keepB' ? '維持給付水準所需的薪資稅率 t' : '稅率不變時的替代率 B/w' });
      g.append('path').datum(yrs).attr('class', 'line ' + (st.mode === 'keepB' ? 'neg' : 'series-1')).attr('d', d3.line().x(v => x(v)).y(v => y(val(v))));
      const yr = Math.min(s.to, Math.max(s.from, st.year));
      g.append('circle').attr('class', 'point point--opt').attr('cx', x(yr)).attr('cy', y(val(yr))).attr('r', 7);
      const right = yr > (s.from + s.to) / 2;
      g.append('text').attr('class', 'annot-num halo').attr('x', x(yr) + (right ? -12 : 12)).attr('y', y(val(yr)) - 12).attr('text-anchor', right ? 'end' : 'start').text(fmt.pct(val(yr), 1));
      crosshair(api, yrs, x, (i, evt) => {
        const v = yrs[i];
        showTip(evt, String(v), [
          { value: dep(s, v).toFixed(3), label: '扶養比 Nb/Nw' },
          { value: (1 / dep(s, v)).toFixed(2) + ' 人', label: '每位退休者的工作者' },
          { value: fmt.pct(val(v), 1), label: st.mode === 'keepB' ? '所需稅率' : '替代率', color: st.mode === 'keepB' ? P.neg : P.s1 }
        ]);
      });
    });
    function update() {
      const s = scen[st.scen];
      const yr = Math.min(s.to, Math.max(s.from, st.year));
      const d = dep(s, yr), workers = 1 / d, rr0 = s.t0 / s.d0;
      window.CORE.picto('dep-picto', workers, ':');
      const box = document.getElementById('dep-picto');
      if (box) box.setAttribute('aria-label', `${yr} 年：每位退休者約由 ${workers.toFixed(1)} 位工作者支撐`);
      setText('dep-ratio', d.toFixed(2));
      setText('dep-workers', workers.toFixed(1));
      const need = st.mode === 'keepB' ? d * rr0 : s.t0 / d;
      setText('dep-need', fmt.pct(need, 1));
      setText('dep-need-label', st.mode === 'keepB' ? '維持替代率所需稅率' : '稅率不變時的替代率');
      setState('dep-need', (st.mode === 'keepB' ? need > s.t0 + 1e-4 : need < rr0 - 1e-4) ? 'neg' : null);
      setText('dep-live-d', d.toFixed(2));
      setText('dep-live-rr', fmt.pct(st.mode === 'keepB' ? rr0 : s.t0 / d, 1));
      setText('dep-live-t', fmt.pct(st.mode === 'keepB' ? d * rr0 : s.t0, 1));
      setText('dep-msg', st.mode === 'keepB'
        ? `${s.label}：扶養比由 ${s.d0} 升到 ${s.d1}。要維持同樣的替代率，稅率必須提高 ${((s.d1 / s.d0 - 1) * 100).toFixed(1)}%（${fmt.pct(s.t0, 1)} → ${fmt.pct(s.d1 * rr0, 1)}）。`
        : `${s.label}：若稅率固定在 ${fmt.pct(s.t0, 1)}，替代率將降為原本的 ${(s.d0 / s.d1 * 100).toFixed(1)}%（${fmt.pct(rr0, 1)} → ${fmt.pct(s.t0 / s.d1, 1)}）。`);
    }
    const yearEl = range('dep-year', v => { st.year = v; c.render(); update(); }, v => v + ' 年');
    seg('dep-mode', v => { st.mode = v; c.render(); update(); });
    seg('dep-scen', v => {
      st.scen = v;
      const s = scen[v];
      if (yearEl) {
        yearEl.min = s.from; yearEl.max = s.to; yearEl.value = s.to;
        const sc = document.getElementById('dep-scale');
        if (sc) { sc.children[0].textContent = s.from; sc.children[1].textContent = s.to; }
        yearEl._update();
      }
    });
  }

  window.SECTIONS = window.SECTIONS || [];
  window.SECTIONS.push(fig116, dependency);
})();
