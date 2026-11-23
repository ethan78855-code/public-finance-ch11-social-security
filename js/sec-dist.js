/* =========================================================
   §04 所得重分配與信託基金
   ========================================================= */
(function () {
  'use strict';
  const { P, fmt, chart, axes, axesH, crosshair, hoverable, showTip, range, setRange, seg, btn, setText, setState } = window.CORE;
  const D = window.DATA;

  /* 共用：畫象形圖（每位退休者由幾位工作者支撐） */
  function picto(boxId, workers, sepText) {
    const box = document.getElementById(boxId);
    if (!box) return;
    box.textContent = '';
    const n = Math.ceil(workers - 1e-9);
    for (let i = 0; i < n; i++) {
      const sp = document.createElement('span');
      sp.className = 'picto__p';
      const part = Math.min(1, workers - i);
      if (part < 0.999) { sp.classList.add('is-partial'); sp.style.setProperty('--part', part.toFixed(2)); }
      box.appendChild(sp);
    }
    const sep = document.createElement('span');
    sep.className = 'picto__sep';
    sep.textContent = sepText || ':';
    box.appendChild(sep);
    const r = document.createElement('span');
    r.className = 'picto__p is-retiree';
    box.appendChild(r);
  }
  window.CORE.picto = picto;

  /* ---------- 隨收隨付恆等式：t·Nw·w = Nb·B ---------- */
  function paygEquation() {
    const st = { t: 12.4, ratio: 2.9, w: 45 };
    function render() {
      const B = st.t / 100 * st.ratio * st.w;
      picto('pg-picto', st.ratio, '→');
      const box = document.getElementById('pg-picto');
      if (box) box.setAttribute('aria-label', `${st.ratio.toFixed(1)} 位工作者支撐 1 位退休者`);
      setText('pg-live-t', st.t.toFixed(1) + '%');
      setText('pg-live-r', st.ratio.toFixed(1));
      setText('pg-live-w', '$' + st.w + 'K');
      setText('pg-live-b', '$' + B.toFixed(1) + 'K');
      setText('pg-b', '$' + B.toFixed(1) + 'K');
      setText('pg-rr', fmt.pct(B / st.w, 1));
    }
    range('pg-t', v => { st.t = v; render(); }, v => v.toFixed(1) + '%');
    range('pg-ratio', v => { st.ratio = v; render(); }, v => v.toFixed(1) + ' 人');
    range('pg-w', v => { st.w = v; render(); }, v => '$' + v + 'K');
    btn('pg-2012', () => { setRange('pg-t', 12.4); setRange('pg-ratio', 2.9); });
    btn('pg-2030', () => { setRange('pg-t', 12.4); setRange('pg-ratio', 2.1); });
    render();
  }

  /* ---------- 隱含報酬率 = 工資成長 + 人口成長 ---------- */
  function implicitReturn() {
    const st = { gw: 1.5, gn: 1.0 };
    const c = chart('#chart-implicit', { label: '隨收隨付制的隱含報酬率', margin: { t: 8, r: 64, b: 28, l: 92 } }, api => {
      const { g, w, h } = api;
      const exact = ((1 + st.gw / 100) * (1 + st.gn / 100) - 1) * 100;
      const data = [
        { k: '工資成長', v: st.gw, cls: 'series-1', c: P.s1 },
        { k: '人口成長', v: st.gn, cls: 'series-2', c: P.s2 },
        { k: '隱含報酬率', v: exact, cls: exact >= 0 ? 'pos' : 'neg', c: exact >= 0 ? P.pos : P.neg }
      ];
      const x = d3.scaleLinear().domain([-2, 8]).range([0, w]);
      const y = d3.scaleBand().domain(data.map(d => d.k)).range([0, h]).padding(0.3);
      axesH(api, x, y, { xTicks: 5, xFormat: v => v + '%' });
      const bars = g.selectAll('rect.b').data(data).join('rect').attr('class', d => 'b bar ' + d.cls)
        .attr('x', d => Math.min(x(0), x(d.v))).attr('width', d => Math.max(1, Math.abs(x(d.v) - x(0)))).attr('y', d => y(d.k)).attr('height', y.bandwidth()).attr('rx', 3);
      g.selectAll('text.v').data(data).join('text').attr('class', 'annot-num')
        .attr('x', d => d.v >= 0 ? x(d.v) + 6 : x(d.v) - 6).attr('text-anchor', d => d.v >= 0 ? 'start' : 'end')
        .attr('y', d => y(d.k) + y.bandwidth() / 2 + 5).text(d => d.v.toFixed(2) + '%');
      hoverable(bars, d => ({ title: d.k, rows: [{ value: d.v.toFixed(3) + '%', color: d.c }] }));
    });
    function readout() {
      const exact = ((1 + st.gw / 100) * (1 + st.gn / 100) - 1) * 100;
      setText('ir-out', exact.toFixed(3) + '%');
      setState('ir-out', exact < 0 ? 'neg' : null);
    }
    range('ir-gw', v => { st.gw = v; c.render(); readout(); }, v => v.toFixed(1) + '%');
    range('ir-gn', v => { st.gn = v; c.render(); readout(); }, v => v.toFixed(1) + '%');
    btn('ir-book', () => { setRange('ir-gw', 1.5); setRange('ir-gn', 1.0); });
    btn('ir-aging', () => { setRange('ir-gw', 1.0); setRange('ir-gn', -0.5); });
  }

  /* ---------- 圖 11.2 社會安全財富（四種家庭型態） ---------- */
  function fig112() {
    const st = { hh: 'singleMale', on: { low: true, avg: true, high: true, max: true } };
    const cls = { low: 'series-1', avg: 'series-2', high: 'series-3 line--dash', max: 'series-4 line--dot' };
    const col = { low: P.s1, avg: P.s2, high: P.s3, max: P.s4 };
    const short = { low: '低', avg: '平均', high: '高', max: '最高' };
    const c = chart('#chart-fig112', { label: '圖 11.2 代表性個人的社會安全財富', margin: { t: 30, r: 44, b: 50, l: 60 }, marginMobile: { r: 16 } }, api => {
      const { g, w, h } = api;
      const yrs = D.years112, set = D.fig112[st.hh];
      const x = d3.scaleLinear().domain([1940, 2065]).range([0, w]);
      const y = d3.scaleLinear().domain([-700, 320]).range([h, 0]);
      axes(api, x, y, { xFormat: d3.format('d'), xTicks: api.mobile ? 5 : 7, yTicks: 5, yFormat: v => (v < 0 ? '−$' : '$') + Math.abs(v) + 'K', zero: true, yLabel: '終身淨收益（千美元，2006 年幣值）', xLabel: '該世代滿 65 歲的年份' });
      g.append('rect').attr('class', 'band').attr('x', 0).attr('y', y(0)).attr('width', w).attr('height', h - y(0));
      g.append('text').attr('class', 'annot halo').attr('x', 6).attr('y', y(0) - 6).text('淨受益 ↑');
      g.append('text').attr('class', 'annot halo').attr('x', 6).attr('y', y(0) + 16).text('淨損失 ↓');
      D.earners112.forEach(e => {
        if (!st.on[e.key]) return;
        const pts = yrs.map((yr, i) => ({ yr, v: set[e.key][i] }));
        g.append('path').datum(pts).attr('class', 'line ' + cls[e.key]).attr('d', d3.line().x(d => x(d.yr)).y(d => y(d.v)).curve(d3.curveMonotoneX));
        const last = pts[pts.length - 1];
        if (!api.mobile) g.append('text').attr('class', 'series-label halo ' + cls[e.key].split(' ')[0]).attr('x', x(last.yr) + 6).attr('y', y(last.v) + 4).text(short[e.key]);
      });
      const dots = {};
      D.earners112.forEach(e => { dots[e.key] = g.append('circle').attr('class', 'dot ' + cls[e.key].split(' ')[0]).attr('r', 4.5).style('opacity', 0); });
      crosshair(api, yrs, x, (i, evt) => {
        const rows = [];
        D.earners112.forEach(e => {
          if (!st.on[e.key]) { dots[e.key].style('opacity', 0); return; }
          const v = set[e.key][i];
          dots[e.key].attr('cx', x(yrs[i])).attr('cy', y(v)).style('opacity', 1);
          rows.push({ value: (v < 0 ? '−$' : '$') + fmt.int(Math.abs(v * 1000)), label: e.label, color: col[e.key], dash: e.key === 'high' || e.key === 'max' });
        });
        showTip(evt, yrs[i] + ' 年滿 65 歲・' + set.label, rows);
      });
    });
    seg('fig112', v => { st.hh = v; c.render(); });
    document.querySelectorAll('[data-earner]').forEach(el => {
      el.addEventListener('click', () => {
        const k = el.dataset.earner;
        const onCount = Object.values(st.on).filter(Boolean).length;
        if (st.on[k] && onCount === 1) return; // 至少保留一條
        st.on[k] = !st.on[k];
        el.setAttribute('aria-pressed', st.on[k] ? 'true' : 'false');
        c.render();
      });
    });
  }

  /* ---------- 同一世代內的重分配 ---------- */
  function withinGen() {
    let mode = 'income';
    const sets = {
      income: [
        { group: '單身男性・低所得', v: -8605, note: '2015 年退休（課本內文）' },
        { group: '單身男性・平均所得', v: -89343, note: '2015 年退休（課本內文）' },
        { group: '單身男性・高所得', v: -196350, note: '2015 年退休（課本內文）' }
      ],
      family: [
        { group: '單身男性', v: -89343, note: '平均所得、2015 年退休（課本內文）' },
        { group: '單薪夫妻', v: -89343 + 138000, note: '比單身男性多約 $138,000（依內文差額推算）' },
        { group: '雙薪夫妻', v: -89343 + 138000 - 114000, note: '比單薪夫妻少約 $114,000（依內文差額推算）' }
      ],
      group: D.withinGen.map(d => ({ group: d.group.replace('（1990 年代退休）', ''), v: d.v, note: d.note + '，1990 年代退休' }))
    };
    const c = chart('#chart-within', { label: '同一世代內的重分配', margin: { t: 8, r: 72, b: 30, l: 170 }, marginMobile: { l: 132, r: 60 } }, api => {
      const { g, w, h } = api;
      const data = sets[mode];
      const ext = d3.max(data, d => Math.abs(d.v)) * 1.08;
      const x = d3.scaleLinear().domain([Math.min(0, d3.min(data, d => d.v) * 1.08), Math.max(ext * 0.35, d3.max(data, d => d.v) * 1.08)]).range([0, w]);
      const y = d3.scaleBand().domain(data.map(d => d.group)).range([0, h]).padding(0.3);
      axesH(api, x, y, { xTicks: api.mobile ? 3 : 5, xFormat: v => (v < 0 ? '−$' : '$') + d3.format('~s')(Math.abs(v)) });
      const bars = g.selectAll('rect.b').data(data).join('rect').attr('class', d => 'b bar ' + (d.v >= 0 ? 'pos' : 'neg'))
        .attr('x', d => Math.min(x(0), x(d.v))).attr('width', d => Math.max(1, Math.abs(x(d.v) - x(0)))).attr('y', d => y(d.group)).attr('height', y.bandwidth()).attr('rx', 3);
      g.selectAll('text.v').data(data).join('text').attr('class', 'annot-num halo')
        .attr('x', d => d.v >= 0 ? x(d.v) + 6 : x(d.v) - 6).attr('text-anchor', d => d.v >= 0 ? 'start' : 'end')
        .attr('y', d => y(d.group) + y.bandwidth() / 2 + 5).text(d => fmt.usd(d.v))
        .each(function (d) { // 太靠左就改放在長條內側右邊
          if (d.v < 0 && x(d.v) < 70) d3.select(this).attr('x', x(0) + 6).attr('text-anchor', 'start');
        });
      hoverable(bars, d => ({ title: d.group, rows: [{ value: fmt.usd(d.v), label: '終身淨收益', color: d.v >= 0 ? P.pos : P.neg }, { value: d.note, label: '' }] }));
    });
    const msgs = {
      income: '所得越高、淨損失越大：給付公式偏向低所得者（雖然低所得族群壽命較短，會抵銷一部分累進性）。',
      family: '單薪夫妻的配偶可領 50% 配偶給付、還有遺屬給付；雙薪夫妻中所得較低的一方，繳了稅卻多領不到多少。',
      group: '壽命長短影響很大：女性活得久、領得多；非裔美國人預期壽命較短，終身淨收益反而為負。'
    };
    seg('within', v => { mode = v; c.render(); setText('within-msg', msgs[v]); });
    setText('within-msg', msgs[mode]);
  }

  /* ---------- 信託基金：盈餘真的變成儲蓄了嗎？ ---------- */
  function trustFund() {
    const st = { off: 0 };
    const c = chart('#chart-trust', { label: '信託基金盈餘的去向', margin: { t: 24, r: 12, b: 12, l: 12 } }, api => {
      const { g, w, h } = api;
      const total = 10, spent = total * st.off / 100, saved = total - spent;
      const x = d3.scaleLinear().domain([0, total]).range([0, w]);
      const barH = Math.min(52, h * 0.3);
      const y2 = h - barH;
      g.append('text').attr('class', 'annot annot--strong').attr('x', 0).attr('y', -8).text('帳面上：信託基金記入 $10B 公債');
      g.append('rect').attr('class', 'bar series-1').attr('x', 0).attr('y', 0).attr('width', w).attr('height', barH).attr('rx', 3);
      g.append('text').attr('class', 'annot bar-label-inv').attr('x', 12).attr('y', barH / 2 + 5).text('$10B「存款」（對財政部的請求權）');
      g.append('text').attr('class', 'annot annot--strong').attr('x', 0).attr('y', y2 - 8).text('實際上：國民儲蓄增加多少？');
      if (saved > 0.001) {
        const r = g.append('rect').datum({ k: '新增國民儲蓄', v: saved, c: P.pos }).attr('class', 'bar pos').attr('x', 0).attr('y', y2).attr('width', Math.max(0, x(saved) - (spent > 0 ? 2 : 0))).attr('height', barH).attr('rx', 3);
        hoverable(r, d => ({ title: d.k, rows: [{ value: '$' + d.v.toFixed(1) + 'B', color: d.c }] }));
        if (x(saved) > 130) g.append('text').attr('class', 'annot bar-label-inv').attr('x', 12).attr('y', y2 + barH / 2 + 5).text('新儲蓄 $' + saved.toFixed(1) + 'B');
      }
      if (spent > 0.001) {
        const r = g.append('rect').datum({ k: '被國會花在其他計畫', v: spent, c: P.neg }).attr('class', 'bar neg').attr('x', x(saved)).attr('y', y2).attr('width', Math.max(0, x(spent) - x(0))).attr('height', barH).attr('rx', 3);
        hoverable(r, d => ({ title: d.k, rows: [{ value: '$' + d.v.toFixed(1) + 'B', color: d.c }] }));
        if (x(spent) > 150) g.append('text').attr('class', 'annot bar-label-inv').attr('x', x(saved) + 12).attr('y', y2 + barH / 2 + 5).text('被其他支出抵銷 $' + spent.toFixed(1) + 'B');
      }
      // 連接箭頭
      g.append('line').attr('class', 'annot-line').attr('x1', w / 2).attr('x2', w / 2).attr('y1', barH + 4).attr('y2', y2 - 24);
    });
    function readout() {
      const saved = 10 * (1 - st.off / 100);
      setText('tf-saved', '$' + saved.toFixed(1) + 'B');
      setState('tf-saved', saved < 5 ? 'neg' : 'pos');
      setText('tf-msg', saved > 9.99
        ? '盈餘全部變成新儲蓄 → 資本存量增加 → 未來生產力與工資提高 → 社會真的更有能力支付未來的給付。'
        : saved < 0.01
          ? '盈餘被全數花掉：基金帳上仍有 $10B 公債，但那只是對財政部的請求權；兌現時還是得加稅、舉債或刪減其他支出。'
          : `只有 $${saved.toFixed(1)}B 成為新儲蓄。信託基金能否幫助未來的退休者，取決於它是否真的提高了國民儲蓄。`);
      setState('tf-msg', saved < 5 ? 'neg' : saved > 9.99 ? 'pos' : null);
    }
    range('tf-off', v => { st.off = v; c.render(); readout(); }, v => v + '%');
    btn('tf-ideal', () => setRange('tf-off', 0));
    btn('tf-ns', () => setRange('tf-off', 90));
  }

  window.SECTIONS = window.SECTIONS || [];
  window.SECTIONS.push(paygEquation, implicitReturn, fig112, withinGen, trustFund);
})();
