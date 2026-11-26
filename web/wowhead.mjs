// Descarga de Wowhead (base de datos de WoW Forever) el tooltip y el icono de cada término del glosario.
// Guarda todo en web/wowhead/ para que el portal funcione sin internet.
// Uso: node web/wowhead.mjs            (solo términos nuevos)
//      node web/wowhead.mjs --refresh  (vuelve a pedirlos todos)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseGlossary, WH_PREFS, WH_WORD, GENERIC_ICONS } from './glosario.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, 'wowhead');
const iconDir = join(outDir, 'icons');
mkdirSync(iconDir, { recursive: true });
const cacheFile = join(outDir, 'datos.json');
const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};
const refresh = process.argv.includes('--refresh');
const UA = { 'User-Agent': 'Mozilla/5.0 (personal leveling guide)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return await r.json();
      if (r.status === 404) return null;
    } catch { /* reintento */ }
    await sleep(1000 * (i + 1));
  }
  return null;
}
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function tooltipLines(html) {
  if (!html) return [];
  const t = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<table/gi, '\n<table').replace(/<\/b>/gi, '</b>\n')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(tr|div|table|p)>/gi, '\n').replace(/<\/t[dh]>/gi, '  ')
    .replace(/<[^>]+>/g, '');
  return decode(t).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean)
    .filter((l) => !/^Sell Price/i.test(l));
}

for (const icon of new Set(Object.values(GENERIC_ICONS))) {
  if (existsSync(join(iconDir, icon + '.jpg'))) continue;
  const r = await fetch(`https://wow.zamimg.com/images/wow/icons/medium/${icon}.jpg`, { headers: UA });
  if (r.ok) writeFileSync(join(iconDir, icon + '.jpg'), Buffer.from(await r.arrayBuffer()));
}

const terms = parseGlossary(readFileSync(join(here, '..', 'docs', 'guia', 'glosario.md'), 'utf8'));
// --retry: vuelve a buscar los que quedaron sin resultado.
const retry = process.argv.includes('--retry');
// --solo=npc: refresca solo ese tipo del glosario.
const solo = (process.argv.find((a) => a.startsWith('--solo=')) || '').slice(7);
let n = 0, miss = [], failed = [];
const save = () => writeFileSync(cacheFile, JSON.stringify(cache, null, 1));
for (const t of terms) {
  const prefs = WH_PREFS[t.kind] || [];
  if (t.wh === 'no' || (!prefs.length && !t.wh)) continue;
  if (solo && t.kind !== solo) continue;
  if (cache[t.name] && !refresh && !solo && !(retry && cache[t.name].none)) continue;
  let pick = null;
  if (t.wh && t.wh !== 'no') {
    const type = +Object.keys(WH_WORD).find((k) => WH_WORD[k] === t.wh.word);
    pick = { type, id: t.wh.id };
  } else {
    const j = await getJSON(`https://www.wowhead.com/forever/search/suggestions-template?q=${encodeURIComponent(t.name)}`);
    // Sin respuesta (Wowhead frena las peticiones): no se toca lo guardado.
    if (!j) { failed.push(t.name); await sleep(5000); continue; }
    const res = (j.results || []).filter((r) => prefs.includes(r.type));
    const exact = res.filter((r) => r.name.toLowerCase() === t.name.toLowerCase());
    // misma prioridad de tipo que en prefs
    exact.sort((a, b) => prefs.indexOf(a.type) - prefs.indexOf(b.type));
    pick = exact[0] || null;
  }
  if (!pick) { if (!cache[t.name] || cache[t.name].none) cache[t.name] = { none: true }; miss.push(t.name); continue; }
  const word = WH_WORD[pick.type];
  const tip = await getJSON(`https://nether.wowhead.com/forever/tooltip/${word}/${pick.id}`);
  if (!tip) { failed.push(t.name); await sleep(5000); continue; }
  const icon = (tip && tip.icon) || pick.icon || '';
  if (icon && !existsSync(join(iconDir, icon + '.jpg'))) {
    try {
      const r = await fetch(`https://wow.zamimg.com/images/wow/icons/medium/${icon}.jpg`, { headers: UA });
      if (r.ok) writeFileSync(join(iconDir, icon + '.jpg'), Buffer.from(await r.arrayBuffer()));
    } catch { /* sin icono */ }
  }
  cache[t.name] = {
    type: word, id: pick.id, icon, quality: tip && tip.quality != null ? tip.quality : pick.quality ?? null,
    lines: tooltipLines(tip && tip.tooltip).slice(0, 14),
    url: `https://www.wowhead.com/forever/${word}=${pick.id}`,
    zone: tip.map && tip.map.zone ? tip.map.zone : undefined,
  };
  n++;
  if (n % 20 === 0) save();
  await sleep(1200);
}
save();
console.log(`Listo: ${n} descargados.`);
console.log(`Wowhead no los tiene: ${miss.length ? miss.join(', ') : 'ninguno'}`);
if (failed.length) console.log(`Wowhead no respondió (vuelve a ejecutar con --retry): ${failed.join(', ')}`);
