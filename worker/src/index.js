/* 1608 / API des commandes : Cloudflare Worker + D1.
   Principes :
   1. Une commande est écrite dans D1 AVANT toute notification (rien ne se perd si Telegram est en panne).
   2. La notification est réessayée chaque minute jusqu'à réussite (cron).
   3. Les coordonnées du client sont chiffrées (AES-GCM) avant d'être stockées ; la notification
      Telegram ne contient par défaut que prénom, ville, articles et total.
   4. L'administration exige un jeton Cloudflare Access valide (refus par défaut si non configuré).
   Aucun secret dans ce fichier : tout vient de `env` (secrets Cloudflare). */

const STATUSES = ['Commande reçue','Total confirmé','Payé (Interac)','En production','Expédié','Livré','Annulé'];
const OPEN_STATUSES = ['Commande reçue','Total confirmé','Payé (Interac)','En production'];
const MAX_BODY = 8192;
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const te = new TextEncoder(), td = new TextDecoder();
const nowIso = () => new Date().toISOString();
const catalog = () => globalThis.CATALOG || (typeof CATALOG !== 'undefined' ? CATALOG : {});

/* ---------- utilitaires ---------- */
const CTRL = new RegExp('[\\u0000-\\u001F\\u007F\\u200B-\\u200F\\u2028\\u2029\\uFEFF]', 'g');
const clean = (v, max) => typeof v === 'string'
  ? v.normalize('NFC').replace(CTRL, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const money = c => (c / 100).toFixed(2).replace('.', ',') + ' $';
const b64 = buf => { let s = ''; new Uint8Array(buf).forEach(b => s += String.fromCharCode(b)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64url = s => unb64(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
async function sha256hex(s) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(s)))].map(b => b.toString(16).padStart(2, '0')).join(''); }
/* Numéro de commande séquentiel (3001, 3002, …) : le compteur est incrémenté de façon atomique dans D1. */
async function nextOrderNumber(env) {
  const r = await env.DB.prepare("UPDATE counter SET n=n+1 WHERE name='order' RETURNING n").first();
  if (!r) throw new Error('compteur manquant');
  return String(r.n);
}
async function emailHash(env, email) { return (await sha256hex((env.PII_KEY || '') + '|email|' + email)).slice(0, 40); }
function origins(env) { return String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean); }
function baseHeaders(extra = {}) {
  return { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', ...extra };
}
const json = (data, status = 200, extra) => new Response(JSON.stringify(data), { status, headers: baseHeaders(extra) });
function corsFor(req, env) {
  const o = req.headers.get('origin');
  if (o && origins(env).includes(o)) return { 'access-control-allow-origin': o, 'vary': 'Origin' };
  return { 'vary': 'Origin' };
}

/* ---------- prix : même règle que le site (assets/catalog.js) ---------- */
export function priceOrder(lines) {
  const cat = catalog();
  const subtotal = lines.reduce((t, l) => t + cat[l.id].price * l.qty, 0);
  const models = new Set(lines.map(l => l.id)).size;
  const look = lines.some(l => l.id === 'uniforme-zip') && lines.some(l => l.id === 'uniforme-jogger');
  const percent = models >= 3 || look ? 15 : models >= 2 ? 10 : 0;
  const discount = Math.round(subtotal * percent / 100);
  return { subtotal, discount, total: subtotal - discount, percent, models };
}

/* ---------- validation de la commande ---------- */
export function validateOrder(body) {
  const err = m => ({ error: m });
  if (!body || typeof body !== 'object') return err('Requête invalide.');
  if (body.website) return { spam: true };                       // champ piège (honeypot)
  const idem = clean(body.idem, 64);
  if (!/^[A-Za-z0-9-]{16,64}$/.test(idem)) return err('Identifiant de demande invalide.');
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20) return err('Panier invalide.');
  const cat = catalog(), seen = new Map();
  for (const it of body.items) {
    const id = clean(it && it.id, 60), size = clean(it && it.size, 6), qty = it && it.qty;
    const p = cat[id];
    if (!p || !p.sizes.includes(size) || !Number.isInteger(qty) || qty < 1 || qty > 10) return err('Article invalide.');
    const k = id + '|' + size; seen.set(k, { id, size, qty: Math.min(10, (seen.get(k)?.qty || 0) + qty) });
  }
  const items = [...seen.values()];
  if (items.some(i => i.qty > 10) || items.reduce((t, i) => t + i.qty, 0) > 30) return err('Quantité trop élevée.');
  const c = body.customer || {};
  const customer = {
    name: clean(c.name, 100), email: clean(c.email, 150).toLowerCase(), phone: clean(c.phone, 30),
    street: clean(c.street, 120), city: clean(c.city, 90), postal: clean(c.postal, 12).toUpperCase(), note: clean(c.note, 500)
  };
  if (customer.name.length < 2) return err('Nom requis.');
  if (!/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(customer.email)) return err('Courriel invalide.');
  if (customer.phone && !/^[0-9+().\-\s]{7,30}$/.test(customer.phone)) return err('Téléphone invalide.');
  if (customer.street.length < 3) return err('Adresse requise.');
  if (customer.city.length < 2) return err('Ville requise.');
  if (!/^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/.test(customer.postal)) return err('Code postal invalide.');
  return { ok: true, idem, items, customer, token: clean(body.turnstile, 2100) };
}

