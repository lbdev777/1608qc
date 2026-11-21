/* 1608 / Analytique (Worker PRIVÉ, séparé : lecture seule, sans clé de déchiffrement). Même protection que l'admin :
   Cloudflare Access + vérification du jeton dans le code + liste blanche de courriels. */
const te = new TextEncoder(), td = new TextDecoder();
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64url = s => unb64(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
const SEC = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY',
  'strict-transport-security': 'max-age=31536000; includeSubDomains', 'x-robots-tag': 'noindex, nofollow', 'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" };
const send = (b, s, t) => new Response(b, { status: s, headers: { ...SEC, 'content-type': t } });
const json = (d, s = 200) => send(JSON.stringify(d), s, 'application/json; charset=utf-8');
let jwks = { at: 0, keys: null };
async function getJwks(env) { if (jwks.keys && Date.now() - jwks.at < 3600e3) return jwks.keys; const r = await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`); if (!r.ok) throw new Error('jwks'); jwks = { at: Date.now(), keys: (await r.json()).keys || [] }; return jwks.keys; }
export async function verifyAccess(req, env) {
  const emails = String(env.ADMIN_EMAILS || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !emails.length) return { configured: false };
  const tok = req.headers.get('cf-access-jwt-assertion'); if (!tok) return { configured: true, ok: false };
  try {
    const [h, p, s] = tok.split('.'); const head = JSON.parse(td.decode(b64url(h))), pay = JSON.parse(td.decode(b64url(p)));
    if (head.alg !== 'RS256') return { configured: true, ok: false };
    const jwk = (await getJwks(env)).find(k => k.kid === head.kid); if (!jwk) return { configured: true, ok: false };
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const good = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), te.encode(h + '.' + p));
    const aud = Array.isArray(pay.aud) ? pay.aud : [pay.aud];
    const ok = good && pay.exp * 1000 > Date.now() && pay.iss === `https://${env.ACCESS_TEAM_DOMAIN}` && aud.includes(env.ACCESS_AUD) && emails.includes(String(pay.email || '').toLowerCase());
    return { configured: true, ok, email: pay.email };
  } catch (_) { return { configured: true, ok: false }; }
}
const RANGES = { '24h': 864e5, '7d': 7 * 864e5, '30d': 30 * 864e5 };
export async function stats(env, range, now = Date.now()) {
  const ms = RANGES[range] || RANGES['24h'];
  const since = new Date(now - ms).toISOString(), prevSince = new Date(now - 2 * ms).toISOString(), liveSince = new Date(now - 300e3).toISOString();
  const q = (sql, ...a) => env.DB.prepare(sql).bind(...a);
  const one = async (sql, ...a) => (await q(sql, ...a).first()) || {};
  const all = async (sql, ...a) => (await q(sql, ...a).all()).results || [];
  const cut = range === '24h' ? 13 : 10;
  const [s, ps, live, ord, pord, pages, locs, devs, refs, prods, fun, ser, oser, lp, op] = await Promise.all([
    one('SELECT COUNT(DISTINCT sid) c FROM hits WHERE ts>=?', since),
    one('SELECT COUNT(DISTINCT sid) c FROM hits WHERE ts>=? AND ts<?', prevSince, since),
    one('SELECT COUNT(DISTINCT sid) c FROM hits WHERE ts>=?', liveSince),
    one("SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE created_at>=? AND status<>'Annulé'", since),
    one("SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE created_at>=? AND created_at<? AND status<>'Annulé'", prevSince, since),
    all("SELECT path, COUNT(*) c FROM hits WHERE ts>=? AND type='pageview' AND path IS NOT NULL GROUP BY path ORDER BY c DESC LIMIT 8", since),
    all('SELECT city, country, COUNT(DISTINCT sid) c FROM hits WHERE ts>=? AND city IS NOT NULL GROUP BY city, country ORDER BY c DESC LIMIT 6', since),
    all('SELECT device, COUNT(DISTINCT sid) c FROM hits WHERE ts>=? GROUP BY device ORDER BY c DESC', since),
    all("SELECT ref, COUNT(DISTINCT sid) c FROM hits WHERE ts>=? AND ref IS NOT NULL AND ref<>'' GROUP BY ref ORDER BY c DESC LIMIT 6", since),
    all("SELECT product, COUNT(*) c FROM hits WHERE ts>=? AND type='product' AND product IS NOT NULL GROUP BY product ORDER BY c DESC LIMIT 6", since),
    all('SELECT type, COUNT(DISTINCT sid) c FROM hits WHERE ts>=? GROUP BY type', since),
    all(`SELECT substr(ts,1,${cut}) b, COUNT(DISTINCT sid) v FROM hits WHERE ts>=? GROUP BY b ORDER BY b`, since),
    all(`SELECT substr(created_at,1,${cut}) b, COUNT(*) v FROM orders WHERE created_at>=? AND status<>'Annulé' GROUP BY b`, since),
    all('SELECT lat, lon, city FROM hits WHERE ts>=? AND lat IS NOT NULL GROUP BY sid LIMIT 200', liveSince),
    all("SELECT lat, lon, city, ts FROM hits WHERE ts>=? AND type='purchase' AND lat IS NOT NULL ORDER BY ts DESC LIMIT 40", since)
  ]);
  return { range, sessions: s.c || 0, live: live.c || 0, orders: ord.n || 0, sales: ord.s || 0, prev: { sessions: ps.c || 0, orders: pord.n || 0, sales: pord.s || 0 },
    pages, locations: locs, devices: devs, refs, products: prods, funnel: Object.fromEntries(fun.map(f => [f.type, f.c])), series: ser, orderSeries: oser, livePoints: lp, orderPoints: op };
}
const NAMES = __NAMES__, HTML = __HTML__, APP_JS = __APP_JS__, APP_CSS = __APP_CSS__, LAND_JS = __LAND_JS__;
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      const auth = await verifyAccess(req, env);
      if (!auth.configured) return json({ error: 'Analytique non configurée.' }, 503);
      if (!auth.ok) return json({ error: 'Accès refusé.' }, 403);
      if (req.method !== 'GET') return json({ error: 'Méthode non permise.' }, 405);
      if (url.pathname === '/api/stats') return json(await stats(env, url.searchParams.get('range')));
      if (url.pathname === '/') return send(HTML, 200, 'text/html; charset=utf-8');
      if (url.pathname === '/app.js') return send(APP_JS, 200, 'application/javascript; charset=utf-8');
      if (url.pathname === '/app.css') return send(APP_CSS, 200, 'text/css; charset=utf-8');
      if (url.pathname === '/land.js') return send(LAND_JS, 200, 'application/javascript; charset=utf-8');
      if (url.pathname === '/names.js') return send('window.__NAMES=' + JSON.stringify(NAMES) + ';', 200, 'application/javascript; charset=utf-8');
      return json({ error: 'Introuvable.' }, 404);
    } catch (e) { console.error('erreur', String(e && e.message).slice(0, 100)); return json({ error: 'Erreur du serveur.' }, 500); }
  }
};
