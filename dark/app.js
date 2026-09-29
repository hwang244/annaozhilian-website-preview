(() => {
  'use strict';
  const en = document.body.dataset.lang === 'en';
  const t = (zh, english) => en ? english : zh;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  const modal = document.querySelector('#content-modal');
  const content = document.querySelector('#modal-content');
  let modalOpener = null;
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? t('关闭导航菜单', 'Close navigation menu') : t('打开导航菜单', 'Open navigation menu'));
  };
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); menu.focus(); }
    if (e.key === 'Tab' && document.body.classList.contains('menu-open')) {
      const items = [...nav.querySelectorAll('a'), document.querySelector('.language'), menu];
      if (e.shiftKey && document.activeElement === items[0]) { e.preventDefault(); menu.focus(); }
      else if (!e.shiftKey && document.activeElement === menu) { e.preventDefault(); items[0].focus(); }
    }
  });
  window.matchMedia('(max-width: 760px)').addEventListener('change', e => { if (!e.matches) setMenu(false); });

  const observed = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    document.body.classList.add('motion-ready');
    const revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        const counter = entry.target.querySelector('[data-count]');
        if (counter && !reduced.matches) {
          const target = Number(counter.dataset.count);
          const start = performance.now();
          const update = now => {
            const progress = Math.min((now - start) / 650, 1);
            counter.firstChild.nodeValue = String(Math.round(target * (1 - (1 - progress) ** 3)));
            if (progress < 1) requestAnimationFrame(update);
          };
          requestAnimationFrame(update);
        }
        revealObserver.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    observed.forEach(el => revealObserver.observe(el));
  }

  const screens = [...document.querySelectorAll('.screen')];
  const dots = [...document.querySelectorAll('.section-dots a')];
  let currentScreen = 0;
  const nearestScreen = () => {
    let distance = Infinity;
    screens.forEach((s, i) => {
      const d = Math.abs(s.getBoundingClientRect().top);
      if (d < distance) { distance = d; currentScreen = i; }
    });
    dots.forEach((dot, i) => i === currentScreen ? dot.setAttribute('aria-current', 'true') : dot.removeAttribute('aria-current'));
  };
  const goToScreen = index => {
    if (index < 0 || index >= screens.length) return;
    window.scrollTo({ top: screens[index].offsetTop, behavior: reduced.matches ? 'instant' : 'smooth' });
  };
  if (screens.length) {
    let framePending = false;
    window.addEventListener('scroll', () => {
      if (!framePending) requestAnimationFrame(() => { nearestScreen(); framePending = false; });
      framePending = true;
    }, { passive: true });
    dots.forEach((dot, i) => dot.addEventListener('click', e => {
      e.preventDefault(); goToScreen(i); history.replaceState(null, '', dot.hash);
    }));
    document.querySelector('.scroll-cue').addEventListener('click', e => { e.preventDefault(); goToScreen(1); });
    document.addEventListener('keydown', e => {
      if (modal.open || document.body.classList.contains('menu-open') || /INPUT|TEXTAREA|SELECT|BUTTON/.test(e.target.tagName) || e.target.isContentEditable || e.altKey || e.ctrlKey || e.metaKey) return;
      if (window.innerWidth < 1101 || window.innerHeight < 700) return;
      const next = ['ArrowDown', 'PageDown'].includes(e.key);
      const prev = ['ArrowUp', 'PageUp'].includes(e.key);
      if (!next && !prev && e.key !== 'Home' && e.key !== 'End') return;
      if (screens[currentScreen].offsetHeight > innerHeight + 8 && (next || prev)) return;
      e.preventDefault();
      goToScreen(e.key === 'Home' ? 0 : e.key === 'End' ? screens.length - 1 : currentScreen + (next ? 1 : -1));
    });
    let wheelLock = 0, wheelTotal = 0;
    window.addEventListener('wheel', e => {
      if (innerWidth < 1101 || innerHeight < 700 || reduced.matches || modal.open || document.body.classList.contains('menu-open') || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const section = screens[currentScreen];
      if (section.offsetHeight > innerHeight + 8) return;
      if ((currentScreen === 0 && e.deltaY < 0) || (currentScreen === screens.length - 1 && e.deltaY > 0)) return;
      e.preventDefault();
      const now = performance.now();
      if (now < wheelLock) return;
      wheelTotal += e.deltaY * (e.deltaMode === 1 ? 20 : 1);
      if (Math.abs(wheelTotal) < 24) return;
      goToScreen(currentScreen + (wheelTotal > 0 ? 1 : -1));
      wheelTotal = 0; wheelLock = now + 950;
    }, { passive: false });
    window.addEventListener('resize', nearestScreen);
    nearestScreen();
  }

  const openModal = opener => { modalOpener = opener || document.activeElement; modal.showModal(); };
  document.querySelector('.modal-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', e => {
    if (e.target !== modal) return;
    const r = modal.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) modal.close();
  });
  modal.addEventListener('close', () => {
    if (modalOpener?.isConnected) modalOpener.focus({ preventScroll: true });
    if (new URL(location.href).searchParams.has('article')) {
      const url = new URL(location.href); url.searchParams.delete('article'); history.replaceState(null, '', url);
    }
  });
  const articles = JSON.parse(document.querySelector('#article-data').textContent);
  function showArticle(id, opener) {
    const article = articles.find(a => a.id === id); if (!article) return;
    content.replaceChildren();
    const status = document.createElement('span'); status.className = 'draft'; status.textContent = t('首发内容草案 · 待正式发布', 'EDITORIAL DRAFT · NOT YET PUBLISHED');
    const title = document.createElement('h2'); title.id = 'modal-title'; title.textContent = article.title;
    const body = document.createElement('div'); body.className = 'article-body';
    article.body.forEach(text => { const p = document.createElement('p'); p.textContent = text; body.append(p); });
    const link = document.createElement('a'); link.className = 'text-link'; link.href = 'contact.html'; link.textContent = t('与我们交流 →', 'Talk with us →');
    content.append(status, title, body, link); openModal(opener);
  }
  document.querySelectorAll('[data-article]').forEach(link => link.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault(); showArticle(link.dataset.article, link);
    const url = new URL(location.href); url.searchParams.set('article', link.dataset.article); history.replaceState(null, '', url);
  }));
  const requestedArticle = new URL(location.href).searchParams.get('article');
  if (requestedArticle) showArticle(requestedArticle);

  const newsList = document.querySelector('#news-list');
  if (newsList) {
    let category = '-1', page = 1;
    const pageSize = 10;
    const cards = [...newsList.querySelectorAll('.news-card')];
    function updateNews() {
      const matches = cards.filter(card => category === '-1' || card.dataset.category === category);
      const pages = Math.max(1, Math.ceil(matches.length / pageSize)); page = Math.min(page, pages);
      const visible = matches.slice((page - 1) * pageSize, page * pageSize);
      cards.forEach(card => { card.hidden = !visible.includes(card); if (!card.hidden) card.classList.add('visible'); });
      document.querySelector('#result-count').textContent = t(`共 ${matches.length} 篇内容 · 每页最多 10 篇`, `${matches.length} article${matches.length === 1 ? '' : 's'} · Up to 10 per page`);
      document.querySelector('#page-count').textContent = `${page} / ${pages}`;
      document.querySelector('#prev-page').disabled = page === 1;
      document.querySelector('#next-page').disabled = page === pages;
    }
    document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => {
      category = btn.dataset.filter; page = 1;
      document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === btn))); updateNews();
    }));
    document.querySelector('#prev-page').addEventListener('click', () => { page--; updateNews(); });
    document.querySelector('#next-page').addEventListener('click', () => { page++; updateNews(); });
    updateNews();
  }

  const form = document.querySelector('#contact-form');
  if (form) {
    const type = new URL(location.href).searchParams.get('type');
    if ([...form.elements.type.options].some(o => o.value === type)) form.elements.type.value = type;
    form.elements.phone.removeAttribute('pattern');
    const validatePhone = () => {
      const value = form.elements.phone.value.trim();
      const valid = /^[+0-9()\s-]{6,25}$/.test(value) && (value.match(/[0-9]/g) || []).length >= 6;
      form.elements.phone.setCustomValidity(valid ? '' : t('请输入有效的联系电话。', 'Please enter a valid phone number.'));
    };
    form.elements.phone.addEventListener('input', validatePhone);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = form.elements.name;
      if (!name.value.trim()) { name.setCustomValidity(t('请填写您的姓名。', 'Please enter your name.')); name.reportValidity(); return; }
      validatePhone();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      content.replaceChildren();
      const title = document.createElement('h2'); title.id = 'modal-title'; title.textContent = t('您的预约信息预览', 'Your request preview');
      const note = document.createElement('p'); note.textContent = t('以下信息仅显示在当前页面，尚未发送。关闭页面后不保留。', 'These details are only shown on this page. They have not been sent and are not retained after closing the page.');
      const list = document.createElement('dl');
      const values = [
        [t('姓名','Name'),data.get('name').trim()], [t('电话','Phone'),data.get('phone').trim()],
        [t('邮箱','Email'),data.get('email')], [t('机构','Organization'),data.get('organization')],
        [t('咨询类型','Interest'),form.elements.type.selectedOptions[0].textContent], [t('需求','Goals'),data.get('message')]
      ];
      values.forEach(([key,value]) => {
        if (!value) return;
        const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = key; dd.textContent = value; list.append(dt, dd);
      });
      const action = document.createElement('button'); action.type = 'button'; action.className = 'button outline'; action.textContent = t('返回编辑', 'Back to edit'); action.addEventListener('click', () => modal.close());
      const actions = document.createElement('div'); actions.className = 'actions'; actions.append(action);
      content.append(title, note, list, actions); openModal(form.querySelector('[type=submit]'));
    });
    form.elements.name.addEventListener('input', () => form.elements.name.setCustomValidity(''));
  }
})();
