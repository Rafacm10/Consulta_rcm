// Clasifica títulos de tienda en: colección, tipo de producto e idioma,
// y agrupa ofertas del mismo producto de distintas tiendas.

export const norm = s => String(s ?? '').toLowerCase()
  .replace(/[ºª°]/g, 'o')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[–—−]/g, '-').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();

export function decodeEntities(s) {
  return String(s ?? '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&([aeiouAEIOU])(acute);/g, (_, v) => ({ a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' }[v]))
    .replace(/&ntilde;/g, 'ñ').replace(/&Ntilde;/g, 'Ñ').replace(/&uuml;/g, 'ü')
    .replace(/&[lr]squo;/g, "'").replace(/&ndash;/g, '-').replace(/&mdash;/g, '-').replace(/&hellip;/g, '...');
}

// Orden importa: lo más específico primero.
export const COLLECTIONS = [
  { id: 'primer-companero', name: 'Primer Compañero (First Partner)', sort: '2026-03', label: 'marzo a agosto 2026', re: /primer(os)? companero|first partner/ },
  { id: 'pokemon-day', name: 'Pokémon Day 2026', sort: '2026-02', label: '2026', re: /pokemon day|dia pokemon/ },
  { id: '30-aniversario', name: 'Celebración 30 Aniversario', sort: '2026-09', label: 'septiembre 2026', re: /30\s*\.?\s*(th|o)?\s*(aniv\w*|anniv\w*|celebr\w*)|celebra\w*\s*(del\s*)?30|\b30th\b/ },
  { id: 'oscuridad-absoluta', name: 'Megaevolución: Oscuridad Absoluta', sort: '2026-07', label: 'julio 2026', re: /oscuridad absoluta|absolute darkness/ },
  { id: 'caos-creciente', name: 'Megaevolución: Caos Creciente', sort: '2026-05', label: 'mayo 2026', re: /caos creciente|chaos rising/ },
  { id: 'equilibrio-perfecto', name: 'Megaevolución: Equilibrio Perfecto', sort: '2026-03b', label: 'marzo 2026', re: /equilibrio perfecto|perfect order/ },
  { id: 'heroes-ascendentes', name: 'Megaevolución: Héroes Ascendentes', sort: '2026-01', label: 'enero 2026', re: /heroes (ascend\w*|trascend\w*|transcend\w*)|ascenso heroico|ascended heroes/ },
  { id: 'llamas-fantasmales', name: 'Megaevolución: Llamas Fantasmales', sort: '2025-11', label: 'noviembre 2025', re: /(llamas|fuegos) fantasm\w*|phantasmal flames/ },
  { id: 'megaevolucion', name: 'Megaevolución (set base)', sort: '2025-09', label: 'septiembre 2025', re: /mega ?evoluci(on|ones)|mega evolution/ },
  { id: 'fulgor-negro-llama-blanca', name: 'Fulgor Negro / Llama Blanca', sort: '2025-07', label: 'julio 2025', re: /fulgor negro|llama blanca|black bolt|white flare/ },
  { id: 'rivales-predestinados', name: 'Rivales Predestinados', sort: '2025-05', label: 'mayo 2025', re: /rivales predestinados|destined rivals/ },
  { id: 'juntos-de-aventuras', name: 'Juntos de Aventuras', sort: '2025-03', label: 'marzo 2025', re: /juntos de aventura\w*|aventuras (compartidas|en conjunto)|companeros de aventura|journey together/ },
  { id: 'evoluciones-prismaticas', name: 'Evoluciones Prismáticas', sort: '2025-01', label: 'enero 2025', re: /evoluciones prismaticas|prismatic evolutions|prismaticas/ },
  { id: 'chispas-fulgurantes', name: 'Chispas Fulgurantes', sort: '2024-11', label: 'noviembre 2024', re: /chispas fulgurantes|surging sparks/ },
];
export const EXTRA_COLLECTIONS = [
  { id: 'accesorios', name: 'Accesorios (fundas, carpetas, tapetes…)', sort: '0001', label: '', re: null },
  { id: 'otros', name: 'Otros productos (sin clasificar)', sort: '0000', label: 'puede incluir productos antiguos', re: null },
];

