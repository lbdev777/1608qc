/* 1608 / Administration des commandes (Worker PRIVÉ, séparé du Worker public).
   Protection en 3 couches : Cloudflare Access devant le nom de domaine + vérification du jeton Access dans le code
   (signature RS256, expiration, audience, émetteur) + liste blanche de courriels. Sans configuration complète : tout est refusé. */
const STATUSES = ['Commande reçue','Total confirmé','Payé (Interac)','En production','Expédié','Livré','Annulé'];
const te = new TextEncoder(), td = new TextDecoder();
const nowIso = () => new Date().toISOString();
const CTRL = new RegExp('[\\u0000-\\u001F\\u007F\\u200B-\\u200F\\u2028\\u2029\\uFEFF]', 'g');
const clean = (v, max) => typeof v === 'string' ? v.normalize('NFC').replace(CTRL, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64url = s => unb64(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
const SEC = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY',
  'strict-transport-security': 'max-age=31536000; includeSubDomains', 'x-robots-tag': 'noindex, nofollow',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" };
const send = (body, status, type) => new Response(body, { status, headers: { ...SEC, 'content-type': type } });
const json = (d, s = 200) => send(JSON.stringify(d), s, 'application/json; charset=utf-8');

async function piiKey(env) { const raw = unb64(env.PII_KEY || ''); if (raw.length !== 32) throw new Error('clé invalide'); return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']); }
async function decryptPII(env, s) { const [iv, ct] = s.split('.'); return JSON.parse(td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await piiKey(env), unb64(ct)))); }
let jwks = { at: 0, keys: null };
async function getJwks(env) {
  if (jwks.keys && Date.now() - jwks.at < 3600e3) return jwks.keys;
  const r = await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error('jwks'); jwks = { at: Date.now(), keys: (await r.json()).keys || [] }; return jwks.keys;
}
export async function verifyAccess(req, env) {
  const emails = String(env.ADMIN_EMAILS || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !emails.length) return { configured: false };
  const tok = req.headers.get('cf-access-jwt-assertion');
  if (!tok) return { configured: true, ok: false };
  try {
    const [h, p, s] = tok.split('.');
    const head = JSON.parse(td.decode(b64url(h))), pay = JSON.parse(td.decode(b64url(p)));
    if (head.alg !== 'RS256') return { configured: true, ok: false };
    const jwk = (await getJwks(env)).find(k => k.kid === head.kid);
    if (!jwk) return { configured: true, ok: false };
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const good = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(s), te.encode(h + '.' + p));
    const aud = Array.isArray(pay.aud) ? pay.aud : [pay.aud];
    const ok = good && pay.exp * 1000 > Date.now() && pay.iss === `https://${env.ACCESS_TEAM_DOMAIN}` && aud.includes(env.ACCESS_AUD) && emails.includes(String(pay.email || '').toLowerCase());
    return { configured: true, ok, email: pay.email };
  } catch (_) { return { configured: true, ok: false }; }
}

async function api(req, env, url, auth) {
  const origin = req.headers.get('origin');
  if (req.method !== 'GET' && origin !== url.origin) return json({ error: 'Origine refusée.' }, 403);
  const parts = url.pathname.replace(/^\/api\/admin\//, '').split('/').filter(Boolean);
  if (req.method === 'GET' && parts[0] === 'orders' && !parts[1]) {
    const rows = (await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 300').all()).results || [];
    const notes = (await env.DB.prepare('SELECT order_id, SUM(sent_at IS NULL) pending, MAX(last_error) err FROM notifications GROUP BY order_id').all()).results || [];
    const nm = Object.fromEntries(notes.map(n => [n.order_id, n]));
    const out = [];
    for (const o of rows) {
      let customer; try { customer = await decryptPII(env, o.pii_enc); } catch (_) { customer = { error: 'Déchiffrement impossible' }; }
      out.push({ id: o.id, created_at: o.created_at, status: o.status, items: JSON.parse(o.items_json), subtotal: o.subtotal, discount: o.discount, total: o.total, customer, note: o.admin_note, notify_pending: nm[o.id]?.pending || 0, notify_error: nm[o.id]?.err || null });
    }
    return json({ orders: out, statuses: STATUSES, me: auth.email });
  }
  if (req.method === 'POST' && parts[0] === 'orders' && parts[1] && parts[2] === 'status') {
    if (!/^application\/json/i.test(req.headers.get('content-type') || '')) return json({ error: 'Type invalide.' }, 415);
    let b; try { b = await req.json(); } catch (_) { return json({ error: 'JSON invalide.' }, 400); }
    if (!STATUSES.includes(b.status)) return json({ error: 'Statut invalide.' }, 400);
    const note = clean(b.note, 500), at = nowIso(), id = clean(parts[1], 20);
    const r = await env.DB.batch([
      env.DB.prepare("UPDATE orders SET status=?, updated_at=?, admin_note=CASE WHEN ?<>'' THEN ? ELSE admin_note END WHERE id=?").bind(b.status, at, note, note, id),
      env.DB.prepare('INSERT INTO events(order_id,at,type,note) SELECT id,?,?,? FROM orders WHERE id=?').bind(at, 'statut → ' + b.status, (auth.email || '') + (note ? ' · ' + note : ''), id)
    ]);
    if (!r[0].meta || r[0].meta.changes !== 1) return json({ error: 'Commande introuvable.' }, 404);
    return json({ ok: true });
  }
  return json({ error: 'Introuvable.' }, 404);
}

const HTML = __HTML__, APP_JS = __APP_JS__, APP_CSS = __APP_CSS__;
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      const auth = await verifyAccess(req, env);
      if (!auth.configured) return json({ error: 'Administration non configurée.' }, 503);
      if (!auth.ok) return json({ error: 'Accès refusé.' }, 403);
      if (url.pathname.startsWith('/api/admin/')) return await api(req, env, url, auth);
      if (req.method !== 'GET') return json({ error: 'Méthode non permise.' }, 405);
      if (url.pathname === '/' || url.pathname === '/commandes') return send(HTML, 200, 'text/html; charset=utf-8');
      if (url.pathname === '/app.js') return send(APP_JS, 200, 'application/javascript; charset=utf-8');
      if (url.pathname === '/app.css') return send(APP_CSS, 200, 'text/css; charset=utf-8');
      return json({ error: 'Introuvable.' }, 404);
    } catch (e) { console.error('erreur', String(e && e.message).slice(0, 100)); return json({ error: 'Erreur du serveur.' }, 500); }
  }
};
