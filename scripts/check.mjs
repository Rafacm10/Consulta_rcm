// Descubre los productos Pokémon TCG de las tiendas de stores.json, los clasifica
// por colección y escribe _site/data/stock.json. Node 20+, sin dependencias.
import fs from 'node:fs/promises';
import path from 'node:path';
import { classify, clusterItems, norm, decodeEntities, COLLECTIONS, EXTRA_COLLECTIONS, TYPE_LABELS, LANG_LABELS } from './classify.mjs';

const UA = 'Mozilla/5.0 (compatible; PokeStock/2.0; uso personal)';
const OUT = process.env.OUT || 'data/stock.json';
const STORES_FILE = process.env.STORES_FILE || 'stores.json';
const EXTRAS_FILE = process.env.EXTRAS_FILE || 'extras.json';
const PREV_URL = process.env.PREV_URL || '';
const PRE_RE = /reserva|preventa|pre-?venta|pre-?order|preorder/;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url, accept = 'application/json') {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': accept, 'Accept-Language': 'es-ES,es;q=0.9' }, signal: ctrl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r;
  } finally { clearTimeout(t); }
}
const getJson = async url => {
  const r = await get(url);
  try { return await r.json(); } catch { throw new Error('la tienda no devolvió datos legibles'); }
};

// ---------- Tiendas Shopify: /products.json ----------
async function fetchShopify(store) {
  const origin = new URL(store.url).origin;
  const paths = store.paths || ['/products.json'];
  const maxPages = store.maxPages || 40;
  let lastErr = new Error('sin productos');
  for (const p of paths) {
    try {
      const raw = []; const seen = new Set();
      for (let page = 1; page <= maxPages; page++) {
        const d = await getJson(`${origin}${p}?limit=250&page=${page}`);
        const arr = d.products || [];
        const fresh = arr.filter(x => !seen.has(x.id));
        fresh.forEach(x => seen.add(x.id));
        raw.push(...fresh);
        if (!arr.length || !fresh.length) break;
        await sleep(300);
      }
      if (!raw.length) { lastErr = new Error('sin productos en ' + p); continue; }
      return raw.map(p => {
        const vs = p.variants || [];
        const av = vs.filter(v => v.available);
        const pool = av.length ? av : vs;
        const prices = pool.map(v => Number(v.price)).filter(Number.isFinite);
        return {
          title: decodeEntities(p.title), tags: Array.isArray(p.tags) ? p.tags.join(' ') : (p.tags || ''),
          vendor: p.vendor || '', url: `${origin}/products/${p.handle}`,
          avail: av.length > 0, backorder: false, price: prices.length ? Math.min(...prices) : null,
        };
      });
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

// ---------- Tiendas WooCommerce: API pública de la tienda ----------
async function fetchWoo(store) {
  const origin = new URL(store.url).origin;
  const maxPages = store.maxPages || 15;
  const raw = []; const seen = new Set();
  for (let page = 1; page <= maxPages; page++) {
    const arr = await getJson(`${origin}/wp-json/wc/store/v1/products?search=pokemon&per_page=100&page=${page}`);
    if (!Array.isArray(arr) || !arr.length) break;
    const fresh = arr.filter(x => !seen.has(x.id));
    fresh.forEach(x => seen.add(x.id));
    raw.push(...fresh);
    if (!fresh.length || arr.length < 100) break;
    await sleep(300);
  }
  if (!raw.length) throw new Error('sin productos');
  return raw.map(p => {
    const minor = p.prices?.currency_minor_unit ?? 2;
    const price = p.prices?.price != null ? Number(p.prices.price) / 10 ** minor : null;
    return {
      title: decodeEntities(p.name), tags: (p.categories || []).map(c => c.name).join(' '), vendor: '',
      url: p.permalink, avail: !!p.is_in_stock, backorder: !!p.is_on_backorder, price: Number.isFinite(price) ? price : null,
    };
  });
}

// ---------- Tienda de plataforma desconocida: prueba Shopify y luego WooCommerce ----------
async function fetchAuto(store) {
  try { return await fetchShopify(store); } catch {}
  try { return await fetchWoo(store); } catch {}
  throw new Error('no es Shopify ni WooCommerce: hay que mirarla a mano');
}

// ---------- Amazon: solo cuenta como stock si hay botón "Añadir a la cesta" y NO pide invitación ----------
async function checkAmazon(u) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  let r, html;
  try {
    r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept': 'text/html', 'Accept-Language': 'es-ES,es;q=0.9' }, signal: ctrl.signal, redirect: 'follow' });
    html = await r.text();
  } finally { clearTimeout(t); }
  if (r.status === 503 || /api-services-support@amazon|Introduce los caracteres|Enter the characters you see|captcha/i.test(html)) throw new Error('Amazon bloquea al robot (captcha)');
  if (!r.ok) throw new Error('HTTP ' + r.status);
  if (!/id="productTitle"|id="title"/.test(html)) throw new Error('página de Amazon no reconocida');
  const text = norm(html);
  const invite = /solicitar (una )?invitacion|pendiente de invitacion|invitacion pendiente|request (an )?invitation|demander une invitation/.test(text);
  const hasCart = /id="add-to-cart-button"|name="submit\.add-to-cart"/.test(html);
  const m = html.match(/class="a-offscreen">\s*([^<]+?)\s*</);
  const price = m ? Number(m[1].replace(/[^\d,.]/g, '').replace(/\./g, '').replace(',', '.')) : null;
  return { avail: hasCart && !invite, price: Number.isFinite(price) ? price : null };
}

// ---------- Enlaces sueltos (extras.json) ----------
async function checkOneUrl(u) {
  const url = new URL(u);
  if (/\/products\/[^/?#]+/.test(url.pathname) && !/\.html$/.test(u)) {
    const variantId = url.searchParams.get('variant');
    const d = await getJson(url.origin + url.pathname.replace(/\/$/, '') + '.js');
    const vs = d.variants || [];
    const v = variantId ? vs.find(x => String(x.id) === variantId) : null;
    if (v) return { avail: !!v.available, price: v.price / 100 };
    const av = vs.filter(x => x.available);
    const pool = av.length ? av : vs;
    return { avail: av.length > 0, price: pool.length ? Math.min(...pool.map(x => x.price)) / 100 : null };
  }
  const html = await (await get(u, 'text/html')).text();
  let found = null;
  const walk = n => {
    if (!n || found) return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (typeof n !== 'object') return;
    if (n.offers) for (const o of (Array.isArray(n.offers) ? n.offers : [n.offers])) {
      if (o && o.availability) { found = { a: String(o.availability), p: o.price ?? o.lowPrice ?? null }; return; }
    }
    Object.values(n).forEach(walk);
  };
  for (const b of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { walk(JSON.parse(b[1].trim())); } catch {}
    if (found) break;
  }
  if (!found) throw new Error('sin datos de stock en la página');
  const price = found.p != null && found.p !== '' ? Number(String(found.p).replace(',', '.')) : null;
  return { avail: /InStock|LimitedAvailability|OnlineOnly|PreOrder|BackOrder/i.test(found.a), backorder: /PreOrder|BackOrder/i.test(found.a), price: Number.isFinite(price) ? price : null };
}

async function pool(tasks, n) {
  const res = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < tasks.length) { const k = i++; res[k] = await tasks[k](); }
  }));
  return res;
}

