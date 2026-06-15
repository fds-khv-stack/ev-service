/* ===========================================================
   EV Service — landing scripts (vanilla JS, без зависимостей)
   =========================================================== */
(() => {
  'use strict';

  /* --- год в подвале --- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* --- шапка: фон при прокрутке + прогресс --- */
  const header = document.getElementById('header');
  const progress = document.getElementById('scrollProgress');
  const onScroll = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    header.classList.toggle('is-stuck', y > 20);
    const h = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* --- мобильное меню --- */
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  const toggleMenu = (open) => {
    const isOpen = open ?? !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', isOpen);
    burger.setAttribute('aria-expanded', String(isOpen));
    document.body.classList.toggle('no-scroll', isOpen);
  };
  burger.addEventListener('click', () => toggleMenu());
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleMenu(false); });

  /* --- reveal при появлении --- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          // hero — оркестровка задаётся в CSS, не перебиваем inline-задержкой
          if (!e.target.closest('.hero__inner')) {
            e.target.style.transitionDelay = Math.min(i * 60, 240) + 'ms';
          }
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-in'));
  }

  /* --- scrollspy: активный пункт меню --- */
  const navLinks = [...nav.querySelectorAll('a')];
  const spySections = navLinks
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if (spySections.length && 'IntersectionObserver' in window) {
    const setActive = (id) => {
      navLinks.forEach(a => {
        const on = a.getAttribute('href') === '#' + id;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    spySections.forEach(s => spy.observe(s));
  }

  /* --- счётчики --- */
  const counters = document.querySelectorAll('[data-count]');
  const runCounter = (el) => {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const dur = 1400;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('ru-RU') + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (counters.length) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(c => cio.observe(c));
  }

  /* --- подсветка курсором на карточках услуг --- */
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* --- аккордеоны (модельный ряд + FAQ) --- */
  document.querySelectorAll('.acc').forEach(acc => {
    acc.querySelectorAll('.acc__head').forEach(head => {
      const body = head.nextElementSibling;
      head.addEventListener('click', () => {
        const open = head.getAttribute('aria-expanded') === 'true';
        // закрыть остальные в этой группе
        acc.querySelectorAll('.acc__head').forEach(h => {
          if (h !== head) {
            h.setAttribute('aria-expanded', 'false');
            h.nextElementSibling.style.maxHeight = null;
          }
        });
        head.setAttribute('aria-expanded', String(!open));
        body.style.maxHeight = open ? null : body.scrollHeight + 'px';
      });
    });
  });

  /* --- лайтбокс для всех галерей (навигация ←→, фокус, счётчик) --- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = lightbox.querySelector('img');
  const closeBtn = lightbox.querySelector('.lightbox__close');
  const prevBtn = lightbox.querySelector('.lightbox__nav--prev');
  const nextBtn = lightbox.querySelector('.lightbox__nav--next');
  const counterEl = lightbox.querySelector('.lightbox__counter');
  const captionEl = lightbox.querySelector('.lightbox__caption');

  let currentGroup = [];
  let currentIndex = 0;
  let lastFocused = null;

  const renderSlide = () => {
    const a = currentGroup[currentIndex];
    if (!a) return;
    lightboxImg.src = a.getAttribute('href');
    lightboxImg.alt = a.querySelector('img')?.alt || '';
    if (captionEl) captionEl.textContent = a.querySelector('span')?.textContent || '';
    if (counterEl) counterEl.textContent = (currentIndex + 1) + ' / ' + currentGroup.length;
    const multi = currentGroup.length > 1;
    if (prevBtn) prevBtn.hidden = !multi;
    if (nextBtn) nextBtn.hidden = !multi;
  };
  const step = (dir) => {
    if (currentGroup.length < 2) return;
    currentIndex = (currentIndex + dir + currentGroup.length) % currentGroup.length;
    renderSlide();
  };
  const openLightbox = (group, index) => {
    currentGroup = group;
    currentIndex = index;
    lastFocused = document.activeElement;
    renderSlide();
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    closeBtn.focus();
  };
  const closeLightbox = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxImg.src = '';
    document.body.classList.remove('no-scroll');
    if (lastFocused) lastFocused.focus();
  };

  document.querySelectorAll('[data-gallery]').forEach(gallery => {
    const items = [...gallery.querySelectorAll('.ph')];
    items.forEach((a, i) => {
      a.addEventListener('click', (e) => { e.preventDefault(); openLightbox(items, i); });
    });
  });

  /* --- карусели (стрелки, точки, drag, клик→лайтбокс) --- */
  const setupCarousel = (root) => {
    const track = root.querySelector('.carousel__track');
    if (!track) return;
    const slides = [...track.children];
    const prev = root.querySelector('.carousel__btn--prev');
    const next = root.querySelector('.carousel__btn--next');
    const dotsWrap = root.querySelector('.carousel__dots');
    const lightboxOn = root.hasAttribute('data-lightbox');

    if (slides.length < 2) {
      prev?.remove(); next?.remove(); dotsWrap?.remove();
      if (lightboxOn && slides[0]?.tagName === 'A') {
        slides[0].addEventListener('click', (e) => { e.preventDefault(); openLightbox(slides, 0); });
      }
      return;
    }

    slides.forEach(s => s.querySelectorAll('img').forEach(im => { im.draggable = false; }));

    const dots = [];
    if (dotsWrap) {
      slides.forEach((_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'carousel__dot';
        b.setAttribute('aria-label', 'Фото ' + (i + 1));
        b.addEventListener('click', () => scrollToIndex(i));
        dotsWrap.appendChild(b);
        dots.push(b);
      });
    }

    const stepW = () => slides.length < 2 ? track.clientWidth
      : slides[1].getBoundingClientRect().left - slides[0].getBoundingClientRect().left;
    const currentIndex = () => Math.round(track.scrollLeft / stepW());
    function scrollToIndex(i) {
      const idx = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: idx * stepW(), behavior: 'smooth' });
    }
    const update = () => {
      const i = currentIndex();
      dots.forEach((d, di) => d.classList.toggle('is-active', di === i));
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
    };

    if (prev) prev.addEventListener('click', () => scrollToIndex(currentIndex() - 1));
    if (next) next.addEventListener('click', () => scrollToIndex(currentIndex() + 1));

    let sT;
    track.addEventListener('scroll', () => { clearTimeout(sT); sT = setTimeout(update, 60); }, { passive: true });

    /* drag мышью (на тач — нативный скролл со snap) */
    let down = false, startX = 0, startScroll = 0, moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.pageX; startScroll = track.scrollLeft;
      track.classList.add('is-drag');
    });
    track.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 5) moved = true;
      track.scrollLeft = startScroll - dx;
    });
    const endDrag = () => {
      if (!down) return;
      down = false; track.classList.remove('is-drag');
      scrollToIndex(currentIndex());
    };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointerleave', endDrag);
    track.addEventListener('pointercancel', endDrag);

    slides.forEach((slide, i) => {
      slide.addEventListener('click', (e) => {
        if (moved) { e.preventDefault(); return; }
        if (lightboxOn && slide.tagName === 'A') { e.preventDefault(); openLightbox(slides, i); }
      });
    });

    window.addEventListener('resize', () => { clearTimeout(sT); sT = setTimeout(update, 150); }, { passive: true });
    update();
  };
  document.querySelectorAll('[data-carousel]').forEach(setupCarousel);

  closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', () => step(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => step(1));
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }
  });

  /* --- пересчёт открытого аккордеона при ресайзе --- */
  let rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => {
      document.querySelectorAll('.acc__head[aria-expanded="true"]').forEach(h => {
        const body = h.nextElementSibling;
        if (body) body.style.maxHeight = body.scrollHeight + 'px';
      });
    }, 150);
  }, { passive: true });
})();
