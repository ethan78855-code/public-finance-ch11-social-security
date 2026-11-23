/* =========================================================
   §03 制度結構
   ========================================================= */
(function () {
  'use strict';
  const { P, fmt, chart, axes, axesH, crosshair, hoverable, showTip, range, setRange, seg, btn, setText } = window.CORE;
  const D = window.DATA, M = window.MODELS;

  /* ---------- 隨收隨付 vs 完全提存：資金流向 ---------- */
  function fundingFlow() {
    let mode = 'payg';
    const c = chart('#chart-flow', { label: '資金流向示意圖', margin: { t: 26, r: 8, b: 8, l: 8 } }, api => {
      const { g, w, h } = api;
      const boxW = Math.min(170, w * 0.36), boxH = 56;
      const xNow = w * 0.2, xFut = w * 0.8;
      const yTop = h * 0.2, yBot = h * 0.8;
      api.svg.append('defs').html('<marker id="arrow-flow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:var(--accent)"/></marker>');
      g.append('text').attr('class', 'annot annot--strong').attr('x', xNow).attr('y', -8).attr('text-anchor', 'middle').text('今天');
      g.append('text').attr('class', 'annot annot--strong').attr('x', xFut).attr('y', -8).attr('text-anchor', 'middle').text('30 年後');
      g.append('line').attr('class', 'ref-line').attr('x1', w / 2).attr('x2', w / 2).attr('y1', -4).attr('y2', h);
      const flows = mode === 'payg'
        ? [
          { d: `M${xNow},${yTop + boxH / 2} L${xNow},${yBot - boxH / 2 - 4}`, label: '今天的稅 → 今天的退休者', lx: xNow + 10, ly: h / 2, anchor: 'start' },
          { d: `M${xFut},${yTop + boxH / 2} L${xFut},${yBot - boxH / 2 - 4}`, label: '下一代的稅 → 你', lx: xFut - 10, ly: h / 2, anchor: 'end' }
        ]
        : [
          { d: `M${xNow + boxW / 2},${yTop} C${w / 2},${yTop} ${w / 2},${yBot} ${xFut - boxW / 2 - 4},${yBot}`, label: '', lx: 0, ly: 0 }
        ];
      flows.forEach(f => {
        g.append('path').attr('class', 'flow-line' + (window.CORE.reducedMotion() ? '' : ' is-flowing')).style('--c', 'var(--accent)')
          .attr('d', f.d).attr('marker-end', 'url(#arrow-flow)');
        if (f.label) g.append('text').attr('class', 'annot halo').attr('x', f.lx).attr('y', f.ly).attr('text-anchor', f.anchor).text(f.label);
      });
      if (mode === 'funded') {
        const n = g.append('g').attr('class', 'node node--accent').attr('transform', `translate(${w / 2 - 56},${h / 2 - 22})`);
        n.append('rect').attr('width', 112).attr('height', 44).attr('rx', 4);
        n.append('text').attr('x', 56).attr('y', 20).text('個人基金');
        n.append('text').attr('class', 'node__sub').attr('x', 56).attr('y', 36).text('本金 ＋ 利息');
      }
      const boxes = [
        { x: xNow, y: yTop, t: '現在的工作者', s: mode === 'payg' ? '繳薪資稅' : '把錢存進自己的帳戶', acc: false },
        { x: xNow, y: yBot, t: '現在的退休者', s: mode === 'payg' ? '領取給付' : '領回自己當年存的錢', acc: false },
        { x: xFut, y: yTop, t: '未來的工作者', s: mode === 'payg' ? '（下一代）繳稅' : '（下一代）', acc: false },
        { x: xFut, y: yBot, t: '今天的工作者退休', s: mode === 'payg' ? '靠下一代的稅' : '領回本金＋利息', acc: true }
      ];
      boxes.forEach(b => {
        const n = g.append('g').attr('class', 'node' + (b.acc ? ' node--accent' : '')).attr('transform', `translate(${b.x - boxW / 2},${b.y - boxH / 2})`);
        n.append('rect').attr('width', boxW).attr('height', boxH).attr('rx', 4);
        n.append('text').attr('x', boxW / 2).attr('y', 24).text(b.t);
        n.append('text').attr('class', 'node__sub').attr('x', boxW / 2).attr('y', 42).text(b.s);
      });
    });
    seg('fund', v => {
      mode = v; c.render();
      setText('flow-msg', v === 'payg'
        ? '隨收隨付：今天工作者繳的稅，直接付給今天的退休者；你退休時，則靠下一代的稅。1939 年起美國改採此制。1983 年後雖累積了信託基金（部分提存），本質上仍接近隨收隨付。'
        : '完全提存：每個人工作時把錢存進基金，累積本金與利息，退休後領回自己的錢。1935 年最初的設計就是這樣，但 1939 年就被放棄了。');
    });
  }

  /* ---------- PIA 計算機 ---------- */
  function piaCalc() {
    const st = { aime: 1600, view: 'amount' };
    const c = chart('#chart-pia', { label: 'AIME 與 PIA 的關係', margin: { t: 30, r: 20, b: 50, l: 56 } }, api => {
      const { g, w, h } = api;
      const xs = d3.range(0, 9001, 50);
      const x = d3.scaleLinear().domain([0, 9000]).range([0, w]);
      const amount = st.view === 'amount';
      const y = amount ? d3.scaleLinear().domain([0, 2600]).range([h, 0]) : d3.scaleLinear().domain([0, 1]).range([h, 0]);
      axes(api, x, y, { xFormat: v => '$' + d3.format(',')(v), xTicks: api.mobile ? 3 : 6, yFormat: amount ? (v => '$' + d3.format(',')(v)) : d3.format('.0%'), yTicks: 5, yLabel: amount ? '每月 PIA（美元）' : 'PIA ÷ AIME（替代率）', xLabel: 'AIME（平均指數化月所得）' });
      const bands = [[0, M.B1, '90%'], [M.B1, M.B2, '32%'], [M.B2, 9000, '15%']];
      bands.forEach((b, i) => {
        if (i === 1) g.append('rect').attr('class', 'band').attr('x', x(b[0])).attr('width', x(b[1]) - x(b[0])).attr('y', 0).attr('height', h);
        if (amount && (x(b[1]) - x(b[0])) > 130) g.append('text').attr('class', 'annot').attr('x', (x(b[0]) + x(b[1])) / 2).attr('y', 14).attr('text-anchor', 'middle').text('每多 $1 → 多領 ' + b[2].replace('%', '¢'));
      });
      [M.B1, M.B2].forEach(bp => {
        g.append('line').attr('class', 'ref-line').attr('x1', x(bp)).attr('x2', x(bp)).attr('y1', 22).attr('y2', h);
        g.append('circle').attr('class', 'dot neg').attr('cx', x(bp)).attr('cy', y(amount ? M.pia(bp).total : M.pia(bp).total / bp)).attr('r', 4.5);
        if (!api.mobile || bp === M.B2) g.append('text').attr('class', 'annot halo').attr('x', x(bp) + 5).attr('y', h - 8).text('折點 $' + d3.format(',')(bp));
      });
      const f = a => amount ? M.pia(a).total : (a > 0 ? M.pia(a).total / a : 0.9);
      g.append('path').datum(xs).attr('class', 'line series-1').attr('d', d3.line().x(a => x(a)).y(a => y(f(a))));
      const yy = y(f(st.aime));
      g.append('line').attr('class', 'annot-line').attr('x1', x(st.aime)).attr('x2', x(st.aime)).attr('y1', yy).attr('y2', h);
      g.append('line').attr('class', 'annot-line').attr('x1', 0).attr('x2', x(st.aime)).attr('y1', yy).attr('y2', yy);
      g.append('circle').attr('class', 'point point--opt').attr('cx', x(st.aime)).attr('cy', yy).attr('r', 7);
      crosshair(api, xs, x, (i, evt) => {
        const a = xs[i], p = M.pia(a).total;
        showTip(evt, 'AIME $' + d3.format(',')(a), [
          { value: '$' + fmt.int(p), label: '每月 PIA', color: P.s1 },
          { value: a > 0 ? fmt.pct(p / a) : '—', label: '替代率' }
        ]);
      });
    });
    function readout() {
      const r = M.pia(st.aime);
      setText('pia-out', '$' + fmt.int(r.total));
      setText('pia-ratio', st.aime > 0 ? fmt.pct(r.total / st.aime) : '—');
      setText('pia-f1', '$' + fmt.int(r.parts[0]));
      setText('pia-f2', '$' + fmt.int(r.parts[1]));
      setText('pia-f3', '$' + fmt.int(r.parts[2]));
      const tier = st.aime <= M.B1 ? '第一級距：每多 $1 AIME，多領 $0.90。' : st.aime <= M.B2 ? '第二級距：超過 $767 的部分，每多 $1 只多領 $0.32。' : '第三級距：超過 $4,624 的部分，每多 $1 只多領 $0.15。';
      setText('pia-msg', `AIME 落在${tier}所以低所得者的替代率較高——給付公式本身就有重分配效果。`);
    }
    range('pia-aime', v => { st.aime = v; c.render(); readout(); }, v => '$' + d3.format(',')(v));
    seg('pia-view', v => { st.view = v; c.render(); });
    btn('pia-ex1', () => setRange('pia-aime', 200));
    btn('pia-ex2', () => setRange('pia-aime', 1600));
    btn('pia-ex3', () => setRange('pia-aime', 8000));
  }

  /* ---------- 請領年齡 ---------- */
  function claimAge() {
    const st = { birth: 1960, age: 62 };
    const c = chart('#chart-claim', { label: '請領年齡與每月給付', margin: { t: 30, r: 20, b: 36, l: 48 } }, api => {
      const { g, w, h } = api;
      const n = M.nra(st.birth);
      const xs = d3.range(62, 70.0001, 1 / 12);
      const x = d3.scaleLinear().domain([62, 70]).range([0, w]);
      const y = d3.scaleLinear().domain([0.6, 1.4]).range([h, 0]);
      axes(api, x, y, { xFormat: v => v + '歲', xTicks: 8, yFormat: d3.format('.0%'), yTicks: 4, yLabel: '每月給付占 PIA 的比例' });
      g.append('line').attr('class', 'zero-line').attr('x1', 0).attr('x2', w).attr('y1', y(1)).attr('y2', y(1));
      g.append('line').attr('class', 'ref-line').attr('x1', x(n)).attr('x2', x(n)).attr('y1', 20).attr('y2', h);
      g.append('text').attr('class', 'annot halo').attr('x', x(n) + (n > 66.5 ? -5 : 5)).attr('y', 14).attr('text-anchor', n > 66.5 ? 'end' : 'start').text('正常退休年齡 ' + fmt.age(n));
      const area = d3.area().x(a => x(a)).y0(y(1)).y1(a => y(M.claimFactor(a, n)));
      g.append('path').datum(xs.filter(a => a <= n + 1e-9)).attr('class', 'gap-area').attr('d', area);
      g.append('path').datum(xs.filter(a => a >= n - 1e-9)).attr('class', 'surplus-area').attr('d', area);
      g.append('path').datum(xs).attr('class', 'line series-1').attr('d', d3.line().x(a => x(a)).y(a => y(M.claimFactor(a, n))));
      const f = M.claimFactor(st.age, n);
      g.append('circle').attr('class', 'point point--opt').attr('cx', x(st.age)).attr('cy', y(f)).attr('r', 7);
      g.append('text').attr('class', 'annot-num halo').attr('x', x(st.age) + (st.age > 68 ? -12 : 12)).attr('y', y(f) - 10)
        .attr('text-anchor', st.age > 68 ? 'end' : 'start').text(fmt.pct(f, 1));
      crosshair(api, xs, x, (i, evt) => {
        const a = xs[i];
        showTip(evt, fmt.age(a) + '請領', [{ value: fmt.pct(M.claimFactor(a, n)), label: '占 PIA', color: P.s1 }]);
      });
    });
    function readout() {
      const n = M.nra(st.birth), f = M.claimFactor(st.age, n);
      setText('ca-nra', fmt.age(n));
      setText('ca-factor', fmt.pct(f, 1));
      setText('ca-benefit', '$' + fmt.int(1000 * f));
      const diff = f - 1;
      setText('ca-msg', Math.abs(diff) < 1e-9
        ? '在正常退休年齡請領：拿到 100% 的 PIA。'
        : diff < 0
          ? `提前請領：每月給付「永久」減少 ${fmt.pct(-diff, 1)}。減幅的設計，讓平均餘命的人「多領的年數」剛好抵銷「每月少領的金額」。`
          : `延後請領：每延後一年加 8%，每月給付永久增加 ${fmt.pct(diff, 1)}。`);
    }
    range('ca-birth', v => { st.birth = v; c.render(); readout(); }, v => v + ' 年');
    range('ca-age', v => { st.age = v; c.render(); readout(); }, v => fmt.age(v));
    btn('ca-62', () => setRange('ca-age', 62));
    btn('ca-nra-btn', () => setRange('ca-age', Math.round(M.nra(st.birth) * 12) / 12));
    btn('ca-70', () => setRange('ca-age', 70));
  }

  /* ---------- 配偶給付 ---------- */
  function spouse() {
    const st = { k: 2000, hh: 600 };
    const c = chart('#chart-spouse', { label: '夫妻的社會安全給付', margin: { t: 16, r: 64, b: 30, l: 84 } }, api => {
      const { g, w, h } = api;
      const spousal = 0.5 * st.k;
      const henry = Math.max(st.hh, spousal);
      const rows = [
        { who: 'Katherine', parts: [{ v: st.k, cls: 'series-1', t: '自己的 PIA', c: P.s1 }] },
        { who: 'Henry', parts: [{ v: Math.min(henry, spousal), cls: 'series-2', t: '配偶給付（Katherine 的 50%）', c: P.s2 }, { v: Math.max(0, st.hh - spousal), cls: 'series-4', t: '自己工作「多」換到的部分', c: P.s4 }] }
      ];
      const x = d3.scaleLinear().domain([0, 3200]).range([0, w]);
      const y = d3.scaleBand().domain(rows.map(r => r.who)).range([0, h]).padding(0.32);
      axesH(api, x, y, { xTicks: api.mobile ? 3 : 6, xFormat: v => '$' + d3.format(',')(v) });
      rows.forEach(r => {
        let x0 = 0;
        const parts = r.parts.filter(p => p.v > 0);
        parts.forEach((p, i) => {
          const bw = Math.max(0, x(x0 + p.v) - x(x0) - (i < parts.length - 1 ? 2 : 0));
          const rect = g.append('rect').datum(p).attr('class', 'bar ' + p.cls).attr('x', x(x0)).attr('y', y(r.who)).attr('width', bw).attr('height', y.bandwidth()).attr('rx', 3);
          hoverable(rect, d => ({ title: r.who, rows: [{ value: '$' + fmt.int(d.v), label: d.t, color: d.c }] }));
          x0 += p.v;
        });
        g.append('text').attr('class', 'annot-num').attr('x', x(x0) + 8).attr('y', y(r.who) + y.bandwidth() / 2 + 5).text('$' + fmt.int(x0));
      });
    });
    function readout() {
      const spousal = 0.5 * st.k;
      setText('sp-total', '$' + fmt.int(st.k + Math.max(st.hh, spousal)));
      setText('sp-gain', '$' + fmt.int(Math.max(0, st.hh - spousal)));
      setText('sp-surv', '$' + fmt.int(Math.max(st.k, st.hh)));
      setText('sp-msg', st.hh <= spousal
        ? `Henry 自己的 PIA（$${fmt.int(st.hh)}）不到 Katherine 的一半（$${fmt.int(spousal)}）：他繳了一輩子薪資稅，退休給付卻跟「完全沒工作」一樣。`
        : `Henry 自己的 PIA 比配偶給付高，但他工作只「多」換到 $${fmt.int(st.hh - spousal)}——所以雙薪家庭比同所得的單薪家庭吃虧。`);
    }
    range('sp-k', v => { st.k = v; c.render(); readout(); }, v => '$' + d3.format(',')(v));
    range('sp-h', v => { st.hh = v; c.render(); readout(); }, v => '$' + d3.format(',')(v));
  }

  /* ---------- 表 11.1 稅率與課稅上限 ---------- */
  function taxHistory() {
    let mode = 'rate';
    const c = chart('#chart-taxhist', { label: '表 11.1 社會安全稅率', margin: { t: 30, r: 20, b: 36, l: 52 } }, api => {
      const { g, w, h } = api;
      const data = D.table111;
      const key = mode;
      const x = d3.scaleLinear().domain([1935, 2014]).range([0, w]);
      const y = d3.scaleLinear().domain([0, key === 'rate' ? 14 : 120000]).range([h, 0]);
      axes(api, x, y, { xFormat: d3.format('d'), xTicks: api.mobile ? 4 : 8, yTicks: 4, yFormat: key === 'rate' ? (v => v + '%') : (v => '$' + d3.format('~s')(v)), yLabel: key === 'rate' ? '勞雇合計稅率（%）' : '最高課稅所得（美元）' });
      const pts = data.concat([{ year: 2014, rate: 12.4, cap: 110100 }]);
      g.append('path').datum(pts).attr('class', 'line line--step series-1').attr('d', d3.line().x(d => x(d.year)).y(d => y(d[key])).curve(d3.curveStepAfter));
      const dots = g.selectAll('circle.pt').data(data).join('circle').attr('class', 'pt dot series-1')
        .attr('cx', d => x(d.year)).attr('cy', d => y(d[key])).attr('r', 5);
      hoverable(dots, d => ({ title: d.year + ' 年', rows: [{ value: d.rate.toFixed(2) + '%', label: '合計稅率' }, { value: '$' + d3.format(',')(d.cap), label: '最高課稅所得' }] }));
      const last = data[data.length - 1];
      g.append('text').attr('class', 'annot annot--strong halo').attr('x', x(last.year)).attr('y', y(last[key]) - 12).attr('text-anchor', 'end')
        .text(key === 'rate' ? '12.4%（勞雇各 6.2%）' : '2012：$110,100');
      if (key === 'rate') g.append('text').attr('class', 'annot halo').attr('x', x(1937) + 6).attr('y', y(2) - 10).text('1937：2%');
    });
    seg('taxhist', v => { mode = v; c.render(); });
  }

  /* ---------- 薪資稅負擔 vs 薪資（上限造成累退） ---------- */
  function taxByWage() {
    const st = { wage: 50000 };
    const c = chart('#chart-taxwage', { label: '平均薪資稅率與年薪', margin: { t: 30, r: 20, b: 50, l: 48 } }, api => {
      const { g, w, h } = api;
      const xs = d3.range(5000, 400001, 2500);
      const x = d3.scaleLinear().domain([0, 400000]).range([0, w]);
      const y = d3.scaleLinear().domain([0, 0.17]).range([h, 0]);
      axes(api, x, y, { xFormat: v => '$' + d3.format('~s')(v), xTicks: api.mobile ? 4 : 8, yFormat: d3.format('.0%'), yTicks: 4, yLabel: '平均薪資稅率（勞雇合計）', xLabel: '年薪' });
      g.append('path').datum(xs).attr('class', 'line line--dash series-4').attr('d', d3.line().x(v => x(v)).y(v => y(M.payrollTax(v).avg)));
      g.append('path').datum(xs).attr('class', 'line series-1').attr('d', d3.line().x(v => x(v)).y(v => y(M.payrollTax(v).ss / v)));
      g.append('line').attr('class', 'ref-line').attr('x1', x(D.cap2012)).attr('x2', x(D.cap2012)).attr('y1', 20).attr('y2', h);
      g.append('text').attr('class', 'annot halo').attr('x', x(D.cap2012) + 5).attr('y', 14).text('課稅上限 $110,100');
      const xr = 390000;
      g.append('text').attr('class', 'series-label series-1 halo').attr('x', x(xr)).attr('y', y(M.payrollTax(xr).ss / xr) + 18).attr('text-anchor', 'end').text('社會安全稅');
      g.append('text').attr('class', 'series-label series-4 halo').attr('x', x(xr)).attr('y', y(M.payrollTax(xr).avg) - 8).attr('text-anchor', 'end').text('＋Medicare');
      const t = M.payrollTax(st.wage);
      g.append('circle').attr('class', 'point point--opt').attr('cx', x(st.wage)).attr('cy', y(t.ss / st.wage)).attr('r', 7);
      crosshair(api, xs, x, (i, evt) => {
        const v = xs[i], r = M.payrollTax(v);
        showTip(evt, '年薪 $' + d3.format(',')(v), [
          { value: fmt.pct(r.ss / v, 2), label: '社會安全稅', color: P.s1 },
          { value: fmt.pct(r.avg, 2), label: '含 Medicare', color: P.s4, dash: true }
        ]);
      });
    });
    function readout() {
      const t = M.payrollTax(st.wage);
      setText('tw-ss', '$' + fmt.int(t.ss));
      setText('tw-half', '$' + fmt.int(t.ss / 2));
      setText('tw-avg', fmt.pct(t.ss / st.wage, 2));
    }
    range('tw-wage', v => { st.wage = v; c.render(); readout(); }, v => '$' + d3.format(',')(v));
  }

  window.SECTIONS = window.SECTIONS || [];
  window.SECTIONS.push(fundingFlow, piaCalc, claimAge, spouse, taxHistory, taxByWage);
})();