// Sets de más de 2 años: se descartan
const OLD_RE = /corona astral|stellar crown|fabula sombria|shrouded fable|mascarada crepuscular|twilight masquerade|fuerzas temporales|temporal forces|destinos de paldea|paldean fates|evoluciones en paldea|paldea evolved|llamas obsidiana|obsidian flames|brecha paradojica|paradox rift|\b151\b|origen perdido|lost origin|tempestad plateada|silver tempest|zenit supremo|crown zenith|astros brillantes|brilliant stars|escarlata y purpura|scarlet (&|and) violet|espada y escudo|sword (&|and) shield|celebraciones|celebrations|25th|champion.?s path|shining fates|fusion strike|evolving skies|cielos evolutivos|pokemon go\b/;

const EXCLUDE_RE = /peluche|plush|funko|nintendo|switch|lego|camiseta|sudadera|taza\b|llavero|mochila|puzzle|rompecabezas|gorra|pijama|calcetin|amiibo|nanoblock|model kit|\blibro\b|\bmanga\b|figura de accion|squishmallow|jazwares|one piece|magic|yu-?gi-?oh|lorcana|digimon|dragon ball|star wars|riftbound|union arena|flesh and blood|naruto|weiss|carta suelta|\bsingles?\b|psa ?\d|\bcgc\b|\bbgs\b|gradad|graded|\b\d{1,3}\/\d{2,3}\b/;

const ACCESSORY_RE = /funda|sleeves?|protectores?|playmat|tapete|deck ?box|portamazo|deck shield|toploader|porta ?cartas|carpeta|\bbinder\b|album|portfolio|\bdados\b|marcadores|\bcoin(s)?\b(?! set)|storage|ultra pro|dragon shield|gamegenic|ultimate guard|metacrilato|acrilico|\bstand\b/;
const ACCESSORY_BUT_COLLECTION = /(binder|album|carpeta).*(collection|coleccion)|(collection|coleccion).*(binder|album|carpeta)|carpeta para colecciones|caja binder/;

export const TYPES = {
  case:     { label: 'Cases (cajas master)',       re: /\bcase\b|caja master|master case/ },
  upc:      { label: 'Ultra-Premium',              re: /ultra.?premium|\bupc\b/ },
  etb:      { label: 'Caja de Entrenador Élite',   re: /elite trainer|entrenador elite|\betb\b|caja de entrenador/ },
  booster_box: { label: 'Booster Box (display)',   re: /booster box|booster display|display(?! set)(?!.*card)|caja de 36|36 sobres|caja de sobres/ },
  bundle:   { label: 'Booster Bundle',             re: /booster bundle|bundle|paquete de sobres|lote( de)? \d* ?sobres|6 sobres|pack de 6/ },
  blister:  { label: 'Blíster',                    re: /blister|3.?pack|2.?pack|checklane|\b[23] sobres\b|tech sticker/ },
  tin:      { label: 'Latas',                      re: /\blatas?\b|\bmini ?latas?\b|\btins?\b|\bmini ?tins?\b/ },
  deck:     { label: 'Mazos',                      re: /battle deck|mazo|baraja|deck set|premium deck|theme deck|league battle/ },
  collection: { label: 'Cajas de colección',       re: /colecci(on)?|collection|\bbox\b|caja|figure|figura|special|premium|\bcoin set\b|card display/ },
  pack:     { label: 'Sobres sueltos',             re: /\bsobres?\b|booster packs?|\bbooster\b|\bpacks?\b/ },
};
export const TYPE_LABELS = { ...Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [k, v.label])), accessory: 'Accesorios', other: 'Otros' };

const LANGS = [
  ['ES', /espanol|castellano|spanish|[\(\[]es[\)\]]|\|\s*es\b|-\s*es\b|\bes$/],
  ['EN', /ingles|english|[\(\[]e(n|ng)[\)\]]|\|\s*en\b|-\s*en\b|\beng\b|\ben$/],
  ['JP', /japones|japanese|\bjp\b|\bjap\b|\bjpn\b|[\(\[]jp[\)\]]/],
  ['KR', /coreano|korean|\bkr\b|\bkor\b/],
  ['ZH', /chino|chinese|\bzh\b|\bcn\b|simplificado|tradicional/],
  ['OT', /aleman|german|deutsch|frances|french|\bfr\b|italiano|italian|portugues/],
];
export const LANG_LABELS = { ES: 'Español', EN: 'Inglés', JP: 'Japonés', KR: 'Coreano', ZH: 'Chino', OT: 'Otros idiomas', ML: 'Varios idiomas', '?': 'Idioma sin indicar' };

