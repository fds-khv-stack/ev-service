(() => {
  'use strict';
  const section = document.getElementById('dyno');
  if (!section) return;
  const $ = selector => section.querySelector(selector);
  const form = $('.dyno__filters');
  const grid = $('.dyno__grid');
  const status = $('.dyno__status');
  const more = $('.dyno__more');
  const viewer = $('.dyno-viewer');
  const labels = {
    chip_tuning:'Чип-тюнинг', EGR_off:'Отключение EGR', DPF_off:'Отключение DPF',
    speedlimit_off:'Снятие ограничения скорости', adblue_off:'Отключение AdBlue',
    start_stop_off:'Отключение Start-Stop', vmax_off:'Снятие ограничения Vmax',
    pop_bangs_on:'Хлопки/выстрелы', e85:'E85', supercharger:'Установка нагнетателя',
    SAP_off:'Отключение вторичного воздуха', akpp_tuning:'Настройка АКПП',
    battery_stand:'Проверка батареи на стенде', controllers:'Контроллеры', euro2:'Евро-2',
    revlimit_off:'Снятие ограничения оборотов', throttlelimit_off:'Снятие ограничения дросселя', vvti:'Настройка VVT-i'
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => typeof value === 'number' && Number.isFinite(value);
  const fmt = value => value.toLocaleString('ru-RU', {maximumFractionDigits:1});
  const signed = value => `${value > 0 ? '+' : ''}${fmt(value)}`;
  const features = r => (Array.isArray(r.features) ? r.features : String(r.features || '').split(',')).map(f => f.trim()).filter(Boolean);
  const carName = r => [String(r.car || '').replace(/\s+\d$/, '').trim(), r.engine].filter(Boolean).join(' ') || 'Автомобиль не указан';
  const brand = r => String(r.car || '').trim().split(/\s+/)[0];
  const full = r => number(r.stock_hp) && number(r.stage_hp);
  const date = r => /^\d{4}-\d{2}-\d{2}$/.test(r.date || '') ? `<time datetime="${r.date}">${r.date.split('-').reverse().join('.')}</time>` : '';
  const link = r => /^https:\/\/(www\.)?instagram\.com\//.test(r.url || '') ? esc(r.url) : '';
  const localImage = r => typeof images[r.id] === 'string' && /^Img\/dyno\/[\w.\-]+\.webp$/.test(images[r.id]) ? images[r.id] : '';
  const gain = r => number(r.delta_hp) ? r.delta_hp : full(r) ? r.stage_hp - r.stock_hp : -Infinity;
  let records = [], images = {}, filtered = [], limit = 12, maxPct = 1, animated = false;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let activeIndex = -1, viewerRecords = [], returnFocus = null, previousOverflow = '';
  function showRecord(id, collection = filtered) {
    const index = collection.findIndex(r => r.id === id);
    if (index < 0 || typeof viewer.showModal !== 'function') return;
    activeIndex = index;
    viewerRecords = collection;
    const r = collection[index], image = localImage(r), url = link(r), name = carName(r);
    $('#dyno-viewer-title').textContent = name;
    $('.dyno-viewer__position').textContent = `Замер ${index + 1} из ${collection.length}${r.date ? ' · ' + r.date.split('-').reverse().join('.') : ''}`;
    $('.dyno-viewer__media').innerHTML = image ? `<img src="${esc(image)}" alt="${esc(name)} — фотография из публикации EV Service">` : '<p>Для этого замера нет сохранённой фотографии.</p>';
    $('.dyno-viewer__media img')?.addEventListener('error', () => {
      $('.dyno-viewer__media').textContent = 'Не удалось загрузить фотографию. Попробуйте открыть исходную публикацию.';
    }, {once:true});
    $('.dyno-viewer__metrics').innerHTML = `${full(r) ? '<p class="dyno-viewer__legend">Сток → после настройки</p>' : ''}${metric(r,'hp','л.с.')}${metric(r,'nm','Н·м','dyno-card__numbers--torque')}`;
    $('.dyno-viewer__note').textContent = full(r) ? `Прирост мощности: ${signed(gain(r))} л.с.` : 'В публикации нет полной пары «сток / результат». Показываем только имеющиеся данные.';
    const details = $('.dyno-viewer__description');
    details.open = false; details.hidden = !r.caption;
    details.querySelector('p').textContent = r.caption || '';
    $('.dyno-viewer__links').innerHTML = `${image ? `<a class="dyno__button" href="${esc(image)}" target="_blank" rel="noopener noreferrer">Фото в полном размере</a>` : ''}${url ? `<a class="dyno__button" href="${url}" target="_blank" rel="noopener noreferrer">Исходный пост в Instagram</a>` : ''}`;
    viewer.querySelector('[data-dyno-step="-1"]').disabled = index === 0;
    viewer.querySelector('[data-dyno-step="1"]').disabled = index === collection.length - 1;
    if (!viewer.open) {
      returnFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
      viewer.showModal();
      document.body.style.overflow = 'hidden';
    }
    viewer.scrollTop = 0;
  }
  section.addEventListener('click', event => {
    const opener = event.target.closest('[data-dyno-open]');
    if (!opener || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof viewer.showModal !== 'function') return;
    event.preventDefault(); showRecord(opener.dataset.dynoOpen, opener.classList.contains('dyno__leader') ? records : filtered);
  });
  $('.dyno-viewer__close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...viewer.querySelectorAll('button:not(:disabled),a[href],summary')].filter(el => el.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  });
  viewer.addEventListener('click', event => {
    if (event.target !== viewer) return;
    const box = viewer.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) viewer.close();
  });
  viewer.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  });
  viewer.querySelectorAll('[data-dyno-step]').forEach(button => button.addEventListener('click', () => {
    const next = viewerRecords[activeIndex + Number(button.dataset.dynoStep)];
    if (next) showRecord(next.id, viewerRecords);
  }));
  let observer;
  function watchBars() {
    if (animated || motion.matches || !('IntersectionObserver' in window)) return;
    section.classList.add('dyno--waiting');
    if (observer) return;
    observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      animated = true;
      section.classList.replace('dyno--waiting', 'dyno--animate');
      observer.disconnect();
      setTimeout(() => section.classList.remove('dyno--animate'), 950);
    }, {threshold:0.1});
    observer.observe($('.dyno__highlights'));
  }
  motion.addEventListener('change', () => {
    if (motion.matches) {
      animated = true;
      observer?.disconnect();
      section.classList.remove('dyno--waiting', 'dyno--animate');
    }
  });
  function metric(r, key, unit, extra = '') {
    const before = r[`stock_${key}`], after = r[`stage_${key}`];
    if (!number(before) && !number(after)) return '';
    const text = number(before) && number(after)
      ? `${fmt(before)} <span class="dyno-card__arrow" aria-label="после настройки">→</span> ${fmt(after)}`
      : `${fmt(number(after) ? after : before)}`;
    return `<p class="dyno-card__numbers ${extra}">${text} <small>${unit}${number(before) && number(after) ? '' : number(after) ? ' после' : ' сток'}</small></p>`;
  }
  function card(r) {
    const name = carName(r), url = link(r);
    const image = localImage(r);
    const media = image ? `<a class="dyno-card__preview" href="${esc(image)}" data-dyno-open="${esc(r.id)}" aria-label="Открыть замер: ${esc(name)}"><img class="dyno-card__image" src="${esc(image)}" alt="${esc(name)} — фотография из публикации EV Service" width="640" height="480" loading="lazy" decoding="async"><span class="dyno-card__open">Смотреть замер</span></a>` : '';
    const pct = full(r) && r.stock_hp > 0 ? (number(r.pct_hp) ? r.pct_hp : (r.stage_hp-r.stock_hp)/r.stock_hp*100) : null;
    let result = '';
    if (full(r) && number(pct)) {
      result = `<div class="dyno-card__gain"><div class="dyno-card__gain-label"><span>Прирост от стока</span><b>${signed(gain(r))} л.с. · ${signed(pct)} %</b></div><div class="dyno-card__track" aria-hidden="true"><div class="dyno-card__fill" style="--gain:${Math.max(0,pct)/maxPct*100}%"></div></div></div>`;
    } else if (number(r.delta_hp) || number(r.delta_nm)) {
      result = `<p class="dyno-card__delta">${[number(r.delta_hp) ? `${signed(r.delta_hp)} л.с.` : '', number(r.delta_nm) ? `${signed(r.delta_nm)} Н·м` : ''].filter(Boolean).join(' · ')}</p>`;
    }
    return `<article class="dyno-card" data-id="${esc(r.id)}">${media}<div class="dyno-card__body"><div class="dyno-card__meta">${date(r)}${r.year ? `<span>${esc(r.year)} г.</span>` : ''}</div><h3>${esc(name)}</h3>${metric(r,'hp','л.с.')}${metric(r,'nm','Н·м','dyno-card__numbers--torque')}${result}${!full(r) ? '<p class="dyno-card__note">В публикации нет полной пары «сток / результат».</p>' : ''}${features(r).length ? `<ul class="dyno-card__features">${features(r).map(f=>`<li>${esc(labels[f] || f.replaceAll('_',' '))}</li>`).join('')}</ul>` : ''}<div class="dyno-card__footer">${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" aria-label="Пост в Instagram: ${esc(name)} (новая вкладка)">Пост в Instagram</a>` : ''}${number(r.likes) ? `<span>${fmt(r.likes)} отметок «Нравится»</span>` : ''}</div></div></article>`;
  }
  function render(append = false) {
    const previous = grid.children.length;
    if (append) grid.insertAdjacentHTML('beforeend', filtered.slice(previous,limit).map(card).join(''));
    else grid.innerHTML = filtered.slice(0,limit).map(card).join('');
    $('.dyno__count').textContent = `Показано ${Math.min(limit,filtered.length)} из ${records.length}`;
    $('.dyno__matched').textContent = filtered.length === records.length ? '' : `По фильтрам: ${filtered.length}`;
    more.hidden = limit >= filtered.length;
    status.hidden = filtered.length > 0;
    if (!filtered.length) status.textContent = 'Таких замеров нет. Измените фильтры или нажмите «Сбросить».';
    grid.querySelectorAll('img').forEach(img => img.addEventListener('error', () => img.remove(), {once:true}));
    if (append) {
      const next = grid.children[previous]?.querySelector('a');
      next?.focus({preventScroll:true});
    }
  }
  function filter() {
    const values = new FormData(form);
    filtered = records.filter(r => (!values.get('brand') || brand(r) === values.get('brand')) &&
      (!values.get('year') || String(r.year || '') === values.get('year')) &&
      (!values.get('work') || features(r).includes(values.get('work'))) && (!values.get('full') || r.quality === 'full'));
    const sort = values.get('sort');
    filtered.sort((a,b) => sort === 'gain' ? (gain(b) === gain(a) ? 0 : gain(b) > gain(a) ? 1 : -1) : sort === 'likes' ? (b.likes || 0)-(a.likes || 0) : String(b.date || '').localeCompare(String(a.date || '')));
    limit = 12;
    render();
  }
  function options(name, values, label = v => v) {
    const select = form.elements[name];
    select.length = 1;
    values.forEach(v => select.add(new Option(label(v),v)));
  }
  async function load() {
    status.hidden = false;
    status.textContent = 'Загружаем архив замеров…';
    form.setAttribute('aria-busy','true');
    Array.from(form.elements).forEach(el => el.disabled = true);
    try {
      const responses = await Promise.all([fetch('data/dyno_records.json'),fetch('data/dyno-images.json')]);
      if (responses.some(r => !r.ok)) throw new Error('HTTP');
      const [data,map] = await Promise.all(responses.map(r => r.json()));
      if (!Array.isArray(data) || !data.length || !map || typeof map !== 'object') throw new Error('Data');
      records = data.filter(r => r && typeof r === 'object'); images = map;
      maxPct = Math.max(1,...records.filter(full).map(r => number(r.pct_hp) ? r.pct_hp : r.stock_hp > 0 ? (r.stage_hp-r.stock_hp)/r.stock_hp*100 : 0));
      $('.dyno__total').textContent = records.length;
      options('brand',[...new Set(records.map(brand).filter(Boolean))].sort());
      options('year',[...new Set(records.map(r=>String(r.year || '')).filter(Boolean))].sort().reverse());
      options('work',[...new Set(records.flatMap(features))].sort((a,b)=>(labels[a] || a).localeCompare(labels[b] || b,'ru')),v=>labels[v] || v.replaceAll('_',' '));
      const top = records.filter(r=>Number.isFinite(gain(r))).sort((a,b)=>gain(b)-gain(a)).slice(0,4);
      $('.dyno__leaders').innerHTML = top.map(r=>`<a class="dyno__leader" href="${esc(localImage(r)) || link(r)}" data-dyno-open="${esc(r.id)}" aria-label="Открыть замер: ${esc(carName(r))}"><strong>${signed(gain(r))} л.с.</strong><span>${esc(carName(r))}</span>${date(r)}</a>`).join('');
      $('.dyno__highlights').hidden = false;
      filter(); watchBars();
    } catch {
      status.innerHTML = '<p>Не удалось загрузить архив замеров. Проверьте соединение и попробуйте ещё раз.</p><button class="dyno__button" type="button">Повторить загрузку</button>';
      status.querySelector('button').addEventListener('click',load,{once:true});
    } finally {
      form.removeAttribute('aria-busy');
      Array.from(form.elements).forEach(el => el.disabled = records.length === 0);
    }
  }
  form.addEventListener('submit', e=>e.preventDefault());
  form.addEventListener('change',filter);
  form.addEventListener('reset',()=>setTimeout(filter,0));
  more.addEventListener('click',()=>{limit += 12;render(true);});
  load();
})();
