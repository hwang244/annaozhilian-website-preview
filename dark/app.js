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

  for (const shell of document.querySelectorAll('[data-story-carousel]')) {
    const rail = shell.querySelector('.story-rail');
    const slides = [...rail.querySelectorAll('.story-slide')];
    const prev = shell.querySelector('[data-story-prev]');
    const next = shell.querySelector('[data-story-next]');
    const count = shell.querySelector('.story-count');
    let active = 0;
    const update = () => {
      active = Math.max(0, Math.min(slides.length - 1, Math.round(rail.scrollLeft / Math.max(rail.clientWidth, 1))));
      count.textContent = `${String(active + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      prev.disabled = active === 0;
      next.disabled = active === slides.length - 1;
    };
    const go = index => rail.scrollTo({left: Math.max(0, Math.min(slides.length - 1, index)) * rail.clientWidth, behavior: reduced.matches ? 'instant' : 'smooth'});
    prev.addEventListener('click', () => go(active - 1));
    next.addEventListener('click', () => go(active + 1));
    rail.addEventListener('scroll', () => requestAnimationFrame(update), {passive:true});
    rail.addEventListener('keydown', e => {
      if (!['ArrowLeft','ArrowRight'].includes(e.key)) return;
      e.preventDefault(); go(active + (e.key === 'ArrowRight' ? 1 : -1));
    });
    window.addEventListener('resize', update);
    update();
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
  });
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