/* ---------- chiffrement des coordonnées ---------- */
async function piiKey(env) {
  if (!env.PII_KEY) throw new Error('PII_KEY manquante');
  const raw = unb64(env.PII_KEY);
  if (raw.length !== 32) throw new Error('PII_KEY doit contenir 32 octets (base64)');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encryptPII(env, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await piiKey(env), te.encode(JSON.stringify(obj)));
  return b64(iv) + '.' + b64(ct);
}
export async function decryptPII(env, s) {
  const [iv, ct] = s.split('.');
  return JSON.parse(td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await piiKey(env), unb64(ct))));
}

/* ---------- Cloudflare Access (administration) ---------- */
let jwksCache = { at: 0, keys: null };
async function getJwks(env) {
  if (jwksCache.keys && Date.now() - jwksCache.at < 3600e3) return jwksCache.keys;
  const r = await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`);
  if (!r.ok) throw new Error('JWKS indisponible');
  jwksCache = { at: Date.now(), keys: (await r.json()).keys || [] };
  return jwksCache.keys;
}
export async function verifyAccess(req, env) {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return { configured: false };
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
    const ok = good && pay.exp * 1000 > Date.now() && pay.iss === `https://${env.ACCESS_TEAM_DOMAIN}` && aud.includes(env.ACCESS_AUD)
      && (!env.ADMIN_EMAILS || String(env.ADMIN_EMAILS).toLowerCase().split(',').map(x => x.trim()).includes(String(pay.email || '').toLowerCase()));
    return { configured: true, ok, email: pay.email };
  } catch (_) { return { configured: true, ok: false }; }
}

