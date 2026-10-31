/* ===== Motor da aplicação: rotas, renderização e cálculo ao vivo ===== */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app');
  const byId = Object.fromEntries(CALCS.map((c) => [c.id, c]));
  const catsOf = (c) => (Array.isArray(c.cat) ? c.cat : [c.cat]);
  const catById = Object.fromEntries(CATS.map((c) => [c.id, c]));

  /* Armazenamento local tolerante a falhas */
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento */ } },
  };
  let favs = store.get('favs', []);
  let recents = store.get('recents', []);
  const ui = { q: '', cat: store.get('cat', 'all') };

  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Tema ---------- */
  const applyTheme = (t) => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
  applyTheme(store.get('theme', null));
  $('#themeBtn').onclick = () => {
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const t = dark ? 'light' : 'dark';
    applyTheme(t); store.set('theme', t);
  };
  $('#backBtn').onclick = () => (history.length > 1 ? history.back() : (location.hash = '#/'));

  /* ---------- Página inicial ---------- */
  const star = (id) => `<button class="star ${favs.includes(id) ? 'on' : ''}" data-fav="${id}" aria-label="Favoritar">${favs.includes(id) ? '★' : '☆'}</button>`;
  const card = (c) => `<a class="card" href="#/c/${c.id}"><div class="card-body"><span class="card-title">${c.name}</span><span class="card-desc">${c.desc}</span></div>${star(c.id)}</a>`;

  function renderHome() {
    $('#backBtn').hidden = true;
    document.title = 'Plantão Calc';
    app.innerHTML = `
      <section class="hero">
        <h1>Calculadoras clínicas</h1>
        <p>${CALCS.length} calculadoras, escores e conversores para beira-leito.</p>
        <label class="search">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input id="q" type="search" placeholder="Buscar: PaFi, Glasgow, MELD…" value="${esc(ui.q)}" autocomplete="off">
        </label>
      </section>
      <div class="chips-wrap">
        <button class="chips-arrow left" id="chipsPrev" aria-label="Categorias anteriores"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
        <nav class="chips" id="chips">
          <button class="chip" data-cat="all">Todas</button>
          ${favs.length ? '<button class="chip" data-cat="fav">★ Favoritas</button>' : ''}
          ${CATS.map((c) => `<button class="chip" data-cat="${c.id}">${c.icon} ${c.name}</button>`).join('')}
        </nav>
        <button class="chips-arrow right" id="chipsNext" aria-label="Próximas categorias"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
      </div>
      <div id="list"></div>`;
    setupChipArrows();
    const q = $('#q');
    q.oninput = () => { ui.q = q.value; renderList(); };
    $('#chips').onclick = (e) => {
      const b = e.target.closest('[data-cat]');
      if (!b) return;
      ui.cat = b.dataset.cat; store.set('cat', ui.cat); renderList();
    };
    if (ui.cat === 'fav' && !favs.length) ui.cat = 'all';
    renderList();
  }

  /* Setas de rolagem das categorias: aparecem só quando há conteúdo escondido daquele lado */
  function setupChipArrows() {
    const nav = $('#chips'), prev = $('#chipsPrev'), next = $('#chipsNext');
    const sync = () => {
      prev.hidden = nav.scrollLeft <= 4;
      next.hidden = nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 4;
    };
    const step = (dir) => nav.scrollBy({ left: dir * nav.clientWidth * 0.7, behavior: 'smooth' });
    prev.onclick = () => step(-1);
    next.onclick = () => step(1);
    nav.addEventListener('scroll', sync, { passive: true });
    nav.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { nav.scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive: false });
    addEventListener('resize', sync);
    sync();
  }

  function renderList() {
    document.querySelectorAll('#chips .chip').forEach((b) => b.classList.toggle('active', b.dataset.cat === ui.cat));
    const act = $('#chips .chip.active');
    if (act) act.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const list = $('#list');
    const q = norm(ui.q.trim());
    let items = CALCS;
    if (q) items = items.filter((c) => norm(c.name + ' ' + c.desc + ' ' + catsOf(c).map((k) => catById[k].name).join(' ')).includes(q));
    if (ui.cat === 'fav') items = items.filter((c) => favs.includes(c.id));
    else if (ui.cat !== 'all') items = items.filter((c) => catsOf(c).includes(ui.cat));

    if (!items.length) { list.innerHTML = '<p class="empty">Nenhuma calculadora encontrada.</p>'; return; }

    let html = '';
    if (!q && ui.cat === 'all') {
      const rec = recents.map((id) => byId[id]).filter(Boolean).slice(0, 6);
      if (rec.length) html += `<h2 class="sec">Recentes</h2><div class="grid">${rec.map(card).join('')}</div>`;
      for (const cat of CATS) {
        const its = items.filter((c) => catsOf(c)[0] === cat.id);
        if (its.length) html += `<h2 class="sec">${cat.icon} ${cat.name} <small>${its.length}</small></h2><div class="grid">${its.map(card).join('')}</div>`;
      }
    } else {
      html = `<div class="grid">${items.map(card).join('')}</div>`;
    }
    list.innerHTML = html;
  }

  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    e.preventDefault();
    const id = b.dataset.fav;
    favs = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
    store.set('favs', favs);
    document.querySelectorAll(`[data-fav="${id}"]`).forEach((el) => { el.classList.toggle('on', favs.includes(id)); el.textContent = favs.includes(id) ? '★' : '☆'; });
  });

  /* ---------- Página da calculadora ---------- */
  function fieldHtml(c, fl) {
    const fid = `f-${c.id}-${fl.id}`;
    if (fl.t === 'head') return `<h3 class="fhead">${fl.label}</h3>`;
    if (fl.t === 'num') {
      return `<label class="field" for="${fid}"><span class="flabel">${fl.label}</span>
        <span class="inwrap"><input id="${fid}" data-id="${fl.id}" type="text" inputmode="decimal" autocomplete="off" placeholder="0" value="${fl.def ?? ''}">${fl.unit ? `<span class="unit">${fl.unit}</span>` : ''}</span></label>`;
    }
    if (fl.t === 'sel') {
      const short = fl.opts.length <= 3 && fl.opts.every(([t]) => String(t).length <= 16);
      const def = fl.def ?? fl.opts[0][1];
      if (short) {
        return `<div class="field"><span class="flabel">${fl.label}</span><div class="seg" role="radiogroup" data-id="${fl.id}">
          ${fl.opts.map(([t, v]) => `<button type="button" role="radio" data-v="${esc(v)}" aria-checked="${String(v) === String(def)}">${t}</button>`).join('')}</div></div>`;
      }
      return `<label class="field" for="${fid}"><span class="flabel">${fl.label}</span><span class="selwrap"><select id="${fid}" data-id="${fl.id}">
        ${fl.opts.map(([t, v]) => `<option value="${esc(v)}" ${String(v) === String(def) ? 'selected' : ''}>${t}</option>`).join('')}</select></span></label>`;
    }
    if (fl.t === 'chk') {
      const p = fl.pts !== 1 && c.score ? `<span class="pts">${fl.pts > 0 ? '+' : ''}${f(fl.pts)}</span>` : '';
      return `<label class="check"><input type="checkbox" data-id="${fl.id}"><span class="box"></span><span class="clabel">${fl.label}</span>${p}</label>`;
    }
    return '';
  }

  const parseVal = (s) => {
    if (s === '' || s == null) return NaN;
    const n = Number(String(s).replace(',', '.'));
    return Number.isFinite(n) ? n : s;
  };

  function readValues(c, root) {
    const v = {};
    let total = 0;
    for (const fl of c.fields) {
      if (fl.t === 'num') v[fl.id] = parseVal($(`[data-id="${fl.id}"]`, root).value.trim());
      else if (fl.t === 'sel') {
        const el = $(`[data-id="${fl.id}"]`, root);
        const raw = el.tagName === 'SELECT' ? el.value : $('[aria-checked="true"]', el)?.dataset.v;
        v[fl.id] = parseVal(raw);
        if (typeof v[fl.id] === 'number') total += v[fl.id];
      } else if (fl.t === 'chk') {
        v[fl.id] = $(`[data-id="${fl.id}"]`, root).checked;
        if (v[fl.id]) total += fl.pts;
      }
    }
    v._t = Math.round(total * 100) / 100;
    return v;
  }

  function renderCalc(id) {
    const c = byId[id];
    if (!c) { location.hash = '#/'; return; }
    recents = [id, ...recents.filter((x) => x !== id)].slice(0, 12);
    store.set('recents', recents);
    $('#backBtn').hidden = false;
    document.title = c.name + ' · Plantão Calc';
    const cats = catsOf(c).map((k) => `<a class="tag" href="#/" data-gocat="${k}">${catById[k].icon} ${catById[k].name}</a>`).join('');
    app.innerHTML = `
      <article class="calc">
        <header class="calc-head">
          <div class="tags">${cats}</div>
          <div class="title-row"><h1>${c.name}</h1>${star(c.id)}</div>
          <p>${c.desc}</p>
        </header>
        <div class="calc-grid">
          <form class="fields" id="form" autocomplete="off" onsubmit="return false">${c.fields.map((fl) => fieldHtml(c, fl)).join('')}
            <div class="actions"><button type="button" class="btn ghost" id="reset">Limpar</button></div>
          </form>
          <aside class="result" id="result" aria-live="polite"></aside>
        </div>
        <p class="disclaimer">Ferramenta de apoio. Os resultados não substituem o julgamento clínico; confira sempre os valores.</p>
      </article>`;
    window.scrollTo(0, 0);
    const form = $('#form');
    const update = () => renderResult(c, form);
    form.addEventListener('input', update);
    form.addEventListener('change', update);
    form.addEventListener('click', (e) => {
      const b = e.target.closest('.seg button');
      if (!b) return;
      b.parentElement.querySelectorAll('button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      update();
    });
    form.addEventListener('focusin', (e) => {
      if (innerWidth < 900 && e.target.matches('input[type=text], select')) setTimeout(() => e.target.closest('.field')?.scrollIntoView({ block: 'nearest' }), 250);
    });
    form.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
      const ins = [...form.querySelectorAll('input[type=text], select')];
      const nx = ins[ins.indexOf(e.target) + 1];
      if (nx) nx.focus(); else e.target.blur();
    });
    $('#reset').onclick = () => { renderCalc(id); };
    app.querySelectorAll('[data-gocat]').forEach((a) => (a.onclick = () => { ui.cat = a.dataset.gocat; ui.q = ''; store.set('cat', ui.cat); }));
    update();
  }

  function renderResult(c, form) {
    const box = $('#result');
    let r = null;
    try { r = c.calc(readValues(c, form), c); } catch (err) { console.error(err); r = null; }
    if (!r) {
      box.className = 'result empty';
      box.innerHTML = `<div class="r-main"><span class="r-label">Resultado</span><span class="r-wait">Preencha os campos</span></div>`;
      return;
    }
    const lvl = r.level || 'neutral';
    box.className = 'result lvl-' + lvl;
    const extra = (r.extra || []).filter(([, val]) => val !== '' && val != null);
    box.innerHTML = `
      <div class="r-main">
        <span class="r-label">${r.label || 'Resultado'}</span>
        <span class="r-value">${r.value}${r.unit ? `<small>${r.unit}</small>` : ''}</span>
        ${r.interp ? `<span class="r-interp">${r.interp}</span>` : ''}
      </div>
      ${extra.length ? `<button type="button" class="r-toggle" id="rtoggle" aria-expanded="false">Detalhes <span>▾</span></button>
      <dl class="r-extra">${extra.map(([k, val]) => `<div><dt>${k}</dt><dd>${val}</dd></div>`).join('')}</dl>` : ''}
      <button type="button" class="r-copy" id="rcopy">Copiar resultado</button>`;
    const tg = $('#rtoggle');
    if (tg) tg.onclick = () => { const o = box.classList.toggle('open'); tg.setAttribute('aria-expanded', String(o)); };
    $('#rcopy').onclick = async () => {
      const txt = `${c.name}: ${r.label ? r.label + ' ' : ''}${String(r.value).replace(/<[^>]+>/g, '')} ${r.unit || ''}${r.interp ? ' – ' + r.interp : ''}\n` + extra.map(([k, val]) => `${k}: ${val}`).join('\n');
      try { await navigator.clipboard.writeText(txt.trim()); $('#rcopy').textContent = 'Copiado ✓'; } catch { $('#rcopy').textContent = 'Não foi possível copiar'; }
      setTimeout(() => { const b = $('#rcopy'); if (b) b.textContent = 'Copiar resultado'; }, 1500);
    };
  }

  /* ---------- Rotas ---------- */
  function route() {
    const m = location.hash.match(/^#\/c\/([\w-]+)/);
    if (m) renderCalc(m[1]); else renderHome();
  }
  window.addEventListener('hashchange', route);
  route();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
