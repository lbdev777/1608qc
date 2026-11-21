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

const HTML = "<!doctype html>\n<html lang=\"fr-CA\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\">\n<title>Commandes — 1608</title>\n<link rel=\"stylesheet\" href=\"/app.css\">\n</head><body>\n<header class=\"cm-top\"><b>1608</b><span>Commandes</span><button type=\"button\" id=\"cm-refresh\">Actualiser</button></header>\n<main>\n<p id=\"cm-state\" role=\"status\">Chargement…</p>\n<div class=\"cm-filters\" id=\"cm-filters\"></div>\n<ul id=\"cm-list\" class=\"cm-list\"></ul>\n</main>\n<script src=\"/app.js\"></script>\n</body></html>\n", APP_JS = "/* Page des commandes (protégée par Cloudflare Access). Toutes les données sont insérées via textContent. */\n(()=>{'use strict';\nconst $=s=>document.querySelector(s);\nconst money=c=>(c/100).toFixed(2).replace('.',',')+' $';\nlet statuses=[],filter='',orders=[];\nconst el=(t,txt,cls)=>{const e=document.createElement(t);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;return e};\nasync function api(path,opt){\n const r=await fetch('/api/admin/'+path,{credentials:'same-origin',...opt,headers:{'content-type':'application/json'}});\n if(!r.ok)throw new Error(r.status===403?'Accès refusé (connexion Cloudflare Access requise).':r.status===503?'Administration non configurée côté serveur.':'Erreur '+r.status);\n return r.json();\n}\nfunction card(o){\n const li=el('li',null,'cm-card');\n li.append(el('h2',o.id+' · '+money(o.total)));\n li.append(el('div',new Date(o.created_at).toLocaleString('fr-CA')+' · '+o.status,'cm-meta'));\n const ul=el('ul',null,'cm-items');\n o.items.forEach(i=>ul.append(el('li',(i.id)+' — '+i.size+' ×'+i.qty)));li.append(ul);\n if(o.discount)li.append(el('div','Rabais ensemble −'+money(o.discount),'cm-meta'));\n const c=o.customer||{},cu=el('div',null,'cm-cust');\n [c.name,c.email,c.phone,[c.street,c.city,c.postal].filter(Boolean).join(', '),c.note&&('Note : '+c.note)].filter(Boolean).forEach(t=>{cu.append(el('div',t))});\n li.append(cu);\n if(o.notify_pending)li.append(el('div','⚠ Notification Telegram non confirmée'+(o.notify_error?' ('+o.notify_error+')':''),'cm-warn'));\n const row=el('div',null,'cm-row'),sel=el('select');\n statuses.forEach(s=>{const op=el('option',s);op.value=s;if(s===o.status)op.selected=true;sel.append(op)});\n const note=el('input');note.placeholder='Note interne (facultatif)';note.maxLength=500;note.value=o.note||'';\n const ok=el('button','Enregistrer');\n ok.onclick=async()=>{ok.disabled=true;try{await api('orders/'+encodeURIComponent(o.id)+'/status',{method:'POST',body:JSON.stringify({status:sel.value,note:note.value})});await load()}catch(e){alert(e.message)}ok.disabled=false};\n row.append(sel,note,ok);\n li.append(row);return li;\n}\nfunction draw(){\n const f=$('#cm-filters');f.textContent='';\n ['',...statuses].forEach(s=>{const b=el('button',s||'Toutes');b.setAttribute('aria-pressed',String(s===filter));b.onclick=()=>{filter=s;draw()};f.append(b)});\n const list=orders.filter(o=>!filter||o.status===filter),ul=$('#cm-list');ul.textContent='';\n list.forEach(o=>ul.append(card(o)));\n $('#cm-state').textContent=list.length?list.length+' commande(s)':'Aucune commande.';\n}\nasync function load(){\n try{const j=await api('orders');orders=j.orders;statuses=j.statuses;draw()}catch(e){$('#cm-state').textContent=e.message}\n}\n$('#cm-refresh').onclick=load;load();setInterval(load,60000);\n})();\n", APP_CSS = "*{box-sizing:border-box}body{margin:0;font:15px/1.45 system-ui,-apple-system,sans-serif;background:#f4f3ef;color:#111}\n.cm-top{display:flex;gap:12px;align-items:center;padding:14px 16px;background:#111;color:#fff;position:sticky;top:0}\n.cm-top b{letter-spacing:.12em}.cm-top span{opacity:.7;flex:1}.cm-top button{background:#fff;border:0;padding:8px 12px;font:inherit;cursor:pointer}\nmain{max-width:720px;margin:0 auto;padding:12px}#cm-state{color:#555}\n.cm-filters{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.cm-filters button{border:1px solid #111;background:#fff;padding:6px 10px;font:inherit;cursor:pointer}.cm-filters button[aria-pressed=true]{background:#111;color:#fff}\n.cm-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}\n.cm-card{background:#fff;border:1px solid #ddd;padding:14px}.cm-card h2{margin:0 0 2px;font-size:16px}.cm-meta{color:#555;font-size:13px}\n.cm-items{margin:8px 0;padding-left:18px}.cm-cust{background:#f4f3ef;padding:8px 10px;margin:8px 0;font-size:14px;word-break:break-word}\n.cm-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.cm-row select,.cm-row button,.cm-row input{font:inherit;padding:8px;border:1px solid #111;background:#fff}.cm-row input{flex:1;min-width:120px}\n.cm-warn{color:#a00;font-size:13px}\n";
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