/* ---------- notifications Telegram ---------- */
function chatIds(env) { return String(env.TELEGRAM_CHAT_IDS || '').split(',').map(s => s.trim()).filter(Boolean); }
function orderMessage(env, o, pii) {
  const items = JSON.parse(o.items_json);
  const cat = catalog();
  const n = items.reduce((t, i) => t + i.qty, 0);
  const lines = items.map(i => `• ${esc(cat[i.id]?.name || i.id)} — ${esc(i.size)} ×${i.qty}`).join('\n');
  let t = `🆕 <b>Commande #${esc(o.id)}</b>\n${n} article${n > 1 ? 's' : ''} · <b>${money(o.total)}</b>` +
    (o.discount ? ` (rabais −${money(o.discount)})` : '') + `\n${lines}\n👤 ${esc(o.first_name)} · ${esc(o.city)}\n` +
    `⚠️ Total, livraison et taxes à confirmer avant le paiement Interac.`;
  if (env.NOTIFY_DETAILS === 'full' && pii) {
    t += `\n\n${esc(pii.name)}\n${esc(pii.email)}${pii.phone ? '\n' + esc(pii.phone) : ''}\n${esc(pii.street)}, ${esc(pii.city)} ${esc(pii.postal)}${pii.note ? '\n📝 ' + esc(pii.note) : ''}`;
  }
  return t;
}
async function tgSend(env, chat, text, withButton) {
  const body = { chat_id: chat, text, parse_mode: 'HTML', disable_web_page_preview: true };
  if (withButton && env.ADMIN_URL) body.reply_markup = { inline_keyboard: [[{ text: 'Ouvrir les commandes', url: env.ADMIN_URL }]] };
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error('Telegram ' + r.status + ' ' + (j.description || '').slice(0, 120));
}
/* Envoie les notifications en attente (une commande ou toutes). Verrou de 30 s par ligne. */
export async function sendPending(env, orderId) {
  if (!env.TELEGRAM_BOT_TOKEN) return { sent: 0, pending: 0, configured: false };
  const lease = new Date(Date.now() - 30e3).toISOString();
  const q = orderId
    ? env.DB.prepare('SELECT n.order_id, n.chat_id FROM notifications n WHERE n.sent_at IS NULL AND n.order_id=?').bind(orderId)
    : env.DB.prepare('SELECT n.order_id, n.chat_id FROM notifications n WHERE n.sent_at IS NULL ORDER BY n.order_id LIMIT 25');
  const rows = (await q.all()).results || [];
  let sent = 0;
  for (const row of rows) {
    const claim = await env.DB.prepare('UPDATE notifications SET attempts=attempts+1, last_try=? WHERE order_id=? AND chat_id=? AND sent_at IS NULL AND (last_try IS NULL OR last_try<?)')
      .bind(nowIso(), row.order_id, row.chat_id, lease).run();
    if (!claim.meta || claim.meta.changes !== 1) continue;
    try {
      const o = await env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(row.order_id).first();
      const pii = env.NOTIFY_DETAILS === 'full' ? await decryptPII(env, o.pii_enc) : null;
      await tgSend(env, row.chat_id, orderMessage(env, o, pii), true);
      await env.DB.prepare('UPDATE notifications SET sent_at=?, last_error=NULL WHERE order_id=? AND chat_id=?').bind(nowIso(), row.order_id, row.chat_id).run();
      sent++;
    } catch (e) {
      await env.DB.prepare('UPDATE notifications SET last_error=? WHERE order_id=? AND chat_id=?').bind(String(e.message).slice(0, 200), row.order_id, row.chat_id).run();
    }
  }
  return { sent, pending: rows.length - sent, configured: true };
}
async function broadcast(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  for (const c of chatIds(env)) { try { await tgSend(env, c, text, true); } catch (_) { /* meilleur effort */ } }
}