// ---------- Principal ----------
const allStores = JSON.parse(await fs.readFile(STORES_FILE, 'utf8'));
const stores = allStores.filter(s => s.type !== 'search');
const searchStores = allStores.filter(s => s.type === 'search').map(({ name, url, note }) => ({ name, url, ...(note ? { note } : {}) }));
let extras = [];
try { extras = JSON.parse(await fs.readFile(EXTRAS_FILE, 'utf8')); } catch {}

let prev = null;
try {
  if (PREV_URL) { const r = await fetch(PREV_URL, { headers: { 'User-Agent': UA } }); if (r.ok) prev = await r.json(); }
  if (!prev) prev = JSON.parse(await fs.readFile(OUT, 'utf8'));
} catch {}

const storeStatus = [];
const rawItems = [];

await pool(stores.map(s => async () => {
  try {
    const list = s.type === 'woo' ? await fetchWoo(s) : s.type === 'auto' ? await fetchAuto(s) : await fetchShopify(s);
    list.forEach(x => rawItems.push({ store: s.name, ...x }));
    storeStatus.push({ name: s.name, ok: true, n: list.length });
  } catch (e) {
    storeStatus.push({ name: s.name, ok: false, n: 0, error: String(e.message || e).slice(0, 80) });
  }
}), 6);

