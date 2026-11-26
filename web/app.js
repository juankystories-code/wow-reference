(() => {
  const D = JSON.parse(document.getElementById('data').textContent);
  const app = document.getElementById('app');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } },
  };

  // ---------- Estado ----------
  const BASE = D.estado.nivel;
  let L = clamp(parseInt(store.get('nivel'), 10) || BASE);
  let pendingScroll = null;
  function clamp(n) { return Math.max(1, Math.min(60, n || 1)); }
  const pageId = () => { const h = location.hash.slice(1); return D.docs[h] ? h : 'inicio'; };
  const has = (v) => v && !/^\(/.test(v);

  const theme = store.get('tema');
  if (theme) document.documentElement.setAttribute('data-theme', theme);

  // ---------- Utilidades ----------
  const inRange = (r, l) => r && l >= r[0] && l <= r[1];
  function quality(min, max, l) {
    if (l < min) { const d = min - l; return d >= 5 ? 'q-red' : d >= 3 ? 'q-orange' : 'q-yellow'; }
    if (l <= max) return 'q-yellow';
    const d = l - max; return d >= 6 ? 'q-grey' : d >= 3 ? 'q-green' : 'q-yellow';
  }
  const pct = (v) => ((v - 1) / 59) * 100;
  const lvTxt = (r) => (r[0] === r[1] ? `${r[0]}` : r[1] === 60 && r[0] > 1 && r[0] <= 55 ? `${r[0]}+` : `${r[0]}-${r[1]}`);
  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 1600);
  }
  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); toast(`Copiado: ${label || text}`); }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch { /* nada */ }
      ta.remove(); toast(ok ? `Copiado: ${label || text}` : 'No se pudo copiar; selecciónalo a mano');
    }
  }

  // ---------- Esqueleto ----------
  const GROUPS = [
    ['Leveo', ['ruta', 'talentos', 'hechizos', 'mascotas', 'armas']],
    ['El cazador y Forever', ['mecanicas', 'sistemas', 'profesiones', 'dinero', 'addons']],
    ['Mi partida', ['estado', 'fuentes']],
  ];
  const label = Object.fromEntries(D.nav.map((n) => [n.id, n.label]));
  app.innerHTML = `
  <div class="shell">
    <aside class="side">
      <a class="brand" href="#inicio" aria-label="Inicio">
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="18.5" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
          <path d="M9 31 L29 11" stroke="var(--fg)" stroke-width="2" stroke-linecap="round"/>
          <path d="M29 11 l-7 1.5 M29 11 l-1.5 7" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" fill="none"/>
          <path d="M9 31 l1-5 M9 31 l5-1 M12 28 l1-5 M12 28 l5-1" stroke="var(--rust)" stroke-width="1.6" stroke-linecap="round"/>
        </svg>
        <span><b>Diario del Cazador</b><small>Troll Hunter · WoW Forever</small></span>
      </a>
      <nav class="nav" aria-label="Secciones">
        <a href="#inicio" data-p="inicio">Qué toca ahora</a>
        ${GROUPS.map(([g, ids]) => `<div class="grp">${g}</div>${ids.map((id) => `<a href="#${id}" data-p="${id}">${label[id]}</a>`).join('')}`).join('')}
      </nav>
      <div class="side-foot">
        <button type="button" class="theme-btn" id="theme">Tema: ${theme === 'light' ? 'claro' : theme === 'dark' ? 'oscuro' : 'sistema'}</button>
        <span class="built">Generado ${D.built}</span>
      </div>
    </aside>
    <div class="main">
      <div class="top">
        <div class="lvl">
          <label for="lvl-range">Nivel</label>
          <button type="button" id="lvl-dn" aria-label="Bajar nivel">−</button>
          <output id="lvl-out" for="lvl-range">${L}</output>
          <button type="button" id="lvl-up" aria-label="Subir nivel">+</button>
          <input type="range" id="lvl-range" min="1" max="60" value="${L}" aria-label="Nivel">
          <button type="button" class="reset" id="lvl-reset" hidden>Volver a ${BASE}</button>
        </div>
        <div class="search">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
          <input id="q" type="search" placeholder="Busca: Broken Tooth, Venomstrike, Thotar, montura…" autocomplete="off">
          <div class="results" id="results" hidden></div>
        </div>
      </div>
      <main class="content" id="view"></main>
    </div>
  </div>`;
  const view = document.getElementById('view');

  // ---------- Nivel ----------
  function setLevel(n) {
    L = clamp(n);
    if (L === BASE) store.del('nivel'); else store.set('nivel', String(L));
    document.getElementById('lvl-out').textContent = L;
    document.getElementById('lvl-range').value = L;
    document.getElementById('lvl-reset').hidden = L === BASE;
    render(false);
  }
  document.getElementById('lvl-dn').onclick = () => setLevel(L - 1);
  document.getElementById('lvl-up').onclick = () => setLevel(L + 1);
  document.getElementById('lvl-range').oninput = (e) => setLevel(+e.target.value);
  document.getElementById('lvl-reset').onclick = () => setLevel(BASE);
  document.getElementById('lvl-reset').hidden = L === BASE;
  document.getElementById('theme').onclick = (e) => {
    const cur = document.documentElement.getAttribute('data-theme');
    const nxt = cur === 'dark' ? 'light' : cur === 'light' ? null : 'dark';
    if (nxt) { document.documentElement.setAttribute('data-theme', nxt); store.set('tema', nxt); }
    else { document.documentElement.removeAttribute('data-theme'); store.del('tema'); }
    e.target.textContent = `Tema: ${nxt === 'light' ? 'claro' : nxt === 'dark' ? 'oscuro' : 'sistema'}`;
  };

  // ---------- Inicio ----------
  function trackRows() {
    return D.resumen.map((r, i) => {
      const q = quality(r.min, r.max, L);
      const w = Math.max(pct(r.max) - pct(r.min), 1.2);
      return `<button type="button" class="trow ${r.isDungeon ? 'dg' : ''}" data-ruta="${r.min}" title="${r.zone}${r.alt && r.alt !== '—' ? ' · alternativa: ' + r.alt : ''}">
        <span class="tl"><small>${r.min}-${r.max}</small>${r.zone}</span>
        <span class="bar ${q}"><i style="left:${pct(r.min)}%;width:${w}%"></i>${i === 0 ? '' : ''}<span class="now" style="left:calc(${pct(L)}% - 1px)"></span></span>
      </button>`;
    }).join('');
  }
  function routeSectionsFor(l) { return D.docs.ruta.sections.filter((s) => inRange(s.range, l)); }

  function renderHome() {
    const e = D.estado;
    const name = has(e.nombre) ? e.nombre : 'Troll Hunter';
    const now = D.resumen.filter((r) => inRange([r.min, r.max], L));
    const secs = routeSectionsFor(L);

    // talentos
    const tNow = D.talents.filter((t) => inRange(t.range, L));
    const tNext = D.talents.filter((t) => t.range[0] > L).slice(0, 3);
    const tPrev = D.talents.filter((t) => t.range[1] < L).slice(-1);
    const tal = [...tPrev.map((t) => ['past', t]), ...tNow.map((t) => ['cur', t]), ...tNext.map((t) => ['', t])]
      .map(([c, t]) => `<li class="${c}"><span class="n">${lvTxt(t.range)}</span><span>${t.html}</span></li>`).join('');

    // hechizos
    const tl = Math.max(...D.spells.filter((s) => s.lvl <= L).map((s) => s.lvl));
    const nl = Math.min(...D.spells.filter((s) => s.lvl > L).map((s) => s.lvl).concat([99]));
    const spellLi = (s) => `<li class="${s.kind === 'no' ? 'past' : ''}"><span class="n">${s.kind === 'si' ? 'Sí' : s.kind === 'no' ? 'Saltar' : 'Info'}</span><span>${s.html}${s.kind !== 'no' && s.note.replace(/^Sí\.?\s*/, '') ? ` <span class="muted small">· ${s.note.replace(/^Sí\.?\s*/, '')}</span>` : ''}</span></li>`;
    const sNow = D.spells.filter((s) => s.lvl === tl);
    const sNext = D.spells.filter((s) => s.lvl === nl);

    // mascota
    const main = D.pets.filter((p) => !p.optional);
    const pCur = main.filter((p) => p.range[0] <= L).slice(-1)[0];
    const pNext = main.find((p) => p.range[0] > L);
    const pOpt = D.pets.filter((p) => p.optional && p.range[0] <= L + 3 && p.range[0] >= (pCur ? pCur.range[0] : 0));

    // arma
    const go = D.weapons.filter((w) => w.go);
    const wCur = go.filter((w) => w.range[0] <= L).slice(-1)[0];
    const wNext = go.filter((w) => w.range[0] > L).slice(0, 2);
    const wSide = D.weapons.filter((w) => !w.go && w.range[0] > L - 2 && w.range[0] <= L + 4);

    const ms = D.milestones.filter((m) => m.lvl >= L).slice(0, 5);
    const gold = D.gold.filter((g) => g.range[1] >= L && g.range[0] > 1).slice(0, 3);

    view.innerHTML = `
    <section class="hero">
      <div class="crest" aria-label="Nivel ${L}"><b>${L}</b><span>nivel</span></div>
      <div>
        <div class="eyebrow">Horda · Beast Mastery · Europa PvP</div>
        <h1>${name}, <em>${now.length ? now.map((r) => r.zone).join(' + ') : 'a por el 60'}</em></h1>
        <div class="facts">
          <span>Reino <b>${has(e.reino) ? e.reino : 'por elegir'}</b></span>
          <span>Zona <b>${has(e.zona) ? e.zona : 'sin empezar'}</b></span>
          <span>Oro <b>${e.oro || 0} g</b></span>
          <span>Mascota <b>${has(e.mascota) ? e.mascota : 'ninguna'}</b></span>
        </div>
        ${L !== BASE ? `<p class="small muted" style="margin:8px 0 0">Estás mirando el nivel ${L}. En estado.md el personaje está a nivel ${BASE}.</p>` : ''}
      </div>
    </section>

    <section class="track-wrap" aria-label="Tramos de la ruta">
      <div class="track-head">
        <h2>La ruta, del 1 al 60</h2>
        <div class="legend">
          <span><i style="background:var(--q-red)"></i>Muy alto</span><span><i style="background:var(--q-orange)"></i>Alto</span>
          <span><i style="background:var(--q-yellow)"></i>Tu nivel</span><span><i style="background:var(--q-green)"></i>Fácil</span>
          <span><i style="background:var(--q-grey)"></i>Gris</span>
        </div>
      </div>
      <div class="rows">${trackRows()}</div>
      <div class="axis"><span></span><div>${[1, 10, 20, 30, 40, 50, 60].map((v) => `<span style="left:${pct(v)}%">${v}</span>`).join('')}</div></div>
    </section>

    <div class="grid">
      <article class="card wide">
        <span class="sub">Dónde ir a nivel ${L}</span>
        <div class="kv">
          ${now.map((r) => `<dt>${r.min}-${r.max}</dt><dd><strong>${r.zone}</strong>${r.alt && r.alt !== '—' ? ` <span class="muted">· alternativa: ${r.alt}</span>` : ''}${r.dungeon && !r.isDungeon ? ` <span class="muted">· mazmorra: ${r.dungeon}</span>` : ''}</dd>`).join('')}
        </div>
        ${secs.map((s, i) => `<details class="sec" ${i === 0 ? 'open' : ''}><summary>${s.titleHtml}</summary><div class="prose">${s.html}</div></details>`).join('')}
      </article>

      <article class="card">
        <h3>Talentos <a href="#talentos">Orden completo →</a></h3>
        ${L < 10 ? '<p class="small muted">El primer punto llega a nivel 10.</p>' : ''}
        <ul class="ladder">${tal}</ul>
      </article>

      <article class="card">
        <h3>Entrenar <a href="#hechizos">Todos →</a></h3>
        <span class="sub">Nivel ${tl}</span>
        <ul class="ladder">${sNow.map(spellLi).join('')}</ul>
        ${sNext.length ? `<div class="next"><span class="sub">Siguiente: nivel ${nl}</span><ul class="ladder">${sNext.map(spellLi).join('')}</ul></div>` : ''}
      </article>

      <article class="card">
        <h3>Mascota <a href="#mascotas">Guía →</a></h3>
        ${pCur ? `<div class="big">${pCur.name}</div><p class="small">${pCur.where}</p><p class="small muted">${pCur.why}</p>`
        : '<p>Sin mascota hasta nivel 10. Ponte Aspect of the Monkey y kitea.</p>'}
        ${pOpt.map((p) => `<p class="small"><span class="pill q-green">Opcional ${lvTxt(p.range)}</span> ${p.name}: ${p.where}</p>`).join('')}
        ${pNext ? `<div class="next"><span class="sub">Siguiente: nivel ${lvTxt(pNext.range)}</span>${pNext.name} · ${pNext.where}</div>` : ''}
      </article>

      <article class="card">
        <h3>Arma a distancia <a href="#armas">Tabla →</a></h3>
        ${wCur ? `<span class="sub">Deberías llevar (nivel ${lvTxt(wCur.range)})</span><div class="big">${wCur.name}</div><p class="small muted">${wCur.how}</p>` : ''}
        ${wSide.map((w) => `<p class="small"><span class="pill q-grey">${lvTxt(w.range)}</span> ${w.name} · <span class="muted">${w.note}</span></p>`).join('')}
        ${wNext.map((w) => `<div class="next"><span class="sub">Siguiente objetivo: nivel ${lvTxt(w.range)}</span><strong>${w.name}</strong> · ${w.how}</div>`).join('')}
      </article>

      <article class="card">
        <h3>Próximos hitos</h3>
        <ul class="ladder">${ms.map((m) => `<li class="${m.lvl === L ? 'cur' : ''}"><span class="n">${m.lvl}</span><span>${m.html} <a href="#${m.page}" class="small">ver</a></span></li>`).join('')}</ul>
      </article>

      <article class="card">
        <h3>Oro <a href="#dinero">Dinero →</a></h3>
        <ul class="ladder">${gold.map((g) => `<li><span class="n">${lvTxt(g.range)}</span><span><strong>${g.what}</strong><br><span class="small muted">${g.cost}</span></span></li>`).join('')}</ul>
      </article>

      <article class="card wide">
        <h3>Antes de cerrar sesión <a href="#sistemas">Sistemas →</a></h3>
        <div class="prose">${D.rutina}</div>
      </article>

      ${D.huecos ? `<article class="card wide gaps"><h3>Por verificar en el juego</h3><div class="prose small">${D.huecos}</div></article>` : ''}
    </div>`;
  }

  // ---------- Páginas de la guía ----------
  function parseLv(txt) {
    const m = txt.replace(/[~*]/g, '').match(/(\d+)(?:\s*-\s*(\d+))?(\+)?/);
    if (!m) return null;
    return [+m[1], m[2] ? +m[2] : m[3] ? 60 : +m[1]];
  }
  function markTables(root) {
    root.querySelectorAll('table').forEach((t) => {
      const th = t.querySelector('th');
      if (!th || !/^nivel$/i.test(th.textContent.trim())) return;
      const rows = [...t.querySelectorAll('tbody tr')].map((tr) => [tr, parseLv(tr.cells[0].textContent)]).filter((x) => x[1]);
      let hit = rows.filter(([, r]) => inRange(r, L));
      if (!hit.length) {
        const best = Math.max(...rows.filter(([, r]) => r[0] <= L).map(([, r]) => r[0]));
        hit = rows.filter(([, r]) => r[0] === best);
      }
      rows.forEach(([tr, r]) => {
        tr.classList.toggle('now', hit.some(([h]) => h === tr));
        tr.classList.toggle('past', !hit.some(([h]) => h === tr) && r[1] < L);
      });
    });
  }
  function renderDoc(id) {
    const d = D.docs[id];
    view.innerHTML = `
      <header class="page-head"><span class="eyebrow">${label[id]}</span><h1>${d.title}</h1></header>
      ${d.sections.length > 2 ? `<nav class="toc" aria-label="En esta página">${d.sections.map((s) => `<button type="button" data-go="${s.slug}" class="${inRange(s.range, L) ? 'on' : ''}">${s.title.replace(/\*\*/g, '')}</button>`).join('')}</nav>` : ''}
      <div class="prose">${d.intro}</div>
      ${d.sections.map((s) => `<section class="doc-sec ${inRange(s.range, L) ? 'here' : ''}" id="s-${s.slug}"><h2>${s.titleHtml}</h2><div class="prose">${s.html}</div></section>`).join('')}`;
    markTables(view);
  }

  function render(scrollTop) {
    const id = pageId();
    document.querySelectorAll('.nav a').forEach((a) => {
      if (a.dataset.p === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const y = window.scrollY;
    if (id === 'inicio') renderHome(); else renderDoc(id);
    if (pendingScroll) {
      const el = document.getElementById('s-' + pendingScroll);
      pendingScroll = null;
      if (el) { el.scrollIntoView({ block: 'start' }); return; }
    }
    if (scrollTop) window.scrollTo(0, 0); else window.scrollTo(0, y);
  }
  window.addEventListener('hashchange', () => render(true));

  // ---------- Clics ----------
  document.addEventListener('click', (e) => {
    const way = e.target.closest('[data-copy]');
    if (way) { copy(way.dataset.copy); return; }
    const cc = e.target.closest('[data-copy-code]');
    if (cc) { copy(cc.parentElement.querySelector('code').textContent, 'macro'); return; }
    const go = e.target.closest('[data-go]');
    if (go) { document.getElementById('s-' + go.dataset.go)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    const tr = e.target.closest('[data-ruta]');
    if (tr) {
      const lv = +tr.dataset.ruta;
      const s = D.docs.ruta.sections.filter((x) => inRange(x.range, lv)).pop();
      if (s) pendingScroll = s.slug;
      if (pageId() === 'ruta') render(false); else location.hash = 'ruta';
    }
  });

  // ---------- Búsqueda ----------
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const index = [];
  for (const [id, d] of Object.entries(D.docs)) {
    for (const s of d.sections) index.push({ id, slug: s.slug, where: `${label[id]} › ${s.title.replace(/\*\*/g, '')}`, text: s.text, n: norm(s.title + ' ' + s.text) });
  }
  const q = document.getElementById('q');
  const res = document.getElementById('results');
  let sel = -1;
  const escH = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function search() {
    const terms = norm(q.value.trim()).split(/\s+/).filter(Boolean);
    if (!terms.length) { res.hidden = true; return; }
    const hits = index.filter((x) => terms.every((t) => x.n.includes(t))).slice(0, 12);
    sel = -1;
    res.innerHTML = hits.length ? hits.map((h, i) => {
      const p = norm(h.text).indexOf(terms[0]);
      const start = Math.max(0, p - 50);
      let snip = (start ? '…' : '') + h.text.slice(start, start + 150) + '…';
      snip = escH(snip);
      for (const t of terms) snip = snip.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'), '<mark>$1</mark>');
      return `<a href="#${h.id}" data-i="${i}" data-slug="${h.slug}"><div class="where">${escH(h.where)}</div><div class="snip">${snip}</div></a>`;
    }).join('') : '<div class="none">Nada en la guía. Pregúntaselo al agente.</div>';
    res.hidden = false;
  }
  q.addEventListener('input', search);
  q.addEventListener('keydown', (e) => {
    const items = [...res.querySelectorAll('a')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); if (!items.length) return;
      sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((a, i) => a.classList.toggle('sel', i === sel));
    } else if (e.key === 'Enter') { (items[sel] || items[0])?.click(); }
    else if (e.key === 'Escape') { res.hidden = true; q.blur(); }
  });
  res.addEventListener('click', (e) => {
    const a = e.target.closest('a'); if (!a) return;
    e.preventDefault();
    pendingScroll = a.dataset.slug; res.hidden = true; q.value = '';
    const id = a.getAttribute('href').slice(1);
    if (pageId() === id) render(false); else location.hash = id;
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) res.hidden = true; });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== q && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); }
  });

  render(false);
})();
