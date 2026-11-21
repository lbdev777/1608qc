import { DatabaseSync } from 'node:sqlite'; import fs from 'node:fs'; import assert from 'node:assert/strict';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const W = await import(path.join(here, '../dist/worker.js'));
const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync(path.join(here, '../schema.sql'), 'utf8'));
const mk = (sql, args = []) => ({
  bind: (...a) => mk(sql, a),
  first: async () => db.prepare(sql).get(...args) ?? null,
  all: async () => ({ results: db.prepare(sql).all(...args) }),
  run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; }
});
const DB = { prepare: s => mk(s), batch: async st => { db.exec('BEGIN'); try { const o = []; for (const s of st) o.push(await s.run()); db.exec('COMMIT'); return o; } catch (e) { db.exec('ROLLBACK'); throw e; } } };
const key = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
const sent = []; let tgFail = false;
globalThis.fetch = async (u, o) => { if (String(u).includes('api.telegram.org')) { if (tgFail) return new Response('{"ok":false,"description":"down"}', { status: 500 }); sent.push(JSON.parse(o.body)); return new Response('{"ok":true}'); } throw new Error('réseau inattendu ' + u); };
const env = { DB, PII_KEY: key, TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_IDS: '111', ALLOWED_ORIGINS: 'https://1608qc.com', ADMIN_URL: 'https://x/admin.html' };
const waits = []; const ctx = { waitUntil: p => waits.push(p) };
const cat = JSON.parse(fs.readFileSync(path.join(here, '../catalog.json'), 'utf8')); const ids = Object.keys(cat);
const good = (over = {}) => ({ idem: 'abcdefgh-1234-5678-' + Math.random().toString(16).slice(2, 10), items: [{ id: ids[0], size: cat[ids[0]].sizes[0], qty: 1 }],
  customer: { name: 'Jean Tremblay', email: 'Jean@Test.ca', phone: '418 555-0100', street: '1 rue Test', city: 'Rimouski', postal: 'g5l 1a1', note: '' }, ...over });
