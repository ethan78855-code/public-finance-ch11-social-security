/* =========================================================
   §05 對經濟行為的影響
   ========================================================= */
(function () {
  'use strict';
  const { P, fmt, chart, axes, axesH, crosshair, hoverable, roundedTop, showTip, range, setRange, toggle, btn, setText, setState } = window.CORE;
  const D = window.DATA, M = window.MODELS;

  /* ---------- 生命週期模型（圖 11.3–11.5） ---------- */
  function lifeCycle() {
    const st = { I0: 20, I1: 5, r: 10, T: 3, beta: 1 / 1.1, lower: false, rs: 2.5 };
    const c = chart('#chart-lifecycle', { label: '跨期預算限制與無異曲線（圖 11.3–11.5）', margin: { t: 30, r: 24, b: 52, l: 52 } }, api => {
      const { g, w, h } = api;
      const p = M.lifeCycle({ I0: st.I0, I1: st.I1, r: st.r / 100, T: st.T, beta: st.beta, rs: st.lower ? st.rs / 100 : st.r / 100 });
      api.state.p = p;
      const R = p.R;
      const xMax = Math.max(10, p.pvNoSS * 1.06), yMax = Math.max(10, p.pvNoSS * R * 1.06);
      const x = d3.scaleLinear().domain([0, xMax]).range([0, w]);
      const y = d3.scaleLinear().domain([0, yMax]).range([h, 0]);
      axes(api, x, y, { xTicks: 5, yTicks: 5, xFormat: v => '$' + v + 'K', yFormat: v => '$' + v + 'K', xLabel: '現在（工作期）消費 c₀', yLabel: '未來（退休期）消費 c₁' });
      api.svg.append('defs').append('clipPath').attr('id', 'lc-clip').append('rect').attr('width', w).attr('height', h);
      const plot = g.append('g').attr('clip-path', 'url(#lc-clip)');
      const M0 = p.pvNoSS, N1 = p.pvNoSS * R;
      // 無異曲線
      const curve = (U, cls) => {
        const xs = d3.range(xMax / 300, xMax, xMax / 300);
        const pts = xs.map(c0 => ({ c0, c1: p.icurve(U, c0) })).filter(d => d.c1 < yMax * 2);
        plot.append('path').datum(pts).attr('class', cls).attr('d', d3.line().x(d => x(d.c0)).y(d => y(d.c1)));
      };
      const U1 = p.utility(p.E1.x, p.E1.y);
      curve(U1 - 0.3, 'indiff is-dimmed');
      curve(U1, 'indiff');
      curve(U1 + 0.3, 'indiff is-dimmed');
      plot.append('line').attr('class', 'budget-line').attr('x1', x(0)).attr('y1', y(N1)).attr('x2', x(M0)).attr('y2', y(0));
      if (st.lower) {
        plot.append('line').attr('class', 'budget-line budget-line--alt').attr('x1', x(0)).attr('y1', y(p.pvSS * R)).attr('x2', x(p.pvSS)).attr('y2', y(0));
        curve(p.utility(p.E2.x, p.E2.y), 'indiff line--dash');
      }
      g.append('text').attr('class', 'point-label').attr('x', 8).attr('y', Math.max(14, y(N1) + 16)).text('M');
      g.append('text').attr('class', 'point-label').attr('x', Math.min(w - 4, x(M0) - 6)).attr('y', h - 8).attr('text-anchor', 'end').text('N');
      // 引導線
      const vguide = pt => plot.append('line').attr('class', 'ref-line').attr('x1', x(pt.x)).attr('x2', x(pt.x)).attr('y1', y(pt.y)).attr('y2', h);
      vguide(p.A); vguide(p.E1);
      if (st.T > 0) {
        vguide(p.Rpt);
        plot.append('path').attr('class', 'annot-line').attr('d', `M${x(p.A.x)},${y(p.A.y)} H${x(p.Rpt.x)} V${y(p.Rpt.y)}`).style('stroke-dasharray', '4 3');
        g.append('text').attr('class', 'annot annot--strong halo').attr('x', (x(p.A.x) + x(p.Rpt.x)) / 2).attr('y', y(p.A.y) + 16).attr('text-anchor', 'middle').text('−T');
        g.append('text').attr('class', 'annot annot--strong halo').attr('x', x(p.Rpt.x) - 6).attr('y', (y(p.A.y) + y(p.Rpt.y)) / 2 + 4).attr('text-anchor', 'end').text(st.lower ? '+(1+rₛ)T' : '+(1+r)T');
      }
      // 儲蓄區間（貼著 x 軸）
      const span = (x1, x2, yy, label, cls) => {
        if (Math.abs(x2 - x1) < 0.01) return;
        const a = x(Math.min(x1, x2)), b = x(Math.max(x1, x2));
        g.append('line').attr('class', 'line ' + cls).attr('x1', a).attr('x2', b).attr('y1', yy).attr('y2', yy).style('stroke-width', 5);
        if (!api.mobile) g.append('text').attr('class', 'annot halo').attr('x', (a + b) / 2).attr('y', yy - 8).attr('text-anchor', 'middle').text(label);
      };
      span(p.E1.x, p.A.x, h - 40, '原本的儲蓄', 'series-1');
      if (st.T > 0) span(st.lower ? p.E2.x : p.E1.x, p.Rpt.x, h - 14, '有社安後的私人儲蓄', 'neg');
      // 點
      const pts = [{ k: 'A', pt: p.A, cls: 'point', t: '稟賦點 A：不借也不存' }];
      if (st.T > 0) pts.push({ k: 'R', pt: p.Rpt, cls: 'point', t: '有社安後的稟賦點 R' });
      pts.push({ k: 'E₁', pt: p.E1, cls: 'point point--opt', t: '效用最大的消費組合 E₁' });
      if (st.lower) pts.push({ k: 'E₂', pt: p.E2, cls: 'point', t: '社安報酬較低時的最適點 E₂' });
      const node = g.selectAll('g.lcpt').data(pts).join('g').attr('class', 'lcpt').attr('transform', d => `translate(${x(d.pt.x)},${y(d.pt.y)})`);
      node.append('circle').attr('r', 14).attr('data-hit', '');
      node.append('circle').attr('class', d => d.cls).attr('r', 6.5);
      node.append('text').attr('class', 'point-label halo').attr('x', 10).attr('y', -10).text(d => d.k);
      hoverable(node, d => ({ title: d.t, rows: [{ value: '$' + d.pt.x.toFixed(2) + 'K', label: 'c₀ 現在' }, { value: '$' + d.pt.y.toFixed(2) + 'K', label: 'c₁ 未來' }] }));
    });
    function readout() {
      const p = c.state.p;
      const crowd = p.saveBefore - p.saveAfter;
      setText('lc-c0', '$' + fmt.int(p.E1.x * 1000));
      setText('lc-save0', '$' + fmt.int(p.saveBefore * 1000));
      setText('lc-save1', '$' + fmt.int(p.saveAfter * 1000));
      setText('lc-crowd', '$' + fmt.int(crowd * 1000));
      setState('lc-save0', p.saveBefore < 0 ? 'neg' : null);
      setText('lc-msg', st.lower
        ? `社安的隱含報酬率（${st.rs}%）低於市場利率（${st.r}%）：預算線往內移（虛線），終身消費機會縮小——此時社安對 Liang 是淨負擔，而不只是「換個地方存錢」。`
        : st.T > 0
          ? `社安把稟賦點從 A 移到 R，但仍在同一條預算線 MN 上，所以最適點 E₁ 不變。Liang 把 $${fmt.int(st.T * 1000)} 的社安稅當成儲蓄，自己少存 $${fmt.int(crowd * 1000)}——這就是「財富替代效果」。`
          : '把社安稅 T 調大，看稟賦點如何沿著預算線移動。');
      setState('lc-msg', st.lower ? 'neg' : null);
    }
    const rerun = () => { c.render(); readout(); };
    range('lc-i0', v => { st.I0 = v; rerun(); }, v => '$' + v + 'K');
    range('lc-i1', v => { st.I1 = v; rerun(); }, v => '$' + v + 'K');
    range('lc-r', v => { st.r = v; rerun(); }, v => v + '%');
    range('lc-t', v => { st.T = v; rerun(); }, v => '$' + v + 'K');
    range('lc-rs', v => { st.rs = v; rerun(); }, v => v + '%');
    const tg = toggle('lc-lower', on => {
      st.lower = on;
      const wrap = document.getElementById('lc-rs-wrap');
      if (wrap) wrap.hidden = !on;
      rerun();
    });
    btn('lc-q8', () => {
      if (tg && tg.checked) { tg.checked = false; tg.dispatchEvent(new Event('change')); }
      setRange('lc-i0', 20); setRange('lc-i1', 5); setRange('lc-r', 10); setRange('lc-t', 3);
    });
    readout();
  }

  /* ---------- 三種效果的拔河 ---------- */
  function savingTug() {
    const st = { ws: 7, re: 3, be: 2 };
    const c = chart('#chart-tug', { label: '社會安全對儲蓄的三種效果', margin: { t: 8, r: 48, b: 28, l: 104 }, marginMobile: { l: 92, r: 40 } }, api => {
      const { g, w, h } = api;
      const net = -st.ws + st.re + st.be;
      const data = [
        { k: '財富替代效果', v: -st.ws },
        { k: '退休效果', v: st.re },
        { k: '遺產效果', v: st.be },
        { k: '淨效果', v: net, net: true }
      ];
      const x = d3.scaleLinear().domain([-10, 10]).range([0, w]);
      const y = d3.scaleBand().domain(data.map(d => d.k)).range([0, h]).padding(0.28);
      axesH(api, x, y, { xTicks: 5, xFormat: v => v > 0 ? '+' + v : String(v).replace('-', '−') });
      g.append('rect').attr('class', 'band').attr('x', 0).attr('width', w).attr('y', y('淨效果') - 4).attr('height', y.bandwidth() + 8);
      const bars = g.selectAll('rect.b').data(data).join('rect')
        .attr('class', d => 'b bar ' + (d.v >= 0 ? 'pos' : 'neg'))
        .attr('x', d => Math.min(x(0), x(d.v))).attr('width', d => Math.max(1, Math.abs(x(d.v) - x(0)))).attr('y', d => y(d.k)).attr('height', y.bandwidth()).attr('rx', 3);
      g.selectAll('text.v').data(data).join('text').attr('class', d => 'annot-num' + (d.net ? '' : ''))
        .attr('x', d => d.v >= 0 ? x(d.v) + 6 : x(d.v) - 6).attr('text-anchor', d => d.v >= 0 ? 'start' : 'end')
        .attr('y', d => y(d.k) + y.bandwidth() / 2 + 5).text(d => (d.v > 0 ? '+' : d.v < 0 ? '−' : '') + Math.abs(d.v));
      hoverable(bars, d => ({ title: d.k, rows: [{ value: (d.v > 0 ? '+' : '') + d.v, label: d.v >= 0 ? '使儲蓄增加' : '使儲蓄減少', color: d.v >= 0 ? P.pos : P.neg }] }));
    });
    function readout() {
      const net = -st.ws + st.re + st.be;
      setText('tug-net', (net > 0 ? '+' : net < 0 ? '−' : '') + Math.abs(net));
      setState('tug-net', net < 0 ? 'neg' : net > 0 ? 'pos' : null);
      setText('tug-msg', net < 0 ? '淨效果為負：社會安全降低了私人儲蓄——多數實證研究的結論也是如此，只是幅度仍有爭議。' : net > 0 ? '淨效果為正：退休效果與遺產效果壓過了財富替代效果。' : '三股力量恰好互相抵銷。');
    }
    range('tug-ws', v => { st.ws = v; c.render(); readout(); }, v => '−' + v);
    range('tug-re', v => { st.re = v; c.render(); readout(); }, v => '+' + v);
    range('tug-be', v => { st.be = v; c.render(); readout(); }, v => '+' + v);
    btn('tug-reset', () => { setRange('tug-ws', 7); setRange('tug-re', 3); setRange('tug-be', 2); });
    range('ab-w', v => {
      setText('ab-out', '$' + fmt.int(v * 0.4));
      setText('ab-left', '$' + fmt.int(v * 0.6));
    }, v => '$' + fmt.int(v));
  }

  /* ---------- 65 歲以上男性勞動參與率 ---------- */
  function lfpr() {
    chart('#chart-lfpr', { label: '65 歲以上男性勞動參與率', margin: { t: 30, r: 24, b: 36, l: 44 } }, api => {
      const { g, w, h } = api;
      const data = D.lfpr;
      const x = d3.scaleLinear().domain([1925, 2015]).range([0, w]);
      const y = d3.scaleLinear().domain([0, 60]).range([h, 0]);
      axes(api, x, y, { xFormat: d3.format('d'), xTicks: 5, yFormat: v => v + '%', yTicks: 4, yLabel: '勞動參與率' });
      g.append('line').attr('class', 'marker-line').attr('x1', x(1935)).attr('x2', x(1935)).attr('y1', 20).attr('y2', h);
      g.append('text').attr('class', 'annot annot--accent halo').attr('x', x(1935) + 6).attr('y', 16).text('1935 社會安全法');
      g.append('path').datum(data).attr('class', 'line series-1').attr('d', d3.line().x(d => x(d.year)).y(d => y(d.v)));
      const dots = g.selectAll('circle.pt').data(data).join('circle').attr('class', 'pt dot series-1').attr('cx', d => x(d.year)).attr('cy', d => y(d.v)).attr('r', 6);
      g.selectAll('text.v').data(data).join('text').attr('class', 'annot-num halo').attr('x', d => x(d.year)).attr('y', d => y(d.v) - 14)
        .attr('text-anchor', (d, i) => i === data.length - 1 ? 'end' : 'middle').text(d => d.year + '：' + d.v + '%');
      hoverable(dots, d => ({ title: d.year + ' 年', rows: [{ value: d.v + '%', label: '65 歲以上男性勞參率', color: P.s1 }] }));
    });
  }

  /* ---------- Adiba 的抉擇：幾歲請領最划算？ ---------- */
  function bestClaim() {
    const st = { death: 85, disc: 3 };
    const nraAge = 66;
    const c = chart('#chart-bestclaim', { label: '不同請領年齡的社安財富', margin: { t: 30, r: 16, b: 36, l: 52 } }, api => {
      const { g, w, h } = api;
      const ages = d3.range(62, 71);
      const pv = a => M.claimWealth(a, st.death, nraAge, st.disc / 100, 1000) / 1000;
      const base = pv(62);
      const data = ages.map(a => ({ a, pv: pv(a), v: pv(a) - base }));
      const best = data.reduce((b, d) => d.v > b.v + 1e-9 ? d : b, data[0]);
      api.state.best = best;
      const x = d3.scaleBand().domain(ages).range([0, w]).padding(0.28);
      const ext = Math.max(5, d3.max(data, d => Math.abs(d.v)) * 1.2);
      const y = d3.scaleLinear().domain([Math.min(-ext * 0.25, d3.min(data, d => d.v) * 1.2), Math.max(ext * 0.25, d3.max(data, d => d.v) * 1.25)]).nice().range([h, 0]);
      axes(api, x, y, { xBand: true, xFormat: v => v + (api.mobile ? '' : '歲'), yFormat: v => (v > 0 ? '+$' : v < 0 ? '−$' : '$') + Math.abs(v) + 'K', yTicks: 5, zero: true, yLabel: '和 62 歲就領相比，社安財富增減（現值）' });
      const bars = g.selectAll('rect.bar').data(data.filter(d => d.a > 62)).join('rect')
        .attr('class', d => 'bar ' + (d.v >= 0 ? 'pos' : 'neg'))
        .attr('x', d => x(d.a)).attr('width', x.bandwidth())
        .attr('y', d => Math.min(y(0), y(d.v))).attr('height', d => Math.max(1.5, Math.abs(y(d.v) - y(0)))).attr('rx', 3)
        .style('opacity', d => d === best ? 1 : 0.6);
      g.append('text').attr('class', 'annot halo').attr('x', x(62) + x.bandwidth() / 2).attr('y', y(0) - 8).attr('text-anchor', 'middle').text('基準');
      if (best.a > 62) g.append('text').attr('class', 'annot annot--strong halo').attr('x', x(best.a) + x.bandwidth() / 2).attr('y', y(best.v) - 8).attr('text-anchor', 'middle').text('最划算');
      hoverable(bars, d => ({ title: d.a + ' 歲開始請領', rows: [{ value: (d.v >= 0 ? '+$' : '−$') + fmt.int(Math.abs(d.v * 1000)), label: '比 62 歲就領', color: d.v >= 0 ? P.pos : P.neg }, { value: '$' + fmt.int(d.pv * 1000), label: '社安財富（現值）' }, { value: fmt.pct(M.claimFactor(d.a, nraAge)), label: '每月給付占 PIA' }] }));
    });
    function readout() {
      const b = c.state.best.a;
      setText('bc-best', b + ' 歲');
      setText('bc-msg', b <= 62
        ? '預期壽命短：越早領越划算——多領幾年，比每月多一點更重要。'
        : b >= 70 ? '預期壽命長：延後請領讓每月給付永久提高，划算得多。' : '預期壽命中等：在中間年齡開始請領，給付現值最高。');
    }
    range('bc-death', v => { st.death = v; c.render(); readout(); }, v => v + ' 歲');
    range('bc-disc', v => { st.disc = v; c.render(); readout(); }, v => v.toFixed(1) + '%');
  }

  window.SECTIONS = window.SECTIONS || [];
  window.SECTIONS.push(lifeCycle, savingTug, lfpr, bestClaim);
})();
