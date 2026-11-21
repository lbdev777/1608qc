/* 1608 / Collecte de statistiques de visite (Worker séparé, SANS accès aux clés ni aux coordonnées des clients).
   Sans cookie, sans adresse IP stockée, sans empreinte : un identifiant de session aléatoire (onglet), la page vue,
   la ville approximative (arrondie ~50 km) fournie par Cloudflare, et le type d'appareil. Purge automatique après 120 jours. */
const TYPES = new Set(['pageview', 'product', 'cart', 'checkout', 'purchase']);
const te = new TextEncoder();
const origins = env => String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const hdr = (env, req, extra = {}) => { const o = req.headers.get('origin'); return { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', vary: 'Origin', ...(o && origins(env).includes(o) ? { 'access-control-allow-origin': o } : {}), ...extra }; };
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const txt = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max) : '';
const r05 = x => typeof x === 'number' && isFinite(x) ? Math.round(x * 2) / 2 : null;

export function parseBatch(body) {
  if (!body || typeof body !== 'object') return null;
  const sid = txt(body.sid, 32);
  if (!/^[a-z0-9]{12,32}$/.test(sid)) return null;
  const device = ['mobile', 'tablet', 'desktop'].includes(body.device) ? body.device : 'desktop';
  const evs = (Array.isArray(body.events) ? body.events : []).slice(0, 5).map(e => {
    if (!e || !TYPES.has(e.type)) return null;
    const path = txt(e.path, 120), ref = txt(e.ref, 80).toLowerCase(), product = txt(e.product, 60);
    if (path && !/^\/[A-Za-z0-9._\-\/]*$/.test(path)) return null;
    if (ref && !/^[a-z0-9.\-]+$/.test(ref)) return null;
    if (product && !/^[a-z0-9\-]+$/.test(product)) return null;
    return { type: e.type, path, ref, product };
  }).filter(Boolean);
  return evs.length ? { sid, device, events: evs } : null;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== '/api/t') return new Response(null, { status: 404 });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: hdr(env, req, { 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' }) });
    if (req.method !== 'POST') return new Response(null, { status: 405 });
    const origin = req.headers.get('origin');
    if (!origin || !origins(env).includes(origin)) return new Response(null, { status: 403, headers: hdr(env, req) });
    try {
      if (/bot|crawl|spider|headless|preview|slurp|facebookexternalhit|lighthouse/i.test(req.headers.get('user-agent') || '')) return new Response(null, { status: 204, headers: hdr(env, req) });
      const raw = await req.text(); if (raw.length > 2048) return new Response(null, { status: 413, headers: hdr(env, req) });
      let body; try { body = JSON.parse(raw); } catch (_) { return new Response(null, { status: 400, headers: hdr(env, req) }); }
      const b = parseBatch(body); if (!b) return new Response(null, { status: 400, headers: hdr(env, req) });
      const day = new Date().toISOString().slice(0, 10);
      const ipHash = (await sha((req.headers.get('cf-connecting-ip') || '') + '|' + day + '|trk')).slice(0, 20);
      const since = new Date(Date.now() - 600e3).toISOString();
      const n = await env.DB.prepare('SELECT COUNT(*) c FROM track_rl WHERE ip_hash=? AND at>?').bind(ipHash, since).first();
      if (n.c >= 120) return new Response(null, { status: 429, headers: hdr(env, req) });
      const cf = req.cf || {}, at = new Date().toISOString();
      const st = [env.DB.prepare('INSERT INTO track_rl(ip_hash,at) VALUES(?,?)').bind(ipHash, at)];
      for (const e of b.events) st.push(env.DB.prepare('INSERT INTO hits(ts,sid,type,path,ref,product,country,region,city,lat,lon,device) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(at, b.sid, e.type, e.path || null, e.ref || null, e.product || null, txt(cf.country, 2) || null, txt(cf.region, 60) || null, txt(cf.city, 60) || null, r05(Number(cf.latitude)), r05(Number(cf.longitude)), b.device));
      await env.DB.batch(st);
      return new Response(null, { status: 204, headers: hdr(env, req) });
    } catch (e) { console.error('track', String(e && e.message).slice(0, 80)); return new Response(null, { status: 204, headers: hdr(env, req) }); }
  },
  async scheduled(event, env) {
    const old = new Date(Date.now() - 120 * 864e5).toISOString(), oldRl = new Date(Date.now() - 864e5).toISOString();
    await env.DB.batch([env.DB.prepare('DELETE FROM hits WHERE ts<?').bind(old), env.DB.prepare('DELETE FROM track_rl WHERE at<?').bind(oldRl), env.DB.prepare('DELETE FROM lookups WHERE at<?').bind(oldRl)]);
  }
};
