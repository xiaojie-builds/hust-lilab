/* 李学飞课题组 Li Lab — 站点脚本（多页面版）
   功能：当前页导航高亮 / 移动端菜单 / 复制邮箱 / 滚动渐显
   无第三方依赖，原生 JS。 */
(function () {
  'use strict';

  /* ---------- 当前页导航高亮 ---------- */
  function markCurrentNav() {
    var here = location.pathname.split('/').pop() || 'index.html';
    var links = document.querySelectorAll('.nav a[href]');
    Array.prototype.forEach.call(links, function (a) {
      var target = a.getAttribute('href').split('#')[0].split('/').pop();
      if (target === here) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* ---------- 移动端菜单 ---------- */
  function setupNavToggle() {
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('nav');
    if (!toggle || !nav) return;

    function setOpen(open) {
      nav.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
      // 展开时锁住页面滚动（iOS 需要同时设 html 与 body 才生效）
      document.documentElement.style.overflow = open ? 'hidden' : '';
      document.body.style.overflow = open ? 'hidden' : '';
    }

    toggle.addEventListener('click', function () {
      setOpen(!nav.classList.contains('open'));
    });

    // 点击菜单内链接后关闭
    nav.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setOpen(false);
    });

    // 点击外部关闭
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('open')) return;
      if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });

    // Esc 关闭并把焦点还给按钮
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    // 视口放大时自动收起（避免桌面端残留展开状态）
    window.addEventListener('resize', function () {
      if (window.innerWidth > 720 && nav.classList.contains('open')) setOpen(false);
    });
  }

  /* ---------- 提示条 ---------- */
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }

  /* ---------- 复制文本 ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy') ? resolve() : reject(); }
      catch (err) { reject(); }
      document.body.removeChild(ta);
    });
  }

  function setupCopy() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-mail]');
      if (!btn) return;
      var mail = btn.getAttribute('data-mail');
      copyText(mail).then(function () {
        if (!btn.dataset.copyOrig) btn.dataset.copyOrig = btn.textContent;
        btn.textContent = '已复制';
        btn.classList.add('copied');
        clearTimeout(btn._t);
        btn._t = setTimeout(function () {
          btn.textContent = btn.dataset.copyOrig || '';
          btn.classList.remove('copied');
        }, 1800);
        toast('邮箱已复制：' + mail);
      }).catch(function () {
        toast('复制失败，请手动复制：' + mail);
      });
    });
  }

  /* ---------- 滚动渐显 ---------- */
  function setupReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(items, function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    Array.prototype.forEach.call(items, function (el) { io.observe(el); });
  }

  /* ---------- 页面滚动时给顶栏加投影 ---------- */
  function setupHeadShadow() {
    var head = document.querySelector('.site-head');
    if (!head) return;
    function onScroll() {
      head.style.boxShadow = window.scrollY > 8 ? '0 6px 20px rgba(15,36,80,.06)' : '';
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 中屏横滑导航：可滑动时右缘渐隐，提示还有栏目 ---------- */
  function setupNavScrollHint() {
    var nav = document.getElementById('nav');
    if (!nav) return;

    function update() {
      var max = nav.scrollWidth - nav.clientWidth;
      var atEnd = nav.scrollLeft >= max - 2;
      nav.classList.toggle('is-scrollable', max > 2 && !atEnd);
    }

    var raf;
    function onScroll() {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }

    update();
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('orientationchange', function () { setTimeout(update, 300); });
    nav.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- 注册 Service Worker：支持添加到主屏与离线浏览 ---------- */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  function init() {
    markCurrentNav();
    setupNavToggle();
    setupNavScrollHint();
    setupCopy();
    setupReveal();
    setupHeadShadow();
    registerServiceWorker();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