/* ---------- création de commande ---------- */
async function turnstileOk(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return true;
  if (!token) return false;
  const f = new FormData(); f.append('secret', env.TURNSTILE_SECRET); f.append('response', token); if (ip) f.append('remoteip', ip);
  try { const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: f }); return !!(await r.json()).success; } catch (_) { return false; }
}
async function createOrder(req, env, ctx) {
  const cors = corsFor(req, env);
  const origin = req.headers.get('origin');
  if (origin && !origins(env).includes(origin)) return json({ error: 'Origine refusée.' }, 403);
  if (!/^application\/json/i.test(req.headers.get('content-type') || '')) return json({ error: 'Type de contenu invalide.' }, 415, cors);
  const len = Number(req.headers.get('content-length') || 0);
  if (len > MAX_BODY) return json({ error: 'Requête trop grande.' }, 413, cors);
  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: 'Requête trop grande.' }, 413, cors);
  let body; try { body = JSON.parse(raw); } catch (_) { return json({ error: 'JSON invalide.' }, 400, cors); }
  const v = validateOrder(body);
  if (v.spam) return json({ ok: true, id: String(3000 + 100 + Math.floor(Math.random() * 800)) }, 200, cors);   // le robot croit avoir réussi
  if (v.error) return json({ error: v.error }, 400, cors);
  const ip = req.headers.get('cf-connecting-ip') || '';
  if (!(await turnstileOk(env, v.token, ip))) return json({ error: 'Vérification anti-robot échouée.' }, 403, cors);

  // Doublon (même identifiant de demande) : on renvoie la commande déjà enregistrée.
  const dup = await env.DB.prepare('SELECT id,total,subtotal,discount,percent FROM orders WHERE idem=?').bind(v.idem).first();
  if (dup) return json({ ok: true, duplicate: true, id: dup.id, subtotal: dup.subtotal, discount: dup.discount, total: dup.total, percent: dup.percent }, 200, cors);

  const ipHash = (await sha256hex(ip + '|' + (env.IP_SALT || '1608'))).slice(0, 24);
  const since10 = new Date(Date.now() - 600e3).toISOString(), since1h = new Date(Date.now() - 3600e3).toISOString();
  const byIp = await env.DB.prepare('SELECT COUNT(*) c FROM orders WHERE ip_hash=? AND created_at>?').bind(ipHash, since10).first();
  const all = await env.DB.prepare('SELECT COUNT(*) c FROM orders WHERE created_at>?').bind(since1h).first();
  if (byIp.c >= 5 || all.c >= 300) return json({ error: 'Trop de demandes. Réessaie dans quelques minutes.' }, 429, { ...cors, 'retry-after': '300' });

  const price = priceOrder(v.items);
  const id = await nextOrderNumber(env), at = nowIso(), eh = await emailHash(env, v.customer.email);
  const pii = await encryptPII(env, v.customer);
  const first = v.customer.name.split(' ')[0].slice(0, 40);
  const stmts = [
    env.DB.prepare('INSERT INTO orders(id,idem,created_at,updated_at,status,items_json,subtotal,discount,total,percent,first_name,city,pii_enc,ip_hash,email_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id, v.idem, at, at, STATUSES[0], JSON.stringify(v.items), price.subtotal, price.discount, price.total, price.percent, first, v.customer.city, pii, ipHash, eh),
    env.DB.prepare('INSERT INTO events(order_id,at,type,note) VALUES(?,?,?,?)').bind(id, at, 'création', 'Commande reçue du site')
  ];
  for (const c of chatIds(env)) stmts.push(env.DB.prepare('INSERT INTO notifications(order_id,chat_id) VALUES(?,?)').bind(id, c));
  await env.DB.batch(stmts);                       // atomique : tout ou rien, AVANT la notification
  ctx.waitUntil(sendPending(env, id));
  return json({ ok: true, id, subtotal: price.subtotal, discount: price.discount, total: price.total, percent: price.percent }, 201, cors);
}

/* ---------- suivi par le client : courriel + numéro de commande (aucune coordonnée renvoyée) ---------- */
async function orderStatus(req, env) {
  const cors = corsFor(req, env);
  const origin = req.headers.get('origin');
  if (origin && !origins(env).includes(origin)) return json({ error: 'Origine refusée.' }, 403);
  if (!/^application\/json/i.test(req.headers.get('content-type') || '')) return json({ error: 'Type de contenu invalide.' }, 415, cors);
  const raw = await req.text();
  if (raw.length > 1024) return json({ error: 'Requête trop grande.' }, 413, cors);
  let b; try { b = JSON.parse(raw); } catch (_) { return json({ error: 'JSON invalide.' }, 400, cors); }
  const email = clean(b && b.email, 150).toLowerCase(), number = clean(String(b && b.number || ''), 12).replace(/^#/, '');
  if (!/^\d{4,8}$/.test(number) || !/^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email)) return json({ error: 'Entrez votre courriel et votre numéro de commande.' }, 400, cors);
  const ipHash = (await sha256hex((req.headers.get('cf-connecting-ip') || '') + '|' + (env.IP_SALT || '1608'))).slice(0, 24);
  const since = new Date(Date.now() - 600e3).toISOString();
  const n = await env.DB.prepare('SELECT COUNT(*) c FROM lookups WHERE ip_hash=? AND at>?').bind(ipHash, since).first();
  if (n.c >= 10) return json({ error: 'Trop d’essais. Réessayez dans quelques minutes.' }, 429, { ...cors, 'retry-after': '600' });
  await env.DB.prepare('INSERT INTO lookups(ip_hash,at) VALUES(?,?)').bind(ipHash, nowIso()).run();
  const o = await env.DB.prepare('SELECT id,created_at,updated_at,status,items_json,subtotal,discount,total FROM orders WHERE id=? AND email_hash=?').bind(number, await emailHash(env, email)).first();
  if (!o) return json({ error: 'Aucune commande trouvée avec ce courriel et ce numéro.' }, 404, cors);
  const cat = catalog();
  const ev = (await env.DB.prepare("SELECT at,type FROM events WHERE order_id=? AND type LIKE 'statut%' ORDER BY at").bind(o.id).all()).results || [];
  return json({ ok: true, id: o.id, status: o.status, created_at: o.created_at, updated_at: o.updated_at, subtotal: o.subtotal, discount: o.discount, total: o.total,
    items: JSON.parse(o.items_json).map(i => ({ name: cat[i.id]?.name || i.id, size: i.size, qty: i.qty })), history: ev.map(e => ({ at: e.at, status: e.type.replace(/^statut → /, '') })) }, 200, cors);
}

