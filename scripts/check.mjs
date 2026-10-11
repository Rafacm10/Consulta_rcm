// Revisa cada enlace de products.json y escribe data/stock.json
// Necesita Node 20+ (fetch incluido). Sin dependencias.
import fs from 'node:fs/promises';

const UA = 'Mozilla/5.0 (compatible; PokeStock/1.0; uso personal)';
const products = JSON.parse(await fs.readFile('products.json', 'utf8'));
let previous = { items: [] };
try { previous = JSON.parse(await fs.readFile('data/stock.json', 'utf8')); } catch {}
const prevByUrl = new Map((previous.items || []).map(i => [i.url, i]));

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url, accept) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept': accept, 'Accept-Language': 'es-ES,es;q=0.9' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r;
  } finally { clearTimeout(t); }
}

// Tiendas Shopify: /products/nombre.js devuelve JSON con "available"
async function checkShopify(u) {
  const url = new URL(u);
  const variantId = url.searchParams.get('variant');
  const jsUrl = url.origin + url.pathname.replace(/\/$/, '') + '.js';
  const d = await (await get(jsUrl, 'application/json')).json();
  const variants = d.variants || [];
  const v = variantId ? variants.find(x => String(x.id) === variantId) : null;
  if (v) return { status: v.available ? 'in_stock' : 'out', price: v.price / 100 };
  const avail = variants.filter(x => x.available);
  const pool = avail.length ? avail : variants;
  return {
    status: avail.length ? 'in_stock' : 'out',
    price: pool.length ? Math.min(...pool.map(x => x.price)) / 100 : null,
  };
}

// Resto de tiendas: busca datos estructurados schema.org en la página
async function checkGeneric(u) {
  const html = await (await get(u, 'text/html')).text();
  const blocks = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
  let found = null;
  const walk = n => {
    if (!n || found) return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (typeof n !== 'object') return;
    if (n.offers) {
      const offs = Array.isArray(n.offers) ? n.offers : [n.offers];
      for (const o of offs) {
        if (o && o.availability) {
          found = { avail: String(o.availability), price: o.price ?? o.lowPrice ?? null };
          return;
        }
      }
    }
    Object.values(n).forEach(walk);
  };
  for (const b of blocks) {
    try { walk(JSON.parse(b[1].trim())); } catch {}
    if (found) break;
  }
  if (!found) return { status: 'unknown', price: null };
  const a = found.avail;
  let status = 'unknown';
  if (/PreOrder|BackOrder/i.test(a)) status = 'preorder';
  else if (/InStock|LimitedAvailability|OnlineOnly/i.test(a)) status = 'in_stock';
  else if (/OutOfStock|SoldOut|Discontinued/i.test(a)) status = 'out';
  const price = found.price != null && found.price !== '' ? Number(String(found.price).replace(',', '.')) : null;
  return { status, price: Number.isFinite(price) ? price : null };
}

const isShopify = u => /\/products\/[^/?#]+/.test(new URL(u).pathname) && !/\.html$/.test(u);

const items = [];
for (const p of products) {
  const now = new Date().toISOString();
  let res;
  try {
    try {
      res = isShopify(p.url) ? await checkShopify(p.url) : await checkGeneric(p.url);
    } catch (e) {
      // Si no era Shopify de verdad, probamos el método genérico
      if (isShopify(p.url)) res = await checkGeneric(p.url); else throw e;
    }
    items.push({ ...p, status: res.status, price: res.price, checkedAt: now });
  } catch (e) {
    const old = prevByUrl.get(p.url);
    items.push({
      ...p,
      status: 'error',
      price: old?.price ?? null,
      lastStatus: old?.status && old.status !== 'error' ? old.status : null,
      error: String(e.message || e).slice(0, 80),
      checkedAt: now,
    });
  }
  await sleep(500); // educado con las tiendas
}

await fs.writeFile('data/stock.json', JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 1));
const c = s => items.filter(i => i.status === s).length;
console.log(`OK: ${items.length} enlaces | en stock ${c('in_stock')} | preventa ${c('preorder')} | agotado ${c('out')} | sin datos ${c('unknown')} | error ${c('error')}`);
