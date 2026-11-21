import { DatabaseSync } from 'node:sqlite'; import fs from 'node:fs'; import assert from 'node:assert/strict'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const A = await import(path.join(here, '../dist/admin.js'));
const db = new DatabaseSync(':memory:'); db.exec(fs.readFileSync(path.join(here, '../schema.sql'), 'utf8'));
const mk = (sql, a = []) => ({ bind: (...x) => mk(sql, x), first: async () => db.prepare(sql).get(...a) ?? null, all: async () => ({ results: db.prepare(sql).all(...a) }), run: async () => ({ meta: { changes: Number(db.prepare(sql).run(...a).changes) } }) });
const DB = { prepare: s => mk(s), batch: async st => { const o = []; for (const s of st) o.push(await s.run()); return o; } };
// vrai jeton RS256 signé localement pour tester la vérification
const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url');
async function token(over = {}, key = kp.privateKey) {
  const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ iss: 'https://t.cloudflareaccess.com', aud: ['AUD1'], exp: Math.floor(Date.now() / 1000) + 600, email: 'moi@test.ca', ...over }));
  return h + '.' + p + '.' + b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(h + '.' + p)));
}
globalThis.fetch = async u => { if (String(u).includes('/cdn-cgi/access/certs')) return new Response(JSON.stringify({ keys: [jwk] })); throw new Error('réseau ' + u); };
const key = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
const iv = crypto.getRandomValues(new Uint8Array(12)); const k = await crypto.subtle.importKey('raw', Buffer.from(key, 'base64'), 'AES-GCM', false, ['encrypt']);
const pii = Buffer.from(iv).toString('base64') + '.' + Buffer.from(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify({ name: 'Jean', email: 'j@t.ca', street: '1 rue', city: 'Rimouski', postal: 'G5L 1A1' })))).toString('base64');
db.prepare("INSERT INTO orders(id,idem,created_at,updated_at,status,items_json,subtotal,discount,total,percent,first_name,city,pii_enc) VALUES('3001','i','2026-01-01','2026-01-01','Commande reçue','[]',100,0,100,0,'Jean','Rimouski',?)").run(pii);
const full = { DB, PII_KEY: key, ACCESS_TEAM_DOMAIN: 't.cloudflareaccess.com', ACCESS_AUD: 'AUD1', ADMIN_EMAILS: 'moi@test.ca' };
const call = (env, path, init = {}, tok) => A.default.fetch(new Request('https://admin.test' + path, { ...init, headers: { ...(init.headers || {}), ...(tok ? { 'cf-access-jwt-assertion': tok } : {}) } }), env);
let n = 0; const ok = async (name, f) => { try { await f(); n++; console.log('✓', name); } catch (e) { console.log('✗', name, e.message); process.exitCode = 1; } };
await ok('non configuré (pas de courriels admin) → 503 même avec un jeton valide', async () => assert.equal((await call({ ...full, ADMIN_EMAILS: '' }, '/', {}, await token())).status, 503));
await ok('sans jeton → 403 (page, API et fichiers)', async () => { for (const p of ['/', '/app.js', '/api/admin/orders']) assert.equal((await call(full, p)).status, 403); });
await ok('jeton valide + courriel autorisé → page 200 avec en-têtes de sécurité', async () => { const r = await call(full, '/', {}, await token()); assert.equal(r.status, 200); assert.match(r.headers.get('content-security-policy'), /default-src 'none'/); assert.equal(r.headers.get('x-frame-options'), 'DENY'); });
await ok('jeton expiré → 403', async () => assert.equal((await call(full, '/api/admin/orders', {}, await token({ exp: 1 }))).status, 403));
await ok('mauvaise audience → 403', async () => assert.equal((await call(full, '/api/admin/orders', {}, await token({ aud: ['AUTRE'] }))).status, 403));
await ok('mauvais émetteur → 403', async () => assert.equal((await call(full, '/api/admin/orders', {}, await token({ iss: 'https://evil.com' }))).status, 403));
await ok('courriel non autorisé → 403', async () => assert.equal((await call(full, '/api/admin/orders', {}, await token({ email: 'pirate@x.com' }))).status, 403));
await ok('jeton signé avec une autre clé → 403', async () => { const o = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign']); assert.equal((await call(full, '/api/admin/orders', {}, await token({}, o.privateKey))).status, 403); });
await ok('alg=none / jeton bidon → 403', async () => assert.equal((await call(full, '/api/admin/orders', {}, 'a.b.c')).status, 403));
await ok('liste des commandes déchiffrée pour l’admin', async () => { const j = await (await call(full, '/api/admin/orders', {}, await token())).json(); assert.equal(j.orders[0].customer.city, 'Rimouski'); });
await ok('changement de statut : exige l’origine du même site (CSRF)', async () => {
  const t = await token(), body = JSON.stringify({ status: 'Payé (Interac)' }), h = { 'content-type': 'application/json' };
  assert.equal((await call(full, '/api/admin/orders/3001/status', { method: 'POST', body, headers: { ...h, origin: 'https://evil.com' } }, t)).status, 403);
  assert.equal((await call(full, '/api/admin/orders/3001/status', { method: 'POST', body, headers: h }, t)).status, 403);
  assert.equal((await call(full, '/api/admin/orders/3001/status', { method: 'POST', body, headers: { ...h, origin: 'https://admin.test' } }, t)).status, 200);
  assert.equal(db.prepare("SELECT status FROM orders WHERE id='3001'").get().status, 'Payé (Interac)');
});
console.log(n, 'tests admin réussis');
