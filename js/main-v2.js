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

    /* автолистание раз в 1 сек, с зацикливанием */
    let autoT = null;
    const advance = () => {
      if (down) return;
      const i = currentIndex();
      scrollToIndex(i >= slides.length - 1 ? 0 : i + 1);
    };
    const startAuto = () => { if (!autoT) autoT = setInterval(advance, 2000); };
    const stopAuto = () => { clearInterval(autoT); autoT = null; };
    root.addEventListener('pointerenter', stopAuto);
    root.addEventListener('pointerleave', startAuto);
    document.addEventListener('visibilitychange', () => { document.hidden ? stopAuto() : startAuto(); });
    startAuto();

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
  /* --- электродуги (удары тока) у заголовка hero --- */
  const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  const arcCanvas = document.getElementById('arcLayer');
  const heroTitle = document.querySelector('.hero__title');
  const logoMark = document.querySelector('.logo__mark');
  if (arcCanvas && heroTitle && logoMark && !prefersReduce) {
    const ctx = arcCanvas.getContext('2d');
    let w = 0, h = 0, raf = null;
    const bolts = [];

    const resize = () => {
      w = arcCanvas.width = Math.max(1, arcCanvas.clientWidth) * DPR;
      h = arcCanvas.height = Math.max(1, arcCanvas.clientHeight) * DPR;
    };
    resize();

    // источник — центр логотипа в шапке (в координатах canvas)
    const source = () => {
      const cr = arcCanvas.getBoundingClientRect();
      const lr = logoMark.getBoundingClientRect();
      return { x: (lr.left + lr.width / 2 - cr.left) * DPR, y: (lr.top + lr.height / 2 - cr.top) * DPR };
    };
    // зона заголовка (в координатах canvas)
    const zone = () => {
      const cr = arcCanvas.getBoundingClientRect();
      const tr = heroTitle.getBoundingClientRect();
      return {
        x: (tr.left - cr.left) * DPR, y: (tr.top - cr.top) * DPR,
        w: tr.width * DPR, h: tr.height * DPR,
      };
    };

    // молния: из логотипа в случайную «букву» заголовка
    const makeBolt = () => {
      const s = source(), z = zone();
      // цель — случайная точка по всей ширине/высоте текста (разные буквы)
      const x2 = z.x + Math.random() * z.w;
      const y2 = z.y + (0.15 + Math.random() * 0.7) * z.h;
      return { x1: s.x, y1: s.y, x2, y2, life: 20 + Math.floor(Math.random() * 14), max: 34 };
    };

    const drawPath = (x1, y1, x2, y2, amp, alpha, lw, col) => {
      const dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy) || 1;
      const segs = Math.max(5, Math.floor(dist / (14 * DPR)));
      const nx = -dy / dist, ny = dx / dist;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      for (let i = 1; i < segs; i++) {
        const t = i / segs;
        const off = Math.sin(t * Math.PI) * (Math.random() - 0.5) * amp;
        ctx.lineTo(x1 + dx * t + nx * off, y1 + dy * t + ny * off);
      }
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = col.replace('A', alpha);
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(120,225,255,' + alpha + ')';
      ctx.shadowBlur = 18 * DPR;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const frame = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      // рождение новых ударов — ещё в 3 раза реже, до 3 одновременно
      if (Math.random() < 0.037 && bolts.length < 3) bolts.push(makeBolt());

      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        const a = Math.min(1, b.life / b.max);
        const amp = 26 * DPR;
        // тройная отрисовка: широкий ореол + средняя жила + яркое белое ядро
        drawPath(b.x1, b.y1, b.x2, b.y2, amp, a * 0.45, 7 * DPR, 'rgba(70,190,255,A)');
        drawPath(b.x1, b.y1, b.x2, b.y2, amp * 0.8, a * 0.8, 3 * DPR, 'rgba(150,225,255,A)');
        drawPath(b.x1, b.y1, b.x2, b.y2, amp * 0.6, a, 1.5 * DPR, 'rgba(245,252,255,A)');
        // вспышка в точке удара
        const rr = 22 * DPR * a;
        const g = ctx.createRadialGradient(b.x2, b.y2, 0, b.x2, b.y2, rr);
        g.addColorStop(0, 'rgba(235,250,255,' + a + ')');
        g.addColorStop(.4, 'rgba(90,205,255,' + (a * 0.6) + ')');
        g.addColorStop(1, 'rgba(90,205,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(b.x2, b.y2, rr, 0, Math.PI * 2); ctx.fill();
        if (--b.life <= 0) bolts.splice(i, 1);
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(frame);
    };
    frame();

    let rtA;
    window.addEventListener('resize', () => { clearTimeout(rtA); rtA = setTimeout(resize, 200); }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = null; }
      else if (!raf) frame();
    });
  }
})();
