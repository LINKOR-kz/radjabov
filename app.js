(function () {
  'use strict';
  var R = window.RM, esc = R.esc, money = R.money;
  var D = null, S = {};
  var F = { cond: 'all', cat: '', model: '', mem: '', q: '', sort: 'rec', noDef: false };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  $('#logoMark').innerHTML = R.logo();

  function waLink(text) { return 'https://wa.me/' + (S.whatsapp || '') + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function visible(it) { return it.status === 'available' || it.status === 'reserved'; }
  function isSale(it) { return +it.oldPrice > +it.price; }

  R.loadCatalog().then(function (res) {
    D = res.data; S = D.settings || {};
    fillContacts(); renderPromos(); buildFilters(); renderRails(); renderGrid();
    var m = location.hash.match(/^#item-(.+)$/); if (m) openItem(decodeURIComponent(m[1]));
  }).catch(function () { $('#grid').innerHTML = '<p class="empty">Не удалось загрузить каталог. Обновите страницу.</p>'; });

  /* ---------- контакты ---------- */
  function fillContacts() {
    var wa = waLink('Здравствуйте! Пишу с сайта Radjabov Mobile.');
    $('#topWa').href = wa; $('#cWa').href = wa;
    $('#cAddr').textContent = (S.city ? S.city + ', ' : '') + (S.address || '');
    $('#cHours').textContent = S.hours || '';
    $('#cPhone').textContent = S.phone || ''; $('#cPhone').href = 'tel:' + String(S.phone || '').replace(/[^\d+]/g, '');
    $('#cTg').href = 'https://t.me/' + (S.telegram || '');
    $('#cIg').href = 'https://www.instagram.com/' + (S.instagram || '') + '/';
    $('#cMap').href = S.map || '#';
  }

  /* ---------- акции ---------- */
  function renderPromos() {
    var list = (D.promos || []).filter(function (p) { return p.active; });
    $('#promos').innerHTML = list.map(function (p) {
      return '<article class="promo promo--' + esc(p.tone || 'blue') + '">' +
        (p.img ? '<img class="promo__img" alt="" ' + 'src="' + esc(R.src(p.img)) + '"' + '>' : '') +
        '<span class="promo__mark">' + R.logo('') + '</span>' +
        '<h3>' + esc(p.title) + '</h3><p>' + esc(p.text) + '</p></article>';
    }).join('');
    R.hydrate($('#promos'));
  }

  /* ---------- карточка ---------- */
  var media = R.mediaTag, card = R.card;

  function renderRails() {
    var all = D.items.filter(visible);
    var sale = all.filter(isSale);
    $('#saleRail').innerHTML = sale.map(card).join('');
    var fresh = all.slice().sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); }).slice(0, 8);
    $('#freshRail').innerHTML = fresh.map(card).join('');
    $('#fresh').hidden = !fresh.length;
    $('#cntNew').textContent = all.filter(function (i) { return i.cond === 'new'; }).length;
    $('#cntUsed').textContent = all.filter(function (i) { return i.cond === 'used'; }).length;
    R.hydrate($('#saleRail')); R.hydrate($('#freshRail'));
  }

  /* ---------- фильтры ---------- */
  function buildFilters() {
    var items = D.items.filter(visible);
    var cats = R.CATS.filter(function (c) { return items.some(function (i) { return i.cat === c; }); });
    $('#catChips').innerHTML = '<button class="chip is-on" data-cat="">Все</button>' + cats.map(function (c) { return '<button class="chip" data-cat="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
    fillModelSel();
    var mems = R.MEMORY.filter(function (m) { return items.some(function (i) { return i.memory === m; }); });
    $('#memSel').innerHTML = '<option value="">Любая память</option>' + mems.map(function (m) { return '<option>' + m + '</option>'; }).join('');
  }
  function fillModelSel() {
    var items = D.items.filter(visible).filter(function (i) { return !F.cat || i.cat === F.cat; });
    var order = [];
    R.IPHONES.forEach(function (g) { order = order.concat(g[1]); });
    Object.keys(R.OTHER_MODELS).forEach(function (k) { order = order.concat(R.OTHER_MODELS[k]); });
    var models = {}; items.forEach(function (i) { models[i.model] = 1; });
    var list = Object.keys(models).sort(function (a, b) { var ia = order.indexOf(a), ib = order.indexOf(b); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib); });
    if (list.indexOf(F.model) < 0) F.model = '';
    $('#modelSel').innerHTML = '<option value="">Все модели</option>' + list.map(function (m) { return '<option' + (m === F.model ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('');
  }

  function filtered() {
    var q = R.norm(F.q).replace(/\s+/g, ' ').trim();
    var list = D.items.filter(visible).filter(function (i) {
      if (F.cond !== 'all' && i.cond !== F.cond) return false;
      if (F.cat && i.cat !== F.cat) return false;
      if (F.model && i.model !== F.model) return false;
      if (F.mem && i.memory !== F.mem) return false;
      if (F.noDef && i.hasDefects) return false;
      if (q) {
        var hay = R.norm([i.model, i.memory, i.color, i.sim, i.cat, i.cond === 'new' ? 'новый' : 'бу б/у'].join(' '));
        if (!q.split(' ').every(function (w) { return hay.indexOf(w) >= 0; })) return false;
      }
      return true;
    });
    list.sort(function (a, b) {
      if (F.sort === 'cheap') return a.price - b.price;
      if (F.sort === 'exp') return b.price - a.price;
      if (F.sort === 'rec') {
        var sa = (a.featured ? 4 : 0) + (a.video ? 2 : 0) + ((a.photos || []).length ? 2 : 0) + (isSale(a) ? 1 : 0);
        var sb = (b.featured ? 4 : 0) + (b.video ? 2 : 0) + ((b.photos || []).length ? 2 : 0) + (isSale(b) ? 1 : 0);
        if (sa !== sb) return sb - sa;
      }
      return String(b.created).localeCompare(String(a.created));
    });
    return list;
  }
  function plural(n) { var m = n % 10, h = n % 100; return m === 1 && h !== 11 ? 'устройство' : m >= 2 && m <= 4 && (h < 12 || h > 14) ? 'устройства' : 'устройств'; }
  function renderGrid() {
    var list = filtered();
    $('#grid').innerHTML = list.map(card).join('');
    $('#found').textContent = 'Найдено: ' + list.length + ' ' + plural(list.length);
    $('#empty').hidden = !!list.length;
    R.hydrate($('#grid'));
  }

  $('#condTabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    F.cond = b.dataset.cond; $$('#condTabs button').forEach(function (x) { x.classList.toggle('is-on', x === b); }); renderGrid();
  });
  $('#catChips').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    F.cat = b.dataset.cat; $$('#catChips .chip').forEach(function (x) { x.classList.toggle('is-on', x === b); }); fillModelSel(); renderGrid();
  });
  $('#modelSel').addEventListener('change', function () { F.model = this.value; renderGrid(); });
  $('#memSel').addEventListener('change', function () { F.mem = this.value; renderGrid(); });
  $('#sortSel').addEventListener('change', function () { F.sort = this.value; renderGrid(); });
  $('#noDef').addEventListener('change', function () { F.noDef = this.checked; renderGrid(); });
  var qt; $('#q').addEventListener('input', function () { var v = this.value; clearTimeout(qt); qt = setTimeout(function () { F.q = v; renderGrid(); }, 150); });
  $('#resetF').addEventListener('click', function () {
    F = { cond: 'all', cat: '', model: '', mem: '', q: '', sort: 'rec', noDef: false };
    $('#q').value = ''; $('#noDef').checked = false; $('#sortSel').value = 'rec'; $('#memSel').value = '';
    $$('#condTabs button').forEach(function (x) { x.classList.toggle('is-on', x.dataset.cond === 'all'); });
    $$('#catChips .chip').forEach(function (x) { x.classList.toggle('is-on', !x.dataset.cat); });
    fillModelSel(); renderGrid();
  });
  $$('[data-jump]').forEach(function (a) {
    a.addEventListener('click', function () { var b = $('#condTabs [data-cond="' + a.dataset.jump + '"]'); if (b) b.click(); });
  });

  /* ---------- карточка товара ---------- */
  document.addEventListener('click', function (e) {
    var c = e.target.closest('.card'); if (c) { openItem(c.dataset.id); return; }
    if (e.target.closest('[data-close]')) closeItem();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#modal').hidden) closeItem(); });

  function openItem(id) {
    var it = D.items.find(function (i) { return i.id === id; }); if (!it) return;
    var t = R.title(it);
    var slides = (it.video ? [{ v: it.video }] : []).concat((it.photos || []).map(function (p) { return { p: p }; }));
    function show(i) {
      var s = slides[i], st = $('#mStage');
      if (!s) { st.innerHTML = R.placeholder(it); return; }
      st.innerHTML = s.v ? '<video controls playsinline autoplay muted loop ' + 'src="' + esc(R.src(s.v)) + '"' + '></video>' : media(s.p, t);
      R.hydrate(st);
      $$('#mThumbs button').forEach(function (b, k) { b.classList.toggle('is-on', k === i); });
    }
    var poster = (it.photos || [])[0];
    $('#mThumbs').innerHTML = slides.length > 1 ? slides.map(function (s, i) {
      return '<button data-i="' + i + '" aria-label="' + (s.v ? 'Видео' : 'Фото ' + i) + '">' + (s.v ? (poster ? media(poster, '') : '') + '<span class="play"><svg viewBox="0 0 12 14"><path d="M0 0l12 7-12 7z" fill="#fff"/></svg></span>' : media(s.p, '')) + '</button>';
    }).join('') : '';
    R.hydrate($('#mThumbs'));
    $('#mThumbs').onclick = function (e) { var b = e.target.closest('button'); if (b) show(+b.dataset.i); };
    show(0);

    var tags = [it.cond === 'new' ? '<span class="badge badge--new">НОВЫЙ</span>' : '<span class="badge">Б/У</span>'];
    if (isSale(it)) tags.push('<span class="badge badge--sale">АКЦИЯ</span>');
    if (it.status === 'reserved') tags.push('<span class="badge badge--res">Забронирован</span>');
    var spec = [['Категория', it.cat], ['Память', it.memory], ['Цвет', it.color || 'Уточняйте наличие'], ['SIM', it.sim], ['Аккумулятор', it.cond === 'used' && it.battery ? it.battery + '%' : (it.cond === 'new' ? '100% (новый)' : '')], ['Комплект', (it.kit || []).join(', ')], ['Гарантия', it.warranty]]
      .filter(function (r) { return r[1]; }).map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('');
    var defs = '';
    if (it.cond === 'used') {
      defs = it.hasDefects
        ? '<div class="defbox defbox--bad"><b>Есть дефекты</b>' + ((it.defects || []).length ? '<ul>' + it.defects.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' : '') + (it.defectsNote ? '<p style="margin:8px 0 0">' + esc(it.defectsNote) + '</p>' : '') + '</div>'
        : '<div class="defbox defbox--ok"><b>Без дефектов</b>Проверен специалистами, всё работает.</div>';
    }
    var msg = 'Здравствуйте! Интересует ' + t + (it.color ? ', ' + it.color : '') + ' (' + (it.cond === 'new' ? 'новый' : 'Б/У') + ') за ' + money(it.price) + '. Он ещё в наличии?';
    $('#mInfo').innerHTML = '<div class="pd__tags">' + tags.join('') + '</div><h3 id="mTitle">' + esc(t) + '</h3>' +
      '<div class="pd__price">' + money(it.price) + (isSale(it) ? '<s>' + money(it.oldPrice) + '</s>' : '') + '</div>' +
      '<dl class="spec">' + spec + '</dl>' + defs +
      (it.desc ? '<p class="pd__desc">' + esc(it.desc) + '</p>' : '') +
      '<a class="btn btn--wa pd__buy" target="_blank" rel="noopener" href="' + esc(waLink(msg)) + '">Купить через WhatsApp</a>' +
      '<p class="pd__hint">' + esc(S.address || '') + '</p>';
    $('#modal').hidden = false; document.body.style.overflow = 'hidden';
    history.replaceState(null, '', '#item-' + encodeURIComponent(id));
  }
  function closeItem() {
    $('#modal').hidden = true; document.body.style.overflow = ''; $('#mStage').innerHTML = '';
    history.replaceState(null, '', location.pathname + location.search);
  }
})();
