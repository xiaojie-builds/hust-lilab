/* 单页 Tab 切换 + 滚动渐显 */
document.addEventListener('DOMContentLoaded', function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));

  function activate(id, push) {
    var page = document.getElementById(id);
    if (!page) { id = 'pg-home'; page = document.getElementById(id); }
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-target') === id;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;        /* roving tabindex */
      if (on && t.scrollIntoView) {
        var bar = t.parentNode;
        var left = t.offsetLeft - (bar.clientWidth - t.clientWidth) / 2;
        bar.scrollTo ? bar.scrollTo({ left: left, behavior: 'smooth' }) : (bar.scrollLeft = left);
      }
    });
    pages.forEach(function (p) { p.classList.toggle('active', p.id === id); });
    // 显示后手动触发渐显（隐藏页面内 IntersectionObserver 不会触发）
    page.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    if (push && history.replaceState) { history.replaceState(null, '', '#' + id.replace(/^pg-/, '')); }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // 方向键 / Home / End 在 tab 之间循环（ARIA tabs pattern）
  tabs.forEach(function (t, i) {
    t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
    t.addEventListener('click', function () { activate(t.getAttribute('data-target'), true); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, next = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') next = tabs[(i + 1) % tabs.length];
      else if (k === 'ArrowLeft' || k === 'ArrowUp') next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (k === 'Home') next = tabs[0];
      else if (k === 'End')  next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); activate(next.getAttribute('data-target'), true); next.focus(); }
    });
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#pg-"]');
    if (a) {
      e.preventDefault();
      activate(a.getAttribute('href').slice(1), true);
    }
  });

  function fromHash(push) {
    var h = (location.hash || '').replace('#', '');
    activate(h ? 'pg-' + h : 'pg-home', push);
  }
  fromHash(false);
  window.addEventListener('hashchange', function () { fromHash(false); });

  // 复制邮箱（mailto 在无邮件客户端或预览环境无效时的兜底）
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast'; el.className = 'toast';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) { return navigator.clipboard.writeText(text); }
    return new Promise(function (res, rej) {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(); }
      document.body.removeChild(ta);
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-mail]');
    if (!b) return;
    var mail = b.getAttribute('data-mail');
    copyText(mail).then(function () {
      b.classList.add('copied');
      // 用 dataset 保存首次点击时的原文，避免 1.8s 内连点被 "已复制" 覆盖
      if (!b.dataset.copyOrig) b.dataset.copyOrig = b.textContent;
      b.textContent = '已复制';
      clearTimeout(b._t);
      b._t = setTimeout(function () {
        b.textContent = b.dataset.copyOrig || '';
        b.classList.remove('copied');
      }, 1800);
      toast('邮箱已复制：' + mail);
    }).catch(function () {
      toast('复制失败，请手动复制：' + mail);
      // 兜底提示用户手动复制（兜底时尝试 window.prompt）
      try { window.prompt('请复制以下邮箱：', mail); } catch (_) {}
    });
  });

  // 滚动渐显
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }
});