export function detectLang(text) {
  const hits = LANGS.filter(([, re]) => re.test(text)).map(([l]) => l);
  if (hits.length === 0) return '?';
  if (hits.length === 1) return hits[0];
  return 'ML';
}
export function detectType(text) {
  if (ACCESSORY_RE.test(text) && !ACCESSORY_BUT_COLLECTION.test(text)) return 'accessory';
  for (const [k, v] of Object.entries(TYPES)) if (v.re.test(text)) return k;
  return null;
}

// Devuelve { c, t, l, col, text } o null si se descarta
export function classify({ title, tags = '', vendor = '' }) {
  const text = norm(`${title} ${tags}`);
  if (EXCLUDE_RE.test(text)) return null;
  const isPoke = /pokemon/.test(text) || /pokemon/.test(norm(vendor));
  const col = COLLECTIONS.find(c => c.re.test(text)) || null;
  if (!col) {
    if (!isPoke) return null;
    if (OLD_RE.test(text)) return null;
  }
  let t = detectType(text);
  if (!t) { if (!col) return null; t = 'other'; }
  let c = col ? col.id : 'otros';
  if (t === 'accessory') { if (!isPoke && !col) return null; c = 'accesorios'; }
  return { c, t, l: detectLang(text), col: t === 'accessory' ? null : col, text };
}

// ---------- Agrupar ofertas del mismo producto ----------
const STOP = new Set(['pokemon', 'tcg', 'jcc', 'de', 'del', 'la', 'el', 'los', 'las', 'con', 'y', 'e', 'the', 'of', 'and', 'a', 'en', 'por', 'para', 'un', 'una', 'set',
  'nuevo', 'new', 'reserva', 'preventa', 'pre', 'venta', 'order', 'preorder', 'oferta', 'coleccion', 'collection', 'caja', 'box', 'pack', 'sobres', 'sobre',
  'booster', 'boosters', 'unidades', 'uds', 'ud', 'x', 'edicion', 'edition', 'aniversario', 'anniversary', 'celebracion', 'celebraciones', 'celebration', 'precintado', 'sellado',
  'megaevolucion', 'megaevoluciones', 'mega', 'evolution', 'evolucion', 'escarlata', 'purpura', 'scarlet', 'violet', 'elite', 'trainer', 'entrenador']);

function tokensOf(cls) {
  let s = cls.text;
  if (cls.col) s = s.replace(new RegExp(cls.col.re.source, 'g'), ' ');
  if (TYPES[cls.t]) s = s.replace(new RegExp(TYPES[cls.t].re.source, 'g'), ' ');
  for (const [, re] of LANGS) s = s.replace(new RegExp(re.source, 'g'), ' ');
  return new Set(s.replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w && !STOP.has(w)));
}
function compatible(a, b) {
  if (a.size === 0 || b.size === 0) return a.size === b.size;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const min = Math.min(a.size, b.size);
  if (min >= 2 && inter === min) return true;
  return inter / (a.size + b.size - inter) >= 0.6;
}
export function clusterItems(items) {
  const withTok = items.map(it => ({ it, tok: tokensOf(it.cls) }));
  withTok.sort((x, y) => x.tok.size - y.tok.size);
  const clusters = [];
  for (const x of withTok) {
    const hit = clusters.find(cl => compatible(cl.tok, x.tok));
    if (hit) hit.members.push(x.it); else clusters.push({ tok: x.tok, members: [x.it] });
  }
  return clusters.map(cl => {
    const freq = new Map();
    for (const m of cl.members) { const k = norm(m.title); freq.set(k, (freq.get(k) || 0) + 1); }
    const best = cl.members.slice().sort((a, b) => (freq.get(norm(b.title)) - freq.get(norm(a.title))) || a.title.length - b.title.length)[0];
    return { name: best.title, items: cl.members };
  });
}
