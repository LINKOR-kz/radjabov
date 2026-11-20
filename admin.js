(function () {
  'use strict';
  var R = window.RM, esc = R.esc, money = R.money;
  var TOKEN_KEY = 'rm-admin-token';
  var D = null, version = 0, tab = 'items', edit = null, editIsNew = false;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  var toastT;
  function toast(msg, err) { var t = $('#toast'); t.textContent = msg; t.classList.toggle('is-err', !!err); t.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('is-on'); }, err ? 5000 : 2600); }
  function num(v) { return +String(v || '').replace(/[^\d]/g, '') || 0; }
  function uid() { return 'it-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function setToken(t) { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) { } }

  function api(path, opts) {
    opts = opts || {};
    var h = { 'Content-Type': 'application/json' }, t = getToken(); if (t) h.Authorization = 'Bearer ' + t;
    return fetch(R.API + path, { method: opts.method || 'GET', headers: h, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (r.status === 401 && path !== '/login') { setToken(''); showLogin('Сессия закончилась, войдите снова.'); throw new Error('auth'); }
          if (!r.ok) { var e = new Error(j.error || ('Ошибка ' + r.status)); e.status = r.status; throw e; }
          return j;
        });
      }, function () { throw new Error('Нет связи с сервером. Проверьте интернет.'); });
  }

  /* Сохранение на сервер. Сохранения идут по очереди, чтобы не было конфликтов. */
  var queue = Promise.resolve();
  function persist(msg) {
    var snapshot = JSON.parse(JSON.stringify(D));
    queue = queue.then(function () {
      setSaving(true);
      return api('/admin/save', { method: 'POST', body: { data: snapshot, version: version } }).then(function (j) {
        version = j.version; D.meta = { updated: j.updated };
        if (msg) toast(msg);
      }).catch(function (e) {
        if (e.message === 'auth') return;
        if (e.status === 409 && confirm(e.message + '\n\nОбновить страницу сейчас?')) { location.reload(); return; }
        toast('Не сохранилось: ' + e.message, true);
      }).finally(function () { setSaving(false); });
    });
    return queue;
  }
  function setSaving(on) { document.body.classList.toggle('is-saving', on); }

  $('#logoMark').innerHTML = R.logo();

  /* ---------- вход ---------- */
  function showLogin(msg) {
    $('#appView').hidden = true; $('#headRight').hidden = true; $('#loginView').hidden = false;
    var e = $('#loginErr'); e.hidden = !msg; e.textContent = msg || '';
    setTimeout(function () { $('#pw').focus(); }, 50);
  }
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var b = $('#loginBtn'); b.disabled = true; b.textContent = 'Проверяем…';
    api('/login', { method: 'POST', body: { password: $('#pw').value } })
      .then(function (j) { setToken(j.token); $('#pw').value = ''; return start(); })
      .catch(function (err) { if (err.message !== 'auth') showLogin(err.message); })
      .finally(function () { b.disabled = false; b.textContent = 'Войти'; });
  });
  $('#logout').addEventListener('click', function () { setToken(''); location.reload(); });

  function start() {
    return api('/admin/data').then(function (j) {
      version = j.version;
      if (j.data) return j.data;
      // на сервере ещё пусто — берём стартовый каталог с сайта
      return fetch('data/catalog.json?t=' + Date.now()).then(function (r) { return r.json(); });
    }).then(function (d) {
      D = d; D.items = D.items || []; D.promos = D.promos || []; D.settings = D.settings || {};
      $('#loginView').hidden = true; $('#appView').hidden = false; $('#headRight').hidden = false;
      render();
    }).catch(function (e) { if (e.message !== 'auth') showLogin(e.message); });
  }
  if (getToken()) start(); else showLogin();

  /* ---------- вкладки ---------- */
  $('#tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; tab = b.dataset.tab; render();
  });
  function render() {
    $$('#tabs button').forEach(function (b) { b.classList.toggle('is-on', b.dataset.tab === tab); });
    ['items', 'promos', 'settings'].forEach(function (t) { $('#tab-' + t).hidden = t !== tab; });
    $('#nItems').textContent = D.items.length; $('#nPromos').textContent = D.promos.length;
    if (tab === 'items') renderList();
    if (tab === 'promos') renderPromos();
    if (tab === 'settings') fillSettings();
  }

  /* ---------- список устройств ---------- */
  function renderList() {
    var q = R.norm($('#q').value.trim()), f = $('#fSel').value;
    var list = D.items.slice().sort(function (a, b) { return String(b.created).localeCompare(String(a.created)); }).filter(function (it) {
      if (f === 'new' || f === 'used') { if (it.cond !== f) return false; }
      else if (f && it.status !== f) return false;
      if (q && R.norm([it.model, it.memory, it.color].join(' ')).indexOf(q) < 0) return false;
      return true;
    });
    if (!list.length) { $('#list').innerHTML = '<p class="empty muted">Ничего не найдено</p>'; return; }
    $('#list').innerHTML = list.map(function (it) {
      var ph = (it.photos || [])[0];
      var m = [it.color, it.sim, it.cond === 'used' && it.battery ? '🔋 ' + it.battery + '%' : '', it.video ? '▶ видео' : '', (it.photos || []).length ? (it.photos.length + ' фото') : 'нет фото'].filter(Boolean).map(esc).join(' · ');
      var tags = '<span class="tag' + (it.cond === 'new' ? ' tag--new">НОВЫЙ' : '">Б/У') + '</span>' +
        (it.cond === 'used' ? (it.hasDefects ? '<span class="tag tag--def">дефекты</span>' : '<span class="tag tag--ok">без дефектов</span>') : '');
      return '<div class="row' + (it.status === 'sold' || it.status === 'hidden' ? ' is-off' : '') + '" data-id="' + esc(it.id) + '">' +
        '<div class="row__img">' + (ph ? R.mediaTag(ph, '') : R.placeholder(it)) + '</div>' +
        '<div class="row__info"><div class="row__t">' + esc(R.title(it)) + '</div><div class="row__m">' + tags + ' ' + m + '</div></div>' +
        '<div class="row__p">' + (R.isSale(it) ? '<s>' + money(it.oldPrice) + '</s>' : '') + money(it.price) + '</div>' +
        '<div class="row__st"><select data-act="status" aria-label="Статус">' + Object.keys(R.STATUS).map(function (k) { return '<option value="' + k + '"' + (k === it.status ? ' selected' : '') + '>' + R.STATUS[k] + '</option>'; }).join('') + '</select></div>' +
        '<div class="row__act"><button class="ibtn" data-act="edit" title="Редактировать">✎</button><button class="ibtn" data-act="copy" title="Сделать копию">⧉</button><button class="ibtn ibtn--del" data-act="del" title="Удалить">🗑</button></div></div>';
    }).join('');
    R.hydrate($('#list'));
  }
  $('#q').addEventListener('input', renderList);
  $('#fSel').addEventListener('change', renderList);
  function byId(id) { return D.items.find(function (i) { return i.id === id; }); }
  $('#list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT') return;
    var row = b.closest('.row'), it = byId(row.dataset.id);
    if (b.dataset.act === 'edit') openEditor(it);
    if (b.dataset.act === 'copy') { var c = JSON.parse(JSON.stringify(it)); c.id = uid(); c.created = new Date().toISOString(); openEditor(c, true); }
    if (b.dataset.act === 'del' && confirm('Удалить «' + R.title(it) + '»? Это нельзя отменить.')) {
      D.items = D.items.filter(function (x) { return x !== it; }); persist('Удалено'); render();
    }
  });
  $('#list').addEventListener('change', function (e) {
    if (e.target.dataset.act !== 'status') return;
    var it = byId(e.target.closest('.row').dataset.id); it.status = e.target.value;
    persist('Статус: ' + R.STATUS[it.status]); renderList();
  });
  $('#addItem').addEventListener('click', function () {
    openEditor({ id: uid(), cat: 'iPhone', model: '', memory: '', color: '', cond: 'used', sim: '', battery: 100, price: 0, oldPrice: 0, hasDefects: false, defects: [], defectsNote: '', kit: [], warranty: 'До 1 года', desc: '', photos: [], video: '', status: 'available', featured: false, created: new Date().toISOString() }, true);
  });

  /* ---------- редактор ---------- */
  var form = $('#itemForm');
  $('#catSel').innerHTML = R.CATS.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
  $('#warSel').innerHTML = R.WARRANTY.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('');
  $('#stSel').innerHTML = Object.keys(R.STATUS).map(function (k) { return '<option value="' + k + '">' + R.STATUS[k] + '</option>'; }).join('');
  $('#colorList').innerHTML = Object.keys(R.COLORS).map(function (c) { return '<option value="' + esc(c) + '">'; }).join('');
  $('#defChecks').innerHTML = R.DEFECTS.map(function (d) { return '<label><input type="checkbox" value="' + esc(d) + '">' + esc(d) + '</label>'; }).join('');
  $('#kitChecks').innerHTML = R.KIT.map(function (d) { return '<label><input type="checkbox" value="' + esc(d) + '">' + esc(d) + '</label>'; }).join('');

  function modelField() {
    var cat = edit.cat;
    if (cat === 'iPhone') {
      var has = false;
      var opts = R.IPHONES.map(function (g) {
        return '<optgroup label="' + esc(g[0]) + '">' + g[1].map(function (m) { if (m === edit.model) has = true; return '<option' + (m === edit.model ? ' selected' : '') + '>' + esc(m) + '</option>'; }).join('') + '</optgroup>';
      }).join('');
      $('#modelWrap').innerHTML = '<select name="model" required><option value="">— выберите модель —</option>' + (edit.model && !has ? '<option selected>' + esc(edit.model) + '</option>' : '') + opts + '</select>';
    } else {
      $('#modelWrap').innerHTML = '<input name="model" list="mList" required placeholder="Начните вводить модель" value="' + esc(edit.model) + '"><datalist id="mList">' + (R.OTHER_MODELS[cat] || []).map(function (m) { return '<option value="' + esc(m) + '">'; }).join('') + '</datalist>';
    }
  }
  function pills(el, values, cur, labels) {
    el.innerHTML = values.map(function (v, i) { return '<button type="button" data-v="' + esc(v) + '"' + (v === cur ? ' class="is-on"' : '') + '>' + esc(labels ? labels[i] : v) + '</button>'; }).join('');
  }
  function syncUI() {
    pills($('#memPills'), [''].concat(R.MEMORY), edit.memory, ['—'].concat(R.MEMORY));
    pills($('#simPills'), ['', 'SIM', 'eSIM', 'SIM + eSIM'], edit.sim, ['не указано', 'SIM', 'eSIM', 'SIM + eSIM']);
    $$('#condSeg button').forEach(function (b) { b.classList.toggle('is-on', b.dataset.v === edit.cond); });
    $$('#defSeg button').forEach(function (b) { b.classList.toggle('is-on', b.dataset.v === (edit.hasDefects ? '1' : '0')); });
    var used = edit.cond === 'used';
    $('#batRow').hidden = !used; $('#defSet').hidden = !used; $('#defBox').hidden = !edit.hasDefects;
    $('#simRow').hidden = !(edit.cat === 'iPhone' || edit.cat === 'Samsung' || edit.cat === 'iPad');
    $('#colorDot').style.background = R.COLORS[edit.color] || 'transparent';
    $('#batOut').textContent = edit.battery + '%';
    renderTiles(); preview();
  }
  function preview() { $('#pv').innerHTML = R.card(edit); R.hydrate($('#pv')); }

  function openEditor(it, isNew) {
    edit = JSON.parse(JSON.stringify(it)); editIsNew = !!isNew;
    $('#sheetTitle').textContent = isNew ? 'Новое устройство' : 'Редактирование';
    $('#catSel').value = edit.cat;
    form.color.value = edit.color || ''; form.battery.value = edit.battery || 100;
    form.price.value = edit.price ? money(edit.price).replace(' ₸', '') : '';
    form.oldPrice.value = edit.oldPrice ? money(edit.oldPrice).replace(' ₸', '') : '';
    form.defectsNote.value = edit.defectsNote || ''; form.desc.value = edit.desc || '';
    form.warranty.value = edit.warranty || 'До 1 года'; form.status.value = edit.status || 'available'; form.featured.checked = !!edit.featured;
    $$('#defChecks input').forEach(function (c) { c.checked = (edit.defects || []).indexOf(c.value) >= 0; });
    $$('#kitChecks input').forEach(function (c) { c.checked = (edit.kit || []).indexOf(c.value) >= 0; });
    $$('.is-bad', form).forEach(function (x) { x.classList.remove('is-bad'); });
    modelField(); syncUI();
    $('#sheet').hidden = false; document.body.style.overflow = 'hidden';
    $('.sheet__body').scrollTop = 0;
  }
  function closeEditor() { $('#sheet').hidden = true; document.body.style.overflow = ''; edit = null; }
  $$('[data-x]').forEach(function (b) { b.addEventListener('click', function () { if (confirm('Закрыть без сохранения?')) closeEditor(); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && edit && confirm('Закрыть без сохранения?')) closeEditor(); });

  $('#catSel').addEventListener('change', function () { edit.cat = this.value; edit.model = ''; modelField(); syncUI(); });
  $('#condSeg').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; edit.cond = b.dataset.v;
    if (edit.cond === 'new') { edit.hasDefects = false; edit.battery = 100; form.battery.value = 100; if (form.warranty.value === 'До 1 года') { form.warranty.value = 'До 2 лет'; edit.warranty = 'До 2 лет'; } }
    else if (form.warranty.value === 'До 2 лет') { form.warranty.value = 'До 1 года'; edit.warranty = 'До 1 года'; }
    syncUI();
  });
  $('#defSeg').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; edit.hasDefects = b.dataset.v === '1'; syncUI(); });
  $('#memPills').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; edit.memory = b.dataset.v; syncUI(); });
  $('#simPills').addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; edit.sim = b.dataset.v; syncUI(); });
  form.addEventListener('input', function (e) {
    var n = e.target.name;
    if (n === 'model') { edit.model = e.target.value; e.target.classList.remove('is-bad'); }
    if (n === 'color') { edit.color = e.target.value.trim(); $('#colorDot').style.background = R.COLORS[edit.color] || 'transparent'; }
    if (n === 'battery') { edit.battery = +e.target.value; $('#batOut').textContent = edit.battery + '%'; }
    if (n === 'price') { edit.price = num(e.target.value); e.target.classList.remove('is-bad'); }
    if (n === 'oldPrice') edit.oldPrice = num(e.target.value);
    if (n === 'featured') edit.featured = e.target.checked;
    if (n === 'status') edit.status = e.target.value;
    if (n === 'warranty') edit.warranty = e.target.value;
    if (e.target.closest('#defChecks')) edit.defects = $$('#defChecks input:checked').map(function (c) { return c.value; });
    if (e.target.closest('#kitChecks')) edit.kit = $$('#kitChecks input:checked').map(function (c) { return c.value; });
    preview();
  });
  form.addEventListener('change', function (e) { if (e.target.name === 'model') { edit.model = e.target.value; preview(); } });
  /* цены с пробелами: 235000 → 235 000 */
  ['price', 'oldPrice'].forEach(function (n) {
    form[n].addEventListener('blur', function () { var v = num(this.value); this.value = v ? money(v).replace(' ₸', '') : ''; });
  });

  /* ---------- фото и видео ---------- */
  var busy = 0, progress = 0;
  function renderTiles() {
    var html = '';
    if (edit.video) html += '<div class="tile"><video muted playsinline loop autoplay ' + 'src="' + esc(R.src(edit.video)) + '"' + '></video><span class="tile__lbl tile__lbl--v">ВИДЕО</span><div class="tile__ctl"><span></span><button type="button" class="del" data-vdel title="Удалить видео">✕</button></div></div>';
    html += (edit.photos || []).map(function (p, i) {
      return '<div class="tile">' + R.mediaTag(p, '') + (i === 0 ? '<span class="tile__lbl">ОБЛОЖКА</span>' : '') +
        '<div class="tile__ctl"><button type="button" data-mv="' + i + '" data-d="-1" title="Левее"' + (i === 0 ? ' disabled style="opacity:.3"' : '') + '>←</button>' +
        '<button type="button" class="del" data-pdel="' + i + '" title="Удалить фото">✕</button>' +
        '<button type="button" data-mv="' + i + '" data-d="1" title="Правее"' + (i === edit.photos.length - 1 ? ' disabled style="opacity:.3"' : '') + '>→</button></div></div>';
    }).join('');
    for (var k = 0; k < busy; k++) html += '<div class="tile tile--load">Загрузка' + (progress && progress < 1 ? ' ' + Math.round(progress * 100) + '%' : '…') + '</div>';
    $('#tiles').innerHTML = html; R.hydrate($('#tiles'));
  }
  $('#tiles').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-vdel')) edit.video = '';
    if (b.hasAttribute('data-pdel')) edit.photos.splice(+b.dataset.pdel, 1);
    if (b.hasAttribute('data-mv')) { var i = +b.dataset.mv, j = i + +b.dataset.d, p = edit.photos; var t = p[i]; p[i] = p[j]; p[j] = t; }
    syncUI();
  });
  $('#addPhotos').addEventListener('click', function () { $('#photoIn').click(); });
  $('#addVideo').addEventListener('click', function () { $('#videoIn').click(); });
  $('#photoIn').addEventListener('change', function () { addFiles(this.files); this.value = ''; });
  $('#videoIn').addEventListener('change', function () { addFiles(this.files); this.value = ''; });
  var drop = $('#drop');
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); }); });
  drop.addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); });

  function addFiles(files) {
    Array.prototype.forEach.call(files || [], function (f) {
      var it = edit;
      if (/^video\//.test(f.type)) {
        if (f.size > 80 * 1024 * 1024) { toast('Видео больше 80 МБ — сожмите его в телефоне перед загрузкой', true); return; }
        busy++; renderTiles();
        R.uploadFile(f, getToken(), function (p) { progress = p; renderTiles(); }).then(function (key) { it.video = key; }).catch(function (er) { toast('Видео не загрузилось: ' + er.message, true); })
          .finally(function () { busy--; if (edit === it) syncUI(); });
      } else if (/^image\//.test(f.type)) {
        busy++; renderTiles();
        R.compressImage(f).then(function (b) { return R.uploadFile(b, getToken()); }).then(function (key) { it.photos.push(key); }).catch(function (er) { toast(er.message || 'Не удалось добавить фото', true); })
          .finally(function () { busy--; if (edit === it) syncUI(); });
      } else toast('Файл «' + f.name + '» не фото и не видео', true);
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) { toast('Подождите, файлы ещё загружаются', true); return; }
    var bad = null;
    if (!edit.model) { bad = form.model; }
    if (!edit.price) { form.price.classList.add('is-bad'); bad = bad || form.price; }
    if (bad) { if (bad === form.model) bad.classList.add('is-bad'); bad.focus(); toast('Заполните модель и цену', true); return; }
    if (edit.oldPrice && edit.oldPrice <= edit.price) { toast('Старая цена должна быть больше новой — иначе скидки не будет', true); form.oldPrice.focus(); return; }
    if (edit.cond === 'new') { edit.hasDefects = false; edit.defects = []; edit.defectsNote = ''; }
    if (!edit.hasDefects) { edit.defects = []; edit.defectsNote = ''; } else { edit.defectsNote = form.defectsNote.value.trim(); }
    edit.desc = form.desc.value.trim();
    var i = D.items.findIndex(function (x) { return x.id === edit.id; });
    if (i >= 0) D.items[i] = edit; else D.items.push(edit);
    var wasNew = editIsNew;
    persist(wasNew ? 'Устройство добавлено на сайт' : 'Изменения сохранены');
    closeEditor(); render();
  });

  /* ---------- акции ---------- */
  function renderPromos() {
    $('#promoList').innerHTML = D.promos.map(function (p, i) {
      return '<div class="pcard" data-i="' + i + '">' +
        '<label class="lbl">Заголовок<input data-f="title" value="' + esc(p.title) + '"></label>' +
        '<label class="lbl">Текст<textarea data-f="text" rows="3">' + esc(p.text) + '</textarea></label>' +
        '<label class="lbl">Цвет<select data-f="tone">' + [['blue', 'Синий'], ['gold', 'Золотой'], ['steel', 'Серебристый']].map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === p.tone ? ' selected' : '') + '>' + t[1] + '</option>'; }).join('') + '</select></label>' +
        '<div class="pcard__img">' + (p.img ? R.mediaTag(p.img, '') : '') + '<button type="button" class="btn btn--glass btn--sm" data-a="img">' + (p.img ? 'Заменить фон' : '＋ Фоновое фото') + '</button>' + (p.img ? '<button type="button" class="linkbtn" data-a="noimg">убрать</button>' : '') + '</div>' +
        '<div class="pcard__foot"><label class="check"><input type="checkbox" data-f="active"' + (p.active ? ' checked' : '') + '><span>Показывать на сайте</span></label><button type="button" class="ibtn ibtn--del" data-a="del" title="Удалить">🗑</button></div></div>';
    }).join('') || '<p class="muted">Акций пока нет.</p>';
    R.hydrate($('#promoList'));
  }
  var promoSaveT;
  $('#promoList').addEventListener('input', function (e) {
    var f = e.target.dataset.f; if (!f) return;
    var p = D.promos[+e.target.closest('.pcard').dataset.i];
    p[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    clearTimeout(promoSaveT); promoSaveT = setTimeout(function () { persist('Акция сохранена'); }, 700);
  });
  $('#promoList').addEventListener('change', function (e) { if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT') e.target.dispatchEvent(new Event('input', { bubbles: true })); });
  $('#promoList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return;
    var i = +b.closest('.pcard').dataset.i, p = D.promos[i];
    if (b.dataset.a === 'del' && confirm('Удалить акцию «' + p.title + '»?')) { D.promos.splice(i, 1); persist(); render(); }
    if (b.dataset.a === 'noimg') { p.img = ''; persist(); renderPromos(); }
    if (b.dataset.a === 'img') {
      var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
      inp.onchange = function () { var f = inp.files[0]; if (!f) return; toast('Загружаем фото…'); R.compressImage(f, 1200).then(function (b) { return R.uploadFile(b, getToken()); }).then(function (k) { p.img = k; persist('Фон добавлен'); renderPromos(); }).catch(function (er) { toast(er.message, true); }); };
      inp.click();
    }
  });
  $('#addPromo').addEventListener('click', function () {
    D.promos.unshift({ id: 'p-' + Date.now().toString(36), title: 'НОВАЯ АКЦИЯ', text: 'Опишите условия акции', tone: 'blue', img: '', active: true });
    persist(); render(); var f = $('#promoList [data-f="title"]'); if (f) { f.focus(); f.select(); }
  });

  /* ---------- контакты ---------- */
  function fillSettings() { var f = $('#setForm'); Object.keys(D.settings).forEach(function (k) { if (f[k]) f[k].value = D.settings[k]; }); }
  $('#setForm').addEventListener('submit', function (e) {
    e.preventDefault(); var f = this;
    ['city', 'address', 'hours', 'phone', 'whatsapp', 'telegram', 'instagram', 'map'].forEach(function (k) { D.settings[k] = f[k].value.trim(); });
    D.settings.whatsapp = D.settings.whatsapp.replace(/\D/g, '');
    D.settings.telegram = D.settings.telegram.replace(/^@/, ''); D.settings.instagram = D.settings.instagram.replace(/^@/, '');
    persist('Контакты сохранены');
  });
})();