const post = (b, h = {}) => W.default.fetch(new Request('https://api/api/orders', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://1608qc.com', 'cf-connecting-ip': '1.2.3.4', ...h }, body: JSON.stringify(b) }), env, ctx);
let n = 0; const ok = (name, f) => f().then(() => { n++; console.log('✓', name); }, e => { console.log('✗', name, e.message); process.exitCode = 1; });

await ok('commande valide : 201, stockée, notifiée', async () => {
  const b = good(); const r = await post(b); assert.equal(r.status, 201); const j = await r.json();
  assert.match(j.id, /^30\d\d$/); assert.equal(j.id, '3001'); await Promise.all(waits);
  assert.equal(sent.length, 1); assert.ok(sent[0].text.includes(j.id)); assert.ok(!sent[0].text.includes('Test.ca'), 'pas de courriel dans la notif');
  assert.ok(!sent[0].text.includes('rue Test'));
});
await ok('PII chiffrée en base (aucun texte clair)', async () => {
  const row = db.prepare('SELECT * FROM orders').get(); const all = JSON.stringify(row);
  for (const s of ['Tremblay', 'Test.ca', '555-0100', 'rue Test', 'G5L']) assert.ok(!all.includes(s), s);
  assert.equal((await W.decryptPII(env, row.pii_enc)).postal, 'G5L 1A1'.replace(' ', ' ') === 'G5L 1A1' ? 'G5L 1A1' : '');
});
await ok('idempotence : même idem = même commande', async () => {
  const b = good(); const a = await (await post(b)).json(); const c = await (await post(b)).json();
  assert.equal(a.id, c.id); assert.equal(c.duplicate, true); assert.equal(db.prepare('SELECT COUNT(*) c FROM orders WHERE idem=?').get(b.idem).c, 1);
});
await ok('prix recalculé côté serveur (prix client ignoré)', async () => {
  const b = good({ items: [{ id: ids[0], size: cat[ids[0]].sizes[0], qty: 2, price: 1 }, { id: ids[1], size: cat[ids[1]].sizes[0], qty: 1 }], total: 1 });
  const j = await (await post(b)).json(); const sub = cat[ids[0]].price * 2 + cat[ids[1]].price;
  assert.equal(j.subtotal, sub); assert.equal(j.percent, 10); assert.equal(j.total, sub - Math.round(sub * .1));
});
await ok('refus : article inconnu, taille invalide, qty négative', async () => {
  for (const it of [{ id: 'nope', size: 'M', qty: 1 }, { id: ids[0], size: 'ZZ', qty: 1 }, { id: ids[0], size: cat[ids[0]].sizes[0], qty: -1 }, { id: ids[0], size: cat[ids[0]].sizes[0], qty: 99 }])
    assert.equal((await post(good({ items: [it] }))).status, 400);
});
await ok('refus : courriel, code postal, nom invalides', async () => {
  for (const c of [{ email: 'x' }, { postal: '12345' }, { name: '' }, { street: '' }]) assert.equal((await post(good({ customer: { ...good().customer, ...c } }))).status, 400);
});
await ok('CORS : origine inconnue refusée', async () => assert.equal((await post(good(), { origin: 'https://evil.com' })).status, 403));
await ok('honeypot : faux succès sans écriture', async () => {
  const c = db.prepare('SELECT COUNT(*) c FROM orders').get().c; const r = await post(good({ website: 'http://spam' })); assert.equal(r.status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM orders').get().c, c);
});
await ok('trop gros / mauvais type', async () => {
  assert.equal((await post(good({ customer: { ...good().customer, note: 'x'.repeat(20000) } }))).status, 413);
  const r = await W.default.fetch(new Request('https://api/api/orders', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' }), env, ctx); assert.equal(r.status, 415);
});
await ok('panne Telegram : commande gardée, notif en attente, cron la renvoie', async () => {
  tgFail = true; const j = await (await post(good())).json(); await Promise.all(waits);
  assert.ok(db.prepare('SELECT COUNT(*) c FROM notifications WHERE sent_at IS NULL AND order_id=?').get(j.id).c === 1);
  tgFail = false; db.prepare('UPDATE notifications SET last_try=NULL').run();
  const before = sent.length; await W.sendPending(env); assert.equal(sent.length, before + 1);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM notifications WHERE sent_at IS NULL').get().c, 0);
});
await ok('limite de débit : 6e commande/10 min refusée (429)', async () => {
  let last; for (let i = 0; i < 8; i++) last = (await post(good(), { 'cf-connecting-ip': '9.9.9.9' })).status; assert.equal(last, 429);
});
await ok('admin sans Access configuré : 503 ; avec Access mais sans jeton : 403', async () => {
  const get = e => W.default.fetch(new Request('https://api/api/admin/orders'), e, ctx);
  assert.equal((await get(env)).status, 503);
  assert.equal((await get({ ...env, ACCESS_TEAM_DOMAIN: 'x.cloudflareaccess.com', ACCESS_AUD: 'a' })).status, 403);
  const r = await W.default.fetch(new Request('https://api/api/admin/orders', { headers: { 'cf-access-jwt-assertion': 'a.b.c' } }), { ...env, ACCESS_TEAM_DOMAIN: 'x.cloudflareaccess.com', ACCESS_AUD: 'a' }, ctx); assert.equal(r.status, 403);
});
await ok('erreur serveur : aucune fuite de détails', async () => {
  const r = await post(good(), {}); const bad = { ...env, PII_KEY: undefined };
  const r2 = await W.default.fetch(new Request('https://api/api/orders', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://1608qc.com' }, body: JSON.stringify(good()) }), bad, ctx);
  assert.equal(r2.status, 500); assert.ok(!(await r2.text()).includes('PII_KEY'));
});
await ok('numéros séquentiels 3001, 3002… sans doublon', async () => {
  const a = await (await post(good(), { 'cf-connecting-ip': '5.5.5.5' })).json(); const b = await (await post(good(), { 'cf-connecting-ip': '5.5.5.5' })).json();
  assert.equal(Number(b.id), Number(a.id) + 1);
});
const look = (email, number, ip = '7.7.7.7') => W.default.fetch(new Request('https://api/api/order-status', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://1608qc.com', 'cf-connecting-ip': ip }, body: JSON.stringify({ email, number }) }), env, ctx);
await ok('suivi : bon courriel + numéro → statut, sans coordonnées', async () => {
  const r = await look('JEAN@test.ca', '#3001'); assert.equal(r.status, 200); const j = await r.json();
  assert.equal(j.id, '3001'); assert.equal(j.status, 'Commande reçue'); const all = JSON.stringify(j);
  for (const x of ['Tremblay', 'rue Test', 'G5L', '555-0100', 'pii_enc']) assert.ok(!all.includes(x), x);
});
await ok('suivi : mauvais courriel ou numéro inconnu → 404 identique', async () => {
  const a = await look('autre@test.ca', '3001'), b = await look('jean@test.ca', '3999');
  assert.equal(a.status, 404); assert.equal(b.status, 404); assert.equal((await a.text()), (await b.text()));
});
await ok('suivi : limite de 10 essais / 10 min', async () => {
  let last; for (let i = 0; i < 12; i++) last = (await look('x@test.ca', '3001', '8.8.8.8')).status; assert.equal(last, 429);
});
console.log(n, 'tests réussis');
