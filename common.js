/* Общие данные и функции сайта и админки Radjabov Mobile */
(function (w) {
  'use strict';

  var CATS = ['iPhone', 'Apple Watch', 'AirPods', 'iPad', 'MacBook', 'Samsung', 'Другое'];

  /* Все модели iPhone, от новых к старым */
  var IPHONES = [
    ['iPhone 18', ['iPhone 18 Pro Max', 'iPhone 18 Pro']],
    ['iPhone 17', ['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17 Air', 'iPhone 17', 'iPhone 17e']],
    ['iPhone 16', ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16', 'iPhone 16e']],
    ['iPhone 15', ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15']],
    ['iPhone 14', ['iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14']],
    ['iPhone 13', ['iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13', 'iPhone 13 mini']],
    ['iPhone 12', ['iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12', 'iPhone 12 mini']],
    ['iPhone 11', ['iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11']],
    ['iPhone SE', ['iPhone SE (3-го поколения)', 'iPhone SE (2-го поколения)']],
    ['Старые', ['iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X', 'iPhone 8 Plus', 'iPhone 8']]
  ];

  var OTHER_MODELS = {
    'Apple Watch': ['Apple Watch Ultra 3', 'Apple Watch Ultra 2', 'Apple Watch Series 11 46mm', 'Apple Watch Series 11 42mm', 'Apple Watch SE 3 44mm', 'Apple Watch SE 3 40mm', 'Apple Watch Series 10 46mm', 'Apple Watch Series 10 42mm', 'Apple Watch Series 9 45mm', 'Apple Watch Series 9 41mm', 'Apple Watch SE 2 44mm', 'Apple Watch SE 2 40mm', 'Apple Watch Series 6 44mm'],
    'AirPods': ['AirPods Pro 3', 'AirPods Pro 2', 'AirPods 4', 'AirPods 4 ANC', 'AirPods Max 2', 'AirPods Max', 'EarPods'],
    'iPad': ['iPad Pro 13"', 'iPad Pro 11"', 'iPad Air 13"', 'iPad Air 11"', 'iPad 11', 'iPad mini'],
    'MacBook': ['MacBook Air 13"', 'MacBook Air 15"', 'MacBook Pro 14"', 'MacBook Pro 16"'],
    'Samsung': ['Samsung S25 Ultra', 'Samsung S25+', 'Samsung S25', 'Samsung S24 Ultra', 'Samsung S23 Ultra', 'Samsung Z Fold 7', 'Samsung Z Flip 7'],
    'Другое': ['Dyson Airwrap', 'Dyson Supersonic', 'Dyson Corrale']
  };

  var MEMORY = ['64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];

  /* Цвета и оттенок для кружка-образца */
  var COLORS = {
    'Black': '#1d1d1f', 'Space Black': '#2b2a2c', 'Midnight': '#1f2430', 'Graphite': '#4a4845',
    'White': '#f2f1ec', 'Starlight': '#efe7da', 'Silver': '#dfe0dc', 'Cloud White': '#f3f3f1',
    'Gold': '#e8d3b0', 'Light Gold': '#e9d9b8', 'Desert Titanium': '#bfa48f', 'Natural Titanium': '#b9b4ab',
    'Black Titanium': '#3c3b39', 'White Titanium': '#e6e4df', 'Blue Titanium': '#3f4b5c',
    'Blue': '#5b7fa8', 'Deep Blue': '#2e3b55', 'Sierra Blue': '#9bb5ce', 'Mist Blue': '#a9bdd0', 'Sky Blue': '#b9d3e6', 'Ultramarine': '#5d6ee8', 'Teal': '#6fa8a3',
    'Purple': '#b9a7cf', 'Deep Purple': '#5e5568', 'Lavender': '#c9bfe0',
    'Pink': '#f3c9cf', 'Rose': '#f0c6c3', 'Red': '#b3202d', 'Yellow': '#f5e08a',
    'Green': '#3f5547', 'Alpine Green': '#4a5c4e', 'Sage': '#b2bfa5', 'Cosmic Orange': '#e0773a', 'Orange': '#e0773a', 'Burgundy': '#6b2333', 'Cobalt Violet': '#4d4a86'
  };
  var DEFECTS = ['Царапины на корпусе', 'Сколы на корпусе', 'Царапины на экране', 'Трещина на экране', 'Заменён экран', 'Заменён аккумулятор', 'Износ аккумулятора', 'Не работает Face ID / Touch ID', 'Неоригинальная деталь', 'Другое'];
  var KIT = ['Коробка', 'Кабель', 'Чек', 'Чехол'];
  var WARRANTY = ['До 2 лет', 'До 1 года', '6 месяцев', '3 месяца', '1 месяц', 'Без гарантии'];
  var STATUS = { available: 'В наличии', reserved: 'Забронирован', sold: 'Продан', hidden: 'Скрыт' };

  /* Сервер админки (Cloudflare Worker): каталог, фото и видео */
  var API = 'https://radjabov-admin.sentora-admin-worker.workers.dev';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return (Math.round(+n) || 0).toLocaleString('ru-RU').replace(/[  ]/g, ' ') + ' ₸'; }
  function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е'); }
  function title(it) { return [it.model, it.memory].filter(Boolean).join(' '); }

  /* Каталог: сначала с сервера, если там пусто или нет связи — из файла на сайте */
  function fileCatalog() { return fetch('data/catalog.json?t=' + Date.now()).then(function (r) { return r.json(); }); }
  function loadCatalog() {
    var ctl = w.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 5000);
    return fetch(API + '/catalog', { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw new Error('empty'); return r.json(); })
      .then(function (d) { return { data: d, server: true }; })
      .catch(function () { clearTimeout(t); return fileCatalog().then(function (d) { return { data: d, server: false }; }); });
  }

  /* Загрузка файла на сервер частями (видео может быть больше лимита одной части) */
  function uploadFile(blob, token, onProgress) {
    var type = blob.type || 'application/octet-stream';
    if (type === 'video/x-m4v') type = 'video/mp4';
    var h = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };
    function call(path, opts) {
      return fetch(API + path, opts).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var e = new Error(j.error || ('Ошибка ' + r.status)); e.status = r.status; throw e; } return j; });
      });
    }
    return call('/admin/upload/start', { method: 'POST', headers: h, body: JSON.stringify({ type: type, size: blob.size }) }).then(function (s) {
      var i = 0;
      function next() {
        if (i >= s.parts) return call('/admin/upload/' + s.id + '/finish', { method: 'POST', headers: h, body: JSON.stringify({ type: type, size: blob.size }) });
        var part = blob.slice(i * s.chunk, Math.min(blob.size, (i + 1) * s.chunk));
        return call('/admin/upload/' + s.id + '/' + i, { method: 'PUT', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/octet-stream' }, body: part })
          .then(function () { i++; if (onProgress) onProgress(i / s.parts); return next(); });
      }
      return next();
    }).then(function (f) { return f.ref; });
  }

  /* Ссылки на файлы: kv:<id> — файл на сервере, остальное — файл на сайте */
  function src(ref) { return ref && ref.indexOf('kv:') === 0 ? API + '/m/' + ref.slice(3) : (ref || ''); }
  function hydrate(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('[data-media]'), function (el) {
      el.src = src(el.getAttribute('data-media')); el.removeAttribute('data-media');
    });
  }

  /* Сжатие фото перед сохранением */
  function compressImage(file, max) {
    max = max || 1400;
    return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
        c.toBlob(function (b) { b ? res(b) : rej(new Error('Не удалось обработать фото')); }, 'image/webp', 0.84);
      };
      img.onerror = function () { rej(new Error('Не удалось открыть фото')); };
      img.src = u;
    });
  }

  /* Картинка-заглушка, если фото ещё нет */
  function placeholder(it) {
    var c = COLORS[it.color] || '#3a4560';
    var cat = it.cat || 'iPhone';
    var body;
    if (cat === 'Apple Watch') {
      body = '<rect x="70" y="40" width="60" height="30" rx="8" fill="#232a3a"/><rect x="70" y="150" width="60" height="30" rx="8" fill="#232a3a"/>' +
        '<rect x="55" y="62" width="90" height="96" rx="24" fill="' + c + '" stroke="rgba(255,255,255,.35)"/><rect x="63" y="70" width="74" height="80" rx="18" fill="#05070c"/>' +
        '<text x="100" y="117" fill="#fff" font-family="Montserrat,sans-serif" font-size="20" font-weight="800" text-anchor="middle">10:09</text>';
    } else if (cat === 'AirPods') {
      body = '<rect x="50" y="70" width="100" height="84" rx="30" fill="#f4f4f2" stroke="rgba(0,0,0,.15)"/><line x1="52" y1="100" x2="148" y2="100" stroke="rgba(0,0,0,.18)" stroke-width="2"/><circle cx="100" cy="122" r="4" fill="#c9c9c6"/>';
    } else if (cat === 'iPhone' || cat === 'Samsung') {
      var pro = /Pro|Ultra/.test(it.model || '');
      var cams = pro ? '<rect x="72" y="34" width="44" height="44" rx="12" fill="rgba(0,0,0,.18)"/><circle cx="84" cy="46" r="8" fill="#14161c"/><circle cx="104" cy="46" r="8" fill="#14161c"/><circle cx="84" cy="66" r="8" fill="#14161c"/>'
        : '<rect x="72" y="34" width="26" height="44" rx="12" fill="rgba(0,0,0,.18)"/><circle cx="85" cy="46" r="8" fill="#14161c"/><circle cx="85" cy="66" r="8" fill="#14161c"/>';
      body = '<rect x="62" y="22" width="76" height="150" rx="20" fill="' + c + '" stroke="rgba(255,255,255,.4)" stroke-width="1.5"/>' + cams;
    } else {
      body = '<rect x="45" y="45" width="110" height="110" rx="22" fill="' + c + '" stroke="rgba(255,255,255,.35)"/>';
    }
    var short = String(it.model || '').replace(/^(iPhone|Apple Watch|Samsung)\s+/, '').replace(/\s+\d+mm$/, '');
    if (short) body += '<text x="100" y="204" fill="#fff" font-family="Montserrat,sans-serif" font-size="' + (short.length > 12 ? 13 : 16) + '" font-weight="900" text-anchor="middle" letter-spacing=".5">' + esc(short.toUpperCase()) + '</text>';
    return '<svg class="ph" viewBox="0 0 200 220" aria-hidden="true"><defs><radialGradient id="g" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#2d4c8f" stop-opacity=".55"/><stop offset="1" stop-color="#0c1220" stop-opacity="0"/></radialGradient></defs><rect width="200" height="220" fill="url(#g)"/>' + body + '</svg>';
  }

  /* Карточка товара — одна и та же на сайте и в предпросмотре админки */
  function isSale(it) { return +it.oldPrice > +it.price; }
  function mediaTag(ref, alt) {
    if (!ref) return '';
    return '<img src="' + esc(src(ref)) + '" alt="' + esc(alt) + '" loading="lazy">';
  }
  function card(it) {
    var t = title(it), photo = (it.photos || [])[0];
    var b = [];
    b.push(it.cond === 'new' ? '<span class="badge badge--new">НОВЫЙ</span>' : '<span class="badge">Б/У</span>');
    if (isSale(it)) b.push('<span class="badge badge--sale">−' + money(it.oldPrice - it.price) + '</span>');
    if (it.status === 'reserved') b.push('<span class="badge badge--res">Бронь</span>');
    var meta = [];
    if (it.color) meta.push('<i><span class="dot" style="background:' + (COLORS[it.color] || '#556') + '"></span>' + esc(it.color) + '</i>');
    if (it.sim) meta.push('<i>' + esc(it.sim) + '</i>');
    if (it.cond === 'used' && it.battery) meta.push('<i class="bat' + (it.battery < 85 ? ' bat--low' : '') + '">🔋 ' + it.battery + '%</i>');
    var def = it.cond === 'new' ? '' : (it.hasDefects ? '<span class="def def--bad">Есть дефекты</span>' : '<span class="def def--ok">Без дефектов</span>');
    return '<button type="button" class="card" data-id="' + esc(it.id) + '" aria-label="' + esc(t) + '">' +
      '<div class="card__media">' + (photo ? mediaTag(photo, t) : placeholder(it)) +
      '<div class="badges">' + b.join('') + '</div>' +
      (it.video ? '<span class="card__vid" title="Есть видео"><svg viewBox="0 0 12 14"><path d="M0 0l12 7-12 7z" fill="#fff"/></svg></span>' : '') + '</div>' +
      '<div class="card__body"><h3 class="card__title">' + esc(t || 'Модель не выбрана') + '</h3>' +
      (meta.length ? '<div class="meta">' + meta.join('') + '</div>' : '') +
      '<div class="card__foot"><div class="price">' + (isSale(it) ? '<s>' + money(it.oldPrice) + '</s>' : '') + money(it.price) + '</div>' + def + '</div></div></button>';
  }

  function logo(cls) {
    return '<svg class="' + (cls || 'logo-mark') + '" viewBox="0 0 40 40" aria-hidden="true"><path d="M6 4h22a8 8 0 0 1 8 8v4H22a6 6 0 0 0-6 6v14H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="currentColor"/><rect x="22" y="22" width="14" height="14" rx="3" fill="currentColor"/></svg>';
  }

  w.RM = {
    CATS: CATS, IPHONES: IPHONES, OTHER_MODELS: OTHER_MODELS, MEMORY: MEMORY, COLORS: COLORS, DEFECTS: DEFECTS, KIT: KIT, WARRANTY: WARRANTY, STATUS: STATUS,
    esc: esc, money: money, norm: norm, title: title, API: API, loadCatalog: loadCatalog, uploadFile: uploadFile,
    hydrate: hydrate, src: src, compressImage: compressImage, placeholder: placeholder, logo: logo, card: card, isSale: isSale, mediaTag: mediaTag
  };
})(window);
