// Genera web/portal.html a partir de los .md de docs/.
// Uso: node web/build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const docsDir = join(root, 'docs');

// id de página -> archivo
const DOCS = [
  ['estado', 'estado.md', 'Estado'],
  ['ruta', 'guia/ruta.md', 'Ruta 1-60'],
  ['talentos', 'guia/talentos.md', 'Talentos'],
  ['hechizos', 'guia/hechizos.md', 'Hechizos'],
  ['mascotas', 'guia/mascotas.md', 'Mascotas'],
  ['armas', 'guia/armas-equipo.md', 'Armas y equipo'],
  ['mecanicas', 'guia/mecanicas-cazador.md', 'Mecánicas'],
  ['sistemas', 'guia/sistemas-forever.md', 'Sistemas Forever'],
  ['profesiones', 'guia/profesiones.md', 'Profesiones'],
  ['dinero', 'guia/dinero.md', 'Dinero'],
  ['addons', 'guia/addons.md', 'Addons'],
  ['fuentes', 'fuentes.md', 'Fuentes'],
];
const FILE2ID = Object.fromEntries(DOCS.map(([id, f]) => [f.split('/').pop(), id]));

// ---------- Markdown mínimo ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[*`[\]()]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const plain = (s) => s.replace(/`([^`]+)`/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/^[#>|\-\s\d.]+/gm, ' ').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();