const coveredHosts = new Set(stores.map(s => new URL(s.url).host.replace(/^www\./, '')));
for (const e of extras) {
  if (coveredHosts.has(new URL(e.url).host.replace(/^www\./, ''))) continue;
  let st = storeStatus.find(x => x.name === e.tienda);
  if (!st) { st = { name: e.tienda, ok: true, n: 0 }; storeStatus.push(st); }
  try {
    const r = (e.tipo === 'amazon' || /(^|\.)amazon\./.test(new URL(e.url).host)) ? await checkAmazon(e.url) : await checkOneUrl(e.url);
    const langWord = { ES: 'español', EN: 'inglés', JP: 'japonés', ZH: 'chino', KR: 'coreano' }[e.idioma] || '';
    rawItems.push({ store: e.tienda, title: `${e.producto} ${e.coleccion || '30 aniversario'} ${langWord}`.trim(), tags: '', vendor: 'pokemon', url: e.url, ...r });
    st.n++;
  } catch (err) { st.ok = false; st.error = String(err.message || err).slice(0, 80); }
  await sleep(500);
}

const seenUrl = new Set();
const dropped = { ajeno_o_antiguo: 0, duplicado: 0 };
const classified = [];
for (const r of rawItems) {
  const key = r.url.split('#')[0].split('?')[0].toLowerCase();
  if (seenUrl.has(key)) { dropped.duplicado++; continue; }
  seenUrl.add(key);
  const cls = classify({ title: r.title, tags: r.tags, vendor: r.vendor });
  if (!cls) { dropped.ajeno_o_antiguo++; continue; }
  const status = r.avail ? ((r.backorder || PRE_RE.test(norm(r.title))) ? 'preorder' : 'in_stock') : 'out';
  classified.push({ ...r, cls, status });
}

// datos anteriores de tiendas que fallaron esta vez
const stale = [];
if (prev?.items && prev?.groups) {
  const gmap = new Map(prev.groups.map(g => [g.id, g]));
  for (const st of storeStatus.filter(s => !s.ok)) {
    for (const it of prev.items.filter(i => i.s === st.name)) {
      const g = gmap.get(it.g); if (!g) continue;
      stale.push({ store: st.name, title: it.n, url: it.u, price: it.p, status: it.st, old: true, cls: { c: g.c, t: g.t, l: g.l, text: norm(it.n), col: COLLECTIONS.find(c => c.id === g.c) || null } });
    }
  }
}
const all = [...classified, ...stale];

const buckets = new Map();
for (const it of all) {
  const k = `${it.cls.c}|${it.cls.t}|${it.cls.l}`;
  if (!buckets.has(k)) buckets.set(k, []);
  buckets.get(k).push(it);
}
const groups = []; const items = [];
let gi = 0;
const seenIds = new Set();
for (const [k, list] of buckets) {
  const [c, t, l] = k.split('|');
  for (const cl of clusterItems(list)) {
    const id = [c, t, l, norm(cl.name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)].join('-') + (seenIds.has([c, t, l, norm(cl.name)].join()) ? '-' + (gi++) : '');
    seenIds.add([c, t, l, norm(cl.name)].join());
    groups.push({ id, c, t, l, n: cl.name });
    for (const m of cl.items) {
      const o = { g: id, n: m.title, s: m.store, u: m.url, st: m.status, p: m.price == null ? null : Math.round(m.price * 100) / 100 };
      if (m.old) o.o = 1;
      items.push(o);
    }
  }
}

const cols = [...COLLECTIONS, ...EXTRA_COLLECTIONS].map(c => ({ id: c.id, name: c.name, sort: c.sort, label: c.label }));
const out = {
  updatedAt: new Date().toISOString(), cols, typeLabels: TYPE_LABELS, langLabels: LANG_LABELS,
  search: searchStores, stores: storeStatus.sort((a, b) => a.name.localeCompare(b.name)), groups, items,
};
await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, JSON.stringify(out));

for (const st of storeStatus.filter(x => !x.ok)) {
  const def = allStores.find(x => x.name === st.name && x.listing);
  if (def && !out.search.some(x => x.name === def.name)) out.search.push({ name: def.name, url: def.listing });
}
await fs.writeFile(OUT, JSON.stringify(out));

const ok = storeStatus.filter(s => s.ok).length;
const cnt = s => items.filter(i => i.st === s).length;
console.log(`Tiendas OK ${ok}/${storeStatus.length} | productos ${items.length} en ${groups.length} grupos | stock ${cnt('in_stock')} preventa ${cnt('preorder')} agotado ${cnt('out')} | descartados ${dropped.ajeno_o_antiguo} (ajenos/antiguos) ${dropped.duplicado} (duplicados) | datos antiguos ${stale.length}`);
for (const s of storeStatus.filter(s => !s.ok)) console.log(`  ✗ ${s.name}: ${s.error}`);
const otros = items.filter(i => groups.find(g => g.id === i.g)?.c === 'otros').slice(0, 15);
if (otros.length) { console.log('Ejemplos sin clasificar (revisar):'); otros.forEach(o => console.log('  -', o.s, '|', o.n)); }
