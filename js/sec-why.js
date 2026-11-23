/* =========================================================
   §02 為什麼需要社會安全？
   ========================================================= */
(function () {
  'use strict';
  const { P, fmt, chart, axes, crosshair, hoverable, roundedTop, showTip, range, setRange, seg, toggle, btn, setText, setState } = window.CORE;
  const D = window.DATA, M = window.MODELS;

  /* ---------- 圖 11.1 支出成長（切換：實質金額／占 GDP，避免雙軸） ---------- */
  function fig111() {
    let mode = 'real';
    const c = chart('#chart-fig111', { label: '圖 11.1 社會安全支出 1937–2011' }, api => {
      const { g, w, h } = api;
      const data = D.fig111;
      const key = mode;
      const x = d3.scaleLinear().domain([1937, 2011]).range([0, w]);
      const y = d3.scaleLinear().domain([0, key === 'real' ? 800 : 6]).range([h, 0]);
      axes(api, x, y, {
        xFormat: d3.format('d'), xTicks: api.mobile ? 4 : 8,
        yFormat: key === 'real' ? (v => '$' + v) : (v => v + '%'),
        yLabel: key === 'real' ? '實質支出（十億美元，2011 年幣值）' : '占 GDP 比重（%）'
      });
      const events = [
        { year: 1939, text: '改為隨收隨付' },
        { year: 1972, text: 'SSI 上路' },
        { year: 1983, text: '1983 年改革' }
      ];
      if (!api.mobile) events.forEach((e, i) => {
        const yy = 16 + i * 18;
        g.append('line').attr('class', 'ref-line').attr('x1', x(e.year)).attr('x2', x(e.year)).attr('y1', yy + 4).attr('y2', h);
        g.append('text').attr('class', 'annot halo').attr('x', x(e.year) + 4).attr('y', yy).text(e.text);
      });
      g.append('path').datum(data).attr('class', 'area series-1')
        .attr('d', d3.area().x(d => x(d.year)).y0(h).y1(d => y(d[key])).curve(d3.curveMonotoneX));
      g.append('path').datum(data).attr('class', 'line series-1')
        .attr('d', d3.line().x(d => x(d.year)).y(d => y(d[key])).curve(d3.curveMonotoneX));
      const last = data[data.length - 1];
      g.append('circle').attr('class', 'dot series-1').attr('cx', x(last.year)).attr('cy', y(last[key])).attr('r', 5);
      g.append('text').attr('class', 'annot annot--strong halo').attr('x', x(last.year) - 10).attr('y', y(last[key]) - 10)
        .attr('text-anchor', 'end').text(key === 'real' ? '2011：$736.1B' : '2011：4.9%');
      const dot = g.append('circle').attr('class', 'dot series-1').attr('r', 5).style('opacity', 0);
      crosshair(api, data.map(d => d.year), x, (i, evt) => {
        const d = data[i];
        dot.attr('cx', x(d.year)).attr('cy', y(d[key])).style('opacity', 1);
        showTip(evt, d.year + ' 年', [
          { value: '$' + fmt.int(d.real) + 'B', label: '實質支出', color: key === 'real' ? P.s1 : null },
          { value: d.gdp.toFixed(2) + '%', label: '占 GDP', color: key === 'gdp' ? P.s1 : null }
        ]);
      });
    });
    seg('fig111', v => { mode = v; c.render(); });
  }

  /* ---------- 活得比存款久：自己存 vs 買年金 ---------- */
  function outlive() {
    const st = { S: 300, C: 25, D: 92 };
    const r = 0.03, payYears = 20; // 年金以平均再活 20 年（85 歲）定價
    const annuity = S => S * r / (1 - Math.pow(1 + r, -payYears));
    function simulate() {
      const ages = d3.range(65, 111);
      let bal = st.S; const self = [];
      ages.forEach(a => {
        const spend = Math.min(st.C, Math.max(0, bal));
        self.push({ a, v: a < st.D ? spend : 0, bal: Math.max(0, bal) });
        bal = (bal - spend) * (1 + r);
      });
      const A = annuity(st.S);
      const ann = ages.map(a => ({ a, v: a < st.D ? A : 0 }));
      const run = self.find(d => d.a < st.D && d.v < st.C - 1e-6);
      return { ages, self, ann, A, runOut: run || null };
    }
    const c = chart('#chart-outlive', { label: '退休後每年可消費金額', margin: { t: 30, r: 20, b: 36, l: 52 } }, api => {
      const { g, w, h } = api;
      const s = simulate();
      const x = d3.scaleLinear().domain([65, 110]).range([0, w]);
      const y = d3.scaleLinear().domain([0, Math.max(60, st.C, s.A) * 1.12]).range([h, 0]);
      axes(api, x, y, { xFormat: d => d + '歲', xTicks: api.mobile ? 5 : 9, yFormat: v => '$' + v + 'K', yTicks: 4, yLabel: '每年可消費（千美元）' });
      g.append('rect').attr('class', 'band').attr('x', x(st.D)).attr('y', 0).attr('width', Math.max(0, w - x(st.D))).attr('height', h);
      g.append('text').attr('class', 'annot').attr('x', Math.min(x(st.D) + 6, w - 4)).attr('y', 14).attr('text-anchor', x(st.D) > w - 90 ? 'end' : 'start').text('過世（' + st.D + ' 歲）');
      const ln = d3.line().x(d => x(d.a)).y(d => y(d.v)).curve(d3.curveStepAfter);
      g.append('path').datum(s.ann).attr('class', 'line line--step series-1').attr('d', ln);
      g.append('path').datum(s.self).attr('class', 'line line--step line--dash series-4').attr('d', ln);
      if (s.runOut) {
        g.append('circle').attr('class', 'dot neg').attr('cx', x(s.runOut.a)).attr('cy', y(s.runOut.v)).attr('r', 6);
        g.append('text').attr('class', 'annot annot--accent halo').attr('x', x(s.runOut.a) + 8)
          .attr('y', Math.min(h - 8, y(s.runOut.v) - 8)).attr('text-anchor', x(s.runOut.a) > w * 0.7 ? 'end' : 'start').attr('dx', x(s.runOut.a) > w * 0.7 ? -16 : 0)
          .text(s.runOut.a + ' 歲存款用盡');
      }
      // 標籤：自己存的放在線的起點；年金的放在「自己存已用完」之後的區段
      const selfAbove = st.C >= s.A;
      g.append('text').attr('class', 'series-label series-4 halo').attr('x', 6).attr('y', selfAbove ? y(st.C) - 8 : y(st.C) + 18).text('自己存：每年花固定金額');
      const annX = s.runOut ? Math.min(x(s.runOut.a) + 8, x(st.D) - 120) : 6;
      const annY = s.runOut ? y(s.A) - 8 : (selfAbove ? y(s.A) + 18 : y(s.A) - 8);
      if (!s.runOut || x(st.D) - x(s.runOut.a) > 60) g.append('text').attr('class', 'series-label series-1 halo').attr('x', Math.max(6, annX)).attr('y', annY).text('年金：活多久領多久');
      crosshair(api, s.ages, x, (i, evt) => {
        showTip(evt, s.ages[i] + ' 歲', [
          { value: '$' + fmt.one(s.ann[i].v) + 'K', label: '年金給付', color: P.s1 },
          { value: '$' + fmt.one(s.self[i].v) + 'K', label: '自己存的消費', color: P.s4, dash: true },
          { value: '$' + fmt.int(s.self[i].bal) + 'K', label: '年初存款餘額' }
        ]);
      });
      api.state.s = s;
    });
    function readout() {
      const s = c.state.s;
      setText('ol-annuity', '$' + fmt.one(s.A) + 'K');
      setText('ol-runout', s.runOut ? s.runOut.a + ' 歲' : '用不完');
      setState('ol-runout', s.runOut ? 'neg' : 'pos');
      setText('ol-msg', s.runOut
        ? `如果活到 ${st.D} 歲，自己存的錢在 ${s.runOut.a} 歲就花光——這就是「活太久」的風險。年金把這個風險轉給保險人。`
        : `活到 ${st.D} 歲時存款還沒花完；但事前沒有人知道自己會活多久，花太省又白白犧牲了消費。`);
      setState('ol-msg', s.runOut ? 'neg' : null);
    }
    const upd = () => { c.render(); readout(); };
    range('ol-s', v => { st.S = v; upd(); }, v => '$' + v + 'K');
    range('ol-c', v => { st.C = v; upd(); }, v => '$' + v + 'K');
    range('ol-d', v => { st.D = v; upd(); }, v => v + ' 歲');
    btn('ol-hobner', () => setRange('ol-d', 107));
    btn('ol-reset', () => { setRange('ol-s', 300); setRange('ol-c', 25); setRange('ol-d', 92); });
  }

  /* ---------- 逆選擇：年金市場的死亡螺旋 ---------- */
  function adverse() {
    const N = 60;
    const people = d3.range(N).map(i => ({ id: i, L: 5 + 30 * (i + 0.5) / N }));
    const meanAll = d3.mean(people, d => d.L);
    const st = { m: 0.10, mandate: false, round: 0, pool: people.slice(), history: [], timer: null, premium: meanAll };
    const inPool = d => st.mandate || st.pool.some(p => p.id === d.id);
    function reset() {
      stop();
      st.round = 0; st.pool = people.slice();
      st.premium = meanAll;
      st.history = [{ round: 0, premium: meanAll, size: N }];
      draw();
    }
    function step() {
      if (st.mandate) { draw(); return false; }
      const r = M.adverseRound(st.pool, st.m, 0);
      if (r.stay.length === st.pool.length || r.stay.length === 0) { draw(); return false; }
      st.pool = r.stay; st.round += 1;
      st.premium = M.adverseRound(st.pool, st.m, 0).premium;
      st.history.push({ round: st.round, premium: st.premium, size: st.pool.length });
      draw();
      return true;
    }
    function stop() { if (st.timer) { clearInterval(st.timer); st.timer = null; } setPlay(false); }
    function setPlay(on) {
      const b = document.getElementById('as-play');
      if (!b) return;
      b.querySelector('span').textContent = on ? '暫停' : '自動播放';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    function play() {
      if (st.timer) { stop(); return; }
      if (isStable()) reset();
      setPlay(true);
      if (!step()) { stop(); return; }
      st.timer = setInterval(() => { if (!step()) stop(); }, 800);
    }
    const isStable = () => st.mandate || M.adverseRound(st.pool, st.m, 0).stay.length === st.pool.length;
    const c1 = chart('#chart-adverse', { label: '投保池中的人', margin: { t: 36, r: 16, b: 48, l: 16 } }, api => {
      const { g, w, h } = api;
      const x = d3.scaleLinear().domain([5, 35]).range([0, w]);
      const gx = g.append('g').attr('class', 'axis axis--x').attr('transform', `translate(0,${h})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d => d + '年').tickSizeOuter(0).tickPadding(8));
      gx.selectAll('.tick line').attr('y2', 4);
      g.append('text').attr('class', 'axis-label').attr('x', w).attr('y', h + 40).attr('text-anchor', 'end').text('預期退休後餘命（自己知道，保險公司不知道）');
      const premium = st.mandate ? meanAll : st.premium;
      const threshold = premium / (1 + st.m);
      if (!st.mandate) {
        g.append('rect').attr('class', 'gap-area').attr('x', 0).attr('y', 0).attr('width', Math.max(0, x(Math.min(35, Math.max(5, threshold))))).attr('height', h);
      }
      const rows = 3, rowH = h / rows;
      const dots = g.selectAll('circle.person').data(people).join('circle')
        .attr('class', d => 'person dot ' + (inPool(d) ? 'series-1' : 'is-out'))
        .attr('cx', d => x(d.L))
        .attr('cy', d => rowH * (d.id % rows) + rowH / 2)
        .attr('r', api.mobile ? 4 : 6);
      hoverable(dots, d => ({
        title: '預期餘命 ' + d.L.toFixed(1) + ' 年',
        rows: [{ value: inPool(d) ? '仍在投保池' : '已退出', label: '狀態' }, { value: (d.L * (1 + st.m)).toFixed(1), label: '願付價格' }, { value: premium.toFixed(1), label: '保費' }]
      }), { focus: false });
      const px = x(Math.min(35, premium));
      g.append('line').attr('class', 'marker-line').attr('x1', px).attr('x2', px).attr('y1', -8).attr('y2', h);
      g.append('text').attr('class', 'annot annot--accent halo').attr('x', Math.min(px, w - 2)).attr('y', -14)
        .attr('text-anchor', px > w * 0.72 ? 'end' : 'middle').text('保費 = ' + premium.toFixed(1) + ' 年份給付');
      if (!st.mandate && threshold > 6) {
        g.append('text').attr('class', 'annot halo').attr('x', 4).attr('y', h - 6).text('← 覺得太貴而退出');
      }
    });
    const c2 = chart('#chart-adverse-premium', { label: '每一輪的保費', margin: { t: 30, r: 16, b: 32, l: 40 } }, api => {
      const { g, w, h } = api;
      const hist = st.history;
      const x = d3.scaleLinear().domain([0, Math.max(6, hist.length - 1)]).range([0, w]);
      const y = d3.scaleLinear().domain([15, 35]).range([h, 0]);
      axes(api, x, y, { xFormat: d => Number.isInteger(d) ? '第' + d + '輪' : '', xTicks: Math.min(6, Math.max(6, hist.length - 1)), yTicks: 4, yLabel: '保費（年份給付）' });
      g.append('path').datum(hist).attr('class', 'line series-1').attr('d', d3.line().x(d => x(d.round)).y(d => y(d.premium)));
      const pts = g.selectAll('circle.pt').data(hist).join('circle').attr('class', 'pt dot series-1')
        .attr('cx', d => x(d.round)).attr('cy', d => y(d.premium)).attr('r', 5);
      hoverable(pts, d => ({ title: '第 ' + d.round + ' 輪', rows: [{ value: d.premium.toFixed(1), label: '保費' }, { value: d.size + ' 人', label: '投保人數' }] }));
    });
    function draw() {
      c1.render(); c2.render();
      const size = st.mandate ? N : st.pool.length;
      setText('as-round', st.mandate ? '—' : String(st.round));
      setText('as-size', Math.round(size / N * 100) + '%');
      setState('as-size', size / N < 0.5 ? 'neg' : null);
      setText('as-premium', (st.mandate ? meanAll : st.premium).toFixed(1));
      const stable = isStable();
      const stepBtn = document.getElementById('as-step');
      if (stepBtn) stepBtn.disabled = stable;
      setText('as-msg', st.mandate
        ? '強制全民加入：長壽與短命的人都在池中，保費固定在全體平均，不會螺旋上升——這正是社會安全「強制參加」的理由之一。'
        : stable
          ? (st.round === 0 ? '在這個風險趨避程度下，沒有人覺得保費太貴，市場一開始就穩定。' : `市場在第 ${st.round} 輪停下來，只剩 ${Math.round(size / N * 100)}% 的人（預期最長壽的一群）還願意買。`)
          : '按「下一輪」：保險公司依「留下來的人」的平均餘命重新訂價，覺得不划算的人退出……');
      setState('as-msg', st.mandate ? 'pos' : (stable && st.round > 0 ? 'neg' : null));
    }
    range('as-m', v => { st.m = v / 100; reset(); }, v => v + '%');
    toggle('as-mandate', on => { st.mandate = on; reset(); });
    btn('as-step', () => { stop(); step(); });
    btn('as-play', play);
    btn('as-reset', reset);
    reset();
  }

  /* ---------- 老年人的經濟狀況 ---------- */
  function poverty() {
    let mode = 'poverty';
    const c = chart('#chart-poverty', { label: '老年貧窮率與所得成長', margin: { t: 30, r: 16, b: 36, l: 44 } }, api => {
      const { g, w, h } = api;
      const data = mode === 'poverty' ? D.poverty : D.incomeGrowth;
      const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, w]).padding(0.45);
      const y = d3.scaleLinear().domain([0, mode === 'poverty' ? 30 : 60]).range([h, 0]);
      axes(api, x, y, { xBand: true, yFormat: v => v + '%', yTicks: 4, yLabel: mode === 'poverty' ? '2011 年貧窮率' : '1974–2011 實質中位所得成長' });
      const bars = g.selectAll('path.bar').data(data).join('path')
        .attr('class', d => 'bar ' + (d.key === 'elder' ? 'series-1' : 'muted-mark'))
        .attr('d', d => roundedTop(x(d.label), y(d.v), x.bandwidth(), h - y(d.v), 4));
      g.selectAll('text.v').data(data).join('text').attr('class', 'annot-num').attr('text-anchor', 'middle')
        .attr('x', d => x(d.label) + x.bandwidth() / 2).attr('y', d => y(d.v) - 8)
        .text(d => (mode === 'poverty' ? '' : '+') + d.v + '%');
      hoverable(bars, d => ({ title: d.label, rows: [{ value: (mode === 'poverty' ? '' : '+') + d.v + '%', label: mode === 'poverty' ? '2011 年貧窮率' : '實質中位所得成長' }] }));
      if (mode === 'poverty') {
        g.append('line').attr('class', 'ref-line').attr('x1', 0).attr('x2', w).attr('y1', y(25)).attr('y2', y(25));
        g.append('text').attr('class', 'annot halo').attr('x', w).attr('y', y(25) - 6).attr('text-anchor', 'end').text('1970 年：每 4 位老人約有 1 位貧窮');
      }
    });
    seg('pov', v => { mode = v; c.render(); });
  }

  window.SECTIONS = window.SECTIONS || [];
  window.SECTIONS.push(fig111, outlive, adverse, poverty);
})();
