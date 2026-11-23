/* =========================================================
   §08 小測驗
   ========================================================= */
(function () {
  'use strict';
  const QUESTIONS = [
    {
      q: '從福利經濟學的角度，社會安全最主要提供的是哪一種保險？',
      opts: ['失業的保險', '「活得比存款久」的保險（年金）', '醫療費用的保險', '股市下跌的保險'],
      a: 1,
      why: '社會安全按月發放、直到過世為止，本質上是一份年金，保障「活太久、提前花光退休存款」的風險。'
    },
    {
      q: '私人年金市場可能失靈，主要是因為哪一種資訊不對稱問題？',
      opts: ['道德風險：買了年金的人會故意活久一點', '外部性：年金會影響別人的效用', '公共財：年金無法排他', '逆選擇：預期自己長壽的人最想買年金'],
      a: 3,
      why: '買方比賣方更清楚自己的預期壽命；長壽者最想買，保險公司只好提高保費，短命者退出，可能形成死亡螺旋。強制全民加入可以解決這個問題。'
    },
    {
      q: '在純粹的隨收隨付制下，長期而言可持續的隱含報酬率由什麼決定？',
      opts: ['股票市場的報酬率', '薪資稅率的高低', '工資成長率 ＋ 人口成長率', '信託基金購買的公債利率'],
      a: 2,
      why: '由 B = t × (Nw/Nb) × w 可知，稅率固定時，給付只能隨工資與工作人口成長。提高稅率只會讓「當時」的退休者一次性受益。'
    },
    {
      q: 'AIME 為 $1,600 的退休者（2012 年公式），每月 PIA 約為多少？',
      opts: ['$957', '$1,440', '$512', '$1,600'],
      a: 0,
      why: '90% × $767 ＋ 32% × ($1,600 − $767) ＝ $690.3 ＋ $266.6 ≈ $957，替代率約 60%。'
    },
    {
      q: '在圖 11.5 的生命週期模型中（社安報酬率 ＝ 市場利率），引進社會安全後會發生什麼事？',
      opts: ['終身消費增加，儲蓄不變', '最適消費組合不變，但私人儲蓄減少', '預算線往外移，儲蓄增加', '現在消費減少 T，未來消費不變'],
      a: 1,
      why: '稟賦點由 A 移到同一條預算線上的 R，最適點 E₁ 不變；個人把社安稅當作儲蓄，自己少存 T——財富替代效果。'
    },
    {
      q: '依 t = (Nb/Nw) × (B/w)，扶養比由 0.35 升到 0.48，若要維持替代率不變，稅率約需提高多少？',
      opts: ['約 13%', '約 48%', '不需要提高', '約 37%'],
      a: 3,
      why: '0.48 ÷ 0.35 ≈ 1.37，稅率要提高約 37%（12.4% → 約 17%）；否則只能讓替代率下降。'
    },
    {
      q: '為什麼只追求「75 年收支平衡」的改革被批評只「有效一年」？',
      opts: ['因為每年支出都大於收入，評估期間往後移一年，新加入的赤字年就讓它又不平衡', '因為 75 年太短，人口結構會改變', '因為信託基金會在 2033 年用完', '因為法律規定每年都要重新立法'],
      a: 0,
      why: '赤字會無限期持續，評估期間往後移一年就多納入一個赤字年。所以多數學者主張以「永續償付」為目標：無限期未來的收入現值 ＝ 支出現值。'
    },
    {
      q: '下列哪一項改革「單獨」就能達成永續償付（依課本引用的精算估計）？',
      opts: ['正常退休年齡提高到 68 歲', 'AIME 改採最高 38 年', '過去薪資改按物價（而非工資）指數化', '生活費調整（COLA）少 1 個百分點'],
      a: 2,
      why: '物價漲得比工資慢，改按物價指數化會讓給付成長較慢，單獨即可達永續償付；延後退休年齡（0.32）、38 年（0.29）都遠低於所需的 3.9。'
    },
    {
      q: '關於民營化（個人帳戶）對償付能力的影響，課本的結論是？',
      opts: ['必然改善，因為股票報酬率較高', '必然惡化，因為現在的稅收會減少', '與償付能力無關', '取決於設計：每轉出 $1，未來傳統給付減少多少'],
      a: 3,
      why: '轉入個人帳戶的錢，必須以減少未來傳統給付來抵銷。給付減少的現值若等於少收的稅，償付不變；較多則改善，較少則惡化。'
    },
    {
      q: '哪一種個人帳戶設計「較可能」增加國民儲蓄？',
      opts: ['Add-on：勞工額外自掏腰包提撥', 'Carve-out：從現有薪資稅挪出', '兩者完全相同', '兩者都一定會減少國民儲蓄'],
      a: 0,
      why: 'Carve-out 可能只是公、私證券互換；Add-on 的額外提撥較可能是新儲蓄，而唯有增加儲蓄、累積資本，才能真正減輕下一代負擔。'
    }
  ];

  function init() {
    const wrap = document.getElementById('quiz');
    if (!wrap) return;
    const keys = ['A', 'B', 'C', 'D'];
    const answered = new Array(QUESTIONS.length).fill(null);
    const list = document.getElementById('quiz-list');
    list.textContent = '';
    QUESTIONS.forEach((item, qi) => {
      const q = document.createElement('div');
      q.className = 'quiz__q';
      q.setAttribute('role', 'group');
      q.setAttribute('aria-labelledby', `q${qi}-stem`);
      const stem = document.createElement('p');
      stem.className = 'quiz__stem'; stem.id = `q${qi}-stem`;
      const num = document.createElement('span'); num.className = 'quiz__num'; num.textContent = String(qi + 1);
      const txt = document.createElement('span'); txt.textContent = item.q;
      stem.append(num, txt);
      const opts = document.createElement('div');
      opts.className = 'quiz__options';
      const fb = document.createElement('div');
      fb.className = 'quiz__feedback'; fb.setAttribute('role', 'status'); fb.hidden = true;
      item.opts.forEach((o, oi) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'quiz__option';
        const k = document.createElement('span'); k.className = 'quiz__key'; k.textContent = keys[oi];
        const s = document.createElement('span'); s.textContent = o;
        b.append(k, s);
        b.addEventListener('click', () => {
          if (answered[qi] !== null) return;
          answered[qi] = oi;
          const right = oi === item.a;
          opts.querySelectorAll('.quiz__option').forEach((x, xi) => {
            x.disabled = true;
            if (xi === item.a) x.classList.add('is-correct');
            if (xi === oi && !right) x.classList.add('is-wrong');
          });
          fb.hidden = false;
          fb.className = 'quiz__feedback ' + (right ? 'is-correct' : 'is-wrong');
          fb.textContent = '';
          const head = document.createElement('b');
          head.textContent = right ? '答對了！' : `再想一下：正確答案是 ${keys[item.a]}。`;
          fb.append(head, document.createTextNode(item.why));
          score();
        });
        opts.appendChild(b);
      });
      q.append(stem, opts, fb);
      list.appendChild(q);
    });
    function score() {
      const done = answered.filter(v => v !== null).length;
      const right = answered.filter((v, i) => v === QUESTIONS[i].a).length;
      const val = document.getElementById('quiz-score');
      if (val) { val.textContent = ''; val.append(document.createTextNode(String(right))); const s = document.createElement('small'); s.textContent = ' / ' + QUESTIONS.length; val.appendChild(s); }
      const lab = document.getElementById('quiz-progress');
      if (lab) lab.textContent = done < QUESTIONS.length ? `已作答 ${done} 題` : (right === QUESTIONS.length ? '全對！你已經掌握第 11 章了' : '作答完成，看看解析再試一次');
    }
    const retry = document.getElementById('quiz-retry');
    if (retry && !retry._bound) {
      retry._bound = true;
      retry.addEventListener('click', () => { init(); const top = document.getElementById('quiz'); if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    }
    score();
  }

  window.SECTIONS = window.SECTIONS || [];
  window.SECTIONS.push(init);
})();