/* ---------- administration ---------- */
async function adminRoute(req, env, url) {
  const auth = await verifyAccess(req, env);
  if (!auth.configured) return json({ error: 'Administration non configurée.' }, 503);
  if (!auth.ok) return json({ error: 'Accès refusé.' }, 403);
  const origin = req.headers.get('origin');
  if (req.method !== 'GET' && origin && origin !== url.origin) return json({ error: 'Origine refusée.' }, 403);
  const parts = url.pathname.replace(/^\/api\/admin\//, '').split('/').filter(Boolean);

  if (req.method === 'GET' && parts[0] === 'orders' && !parts[1]) {
    const status = url.searchParams.get('status');
    const rows = (status && STATUSES.includes(status)
      ? await env.DB.prepare('SELECT * FROM orders WHERE status=? ORDER BY created_at DESC LIMIT 300').bind(status).all()
      : await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 300').all()).results || [];
    const notes = (await env.DB.prepare('SELECT order_id, SUM(sent_at IS NULL) pending, MAX(last_error) err FROM notifications GROUP BY order_id').all()).results || [];
    const nm = Object.fromEntries(notes.map(n => [n.order_id, n]));
    const out = [];
    for (const o of rows) {
      let customer = null; try { customer = await decryptPII(env, o.pii_enc); } catch (_) { customer = { error: 'Déchiffrement impossible' }; }
      out.push({ id: o.id, created_at: o.created_at, updated_at: o.updated_at, status: o.status, items: JSON.parse(o.items_json), subtotal: o.subtotal, discount: o.discount, total: o.total, percent: o.percent, customer, note: o.admin_note, notify_pending: nm[o.id]?.pending || 0, notify_error: nm[o.id]?.err || null });
    }
    return json({ orders: out, statuses: STATUSES });
  }
  if (req.method === 'POST' && parts[0] === 'orders' && parts[1] && parts[2] === 'status') {
    let b; try { b = await req.json(); } catch (_) { return json({ error: 'JSON invalide.' }, 400); }
    if (!STATUSES.includes(b.status)) return json({ error: 'Statut invalide.' }, 400);
    const note = clean(b.note, 500), at = nowIso(), id = clean(parts[1], 20);
    const r = await env.DB.batch([
      env.DB.prepare('UPDATE orders SET status=?, updated_at=?, admin_note=CASE WHEN ?<>\'\' THEN ? ELSE admin_note END WHERE id=?').bind(b.status, at, note, note, id),
      env.DB.prepare('INSERT INTO events(order_id,at,type,note) SELECT id,?,?,? FROM orders WHERE id=?').bind(at, 'statut → ' + b.status, (auth.email || '') + (note ? ' · ' + note : ''), id)
    ]);
    if (!r[0].meta || r[0].meta.changes !== 1) return json({ error: 'Commande introuvable.' }, 404);
    return json({ ok: true });
  }
  if (req.method === 'POST' && parts[0] === 'orders' && parts[1] && parts[2] === 'notify') {
    const id = clean(parts[1], 20);
    await env.DB.prepare('UPDATE notifications SET sent_at=NULL, last_try=NULL WHERE order_id=?').bind(id).run();
    return json({ ok: true, ...(await sendPending(env, id)) });
  }
  if (req.method === 'GET' && parts[0] === 'events' && parts[1]) {
    const e = (await env.DB.prepare('SELECT at,type,note FROM events WHERE order_id=? ORDER BY at').bind(clean(parts[1], 20)).all()).results || [];
    return json({ events: e });
  }
  if (req.method === 'GET' && parts[0] === 'stats') {
    const s = await env.DB.prepare("SELECT COUNT(*) total, SUM(status='Commande reçue') nouvelles, SUM(status IN ('Payé (Interac)','En production','Expédié','Livré')) payees FROM orders").first();
    const p = await env.DB.prepare('SELECT COUNT(*) c FROM notifications WHERE sent_at IS NULL').first();
    return json({ ...s, notifications_en_attente: p.c, telegram: !!env.TELEGRAM_BOT_TOKEN && chatIds(env).length > 0 });
  }
  return json({ error: 'Introuvable.' }, 404);
}

/* ---------- point d'entrée ---------- */
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    try {
      if (url.pathname === '/api/health' && req.method === 'GET') {
        await env.DB.prepare('SELECT 1').first();
        return json({ ok: true, db: true, notifier: !!env.TELEGRAM_BOT_TOKEN && chatIds(env).length > 0, adminProtected: !!(env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD) });
      }
      if (url.pathname === '/api/orders') {
        if (req.method === 'OPTIONS') {
          const c = corsFor(req, env);
          return new Response(null, { status: 204, headers: { ...c, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } });
        }
        if (req.method === 'POST') return await createOrder(req, env, ctx);
        return json({ error: 'Méthode non permise.' }, 405);
      }
      if (url.pathname === '/api/order-status') {
        if (req.method === 'OPTIONS') {
          const c = corsFor(req, env);
          return new Response(null, { status: 204, headers: { ...c, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } });
        }
        if (req.method === 'POST') return await orderStatus(req, env);
        return json({ error: 'Méthode non permise.' }, 405);
      }
      if (url.pathname.startsWith('/api/admin/')) return await adminRoute(req, env, url);
      return json({ error: 'Introuvable.' }, 404);
    } catch (e) {
      // Jamais de détails ni de données personnelles dans la réponse ou les journaux.
      console.error('erreur', String(e && e.message).slice(0, 120));
      return json({ error: 'Erreur du serveur. Ta demande n’a pas été perdue si tu as reçu un numéro ; sinon réessaie.' }, 500);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      const r = await sendPending(env);
      // Rappel : demande sans réponse depuis plus d'une heure.
      const old = new Date(Date.now() - 3600e3).toISOString();
      const stale = (await env.DB.prepare("SELECT id,first_name,total FROM orders WHERE status='Commande reçue' AND reminded_at IS NULL AND created_at<? LIMIT 10").bind(old).all()).results || [];
      for (const o of stale) {
        await broadcast(env, `⏰ <b>#${esc(o.id)}</b> (${esc(o.first_name)}, ${money(o.total)}) attend toujours une réponse.`);
        await env.DB.prepare('UPDATE orders SET reminded_at=? WHERE id=?').bind(nowIso(), o.id).run();
      }
      if (event.cron === '0 12 * * *') {
        const open = await env.DB.prepare(`SELECT status, COUNT(*) c FROM orders WHERE status IN (${OPEN_STATUSES.map(() => '?').join(',')}) GROUP BY status`).bind(...OPEN_STATUSES).all();
        const rows = open.results || [];
        await broadcast(env, '☀️ <b>Résumé du matin</b>\n' + (rows.length ? rows.map(x => `${esc(x.status)} : ${x.c}`).join('\n') : 'Aucune commande ouverte.'));
      }
      return r;
    })());
  }
};
