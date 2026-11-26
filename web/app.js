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
  let jump = false;
  function clamp(n) { return Math.max(1, Math.min(60, n || 1)); }
  const pageId = () => { const h = location.hash.slice(1); return D.docs[h] || h === 'glosario' ? h : 'inicio'; };
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
    ['Consulta', ['glosario', 'ruta', 'talentos', 'hechizos', 'mascotas', 'armas']],
    ['El cazador y Forever', ['mecanicas', 'sistemas', 'profesiones', 'dinero', 'addons']],
    ['Mi partida', ['estado', 'fuentes']],
  ];
  const label = Object.fromEntries(D.nav.map((n) => [n.id, n.label]));
  label.glosario = 'Glosario';
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
        <a href="#inicio" data-p="inicio">Lineup 1-60</a>
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
    tramo = tramoOf(L);
    jump = true;
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

  // ---------- Lineup ----------
  const TAGS = {
    zona: 'Zona', entrenar: 'Entrenar', talento: 'Talento', mascota: 'Mascota', arma: 'Arma', comprar: 'Comprar',
    mazmorra: 'Mazmorra', mision: 'Misión', profesion: 'Oficio', sistema: 'Sistema', ojo: 'Ojo', saltar: 'No entrenes',
  };
  const TRAMOS = [[1, 10], [11, 20], [21, 30], [31, 40], [41, 50], [51, 60]];
  const tramoOf = (l) => Math.min(5, Math.floor((l - 1) / 10));
  let tramo = tramoOf(L);
  let done;
  try { done = new Set(JSON.parse(store.get('hecho') || '[]')); } catch { done = new Set(); }
  let hideDone = store.get('ocultar') === '1';
  const saveDone = () => store.set('hecho', JSON.stringify([...done]));
  const countable = (lv) => lv.items.filter((i) => i.tag !== 'saltar' && i.tag !== 'ojo');
  const stats = (lvls) => {
    const all = lvls.flatMap(countable);
    return [all.filter((i) => done.has(i.id)).length, all.length];
  };

  function renderHome(scrollToCur) {
    const [a, b] = TRAMOS[tramo];
    const lvls = D.lineup.filter((l) => l.lvl >= a && l.lvl <= b);
    const [dn, tot] = stats(lvls);
    view.innerHTML = `
    <header class="lu-head">
      <div class="lu-title">
        <span class="eyebrow">Lineup · nivel a nivel</span>
        <h1>Del ${a} al ${b}</h1>
        <div class="prog" role="img" aria-label="${dn} de ${tot} hechas"><i style="width:${tot ? (dn / tot) * 100 : 0}%"></i></div>
        <span class="small muted">${dn} de ${tot} hechas</span>
      </div>
      <div class="tabs" role="tablist" aria-label="Tramos">
        ${TRAMOS.map(([x, y], i) => {
          const [d2, t2] = stats(D.lineup.filter((l) => l.lvl >= x && l.lvl <= y));
          return `<button type="button" role="tab" data-tramo="${i}" aria-selected="${i === tramo}" class="${tramoOf(L) === i ? 'has-me' : ''}">${x}-${y}<small>${t2 && d2 === t2 ? '✓' : `${d2}/${t2}`}</small></button>`;
        }).join('')}
      </div>
      <label class="hide-done"><input type="checkbox" id="hide-done" ${hideDone ? 'checked' : ''}> Ocultar lo hecho</label>
    </header>
    <ol class="lu ${hideDone ? 'hide' : ''}">
      ${lvls.map((lv) => {
        const cls = lv.lvl === L ? 'cur' : lv.lvl < L ? 'past' : '';
        if (!lv.items.length) {
          return `<li class="lv empty ${cls}" id="lv-${lv.lvl}"><div class="lv-num">${lv.lvl}</div><div class="lv-empty">Nada nuevo. Sigue con las misiones de ${lv.zone}.${lv.lvl === L ? ' <span class="here-pill">Estás aquí</span>' : ''}</div></li>`;
        }
        const [d3, t3] = stats([lv]);
        return `<li class="lv ${cls}" id="lv-${lv.lvl}">
          <details ${lv.lvl >= L ? 'open' : ''}>
            <summary>
              <span class="lv-num">${lv.lvl}</span>
              <span class="lv-name">${lv.title || `<span class="muted">${lv.zone}</span>`}</span>
              ${lv.lvl === L ? '<span class="here-pill">Estás aquí</span>' : `<button type="button" class="set-lv" data-setlv="${lv.lvl}">Estoy aquí</button>`}
              <span class="cnt ${t3 && d3 === t3 ? 'ok' : ''}">${t3 && d3 === t3 ? '✓' : `${d3}/${t3}`}</span>
            </summary>
            <ul class="acts">
              ${lv.items.map((it) => {
                const check = it.tag !== 'saltar' && it.tag !== 'ojo';
                const isDone = done.has(it.id);
                return `<li class="act t-${it.tag} ${isDone ? 'done' : ''}">
                  ${check ? `<input type="checkbox" id="c-${it.id}" data-id="${it.id}" ${isDone ? 'checked' : ''}>` : '<span class="nocheck" aria-hidden="true"></span>'}
                  <span class="tag">${TAGS[it.tag] || it.tag}</span>
                  <label class="txt" ${check ? `for="c-${it.id}"` : ''}>${it.html}</label>
                </li>`;
              }).join('')}
            </ul>
          </details>
        </li>`;
      }).join('')}
    </ol>
    <details class="rutina"><summary>Antes de cerrar sesión</summary><div class="prose">${D.rutina}</div></details>`;
    linkTerms(view);
    if (scrollToCur) {
      const el = document.getElementById('lv-' + L);
      // Solo salta si tu nivel queda por debajo de la primera pantalla; así la cabecera del tramo sigue a la vista.
      if (el && tramoOf(L) === tramo) requestAnimationFrame(() => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top > window.innerHeight * 0.6 ? top - 80 : 0);
      });
    }
  }

  view.addEventListener('change', (e) => {
    const id = e.target.dataset && e.target.dataset.id;
    if (id) {
      if (e.target.checked) done.add(id); else done.delete(id);
      saveDone();
      const y = window.scrollY; renderHome(false); window.scrollTo(0, y);
    } else if (e.target.id === 'hide-done') {
      hideDone = e.target.checked; store.set('ocultar', hideDone ? '1' : '0');
      view.querySelector('.lu').classList.toggle('hide', hideDone);
    }
  });
  view.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tramo]');
    if (t) { tramo = +t.dataset.tramo; renderHome(false); window.scrollTo(0, 0); return; }
    const s = e.target.closest('[data-setlv]');
    if (s) { e.preventDefault(); e.stopPropagation(); setLevel(+s.dataset.setlv); }
  });

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
    linkTerms(view);
  }

  function render(scrollTop) {
    const id = pageId();
    document.querySelectorAll('.nav a').forEach((a) => {
      if (a.dataset.p === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    const y = window.scrollY;
    if (id === 'inicio') { renderHome(scrollTop || jump); const j = jump || scrollTop; jump = false; if (j) return; } else if (id === 'glosario') renderGlossary(); else renderDoc(id);
    jump = false;
    if (pendingScroll) {
      const el = document.getElementById('s-' + pendingScroll);
      pendingScroll = null;
      if (el) { el.scrollIntoView({ block: 'start' }); return; }
    }
    if (scrollTop) window.scrollTo(0, 0); else window.scrollTo(0, y);
  }
  window.addEventListener('hashchange', () => render(true));

  // ---------- Glosario ----------
  const G = D.glossary;
  const KIND = {
    zona: 'Zona', mazmorra: 'Mazmorra', npc: 'PNJ', objeto: 'Objeto', hechizo: 'Hechizo', talento: 'Talento',
    mascota: 'Habilidad de mascota', mision: 'Misión', oficio: 'Profesión', sistema: 'Sistema de Forever', jerga: 'Jerga',
  };
  const KGLYPH = { zona: 'Z', mazmorra: 'M', npc: 'P', objeto: 'O', hechizo: 'H', talento: 'T', mascota: 'H', mision: '!', oficio: 'O', sistema: 'F', jerga: '?' };
  const byKey = new Map();
  for (const [i, e] of G.entries()) for (const k of [e.n, ...e.a]) if (!byKey.has(k.toLowerCase())) byKey.set(k.toLowerCase(), i);
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\  // ---------- Clics ----------');
  const termRe = new RegExp(`(?<![\\p{L}\\p{N}'])(${[...byKey.keys()].sort((a, b) => b.length - a.length).map(reEsc).join('|')})(?![\\p{L}\\p{N}'])`, 'giu');
  const SKIP = 'a, button, code, pre, input, textarea, .term, .tip, .g-name, .tag, .lv-num, .eyebrow, th, .toc, .results';
  const iconHtml = (e, cls) => e.i
    ? `<img class="${cls}${e.gen ? ' gen' : ''}" src="${D.icons[e.i]}" alt="" width="36" height="36">`
    : `<span class="${cls} glyph k-${e.k}" aria-hidden="true">${KGLYPH[e.k] || '?'}</span>`;

  function linkTerms(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (!n.nodeValue.trim() || n.parentElement.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const n of nodes) {
      const txt = n.nodeValue;
      termRe.lastIndex = 0;
      if (!termRe.test(txt)) continue;
      termRe.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, m;
      while ((m = termRe.exec(txt))) {
        const i = byKey.get(m[1].toLowerCase());
        if (i == null) continue;
        if (m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
        const s = document.createElement('span');
        const e = G[i];
        s.className = `term k-${e.k}${e.q != null ? ' q' + e.q : ''}`;
        s.dataset.g = i; s.tabIndex = 0; s.setAttribute('role', 'button');
        s.textContent = m[1];
        frag.appendChild(s);
        last = m.index + m[1].length;
      }
      if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
      n.parentNode.replaceChild(frag, n);
    }
  }

  // Ficha flotante
  const tip = document.createElement('div');
  tip.className = 'tip'; tip.hidden = true; tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  let tipFor = null, pinned = false, hoverT = null;
  function showTip(el, pin) {
    const e = G[+el.dataset.g];
    tip.innerHTML = `
      <div class="tip-head">${iconHtml(e, 'tip-ic')}<div><div class="tip-name ${e.q != null ? 'q' + e.q : ''}">${e.n}</div><div class="tip-kind">${KIND[e.k] || e.k}</div></div></div>
      <p class="tip-desc">${e.d}</p>${e.z ? `<p class="tip-zone">Está en: ${e.z}</p>` : ''}
      ${e.l ? `<div class="tip-game"><span>En el juego</span>${e.l.map((l) => `<div>${l}</div>`).join('')}</div>` : ''}
      <div class="tip-foot"><a href="#glosario" data-gl="${e.id}">Glosario</a>${e.u ? `<a href="${e.u}" target="_blank" rel="noopener">Wowhead ↗</a>` : ''}</div>`;
    tip.hidden = false; tipFor = el; pinned = !!pin;
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth, h = tip.offsetHeight;
    let left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 8 && r.top - h - 6 > 8) top = r.top - h - 6;
    tip.style.left = left + 'px'; tip.style.top = Math.max(8, top) + 'px';
  }
  function hideTip() { tip.hidden = true; tipFor = null; pinned = false; }
  const canHover = window.matchMedia('(hover: hover)').matches;
  document.addEventListener('mouseover', (ev) => {
    if (!canHover) return;
    const el = ev.target.closest('.term');
    if (el && el !== tipFor && !pinned) { clearTimeout(hoverT); hoverT = setTimeout(() => showTip(el, false), 120); }
  });
  document.addEventListener('mouseout', (ev) => {
    if (!canHover || pinned) return;
    const to = ev.relatedTarget;
    if (ev.target.closest('.term') && !(to && (to.closest('.tip') || to.closest('.term') === tipFor))) { clearTimeout(hoverT); hoverT = setTimeout(hideTip, 150); }
    if (ev.target.closest('.tip') && !(to && (to.closest('.tip') || to.closest('.term')))) { clearTimeout(hoverT); hoverT = setTimeout(hideTip, 150); }
  });
  tip.addEventListener('mouseenter', () => clearTimeout(hoverT));
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('.term');
    if (el) { ev.preventDefault(); ev.stopPropagation(); if (tipFor === el && pinned) hideTip(); else showTip(el, true); return; }
    const gl = ev.target.closest('[data-gl]');
    if (gl) { ev.preventDefault(); hideTip(); pendingScroll = 'g-' + gl.dataset.gl; if (pageId() === 'glosario') render(false); else location.hash = 'glosario'; return; }
    if (!ev.target.closest('.tip')) hideTip();
  }, true);
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') hideTip();
    if ((ev.key === 'Enter' || ev.key === ' ') && document.activeElement.classList.contains('term')) { ev.preventDefault(); showTip(document.activeElement, true); }
  });
  window.addEventListener('scroll', () => { if (!tip.hidden) hideTip(); }, { passive: true });

  // Página del glosario
  let gFilter = '';
  function renderGlossary() {
    const sections = [...new Set(G.map((e) => e.s))];
    const f = norm(gFilter.trim());
    const match = (e) => !f || norm(e.n + ' ' + e.a.join(' ') + ' ' + e.d).includes(f);
    view.innerHTML = `
      <header class="page-head"><span class="eyebrow">Consulta</span><h1>Glosario</h1>
        <p class="muted small" style="margin:0">Qué es cada nombre de la guía. Los datos "En el juego" e iconos vienen de la base de datos de WoW Forever de Wowhead.</p></header>
      <div class="g-filter"><input id="g-filter" type="search" placeholder="Filtra: trampa, Orgrimmar, élite…" value="${escH(gFilter)}" autocomplete="off"></div>
      <nav class="toc" aria-label="Secciones">${sections.map((s) => `<button type="button" data-go="${slugify(s)}">${s}</button>`).join('')}</nav>
      ${sections.map((s) => {
        const list = G.filter((e) => e.s === s && match(e));
        if (!list.length) return '';
        return `<section class="doc-sec" id="s-${slugify(s)}"><h2>${s}</h2><div class="g-list">${list.map((e) => `
          <article class="g-item" id="s-g-${e.id}">
            ${iconHtml(e, 'g-ic')}
            <div class="g-body">
              <div class="g-name ${e.q != null ? 'q' + e.q : ''}">${e.n}${e.a.length ? ` <span class="muted small">(${e.a.join(', ')})</span>` : ''}</div>
              <div class="g-desc">${e.d}${e.z ? ` <span class="muted">Está en: ${e.z}.</span>` : ''}</div>
              ${e.l || e.u ? `<details class="g-game"><summary>En el juego</summary>${(e.l || []).map((l) => `<div>${l}</div>`).join('')}${e.u ? `<a href="${e.u}" target="_blank" rel="noopener">Ver en Wowhead ↗</a>` : ''}</details>` : ''}
            </div>
          </article>`).join('')}</div></section>`;
      }).join('')}`;
    linkTerms(view);
    const inp = document.getElementById('g-filter');
    inp.addEventListener('input', () => {
      gFilter = inp.value; const pos = inp.selectionStart;
      renderGlossary();
      const n = document.getElementById('g-filter'); n.focus(); n.setSelectionRange(pos, pos);
    });
  }
  function slugify(s) { return norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  // ---------- Clics ----------
  document.addEventListener('click', (e) => {
    const way = e.target.closest('[data-copy]');
    if (way) { e.preventDefault(); copy(way.dataset.copy); return; }
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
  const index = G.map((e) => ({ id: 'glosario', slug: 'g-' + e.id, where: 'Glosario › ' + e.n, text: e.d.replace(/<[^>]+>/g, ''), n: norm(e.n + ' ' + e.a.join(' ')) + ' ' + norm(e.d.replace(/<[^>]+>/g, '')), g: true }));
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
    const score = (x) => (x.g ? (terms.every((t) => norm(x.where).includes(t)) ? 0 : 2) : 1);
    const hits = index.filter((x) => terms.every((t) => x.n.includes(t))).sort((a, b) => score(a) - score(b)).slice(0, 12);
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

  render(true);
})();
