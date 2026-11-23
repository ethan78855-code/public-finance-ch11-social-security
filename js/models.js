/* =========================================================
   經濟模型：純函式（不碰 DOM），方便檢查與重複使用
   ========================================================= */
window.MODELS = (function () {
  'use strict';
  const B1 = 767, B2 = 4624; // 2012 年 bend points

  /* PIA：90% × 前 $767 ＋ 32% × ($767–$4,624) ＋ 15% × 超過 $4,624 */
  function pia(aime) {
    const a = Math.max(0, aime);
    const p1 = 0.9 * Math.min(a, B1);
    const p2 = 0.32 * Math.max(0, Math.min(a, B2) - B1);
    const p3 = 0.15 * Math.max(0, a - B2);
    return { total: p1 + p2 + p3, parts: [p1, p2, p3] };
  }

  /* 正常退休年齡（以「年」表示，可含小數月份） */
  function nra(birthYear) {
    if (birthYear <= 1937) return 65;
    if (birthYear <= 1942) return 65 + (birthYear - 1937) * 2 / 12;
    if (birthYear <= 1954) return 66;
    if (birthYear <= 1959) return 66 + (birthYear - 1954) * 2 / 12;
    return 67;
  }

  /* 請領年齡 → 給付占 PIA 的比例
     提前：前 36 個月每月減 5/9 %，再提前的月份每月減 5/12 %
     延後：每年加 8%（至 70 歲為止） */
  function claimFactor(claimAge, normalAge) {
    const m = Math.round((claimAge - normalAge) * 12);
    if (m < 0) {
      const early = -m;
      const first = Math.min(early, 36) * (5 / 9) / 100;
      const extra = Math.max(0, early - 36) * (5 / 12) / 100;
      return 1 - first - extra;
    }
    const capped = Math.min(m, Math.round((70 - normalAge) * 12));
    return 1 + capped * (8 / 12) / 100;
  }

  /* 薪資稅（2012）：社安 12.4%（上限 $110,100）＋ Medicare 2.9%（無上限）＋ 0.9% 附加稅（> $200,000） */
  function payrollTax(wage, cap) {
    cap = cap || 110100;
    const ss = 0.124 * Math.min(wage, cap);
    const med = 0.029 * wage + 0.009 * Math.max(0, wage - 200000);
    return { ss, med, total: ss + med, avg: wage > 0 ? (ss + med) / wage : 0 };
  }

  /* 兩期生命週期模型：U = ln c0 + β ln c1
     預算：c0 + c1/(1+r) = W0，其中 W0 = 稟賦點的現值 */
  function lifeCycle(p) {
    const { I0, I1, r, T, beta, rs } = p;
    const R = 1 + r;
    const pvNoSS = I0 + I1 / R;
    const c0a = pvNoSS / (1 + beta);
    const c1a = beta * R * c0a;
    // 社安：現在繳 T，未來領 (1+rs)T
    const ssBenefit = (1 + rs) * T;
    const endowR = { x: I0 - T, y: I1 + ssBenefit };
    const pvSS = endowR.x + endowR.y / R;
    const c0b = pvSS / (1 + beta);
    const c1b = beta * R * c0b;
    return {
      R, pvNoSS, pvSS,
      A: { x: I0, y: I1 },
      Rpt: endowR,
      E1: { x: c0a, y: c1a },
      E2: { x: c0b, y: c1b },
      saveBefore: I0 - c0a,
      saveAfter: I0 - T - c0b,
      utility: (c0, c1) => Math.log(c0) + beta * Math.log(c1),
      // 給定效用 U，求無異曲線 c1(c0)
      icurve: (U, c0) => Math.exp((U - Math.log(c0)) / beta)
    };
  }

  /* 逆選擇：年金市場的死亡螺旋
     每人知道自己的預期餘命 L；年金每年付 1，公平保費 ≈ L
     願付價格 = L × (1 + m)（m：風險趨避帶來的保險溢價）
     保險公司保費 = 留在池中者的平均 L × (1 + load) */
  function adverseRound(pool, m, load) {
    const avg = pool.reduce((s, d) => s + d.L, 0) / pool.length;
    const premium = avg * (1 + load);
    const stay = pool.filter(d => d.L * (1 + m) >= premium);
    return { premium, avg, stay };
  }

  /* 75 年 vs 永續償付：年度收支（占課稅薪資 %） */
  function solvencyBase(t) {
    // 早期小幅盈餘，之後赤字擴大並無限期持續
    return 0.6 - 0.07 * Math.min(t, 40);
  }
  function pvSum(f, from, to, rate) {
    let s = 0;
    for (let t = from; t <= to; t++) s += f(t) / Math.pow(1 + rate, t);
    return s;
  }
  function solvencyFix(rate) {
    const H = 600; // 視為無限期
    const pvAnn = (a, b) => { let s = 0; for (let t = a; t <= b; t++) s += 1 / Math.pow(1 + rate, t); return s; };
    const c75 = -pvSum(solvencyBase, 0, 74, rate) / pvAnn(0, 74);
    const cInf = -pvSum(solvencyBase, 0, H, rate) / pvAnn(0, H);
    return { c75, cInf };
  }

  /* 簡單可重現的亂數（mulberry32）與常態分配 */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function normal(rand) {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* 個人帳戶蒙地卡羅：每年提撥 c，持續 n 年 */
  function monteCarlo(o) {
    const { runs, years, contrib, stockShare, fee, crash, seed } = o;
    const rand = rng(seed);
    const muS = 0.065, sdS = 0.18, muB = 0.025, sdB = 0.05;
    const paths = [];
    for (let k = 0; k < runs; k++) {
      let bal = 0; const path = [0];
      for (let y = 1; y <= years; y++) {
        let rs = muS + sdS * normal(rand);
        const rb = muB + sdB * normal(rand);
        if (crash && y === years) rs = -0.37;
        const ret = stockShare * rs + (1 - stockShare) * rb - fee;
        bal = (bal + contrib) * (1 + ret);
        path.push(bal);
      }
      paths.push(path);
    }
    // 隨收隨付的隱含報酬（課本例：工資 1.5% ＋ 人口 1% ≈ 2.5%）
    const payg = [0];
    let b = 0;
    for (let y = 1; y <= years; y++) { b = (b + contrib) * 1.025; payg.push(b); }
    const pct = [0.1, 0.25, 0.5, 0.75, 0.9];
    const bands = [];
    for (let y = 0; y <= years; y++) {
      const col = paths.map(p => p[y]).sort((a, c) => a - c);
      const q = pct.map(p => col[Math.min(col.length - 1, Math.floor(p * (col.length - 1)))]);
      bands.push({ y, q, payg: payg[y] });
    }
    const finals = paths.map(p => p[years]).sort((a, c) => a - c);
    return { bands, finals, paygFinal: payg[years], contribTotal: contrib * years };
  }

  /* 帳戶管理費的複利侵蝕 */
  function feeDrag(years, contrib, ret, fee) {
    let a = 0, b = 0; const s = [{ y: 0, a: 0, b: 0 }];
    for (let y = 1; y <= years; y++) {
      a = (a + contrib) * (1 + ret);
      b = (b + contrib) * (1 + ret - fee);
      s.push({ y, a, b });
    }
    return s;
  }

  /* 請領年齡與社安財富（以 62 歲為基準的現值） */
  function claimWealth(claimAge, deathAge, nraAge, disc, piaMonthly) {
    const f = claimFactor(claimAge, nraAge);
    let pv = 0;
    for (let age = claimAge; age < deathAge; age++) {
      pv += piaMonthly * 12 * f / Math.pow(1 + disc, age - 62);
    }
    return pv;
  }

  return {
    pia, nra, claimFactor, payrollTax, lifeCycle, adverseRound,
    solvencyBase, solvencyFix, pvSum, rng, normal, monteCarlo, feeDrag, claimWealth,
    B1, B2
  };
})();
