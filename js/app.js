/* =========================================================
   啟動：主題切換、目錄、閱讀進度、進場動畫、各段圖表初始化
   ========================================================= */
(function () {
  'use strict';
  const root = document.documentElement;

  /* ---------- 主題切換 ---------- */
  const themeBtn = document.getElementById('themeToggle');
  function currentTheme() {
    return root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function syncThemeLabel() {
    if (!themeBtn) return;
    const t = currentTheme();
    themeBtn.setAttribute('aria-label', t === 'dark' ? '切換為淺色模式' : '切換為深色模式');
    themeBtn.setAttribute('title', t === 'dark' ? '切換為淺色模式' : '切換為深色模式');
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* 無痕模式等情況 */ }
      syncThemeLabel();
    });
    syncThemeLabel();
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncThemeLabel);
  }

  /* ---------- 初始化所有段落（單一段落出錯不影響其他段） ---------- */
  (window.SECTIONS || []).forEach(fn => {
    try { fn(); } catch (err) { console.error('section init failed:', fn.name, err); }
  });

  /* ---------- 目錄：目前章節＋閱讀進度 ---------- */
  const links = Array.from(document.querySelectorAll('.toc__link'));
  const sections = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const progress = document.querySelector('.progress');
  let active = null, ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY + window.innerHeight * 0.3;
    let cur = null;
    sections.forEach((s, i) => { if (s.offsetTop <= y) cur = i; });
    if (cur !== active) {
      active = cur;
      links.forEach((a, i) => {
        if (i === cur) {
          a.setAttribute('aria-current', 'true');
          const toc = a.parentElement;
          if (toc && toc.scrollWidth > toc.clientWidth) {
            const left = a.offsetLeft - toc.clientWidth / 2 + a.offsetWidth / 2;
            toc.scrollTo({ left, behavior: 'smooth' });
          }
        } else a.removeAttribute('aria-current');
      });
    }
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.setProperty('--progress', max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : '0');
    }
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------- 進場動畫（IntersectionObserver＋捲動位置雙保險，內容不會卡在隱藏狀態） ---------- */
  let pending = Array.from(document.querySelectorAll('.reveal'));
  const showIn = el => el.classList.add('is-in');
  function sweep() {
    if (!pending.length) return;
    const limit = window.innerHeight * 0.98;
    pending = pending.filter(el => {
      if (el.getBoundingClientRect().top < limit) { showIn(el); return false; }
      return true;
    });
  }
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { showIn(e.target); io.unobserve(e.target); } });
    }, { threshold: 0 });
    pending.forEach(el => io.observe(el));
    window.addEventListener('scroll', () => requestAnimationFrame(sweep), { passive: true });
    sweep();
  } else {
    pending.forEach(showIn); pending = [];
  }
  // 列印時全部顯示
  window.addEventListener('beforeprint', () => document.querySelectorAll('.reveal').forEach(showIn));
})();
