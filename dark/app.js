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
  window.matchMedia('(max-width: 1100px)').addEventListener('change', e => { if (!e.matches) setMenu(false); });

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
    // Leave wheel, touch and page keys to the browser for uninterrupted reading.
    window.addEventListener('resize', nearestScreen);
    nearestScreen();
  }

  for (const shell of document.querySelectorAll('[data-story-carousel]')) {
    const rail = shell.querySelector('.story-rail');
    const slides = [...rail.querySelectorAll('.story-slide')];
    const prev = shell.querySelector('[data-story-prev]');
    const next = shell.querySelector('[data-story-next]');
    const dots = [...shell.querySelectorAll('[data-story-dot]')];
    const count = slides.length;
    if (count < 2) continue;

    // One copy at each edge lets the rail wrap by moving just one slide.
    const clone = slide => {
      const copy = slide.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      copy.inert = true;
      return copy;
    };
    rail.prepend(clone(slides[count - 1]));
    rail.append(clone(slides[0]));

    let active = 0;
    let moving = false;
    let nextAutoAt = 0;
    let resumeAt = 0;
    let visible = !('IntersectionObserver' in window);
    let autoplayTimer;
    let settleTimer;

    const moveRail = (position, behavior) => rail.scrollTo({
      left: position * rail.clientWidth,
      behavior,
    });
    const schedule = () => {
      clearTimeout(autoplayTimer);
      // Focus on a story link pauses rotation; focus left on a control does not.
      if (!visible || reduced.matches || document.hidden || rail.querySelector('.story-slide :focus')) {
        nextAutoAt = 0;
        return;
      }
      if (moving) return;
      const now = performance.now();
      if (!resumeAt && !nextAutoAt) nextAutoAt = now + 4000;
      const deadline = resumeAt || nextAutoAt;
      autoplayTimer = setTimeout(() => {
        resumeAt = 0;
        nextAutoAt = performance.now() + 4000;
        go(active + 2);
      }, Math.max(0, deadline - now));
    };
    const settle = () => {
      clearTimeout(settleTimer);
      const position = Math.round(rail.scrollLeft / Math.max(rail.clientWidth, 1));
      active = (position + count - 1) % count;
      if (position === 0 || position === count + 1) moveRail(active + 1, 'instant');
      moving = false;
      dots.forEach((dot, index) => dot.setAttribute('aria-current', String(index === active)));
      schedule();
    };
    const waitForScroll = () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 150);
    };
    const go = position => {
      if (!moving && position === active + 1) return;
      clearTimeout(autoplayTimer);
      moving = true;
      moveRail(position, reduced.matches ? 'instant' : 'smooth');
      waitForScroll();
    };
    const selectManually = position => {
      resumeAt = performance.now() + 5000;
      go(position);
      schedule();
    };

    prev.addEventListener('click', () => selectManually(active));
    next.addEventListener('click', () => selectManually(active + 2));
    dots.forEach((dot, index) => dot.addEventListener('click', () => selectManually(index + 1)));
    rail.addEventListener('scroll', () => {
      clearTimeout(autoplayTimer);
      waitForScroll();
    }, { passive: true });
    rail.addEventListener('keydown', e => {
      if (!['ArrowLeft','ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      selectManually(active + (e.key === 'ArrowRight' ? 2 : 0));
    });
    shell.addEventListener('focusin', schedule);
    shell.addEventListener('focusout', () => queueMicrotask(schedule));
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', schedule);
    window.addEventListener('resize', () => {
      moveRail(active + 1, 'instant');
      settle();
    });
    moveRail(1, 'instant');
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.25;
        schedule();
      }, { threshold: 0.25 }).observe(shell);
    } else {
      schedule();
    }
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
  const articles = JSON.parse(document.querySelector('#article-data')?.textContent || '[]');
  function showArticle(id, opener) {
    const article = articles.find(item => item.id === id); if (!article) return;
    content.replaceChildren();
    const title = document.createElement('h2'); title.id = 'modal-title'; title.textContent = article.title;
    const body = document.createElement('div'); body.className = 'article-body';
    if (article.image) {
      const image = document.createElement('img'); image.className = 'article-hero-image'; image.src = article.image; image.alt = article.imageAlt || article.title; image.width = 1080; image.height = 607; image.decoding = 'async'; body.append(image);
    }
    article.body.forEach(text => { const paragraph = document.createElement('p'); paragraph.textContent = text; body.append(paragraph); });
    const link = document.createElement('a'); link.className = 'text-link'; link.href = 'contact.html'; link.textContent = t('与我们交流 →', 'Talk with us →');
    content.append(title, body, link); openModal(opener);
  }
  document.querySelectorAll('[data-article]').forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); showArticle(link.dataset.article, link);
    const url = new URL(location.href); url.searchParams.set('article', link.dataset.article); history.replaceState(null, '', url);
  }));
  const requestedArticle = new URL(location.href).searchParams.get('article');
  if (requestedArticle) showArticle(requestedArticle);
  const form = document.querySelector('#contact-form');
  if (form) {
    const type = new URL(location.href).searchParams.get('type');
    const setInitialType = () => {
      if ([...form.elements.type.options].some(o => o.value === type)) form.elements.type.value = type;
    };
    setInitialType();
    const status = form.querySelector('.form-status');
    const button = form.querySelector('[type=submit]');
    const label = button.firstChild;
    const idleLabel = label.textContent;
    let busy = false, pendingId = '', pendingPayload = '';
    const newId = () => {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
      const hex = [...bytes].map(n => n.toString(16).padStart(2, '0')).join('');
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    };
    const showStatus = (message, state) => {
      status.textContent = message; status.dataset.state = state; status.hidden = false;
    };
    const validatePhone = () => {
      const value = form.elements.phone.value.trim();
      const valid = /^[+0-9()\s-]{6,25}$/.test(value) && (value.match(/[0-9]/g) || []).length >= 6;
      form.elements.phone.setCustomValidity(valid ? '' : t('请输入有效的联系电话。', 'Please enter a valid phone number.'));
    };
    form.elements.phone.removeAttribute('pattern');
    form.elements.phone.addEventListener('input', validatePhone);
    form.elements.name.addEventListener('input', () => form.elements.name.setCustomValidity(''));
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      if (!form.elements.name.value.trim()) {
        form.elements.name.setCustomValidity(t('请填写您的姓名。', 'Please enter your name.'));
      }
      validatePhone();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const payload = Object.fromEntries(['name','phone','email','organization','type','message','website'].map(key => [key, String(data.get(key) || '').trim()]));
      payload.consent = data.get('consent') === 'on'; payload.lang = en ? 'en' : 'zh';
      const serialized = JSON.stringify(payload);
      if (serialized !== pendingPayload || !pendingId) { pendingId = newId(); pendingPayload = serialized; }
      payload.requestId = pendingId;
      busy = true; button.disabled = true; form.setAttribute('aria-busy', 'true');
      label.textContent = t('正在提交…', 'Submitting…');
      showStatus(t('正在发送预约，请稍候。', 'Sending your request. Please wait.'), 'pending');
      const fields = [...form.querySelectorAll('input,select,textarea')];
      fields.forEach(field => { field.disabled = true; });
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const response = await fetch(form.action, {method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload), signal: controller.signal, credentials: 'omit'});
        const result = await response.json();
        if (!response.ok || result.ok !== true || result.requestId !== pendingId) {
          const error = new Error(result.code || 'unavailable'); throw error;
        }
        form.reset(); setInitialType();
        showStatus(t('预约已提交，我们将通过您留下的联系方式与您沟通。预约编号：',
          'Your request has been received. We will contact you using the details provided. Reference: ') + result.requestId, 'success');
        pendingId = ''; pendingPayload = '';
      } catch (error) {
        const message = error.message === 'rate_limited'
          ? t('提交较为频繁，请稍后重试。您填写的内容仍保留在表单中。', 'Too many requests. Please try again later. Your details remain in the form.')
          : error.message === 'invalid_fields'
            ? t('请检查姓名、联系电话和邮箱格式后重试。', 'Please check your name, phone number and email, then try again.')
            : t('暂时无法确认提交结果，请稍后重试。您填写的内容仍保留，再次提交不会重复保存同一预约。',
              'We could not confirm your submission. Please try again. Your details remain in the form; retrying the same request will not create a duplicate.');
        showStatus(message, 'error');
      } finally {
        clearTimeout(timeout); busy = false; button.disabled = false; label.textContent = idleLabel;
        fields.forEach(field => { field.disabled = false; }); form.removeAttribute('aria-busy');
        status.focus({preventScroll: true}); status.scrollIntoView({block: 'nearest', behavior: reduced.matches ? 'instant' : 'smooth'});
      }
    });
  }
})();