function shortUrl(u) {
  try { const x = new URL(u.replace(/&amp;/g, '&')); return x.hostname.replace(/^www\./, ''); } catch { return u; }
}
function link(t, u) {
  if (/^https?:/.test(u)) return `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
  const id = FILE2ID[u.split('#')[0].split('/').pop()];
  return id ? `<a href="#${id}">${t}</a>` : t;
}
function inline(s) {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => link(t, u));
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s)<]+)/g, (m, p, u) => `${p}<a class="ext" href="${u}" target="_blank" rel="noopener">${shortUrl(u)}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\u0000(\d+)\u0000/g, (m, n) => {
    const c = codes[+n];
    if (/^\/way\s/.test(c)) return `<button type="button" class="way" data-copy="${esc(c)}" title="Copiar para TomTom">${esc(c.replace(/^\/way\s+/, ''))}</button>`;
    return `<code>${esc(c)}</code>`;
  });
  return s;
}
const LIST_RE = /^\s*([-*]|\d+\.)\s+/;
function list(lines) {
  const items = [];
  for (const l of lines) {
    const m = l.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (m) items.push({ ind: m[1].length, ord: /\d/.test(m[2]), num: parseInt(m[2], 10), text: m[3] });
    else if (items.length) items[items.length - 1].text += ' ' + l.trim();
  }
  let pos = 0;
  function build(ind) {
    const first = items[pos];
    const tag = first.ord ? 'ol' : 'ul';
    let html = `<${tag}${first.ord && first.num !== 1 ? ` start="${first.num}"` : ''}>`;
    while (pos < items.length && items[pos].ind >= ind) {
      const it = items[pos++];
      let li = inline(it.text);
      if (pos < items.length && items[pos].ind > it.ind) li += build(items[pos].ind);
      html += `<li>${li}</li>`;
    }
    return html + `</${tag}>`;
  }
  return build(items[0].ind);
}
const cells = (row) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
function table(lines) {
  const rows = lines.filter((l, i) => !(i === 1 && /^[\s|:-]+$/.test(l))).map(cells);
  const [head, ...body] = rows;
  return `<div class="tbl"><table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${
    body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function md(src) {
  const lines = src.replace(/\r/g, '').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith('```')) {
      const buf = []; i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      out.push(`<div class="code"><button type="button" class="copy" data-copy-code>Copiar</button><pre><code>${esc(buf.join('\n'))}</code></pre></div>`);
      continue;
    }
    const h = l.match(/^(#{1,6})\s+(.*)$/);
    if (h) { out.push(`<h${h[1].length} id="${slug(h[2])}">${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^---+\s*$/.test(l)) { out.push('<hr>'); i++; continue; }
    if (l.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''));
      out.push(`<blockquote>${md(buf.join('\n'))}</blockquote>`); continue;
    }
    if (l.trim().startsWith('|')) {
      const buf = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) buf.push(lines[i++]);
      out.push(table(buf)); continue;
    }
    if (LIST_RE.test(l)) {
      const buf = [];
      while (i < lines.length && (LIST_RE.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) buf.push(lines[i++]);
      out.push(list(buf)); continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(#|```|>|---|\s*\||\s*([-*]|\d+\.)\s)/.test(lines[i])) buf.push(lines[i++].trim());
    if (!buf.length) { buf.push(lines[i++].trim()); }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

// ---------- Documentos ----------
function parseDoc(id, file, label) {
  const src = readFileSync(join(docsDir, file), 'utf8').replace(/\r/g, '');
  const lines = src.split('\n');
  let title = label;
  const intro = [];
  const sections = [];
  let cur = null;
  for (const l of lines) {
    if (/^#\s/.test(l)) { title = l.replace(/^#\s+/, ''); continue; }
    if (/^##\s/.test(l)) { cur = { title: l.replace(/^##\s+/, ''), md: [] }; sections.push(cur); continue; }
    (cur ? cur.md : intro).push(l);
  }
  return {
    id, label, file, title,
    intro: md(intro.join('\n')),
    sections: sections.map((s) => {
      const body = s.md.join('\n');
      const range = s.title.match(/^(\d+)-(\d+)/);
      return {
        title: s.title, titleHtml: inline(s.title), slug: slug(s.title), html: md(body), text: plain(body),
        range: range ? [+range[1], +range[2]] : null, md: body,
      };
    }),
  };
}
const docs = DOCS.map(([id, f, label]) => parseDoc(id, f, label));
const byId = Object.fromEntries(docs.map((d) => [d.id, d]));
const sec = (id, start) => byId[id].sections.find((s) => s.title.startsWith(start));

function tableRows(markdown) {
  const lines = markdown.split('\n').filter((l) => l.trim().startsWith('|'));
  return lines.filter((l, i) => !(i === 1 && /^[\s|:-]+$/.test(l))).map(cells).slice(1);
}
function lvl(cell) {
  const c = cell.replace(/\*|~/g, '');
  const m = c.match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!m) return null;
  const min = +m[1];
  const max = m[2] ? +m[2] : (/\+/.test(c) ? 60 : min);
  return [min, max];
}
const strip = (s) => s.replace(/\*\*/g, '');

// Resumen de la ruta
const resumen = tableRows(sec('ruta', 'Resumen').md).map((r) => {
  const [min, max] = lvl(r[0]);
  const zone = strip(r[1]);
  const dungeon = strip(r[3]);
  return { min, max, zone: zone === '—' ? dungeon : zone, alt: strip(r[2]), dungeon: dungeon === '—' ? '' : dungeon, isDungeon: zone === '—' };
});
const talents = tableRows(byId.talentos.sections.find((s) => /^Leveo/.test(s.title)).md)
  .map((r) => ({ range: lvl(r[0]), html: inline(r[1]) }));
const spells = tableRows(readFileSync(join(docsDir, 'guia/hechizos.md'), 'utf8'))
  .map((r) => ({ lvl: lvl(r[0])[0], html: inline(r[1]), kind: /^Sí/.test(r[2]) ? 'si' : /^Saltar/.test(r[2]) ? 'no' : 'info', note: inline(r[2]) }));
const pets = tableRows(sec('mascotas', 'Plan').md).map((r) => ({
  range: lvl(r[0]), optional: /opcional|alternativa/i.test(r[0]), name: inline(r[1]), where: inline(r[2]), why: inline(r[3]),
}));
const weapons = tableRows(sec('armas', 'Arma a distancia').md).map((r) => ({
  range: lvl(r[0]), name: inline(r[1]), how: inline(r[2]), go: /^\**Sí/.test(r[3]), note: inline(r[3]),
}));
const gold = tableRows(sec('dinero', 'Objetivos').md).map((r) => ({ range: lvl(r[0]), what: inline(r[1]), cost: inline(r[2]) }));

// Estado
const estadoSrc = readFileSync(join(docsDir, 'estado.md'), 'utf8');
const field = (k) => {
  const m = estadoSrc.match(new RegExp(`\\*\\*${k}:\\*\\*\\s*(.*)`));
  return m ? m[1].trim() : '';
};
const estado = {
  nombre: field('Nombre'), reino: field('Reino'), nivel: parseInt(field('Nivel'), 10) || 1,
  zona: field('Zona actual'), oro: field('Oro'), mascota: field('Mascota activa'), arma: field('Arma a distancia'),
};

// Huecos conocidos (CLAUDE.md)
let huecos = '';
try {
  const c = readFileSync(join(root, 'CLAUDE.md'), 'utf8').replace(/\r/g, '');
  const m = c.match(/## Huecos conocidos[^\n]*\n([\s\S]*?)(\n## |$)/);
  if (m) huecos = md(m[1]);
} catch { /* sin CLAUDE.md */ }

// Hitos (curados a mano a partir de la guía)
const milestones = [
  [4, 'Primer entrenamiento: Serpent Sting y Aspect of the Monkey', 'hechizos'],
  [6, 'Cooking y First Aid en Sen\'jin Village', 'profesiones'],
  [10, '"Taming the Beast" con Thotar → doma Shal\'ma. Primer talento. Leatherworking en Orgrimmar', 'mascotas'],
  [14, 'Empieza la Cozy Sleeping Bag: Burned-Out Remains (The Barrens 46 74)', 'sistemas'],
  [18, 'Wailing Caverns con todas las misiones → Venomstrike. Multi-Shot', 'ruta'],
  [20, 'Aimed Shot, Aspect of the Cheetah y Freezing Trap. Stonetalon: "Scramble" → Precision Bow o Moonsight Rifle', 'hechizos'],
  [25, 'Summon Hawk (siempre dos fuera). Primer punto de Legacy → Frequent Flier', 'talentos'],
  [29, 'Razorfen Kraul: Vengeful Fate → Quilboar Blaster', 'armas'],
  [30, 'Feign Death e Intimidation', 'hechizos'],
  [37, 'Doma a Broken Tooth en Badlands. Mascota hasta 60', 'mascotas'],
  [40, 'Montura (~120 g con Xar\'Ti), Bestial Wrath y Truthseeker\'s Bow (25 libros)', 'dinero'],
  [41, 'Big Game Hunter → Master Hunter\'s Bow o Rifle', 'armas'],
  [44, 'Zul\'Farrak → Arch of the Covenant', 'ruta'],
  [46, 'Maraudon: Corruption of Earth and Seed → Verdant Keeper\'s Aim', 'armas'],
  [54, 'Lower Blackrock Spire → Blackcrow', 'armas'],
  [60, 'Rellena el registro final de estado.md', 'estado'],
];

const DATA = {
  nav: docs.map((d) => ({ id: d.id, label: d.label })),
  docs: Object.fromEntries(docs.map((d) => [d.id, {
    title: d.title, intro: d.intro,
    sections: d.sections.map(({ title, titleHtml, slug: s, html, text, range }) => ({ title, titleHtml, slug: s, html, text, range })),
  }])),
  resumen, talents, spells, pets, weapons, gold, estado, huecos,
  rutina: sec('sistemas', 'Rutina').html,
  milestones: milestones.map(([l, t, p]) => ({ lvl: l, html: inline(t), page: p })),
  built: new Date().toISOString().slice(0, 16).replace('T', ' '),
};

const css = readFileSync(join(here, 'style.css'), 'utf8');
const js = readFileSync(join(here, 'app.js'), 'utf8');
const html = `<meta charset="utf-8">
<title>Diario del Cazador</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Grenze:wght@500;600;700&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
${css}
</style>
<div id="app"></div>
<script id="data" type="application/json">${JSON.stringify(DATA).replace(/</g, '\\u003c')}</script>
<script>
${js}
</script>
`;
writeFileSync(join(here, 'portal.html'), html);
console.log(`portal.html generado (${(html.length / 1024).toFixed(0)} KB, nivel ${estado.nivel}, ${resumen.length} tramos, ${spells.length} filas de hechizos)`);
