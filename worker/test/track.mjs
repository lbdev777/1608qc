import { DatabaseSync } from 'node:sqlite'; import fs from 'node:fs'; import assert from 'node:assert/strict'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const T = await import(path.join(here, '../dist/track.js')); const A = await import(path.join(here, '../dist/analytics.js'));
const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync(path.join(here, '../schema.sql'), 'utf8'));
const mk = (sql, a = []) => ({ bind: (...x) => mk(sql, x), first: async () => db.prepare(sql).get(...a) ?? null, all: async () => ({ results: db.prepare(sql).all(...a) }), run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...a).changes) } }) });
const DB = { prepare: s => mk(s), batch: async st => { for (const s of st) await s.run(); } };
const env = { DB, ALLOWED_ORIGINS: 'https://1608qc.com,https://lbdev777.github.io' };
const post = (b, h = {}, cf = { country: 'CA', region: 'Quebec', city: 'Rimouski', latitude: '48.45', longitude: '-68.52' }) => { const r = new Request('https://t/api/t', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://1608qc.com', 'cf-connecting-ip': '1.1.1.1', 'user-agent': 'Mozilla/5.0 (iPhone)', ...h }, body: JSON.stringify(b) }); Object.defineProperty(r, 'cf', { value: cf }); return T.default.fetch(r, env); };
let n = 0; const ok = async (name, f) => { try { await f(); n++; console.log('✓', name); } catch (e) { console.log('✗', name, e.message); process.exitCode = 1; } };
const sid = 'abcdef123456abcd';
await ok('événement valide : 204, stocké avec ville arrondie, sans IP', async () => {
  assert.equal((await post({ sid, device: 'mobile', events: [{ type: 'pageview', path: '/index.html', ref: 'instagram.com' }] })).status, 204);
  const h = db.prepare('SELECT * FROM hits').get(); assert.equal(h.city, 'Rimouski'); assert.equal(h.lat, 48.5); assert.equal(h.lon, -68.5);
  assert.ok(!JSON.stringify(h).includes('1.1.1.1')); assert.ok(!db.prepare("SELECT sql FROM sqlite_master WHERE name='hits'").get().sql.toLowerCase().includes('ip'));
});
await ok('origine inconnue → 403 ; robot → rien stocké', async () => {
  assert.equal((await post({ sid, events: [{ type: 'pageview', path: '/' }] }, { origin: 'https://evil.com' })).status, 403);
  const c = db.prepare('SELECT COUNT(*) c FROM hits').get().c; await post({ sid, events: [{ type: 'pageview', path: '/' }] }, { 'user-agent': 'Googlebot/2.1' }); assert.equal(db.prepare('SELECT COUNT(*) c FROM hits').get().c, c);
});
await ok('entrées invalides refusées (type, chemin, sid)', async () => {
  for (const b of [{ sid, events: [{ type: 'hack' }] }, { sid, events: [{ type: 'pageview', path: '/<script>' }] }, { sid: 'x', events: [{ type: 'pageview', path: '/' }] }, { sid, events: [] }]) assert.equal((await post(b)).status, 400);
});
await ok('limite de débit : 120 requêtes / 10 min', async () => { let l; for (let i = 0; i < 125; i++) l = (await post({ sid, events: [{ type: 'pageview', path: '/' }] }, { 'cf-connecting-ip': '9.9.9.9' })).status; assert.equal(l, 429); });
// jeu de données pour les stats
const t = new Date().toISOString();
const ins = (s, type, extra = {}) => db.prepare('INSERT INTO hits(ts,sid,type,path,product,city,country,lat,lon,device,ref) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(t, s, type, extra.path || '/index.html', extra.product || null, extra.city || 'Montréal', 'CA', 45.5, -73.5, extra.device || 'mobile', extra.ref || null);
for (const s of ['aaaaaaaaaaaa', 'bbbbbbbbbbbb', 'cccccccccccc']) ins(s, 'pageview');
ins('aaaaaaaaaaaa', 'product', { product: 'uniforme-zip' }); ins('aaaaaaaaaaaa', 'cart'); ins('aaaaaaaaaaaa', 'checkout'); ins('aaaaaaaaaaaa', 'purchase');
db.prepare("INSERT INTO orders(id,idem,created_at,updated_at,status,items_json,subtotal,discount,total,percent,first_name,city,pii_enc) VALUES('3001','a',?,?,'Commande reçue','[]',100,0,13430,0,'J','R','x')").run(t, t);
db.prepare("INSERT INTO orders(id,idem,created_at,updated_at,status,items_json,subtotal,discount,total,percent,first_name,city,pii_enc) VALUES('3002','b',?,?,'Annulé','[]',100,0,9999,0,'J','R','x')").run(t, t);
await ok('stats : sessions, ventes (annulées exclues), entonnoir, points du globe', async () => {
  const s = await A.stats(env, '24h'); assert.equal(s.orders, 1); assert.equal(s.sales, 13430); assert.ok(s.sessions >= 3); assert.equal(s.funnel.purchase, 1); assert.equal(s.funnel.cart, 1);
  assert.ok(s.livePoints.length >= 1 && s.orderPoints.length === 1); assert.equal(s.products[0].product, 'uniforme-zip'); assert.ok(s.series.length >= 1);
  assert.ok(!JSON.stringify(s).includes('pii_enc'));
});
await ok('analytique : sans jeton → 403, non configurée → 503', async () => {
  const get = e => A.default.fetch(new Request('https://a/api/stats'), e);
  assert.equal((await get(env)).status, 503); assert.equal((await get({ ...env, ACCESS_TEAM_DOMAIN: 't.cloudflareaccess.com', ACCESS_AUD: 'x', ADMIN_EMAILS: 'a@b.ca' })).status, 403);
});
console.log(n, 'tests réussis');
