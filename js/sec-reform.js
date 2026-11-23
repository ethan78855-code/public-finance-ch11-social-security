/* =========================================================
   §07 社會安全改革（報告重點）
   ========================================================= */
(function () {
  'use strict';
  const { P, fmt, chart, axes, axesH, crosshair, hoverable, showTip, hideTip, range, setRange, seg, toggle, btn, setText, setState } = window.CORE;
  const D = window.DATA, M = window.MODELS;

  /* ---------- 75 年 vs 永續償付 ---------- */
  function solvencyWindow() {
    const rate = 0.02;
    const fix = M.solvencyFix(rate);
    const st = { shift: 0, plan: '75', timer: null };
    const MAX = 40;
    const bal = t => M.solvencyBase(t) + (st.plan === '75' ? fix.c75 : fix.cInf);
    // 截至評估期間最後一年的累計收支現值（含之前累積的信託基金）
    const cum = k => { let s = 0; for (let t = 0; t <= k + 74; t++) s += bal(t) / Math.pow(1 + rate, t); return s * Math.pow(1 + rate, k); };
    const c = chart('#chart-window', { label: '75 年評估期間與永續償付', margin: { t: 34, r: 16, b: 36, l: 48 } }, api => {
      const { g, w, h } = api;
      const N = 130, ts = d3.range(0, N);
      const x = d3.scaleBand().domain(ts).range([0, w]).paddingInner(0.18);
      const y = d3.scaleLinear().domain([-1.6, 2.2]).range([h, 0]);
      axes(api, d3.scaleLinear().domain([2012, 2012 + N]).range([0, w]), y, { xFormat: d3.format('d'), xTicks: api.mobile ? 4 : 7, yFormat: v => (v > 0 ? '+' : '') + String(v).replace('-', '−') + '%', yTicks: 4, zero: true, yLabel: '每年收支（占課稅薪資 %）' });
      const k = st.shift;
      const x1 = x(k), x2 = x(Math.min(N - 1, k + 74)) + x.bandwidth();
      g.append('rect').attr('class', 'window').attr('x', x1).attr('y', -6).attr('width', x2 - x1).attr('height', h + 6);
      g.append('text').attr('class', 'annot annot--strong halo').attr('x', x1 + 8).attr('y', h - 10).text(`75 年評估期間：${2012 + k}–${2012 + k + 74}`);
      const bars = g.selectAll('rect.yr').data(ts).join('rect')
        .attr('class', t => 'yr bar ' + (bal(t) >= 0 ? 'pos' : 'neg'))
        .attr('x', t => x(t)).attr('width', x.bandwidth())
        .attr('y', t => Math.min(y(0), y(bal(t)))).attr('height', t => Math.max(0.5, Math.abs(y(bal(t)) - y(0))))
        .style('opacity', t => (t >= k && t <= k + 74) ? 1 : 0.3);
      if (k > 0) {
        const t = k + 74;
        g.append('rect').attr('class', 'bar--outline').style('--c', 'var(--chart-text-strong)')
          .attr('x', x(t) - 2).attr('y', Math.min(y(0), y(bal(t))) - 2).attr('width', x.bandwidth() + 4).attr('height', Math.abs(y(bal(t)) - y(0)) + 4);
        g.append('text').attr('class', 'annot annot--accent halo').attr('x', x(t) + (x(t) > w * 0.72 ? -6 : 8)).attr('y', y(bal(t)) + 20)
          .attr('text-anchor', x(t) > w * 0.72 ? 'end' : 'start').text('新加入的赤字年');
      }
      bars.on('pointermove pointerdown', (evt, t) => showTip(evt, String(2012 + t), [{ value: (bal(t) >= 0 ? '+' : '−') + Math.abs(bal(t)).toFixed(2) + '%', label: bal(t) >= 0 ? '盈餘' : '赤字', color: bal(t) >= 0 ? P.pos : P.neg }]))
        .on('pointerleave', evt => { if (evt.pointerType !== 'touch') hideTip(); });
    });
    function readout() {
      const v = cum(st.shift);
      const ok = v >= -1e-6;
      setText('sw-year', `${2012 + st.shift}–${2012 + st.shift + 74}`);
      setText('sw-balance', (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2));
      setText('sw-status', ok ? '平衡 ✓' : '缺口 ✗');
      setState('sw-status', ok ? 'pos' : 'neg');
      setState('sw-balance', ok ? null : 'neg');
      setText('sw-msg', st.plan === '75'
        ? (st.shift === 0
          ? '這個方案剛好讓「從今年算起的 75 年」收支平衡。按「往後推一年」看看會發生什麼事。'
          : `評估期間往後移了 ${st.shift} 年：新加入的年份全是赤字，原本「平衡」的方案就破功了。只追求 75 年平衡的改革，其實只「有效一年」。`)
        : '永續償付（sustainable solvency）：無限期未來的收入現值 ＝ 支出現值。早年的盈餘先累積成基金，所以評估期間不論怎麼往後移，都不會破功。');
      setState('sw-msg', ok ? (st.plan === 'inf' ? 'pos' : null) : 'neg');
      const shiftBtn = document.getElementById('sw-shift');
      if (shiftBtn) shiftBtn.disabled = st.shift >= MAX;
      const playBtn = document.getElementById('sw-play');
      if (playBtn) playBtn.disabled = st.shift >= MAX && !st.timer;
    }
    function go(n) { st.shift = Math.max(0, Math.min(MAX, st.shift + n)); c.render(); readout(); }
    function stop() {
      if (st.timer) { clearInterval(st.timer); st.timer = null; }
      const b = document.getElementById('sw-play');
      if (b) { b.querySelector('span').textContent = '自動播放'; b.setAttribute('aria-pressed', 'false'); }
      readout();
    }
    btn('sw-shift', () => { stop(); go(1); });
    btn('sw-play', () => {
      if (st.timer) { stop(); return; }
      if (st.shift >= MAX) go(-MAX);
      const b = document.getElementById('sw-play');
      if (b) { b.querySelector('span').textContent = '暫停'; b.setAttribute('aria-pressed', 'true'); }
      st.timer = setInterval(() => { if (st.shift >= MAX) stop(); else go(1); }, 650);
    });
    btn('sw-reset', () => { stop(); go(-MAX); });
    seg('sw-plan', v => { stop(); st.plan = v; st.shift = 0; c.render(); readout(); });
    readout();
  }

  /* ---------- 方案 A：改革工具箱 ---------- */
  function reformBuilder() {
    const st = { tax: 0, on: {} };
    const levers = D.reformLevers;
    const T = D.targets;
    const c = chart('#chart-reform', { label: '改革組合：收入面 vs 給付面', margin: { t: 26, r: 16, b: 28, l: 16 } }, api => {
      const { g, w, h } = api;
      const items = [];
      if (st.tax > 0) items.push({ k: '提高薪資稅率', v: st.tax, side: 'rev' });
      levers.forEach(l => { if (!l.slider && st.on[l.key]) items.push({ k: l.short || l.label, v: l.pp, side: l.side }); });
      items.sort((a, b) => (a.side === b.side ? 0 : a.side === 'rev' ? -1 : 1));
      const total = d3.sum(items, d => d.v);
      const x = d3.scaleLinear().domain([0, Math.max(5, total * 1.05)]).range([0, w]);
      const gx = g.append('g').attr('class', 'axis axis--x').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(5).tickFormat(v => v + ' pp').tickSize(-h).tickPadding(6));
      gx.select('.domain').remove(); gx.selectAll('.tick line').attr('class', 'gridline');
      g.append('rect').attr('class', 'band').attr('x', 0).attr('y', 0).attr('width', w).attr('height', h);
      let x0 = 0;
      items.forEach((d, i) => {
        const r = g.append('rect').datum(d).attr('class', 'bar ' + (d.side === 'rev' ? 'series-1' : 'series-2'))
          .attr('x', x(x0)).attr('y', 0).attr('width', Math.max(0, x(x0 + d.v) - x(x0) - 2)).attr('height', h).attr('rx', 2);
        hoverable(r, dd => ({ title: dd.k, rows: [{ value: dd.v.toFixed(2) + ' pp', label: dd.side === 'rev' ? '增加收入' : '減少給付', color: dd.side === 'rev' ? P.s1 : P.s2 }] }));
        x0 += d.v;
      });
      if (!items.length) g.append('text').attr('class', 'annot').attr('x', 10).attr('y', h / 2 + 4).text('尚未選擇任何改革工具');
      [[T.window75, '2.52'], [T.sustainable, '3.9']].forEach(([v, t]) => {
        g.append('line').attr('class', 'marker-line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', -6).attr('y2', h + 4);
        g.append('text').attr('class', 'annot annot--accent halo').attr('x', x(v)).attr('y', -10).attr('text-anchor', 'middle').text(t);
      });
      api.state.total = total;
      api.state.rev = d3.sum(items.filter(d => d.side === 'rev'), d => d.v);
      api.state.ben = d3.sum(items.filter(d => d.side === 'ben'), d => d.v);
    });
    function readout() {
      const t = c.state.total;
      const ok = t >= T.sustainable - 1e-9, ok75 = t >= T.window75 - 1e-9;
      setText('rf-total', t.toFixed(2));
      setText('rf-rev', c.state.rev.toFixed(2));
      setText('rf-ben', c.state.ben.toFixed(2));
      setText('rf-gap', ok ? '已達成' : '還差 ' + (T.sustainable - t).toFixed(2) + ' pp');
      const meter = document.getElementById('rf-meter');
      if (meter) {
        meter.style.setProperty('--value', Math.min(100, t / T.sustainable * 100) + '%');
        meter.classList.toggle('is-complete', ok);
        meter.classList.toggle('is-partial', !ok && ok75);
        meter.setAttribute('aria-valuenow', t.toFixed(2));
      }
      setText('rf-status', ok ? '永續償付 ✓' : ok75 ? '只到 75 年' : '仍不足');
      setState('rf-status', ok ? 'pos' : 'neg');
      setText('rf-msg', ok
        ? '已達成永續償付。但別忘了：償付效果相同 ≠ 經濟影響相同。加稅造成的效率扭曲通常大於等額的減給付，所得分配效果也不一樣。'
        : ok75
          ? `已經超過 75 年平衡所需的 2.52，但距離永續償付（3.9）還差 ${(T.sustainable - t).toFixed(2)} 個百分點。`
          : `距離永續償付（3.9 個百分點）還差 ${(T.sustainable - t).toFixed(2)}。注意：各項數字是個別估計，直接相加只是近似。`);
      setState('rf-msg', ok ? 'pos' : null);
      document.querySelectorAll('[data-lever]').forEach(el => {
        const lv = el.closest('.lever');
        if (lv) lv.classList.toggle('is-on', el.checked);
      });
    }
    const render = () => { c.render(); readout(); };
    range('rf-tax', v => {
      st.tax = v;
      const sw = document.getElementById('rf-tax-gain');
      if (sw) sw.textContent = '+' + v.toFixed(2) + ' pp';
      render();
    }, v => '+' + v.toFixed(2) + ' pp');
    document.querySelectorAll('[data-lever]').forEach(el => {
      el.addEventListener('change', () => { st.on[el.dataset.lever] = el.checked; render(); });
    });
    function setLevers(map, tax) {
      document.querySelectorAll('[data-lever]').forEach(el => { el.checked = !!map[el.dataset.lever]; st.on[el.dataset.lever] = el.checked; });
      setRange('rf-tax', tax);
    }
    btn('rf-reset', () => setLevers({}, 0));
    btn('rf-onlytax', () => setLevers({}, 3.9));
    btn('rf-mix', () => setLevers({ age: true, aime: true, cola: true }, 1.65));
    btn('rf-price', () => setLevers({ price: true }, 0));
    readout();
  }

  /* ---------- 方案 B：抵銷利率與償付能力（課後題 11） ---------- */
  function offsetRate() {
    const st = { o: 3, i: 3, R: 5, n: 35 };
    const c = chart('#chart-offset', { label: '轉出 $1,000 到個人帳戶的效果', margin: { t: 8, r: 72, b: 28, l: 140 }, marginMobile: { l: 112, r: 60 } }, api => {
      const { g, w, h } = api;
      const D0 = 1000;
      const acct = D0 * Math.pow(1 + st.R / 100, st.n);
      const cut = D0 * Math.pow(1 + st.o / 100, st.n);
      const pvCut = cut / Math.pow(1 + st.i / 100, st.n);
      const sys = pvCut - D0, net = acct - cut;
      const data = [
        { k: '個人帳戶累積', v: acct, cls: 'series-1', c: P.s1, t: `$1,000 以 ${st.R}% 投資 ${st.n} 年` },
        { k: '傳統給付減少', v: cut, cls: 'series-2', c: P.s2, t: `$1,000 以抵銷利率 ${st.o}% 複利 ${st.n} 年` },
        { k: '勞工淨得', v: net, cls: net >= 0 ? 'pos' : 'neg', c: net >= 0 ? P.pos : P.neg, t: '帳戶累積 − 給付減少' },
        { k: '制度償付變化', v: sys, cls: Math.abs(sys) < 1 ? 'muted-mark' : sys > 0 ? 'pos' : 'neg', c: sys >= 0 ? P.pos : P.neg, t: '給付減少的現值 − 今天少收的 $1,000' }
      ];
      const lo = Math.min(0, d3.min(data, d => d.v));
      const hi = Math.max(2000, d3.max(data, d => d.v));
      const x = d3.scaleLinear().domain([lo * 1.1, hi * 1.08]).range([0, w]);
      const y = d3.scaleBand().domain(data.map(d => d.k)).range([0, h]).padding(0.3);
      axesH(api, x, y, { xTicks: api.mobile ? 3 : 5, xFormat: v => (v < 0 ? '−$' : '$') + d3.format('~s')(Math.abs(v)) });
      const bars = g.selectAll('rect.b').data(data).join('rect').attr('class', d => 'b bar ' + d.cls)
        .attr('x', d => Math.min(x(0), x(d.v))).attr('width', d => Math.max(1.5, Math.abs(x(d.v) - x(0)))).attr('y', d => y(d.k)).attr('height', y.bandwidth()).attr('rx', 3);
      g.selectAll('text.v').data(data).join('text').attr('class', 'annot-num halo')
        .attr('x', d => d.v >= 0 ? x(d.v) + 6 : x(d.v) - 6).attr('text-anchor', d => d.v >= 0 ? 'start' : 'end')
        .attr('y', d => y(d.k) + y.bandwidth() / 2 + 5).text(d => fmt.usd(d.v));
      hoverable(bars, d => ({ title: d.k, rows: [{ value: fmt.usd(d.v), color: d.c, label: '' }, { value: d.t, label: '' }] }));
      api.state.sys = sys;
    });
    function readout() {
      const d = c.state.sys;
      const s = Math.abs(d) < 1 ? 'neutral' : d > 0 ? 'good' : 'bad';
      setText('or-status', s === 'neutral' ? '不變' : s === 'good' ? '改善' : '惡化');
      setState('or-status', s === 'good' ? 'pos' : s === 'bad' ? 'neg' : null);
      setText('or-msg', s === 'neutral'
        ? '抵銷利率 ＝ 制度的折現率：每轉出 $1 進個人帳戶，未來給付減少的現值剛好也是 $1——民營化本身不改變償付能力。'
        : s === 'good'
          ? '抵銷利率高於折現率：未來給付減得比今天少收的錢還多 → 償付能力改善，但勞工的社安財富因此下降。'
          : '抵銷利率低於折現率：未來給付減得不夠 → 償付能力惡化。關鍵在「設計細節」，不在民營化本身。');
      setState('or-msg', s === 'bad' ? 'neg' : s === 'good' ? 'pos' : null);
    }
    const r = () => { c.render(); readout(); };
    range('or-o', v => { st.o = v; r(); }, v => v.toFixed(1) + '%');
    range('or-i', v => { st.i = v; r(); }, v => v.toFixed(1) + '%');
    range('or-r', v => { st.R = v; r(); }, v => v.toFixed(1) + '%');
    range('or-n', v => { st.n = v; r(); }, v => v + ' 年');
    btn('or-match', () => setRange('or-o', parseFloat(document.getElementById('or-i').value)));
    readout();
  }

  /* ---------- 方案 B：風險（蒙地卡羅） ---------- */
  function riskSim() {
    const st = { share: 60, crash: false, seed: 11 };
    const years = 40, contrib = 2;
    const c = chart('#chart-risk', { label: '個人帳戶餘額的可能範圍', margin: { t: 30, r: 20, b: 50, l: 52 } }, api => {
      const { g, w, h } = api;
      const r = M.monteCarlo({ runs: 400, years, contrib, stockShare: st.share / 100, fee: 0.003, crash: st.crash, seed: st.seed });
      api.state.r = r;
      const x = d3.scaleLinear().domain([0, years]).range([0, w]);
      const ymax = Math.max(200, d3.max(r.bands, b => b.q[4]) * 1.05);
      const y = d3.scaleLinear().domain([0, ymax]).range([h, 0]);
      axes(api, x, y, { xFormat: v => v + '年', xTicks: api.mobile ? 4 : 8, yFormat: v => '$' + v + 'K', yTicks: 4, yLabel: '帳戶餘額（千美元，實質）', xLabel: '提撥年數（每年 $2K）' });
      const area = (lo, hi) => d3.area().x(b => x(b.y)).y0(b => y(b.q[lo])).y1(b => y(b.q[hi])).curve(d3.curveMonotoneX);
      g.append('path').datum(r.bands).attr('class', 'fan-1').attr('d', area(0, 4));
      g.append('path').datum(r.bands).attr('class', 'fan-2').attr('d', area(1, 3));
      g.append('path').datum(r.bands).attr('class', 'line series-1').attr('d', d3.line().x(b => x(b.y)).y(b => y(b.q[2])).curve(d3.curveMonotoneX));
      g.append('path').datum(r.bands).attr('class', 'line line--dash series-4').attr('d', d3.line().x(b => x(b.y)).y(b => y(b.payg)));
      const last = r.bands[years];
      g.append('text').attr('class', 'series-label series-1 halo').attr('x', x(years) - 4).attr('y', y(last.q[2]) - 10).attr('text-anchor', 'end').text('中位數');
      g.append('text').attr('class', 'series-label series-4 halo').attr('x', x(years) - 4).attr('y', y(last.payg) + 20).attr('text-anchor', 'end').text('隨收隨付隱含報酬 2.5%');
      g.append('text').attr('class', 'annot halo').attr('x', x(years) - 4).attr('y', y(last.q[4]) - 8).attr('text-anchor', 'end').text(st.crash ? '90 百分位（退休前一年股市 −37%）' : '90 百分位');
      const dot = g.append('circle').attr('class', 'dot series-1').attr('r', 4.5).style('opacity', 0);
      crosshair(api, r.bands.map(b => b.y), x, (i, evt) => {
        const b = r.bands[i];
        dot.attr('cx', x(b.y)).attr('cy', y(b.q[2])).style('opacity', 1);
        showTip(evt, '第 ' + b.y + ' 年', [
          { value: '$' + fmt.one(b.q[4]) + 'K', label: '樂觀（90 百分位）' },
          { value: '$' + fmt.one(b.q[2]) + 'K', label: '中位數', color: P.s1 },
          { value: '$' + fmt.one(b.q[0]) + 'K', label: '悲觀（10 百分位）' },
          { value: '$' + fmt.one(b.payg) + 'K', label: '隨收隨付', color: P.s4, dash: true }
        ]);
      });
    });
    function readout() {
      const r = c.state.r, f = r.finals;
      const med = f[Math.floor(f.length / 2)], p10 = f[Math.floor(f.length * 0.1)];
      const below = f.filter(v => v < r.paygFinal).length / f.length;
      setText('rk-med', '$' + fmt.int(med) + 'K');
      setText('rk-p10', '$' + fmt.int(p10) + 'K');
      setText('rk-below', fmt.pct(below, 0));
      setState('rk-below', below > 0.25 ? 'neg' : null);
    }
    const r = () => { c.render(); readout(); };
    range('rk-share', v => { st.share = v; r(); }, v => v + '%');
    toggle('rk-crash', on => { st.crash = on; r(); });
    btn('rk-resim', () => { st.seed = (st.seed * 9301 + 49297) % 233280; r(); });
    readout();
  }

  /* ---------- 方案 B：行政成本的複利侵蝕 ---------- */
  function feeDrag() {
    const st = { fee: 0.5 };
    const c = chart('#chart-fee', { label: '管理費對帳戶餘額的影響', margin: { t: 30, r: 20, b: 36, l: 52 } }, api => {
      const { g, w, h } = api;
      const s = M.feeDrag(40, 2, 0.05, st.fee / 100);
      api.state.s = s;
      const x = d3.scaleLinear().domain([0, 40]).range([0, w]);
      const y = d3.scaleLinear().domain([0, d3.max(s, d => d.a) * 1.08]).range([h, 0]);
      axes(api, x, y, { xFormat: v => v + '年', xTicks: api.mobile ? 4 : 8, yFormat: v => '$' + v + 'K', yTicks: 4, yLabel: '帳戶餘額（千美元；年報酬 5%、每年存 $2K）' });
      g.append('path').datum(s).attr('class', 'gap-area').attr('d', d3.area().x(d => x(d.y)).y0(d => y(d.b)).y1(d => y(d.a)));
      g.append('path').datum(s).attr('class', 'line line--dash series-4').attr('d', d3.line().x(d => x(d.y)).y(d => y(d.a)));
      g.append('path').datum(s).attr('class', 'line series-1').attr('d', d3.line().x(d => x(d.y)).y(d => y(d.b)));
      const L = s[40];
      g.append('text').attr('class', 'series-label series-4 halo').attr('x', x(39)).attr('y', y(L.a) - 10).attr('text-anchor', 'end').text('零費用');
      g.append('text').attr('class', 'series-label series-1 halo').attr('x', x(39)).attr('y', y(L.b) + 20).attr('text-anchor', 'end').text('扣除管理費後');
      crosshair(api, s.map(d => d.y), x, (i, evt) => {
        const d = s[i];
        showTip(evt, '第 ' + d.y + ' 年', [
          { value: '$' + fmt.one(d.a) + 'K', label: '零費用', color: P.s4, dash: true },
          { value: '$' + fmt.one(d.b) + 'K', label: '扣費後', color: P.s1 },
          { value: '$' + fmt.one(d.a - d.b) + 'K', label: '被費用吃掉', color: P.neg }
        ]);
      });
    });
    function readout() {
      const L = c.state.s[40];
      setText('fd-loss', fmt.pct(1 - L.b / L.a, 1));
      setState('fd-loss', (1 - L.b / L.a) > 0.15 ? 'neg' : null);
      setText('fd-final', '$' + fmt.int(L.b) + 'K');
    }
    range('fd-fee', v => { st.fee = v; c.render(); readout(); }, v => v.toFixed(2) + '%');
    btn('fd-low', () => setRange('fd-fee', 0.1));
    btn('fd-high', () => setRange('fd-fee', 1.5));
    readout();
  }

  /* ---------- Carve-out vs Add-on 與國民儲蓄 ---------- */
  function savingMatrix() {
    const st = { acct: 'carve', view: 'trad' };
    const table = {
      'carve|trad': { lvl: 0, label: '幾乎沒有', msg: '傳統觀點：信託基金少買的公債，改由民間買下 → 只是公、私證券互換，沒有創造新的儲蓄。' },
      'carve|pol': { lvl: 1, label: '可能有一些', msg: '政治經濟觀點：盈餘移出統一預算、被「隔離」在個人帳戶，政府較難挪用 → 支出可能減少、國民儲蓄可能增加（Nataraj & Shoven, 2004），但效果大小不確定。' },
      'add|trad': { lvl: 2, label: '較可能增加', msg: 'Add-on：勞工額外自掏腰包提撥（例如 Liebman et al. 2005 的 3% 帳戶，一半來自薪資稅、一半額外提撥），這部分較可能是真正的新儲蓄。' },
      'add|pol': { lvl: 2, label: '較可能增加', msg: 'Add-on 的額外提撥本來就不經過政府預算，不論採哪一種觀點，都較可能增加國民儲蓄 → 累積資本、提高未來產出。' }
    };
    function render() {
      const r = table[st.acct + '|' + st.view];
      const meter = document.getElementById('sm-meter');
      if (meter) {
        meter.style.setProperty('--value', [6, 45, 85][r.lvl] + '%');
        meter.classList.toggle('is-partial', r.lvl === 1);
        meter.classList.toggle('is-complete', r.lvl === 2);
        meter.setAttribute('aria-valuenow', String(r.lvl));
        meter.setAttribute('aria-valuetext', r.label);
      }
      setText('sm-label', r.label);
      setState('sm-label', r.lvl === 0 ? 'neg' : r.lvl === 2 ? 'pos' : null);
      setText('sm-msg', r.msg);
    }
    seg('sm-acct', v => { st.acct = v; render(); });
    seg('sm-view', v => { st.view = v; render(); });
    render();
  }

  /* ---------- 比較表：可展開列 ---------- */
  function compareTable() {
    const toggles = Array.from(document.querySelectorAll('.compare__toggle'));
    const set = (b, open) => {
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      const panel = document.getElementById(b.getAttribute('aria-controls'));
      if (panel) panel.hidden = !open;
    };
    toggles.forEach(b => b.addEventListener('click', () => set(b, b.getAttribute('aria-expanded') !== 'true')));
    btn('cmp-all', () => {
      const anyClosed = toggles.some(b => b.getAttribute('aria-expanded') !== 'true');
      toggles.forEach(b => set(b, anyClosed));
      const all = document.getElementById('cmp-all');
      if (all) all.textContent = anyClosed ? '全部收合' : '全部展開';
    });
  }

  window.SECTIONS = window.SECTIONS || [];
  window.SECTIONS.push(solvencyWindow, reformBuilder, offsetRate, riskSim, feeDrag, savingMatrix, compareTable);
})();
