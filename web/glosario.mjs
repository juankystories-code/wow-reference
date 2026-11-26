// Lee docs/guia/glosario.md.
// Formato:
//   ## Sección {tipo}
//   - **Nombre** (alias, alias): descripción {wh:npc=1234}
// Tipos: zona, mazmorra, npc, objeto, hechizo, talento, mascota, mision, oficio, sistema, jerga.
// {wh:tipo=id} fuerza la entrada de Wowhead si la búsqueda automática se equivoca. {wh:no} la desactiva.

// Tipos de resultado de Wowhead: 1 PNJ, 3 objeto, 5 misión, 6 hechizo, 7 zona.
export const WH_PREFS = {
  zona: [7], mazmorra: [7], npc: [1], objeto: [3], hechizo: [6], talento: [6], mascota: [6, 1],
  mision: [5], oficio: [6], sistema: [3, 6], jerga: [],
};
export const WH_WORD = { 1: 'npc', 3: 'item', 5: 'quest', 6: 'spell', 7: 'zone' };
// Iconos del juego para los términos que no tienen uno propio en Wowhead (zonas, PNJ, misiones…).
export const GENERIC_ICONS = {
  zona: 'inv_misc_map_01', mazmorra: 'inv_misc_key_10', npc: 'inv_misc_groupneedmore', mision: 'inv_misc_note_01',
  sistema: 'inv_misc_gear_01', jerga: 'inv_misc_book_09', objeto: 'inv_misc_questionmark', hechizo: 'inv_misc_questionmark',
  talento: 'inv_misc_questionmark', mascota: 'ability_hunter_beasttaming', oficio: 'inv_misc_questionmark',
};

export function parseGlossary(src) {
  const out = [];
  let section = '', kind = '';
  for (const line of src.replace(/\r/g, '').split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*\{(\w+)\}\s*$/);
    if (h) { section = h[1]; kind = h[2]; continue; }
    const m = line.match(/^-\s+\*\*(.+?)\*\*(?:\s*\(([^)]*)\))?:\s*(.*?)\s*(\{wh:([^}]+)\})?\s*$/);
    if (!m || !kind) continue;
    let wh = null;
    if (m[5]) {
      if (m[5] === 'no') wh = 'no';
      else { const w = m[5].match(/^(\w+)=(\d+)$/); if (w) wh = { word: w[1], id: +w[2] }; }
    }
    out.push({
      name: m[1].trim(),
      aliases: m[2] ? m[2].split(',').map((a) => a.trim()).filter(Boolean) : [],
      desc: m[3].trim(),
      section, kind, wh,
    });
  }
  return out;
}
