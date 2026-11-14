/* 1608 — boutique statique. Aucune vente automatique : le panier prépare une demande de commande
   (voir checkout.js). Tout le contenu produit vient de catalog.js. */
(() => {
'use strict';

const CFG = window.STORE_CONFIG;
const P = window.STORE_PRODUCTS;
const money = window.STORE_CURRENCY;
const priceOf = lines => window.STORE_BUNDLE_PRICING.calculate(lines);
const PAY = window.STORE_MANUAL_PAYMENT || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const byId = id => P.find(p => p.id === id);
const pUrl = id => 'produit-' + id + '.html';
const KEY = '1608-cart-v2';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const validEmail = v => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const contactEmail = validEmail(PAY.ordersEmail) ? PAY.ordersEmail : '';
const freeOn = CFG.freeShippingOver > 0;
const LEAD = CFG.leadTime || '';

/* ───────── Panier ───────── */
let cart = loadCart();
function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(x => byId(x.id) && byId(x.id).sizes.includes(x.size) && Number.isInteger(x.qty) && x.qty >= 1 && x.qty <= 10) : [];
  } catch (_) { return []; }
}
function saveCart() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (_) {} window.dispatchEvent(new Event('1608:cart-saved')); }
const cartCount = () => cart.reduce((n, l) => n + l.qty, 0);

function addLines(lines) {
  for (const { id, size, qty } of lines) {
    const p = byId(id);
    if (!p || !p.sizes.includes(size) || !Number.isInteger(qty) || qty < 1) return false;
    const existing = cart.find(l => l.id === id && l.size === size);
    if (existing) { if (existing.qty + qty > 10) { toast('Maximum 10 exemplaires par taille.'); return false; } existing.qty += qty; }
    else cart.push({ id, size, qty });
  }
  saveCart(); syncCart(); openOverlay('cart');
  return true;
}

/* ───────── Icônes ───────── */
const ico = {
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.9" cy="10.9" r="7.2"/><path d="m16.5 16.5 5 5"/></svg>',
  bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16l-1 13H5L4 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>',
  menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4.5 6v5.5c0 4.5 3 8 7.5 9.5 4.5-1.5 7.5-5 7.5-9.5V6L12 3Z"/><path d="m9 12 2.2 2.2L15.5 10"/></svg>',
  receipt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/></svg>',
  truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></svg>'
};

/* ───────── Éléments communs ───────── */
function announceText() {
  const bits = [];
  if (freeOn) bits.push('Livraison gratuite dès <b>' + money(CFG.freeShippingOver).replace(',00', '') + '</b>');
  bits.push('Le duo <b>−' + CFG.duoPercent + ' %</b>');
  bits.push('Le trio <b>−' + CFG.trioPercent + ' %</b>');
  return bits.join(' &nbsp;·&nbsp; ');
}
function header() {
  return `<a class="skip-link" href="#main">Aller au contenu</a>
<div class="announce"><span>${announceText()}</span></div>
<header class="site-header"><div class="header-inner">
<a class="wordmark" href="index.html" aria-label="1608, accueil"><strong>1608</strong><span>MILLE-SIX-CENT-HUIT</span></a>
<nav class="nav-main" aria-label="Navigation principale"><a href="index.html#collection">Collection</a><a href="index.html#ensembles">Ensembles</a><a href="index.html#marque">La marque</a><a href="index.html#questions">Questions</a></nav>
<div class="header-actions">
<button class="icon-btn" type="button" data-open="search" aria-label="Rechercher une pièce">${ico.search}</button>
<button class="icon-btn" type="button" data-open="cart" aria-label="Ouvrir le panier">${ico.bag}<span class="bag-count" data-cart-count hidden>0</span></button>
<button class="icon-btn menu-btn" type="button" data-menu aria-label="Ouvrir le menu" aria-expanded="false">${ico.menu}</button>
</div></div>
<nav class="mobile-nav" data-mobile-nav hidden aria-label="Navigation mobile"><a href="index.html#collection">Collection</a><a href="index.html#ensembles">Ensembles</a><a href="index.html#marque">La marque</a><a href="index.html#questions">Questions</a></nav></header>`;
}
function footer() {
  const contact = contactEmail ? `<a href="mailto:${contactEmail}">${contactEmail}</a>` : '';
  return `<footer class="site-footer"><div class="container">
<div class="footer-top">
<div><div class="footer-logo">1608.</div><p>Marque de vêtements indépendante imaginée au Québec. Mille-Six-Cent-Huit.</p></div>
<div class="footer-col"><b>Boutique</b><a href="index.html#collection">Toute la collection</a><a href="index.html#ensembles">Ensembles et rabais</a><a href="checkout.html">Mon panier</a></div>
<div class="footer-col"><b>Infos</b><a href="index.html#marque">La marque</a><a href="index.html#questions">Livraison, paiement, retours</a>${contact}</div>
</div>
<div class="footer-bottom"><span>© ${new Date().getFullYear()} 1608 — Mille-Six-Cent-Huit</span><span>Imaginé au Québec · Paiement par virement Interac</span></div>
</div></footer>`;
}
function shell() {
  const h = $('[data-site-header]'), f = $('[data-site-footer]');
  if (h) h.innerHTML = header();
  if (f) f.innerHTML = footer();
  document.body.insertAdjacentHTML('beforeend', `
<div class="backdrop" data-backdrop></div>
<aside class="drawer" data-overlay="cart" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="cart-title">
  <div class="drawer-head"><h2 id="cart-title">Panier <span data-drawer-count></span></h2><button class="close" type="button" data-close aria-label="Fermer le panier">×</button></div>
  <div class="perks" data-perks hidden></div>
  <div class="drawer-body" data-cart-lines></div>
  <div class="drawer-foot" data-cart-foot hidden></div>
</aside>
<div class="sheet" data-overlay="sheet" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="sheet-title"></div>
<div class="search" data-overlay="search" role="dialog" aria-modal="true" aria-hidden="true" aria-label="Recherche">
  <div class="search-head"><input type="search" data-search-input placeholder="Rechercher…" aria-label="Rechercher une pièce" autocomplete="off"><button class="close" type="button" data-close aria-label="Fermer la recherche">×</button></div>
  <div class="search-results" data-search-results></div>
</div>
<div class="toast" data-toast role="status" aria-live="polite"></div>`);
  $$('[data-overlay]').forEach(el => { el.inert = true; });
}

let toastTimer;
function toast(msg) {
  const el = $('[data-toast]'); if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

/* ───────── Superpositions (panier, ajout rapide, recherche) ───────── */
let active = null, lastFocus = null;
function openOverlay(name) {
  closeOverlay(false);
  const el = $(`[data-overlay="${name}"]`); if (!el) return;
  lastFocus = document.activeElement; active = name;
  $('[data-backdrop]').classList.add('is-open');
  el.inert = false; el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (name === 'cart') syncCart();
  if (name === 'search') searchRender('');
  setTimeout(() => { const t = name === 'search' ? $('[data-search-input]') : $('[data-close]', el) || $('button, a', el); t && t.focus(); }, 120);
}
function closeOverlay(restore = true) {
  if (!active) return;
  $$('[data-overlay]').forEach(el => { el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true'); el.inert = true; });
  $('[data-backdrop]').classList.remove('is-open');
  document.body.style.overflow = ''; active = null;
  if (restore && lastFocus && lastFocus.isConnected) lastFocus.focus();
}

/* ───────── Fragments réutilisés ───────── */
function sizeChips(p, group, selected) {
  return `<div class="sizes" role="group" aria-label="Taille ${p.name}" data-sizes="${group}">${p.sizes.map(s => `<button class="size-chip" type="button" data-size="${s}" data-for="${group}" aria-pressed="${s === selected}">${s}</button>`).join('')}</div>`;
}
function pickSize(btn) {
  const group = btn.dataset.for, wrap = btn.closest('[data-sizes]');
  $$('.size-chip', wrap).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  wrap.classList.remove('is-error');
  return group;
}
function card(p) {
  const look = CFG.looks.find(l => l.items.includes(p.id));
  return `<article class="card" data-category="${p.category}">
<div class="card-media">
${p.isNew ? '<span class="badge qc">Nouveau</span>' : ''}${look ? `<span class="badge badge-2${p.isNew ? '' : ' solo'}">Look −${look.percent} %</span>` : ''}
<a href="${pUrl(p.id)}" aria-label="${p.name}, ${p.variant}, ${money(p.price)}"><img class="main" src="${p.photos[0]}" alt="${p.name}, vue avant" loading="lazy" width="700" height="700"><img class="alt" src="${p.photos[1]}" alt="" loading="lazy" width="700" height="700"></a>
<button class="card-quick" type="button" data-quick="${p.id}" aria-label="Ajout rapide : ${p.name}"><i aria-hidden="true">+</i><span>Ajout rapide</span></button>
</div>
<a class="card-info" href="${pUrl(p.id)}" tabindex="-1" aria-hidden="true"><div class="card-top"><h3>${p.name}</h3><b>${money(p.price)}</b></div><p class="card-sub">${p.variant}</p><p class="card-short">${p.short}</p></a>
</article>`;
}

/* ───────── Ajout rapide ───────── */
let sheetSize = null;
function openSheet(id) {
  const p = byId(id); if (!p) return;
  sheetSize = null;
  $('[data-overlay="sheet"]').innerHTML = `
<div class="sheet-head"><img src="${p.photos[0]}" alt="" width="96" height="96"><div><h3 id="sheet-title">${p.name}</h3><p>${p.variant}</p><b>${money(p.price)}</b></div><button class="close" type="button" data-close aria-label="Fermer">×</button></div>
<div class="label sheet-label">Choisis ta taille</div>
${sizeChips(p, 'sheet')}
<p class="size-hint" data-hint aria-live="polite"></p>
<button class="btn btn-block" type="button" data-sheet-add="${p.id}">Ajouter au panier <span class="arrow" aria-hidden="true">↗</span></button>
<p class="sheet-more"><a class="text-link" href="${pUrl(p.id)}">Voir la fiche complète</a></p>`;
  openOverlay('sheet');
}

/* ───────── Panier : rendu ───────── */
function perksHTML(pr) {
  let h = '';
  if (freeOn) {
    const ok = pr.freeShipping, pct = Math.min(100, Math.round(pr.total / pr.threshold * 100));
    h += `<div><div class="perk-label${ok ? ' ok' : ''}"><span>${ok ? '✓ Livraison gratuite débloquée' : 'Plus que ' + money(pr.toFreeShipping) + ' pour la livraison gratuite'}</span></div><div class="bar${ok ? ' ok' : ''}"><i data-w="${pct}"></i></div></div>`;
  }
  const done = pr.percent === CFG.trioPercent || (pr.look && pr.percent >= pr.look.percent);
  const bpct = done ? 100 : pr.models === 2 ? 66 : pr.models === 1 ? 33 : 0;
  const label = pr.percent ? '✓ Rabais ensemble −' + pr.percent + ' %' + (pr.next ? ' · ' + pr.next.text.replace('Ajoute', 'ajoute') : '') : (pr.next ? pr.next.text : '');
  if (label) h += `<div><div class="perk-label${done ? ' ok' : ''}"><span>${label}</span></div><div class="bar${done ? ' ok' : ''}"><i data-w="${bpct}"></i></div></div>`;
  return h;
}
function upsellFor() {
  const inCart = new Set(cart.map(l => l.id));
  for (const l of cart) { const partner = byId(l.id).pairedWith; if (partner && !inCart.has(partner)) return { p: byId(partner), why: 'Complète ton look : −' + (CFG.looks[0] ? CFG.looks[0].percent : CFG.trioPercent) + ' % dès deux pièces' }; }
  if (inCart.size && inCart.size < 3) {
    const next = priceOf(cart).next;
    const candidates = P.filter(p => !inCart.has(p.id)).sort((a, b) => a.price - b.price);
    if (candidates.length && next) return { p: candidates[0], why: next.text };
  }
  return null;
}
function syncCart() {
  const n = cartCount();
  $$('[data-cart-count]').forEach(el => { el.textContent = n; el.hidden = n === 0; });
  const lines = $('[data-cart-lines]'); if (!lines) return;
  const count = $('[data-drawer-count]'); if (count) count.textContent = n ? '(' + n + ')' : '';
  const perks = $('[data-perks]'), foot = $('[data-cart-foot]');
  if (!cart.length) {
    perks.hidden = true; foot.hidden = true;
    lines.innerHTML = '<div class="drawer-empty"><strong>Ton panier est vide.</strong><p class="muted">Deux modèles différents : −' + CFG.duoPercent + ' %. Trois ou plus : −' + CFG.trioPercent + ' %.</p><a class="btn btn-outline" href="index.html#collection" data-close>Voir la collection <span class="arrow" aria-hidden="true">↗</span></a></div>';
    return;
  }
  const pr = priceOf(cart);
  perks.hidden = false; perks.innerHTML = perksHTML(pr);
  $$('[data-w]', perks).forEach(el => { el.style.width = el.dataset.w + '%'; });
  lines.innerHTML = cart.map((l, i) => {
    const p = byId(l.id);
    return `<div class="cart-line"><a href="${pUrl(p.id)}"><img src="${p.photos[0]}" alt="${p.name}" width="92" height="92"></a>
<div><h3><a class="plain" href="${pUrl(p.id)}">${p.name}</a></h3><p>${p.variant} · Taille ${l.size}</p>
<div class="cart-line-row"><div class="mini-qty"><button type="button" data-cartqty="${i}:-1" aria-label="Diminuer la quantité">−</button><span aria-live="polite">${l.qty}</span><button type="button" data-cartqty="${i}:1" aria-label="Augmenter la quantité">+</button></div><strong>${money(p.price * l.qty)}</strong></div>
<button class="remove" type="button" data-remove="${i}">Retirer</button></div></div>`;
  }).join('');
  const up = upsellFor();
  if (up) lines.insertAdjacentHTML('beforeend', `<div class="upsell"><span class="label">${up.why}</span><div class="upsell-row"><img src="${up.p.photos[0]}" alt="" width="64" height="64"><div><b>${up.p.name}</b><small>${money(up.p.price)}</small></div><button class="btn btn-qc" type="button" data-quick="${up.p.id}">Ajouter</button></div></div>`);
  foot.hidden = false;
  foot.innerHTML = `<div class="tot-row"><span>Articles</span><span>${money(pr.subtotal)}</span></div>
${pr.percent ? `<div class="tot-row save"><span>Rabais ensemble −${pr.percent} %</span><span>−${money(pr.discount)}</span></div>` : ''}
<div class="tot-row"><span>Livraison</span><span>${freeOn && pr.freeShipping ? 'Gratuite' : 'Confirmée avant paiement'}</span></div>
<div class="tot-row final"><span>Total des articles</span><span>${money(pr.total)}</span></div>
<a class="btn btn-block" href="checkout.html">Passer à la caisse <span class="arrow" aria-hidden="true">↗</span></a>
<p class="fineprint">Taxes en sus. Tu paies par virement Interac seulement après avoir reçu ton total confirmé.</p>`;
}

/* ───────── Recherche ───────── */
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
function searchRender(q) {
  const el = $('[data-search-results]'); if (!el) return;
  const query = norm((q || '').trim());
  const list = query ? P.filter(p => norm([p.name, p.variant, p.fit, p.material, p.category].join(' ')).includes(query)) : P;
  el.innerHTML = list.length ? list.map(p => `<a class="search-result" href="${pUrl(p.id)}"><img src="${p.photos[0]}" alt="" width="64" height="64"><span>${p.name}<small>${p.variant}</small></span><b>${money(p.price)}</b></a>`).join('') : '<p>Aucune pièce trouvée.</p>';
}

/* ───────── Accueil ───────── */
function initHome() {
  /* Bandeau défilant */
  const tick = $('[data-ticker]');
  if (tick) {
    const items = ['Imaginé au Québec', 'Coupes amples', 'Graphismes signature', 'Le duo −' + CFG.duoPercent + ' %', 'Le trio −' + CFG.trioPercent + ' %', 'Produit à la commande'];
    if (freeOn) items.push('Livraison gratuite dès ' + money(CFG.freeShippingOver).replace(',00', ''));
    const run = items.map(t => `<span>${t}</span>`).join('');
    tick.innerHTML = `<div class="ticker-track" aria-hidden="true">${run}${run}</div><p class="sr-only">${items.join('. ')}.</p>`;
  }

  /* Achat dans le héro */
  const hero = P.find(p => p.isNew) || P[0];
  const buy = $('[data-hero-buy]');
  if (buy) {
    buy.innerHTML = `<div class="hero-buy-top"><div><h2>${hero.name}</h2><p class="sub">${hero.variant} · ${hero.fit}</p></div><span class="price">${money(hero.price)}</span></div>
<div class="hero-buy-row">${sizeChips(hero, 'hero')}<button class="btn" type="button" data-hero-add>Ajouter <span class="arrow" aria-hidden="true">↗</span></button></div>
<p class="size-hint" data-hint aria-live="polite"></p><a class="text-link more" href="${pUrl(hero.id)}">Voir la pièce en détail</a>`;
    const photo = $('[data-hero-photo]');
    if (photo && !photo.querySelector(`img[src="${hero.photos[0]}"]`)) photo.innerHTML = `<img src="${hero.photos[0]}" alt="${hero.name}, ${hero.variant}" width="900" height="900" fetchpriority="high">`;
    let size = null;
    buy.addEventListener('click', e => {
      const chip = e.target.closest('.size-chip'); if (chip) { size = chip.dataset.size; pickSize(chip); $('[data-hint]', buy).textContent = ''; $('[data-hint]', buy).classList.remove('is-error'); return; }
      if (e.target.closest('[data-hero-add]')) {
        if (!size) { $('[data-sizes]', buy).classList.add('is-error'); const h = $('[data-hint]', buy); h.textContent = 'Choisis ta taille d’abord.'; h.classList.add('is-error'); return; }
        addLines([{ id: hero.id, size, qty: 1 }]);
      }
    });
  }

  /* Grille + filtres + tri */
  const grid = $('[data-grid]');
  if (grid) {
    let filter = 'all', sort = 'default';
    const draw = () => {
      let list = filter === 'all' ? [...P] : P.filter(p => p.category === filter);
      if (sort === 'asc') list.sort((a, b) => a.price - b.price);
      if (sort === 'desc') list.sort((a, b) => b.price - a.price);
      grid.innerHTML = list.map(card).join('');
      const c = $('[data-count]'); if (c) c.textContent = String(list.length).padStart(2, '0') + ' pièces';
    };
    draw();
    $$('[data-filter]').forEach(b => b.addEventListener('click', () => { filter = b.dataset.filter; $$('[data-filter]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); }));
    const sel = $('[data-sort]'); if (sel) sel.addEventListener('change', () => { sort = sel.value; draw(); });
  }

  /* Paliers de rabais */
  const tiers = $('[data-tiers]');
  if (tiers) tiers.innerHTML = `<div class="tier"><b>−${CFG.duoPercent} %</b><span>Le duo<br>2 modèles différents</span></div><div class="tier"><b>−${CFG.trioPercent} %</b><span>Le trio<br>3 modèles ou plus</span></div>${freeOn ? `<div class="tier hot"><b>0 $</b><span>Livraison dès<br>${money(CFG.freeShippingOver).replace(',00', '')}</span></div>` : ''}`;

  /* Look complet */
  const look = CFG.looks[0], lookEl = $('[data-look]');
  if (look && lookEl) {
    const [a, b] = look.items.map(byId);
    const pr = priceOf([{ id: a.id, qty: 1 }, { id: b.id, qty: 1 }]);
    const sizes = {};
    lookEl.innerHTML = `<div class="look-photos"><figure><img src="${a.photos[0]}" alt="${a.name}" loading="lazy" width="700" height="700"><figcaption>01 / ${a.name.replace(' 1608', '')}</figcaption></figure><figure><img src="${b.photos[0]}" alt="${b.name}" loading="lazy" width="700" height="700"><figcaption>02 / ${b.name.replace(' 1608', '')}</figcaption></figure></div>
<div class="look-body"><div><span class="eyebrow tight">Le look complet</span><h3>${look.name.replace('LE ', '')}.<br>−${look.percent} % dès deux pièces.</h3></div>
<div class="look-pick"><span class="label">Taille du zip</span>${sizeChips(a, 'look-a')}</div>
<div class="look-pick"><span class="label">Taille du jogger</span>${sizeChips(b, 'look-b')}</div>
<div class="math"><div><span>${a.name} + ${b.name}</span><s>${money(pr.subtotal)}</s></div><div class="save"><span>Rabais look −${pr.percent} %</span><span>−${money(pr.discount)}</span></div>${freeOn && pr.freeShipping ? '<div><span>Livraison</span><span>Gratuite</span></div>' : ''}<div class="total"><span>Total des articles</span><span>${money(pr.total)}</span></div></div>
<p class="size-hint" data-hint aria-live="polite"></p>
<button class="btn btn-block" type="button" data-look-add>Ajouter le look complet <span class="arrow" aria-hidden="true">↗</span></button></div>`;
    lookEl.addEventListener('click', e => {
      const chip = e.target.closest('.size-chip'); if (chip) { sizes[pickSize(chip)] = chip.dataset.size; const h = $('[data-hint]', lookEl); h.textContent = ''; return; }
      if (e.target.closest('[data-look-add]')) {
        if (!sizes['look-a'] || !sizes['look-b']) { $$('[data-sizes]', lookEl).forEach(w => { if (!$('[aria-pressed="true"]', w)) w.classList.add('is-error'); }); const h = $('[data-hint]', lookEl); h.textContent = 'Choisis une taille pour chaque pièce.'; h.classList.add('is-error'); return; }
        addLines([{ id: a.id, size: sizes['look-a'], qty: 1 }, { id: b.id, size: sizes['look-b'], qty: 1 }]);
      }
    });
  }
}

/* ───────── Fiche produit ───────── */
function initProduct() {
  const id = document.body.dataset.productId;
  const p = byId(id), shell = $('[data-pdp]');
  if (!p) { shell.innerHTML = '<div class="container nf"><span class="eyebrow">Erreur 404</span><h1 class="display">Pièce introuvable.</h1><a class="btn" href="index.html#collection">Voir la collection</a></div>'; document.title = 'Pièce introuvable — 1608'; return; }
  let size = null, qty = 1;
  const partner = p.pairedWith ? byId(p.pairedWith) : null;
  const look = partner ? CFG.looks.find(l => l.items.includes(p.id)) : null;
  const pairPrice = partner && look ? priceOf([{ id: p.id, qty: 1 }, { id: partner.id, qty: 1 }]) : null;
  document.title = `${p.name} — ${p.variant} | 1608`;

  /* Données structurées pour Google */
  const ld = document.createElement('script'); ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: p.name + ' — ' + p.variant, description: p.description, image: p.photos.map(x => new URL(x, document.baseURI).href), brand: { '@type': 'Brand', name: '1608' }, offers: { '@type': 'Offer', priceCurrency: 'CAD', price: (p.price / 100).toFixed(2), url: new URL(pUrl(p.id), document.baseURI).href } });
  document.head.appendChild(ld);

  const assure = [
    [ico.shield, '<b>Paiement Interac, sans carte.</b> Tu ne paies qu’après avoir reçu ton total confirmé.'],
    [ico.truck, (freeOn ? '<b>Livraison gratuite dès ' + money(CFG.freeShippingOver).replace(',00', '') + '</b> d’articles (après rabais). Sinon, frais confirmés avant paiement.' : '<b>Livraison au Canada.</b> Frais confirmés avant paiement.') + (LEAD ? ' Produite à la commande : compte ' + LEAD + '.' : '')],
    [ico.pin, '<b>Imaginé au Québec.</b> Une marque indépendante.']
  ].map(([i, t]) => `<div>${i}<span>${t}</span></div>`).join('');

  const sizeHelp = contactEmail
    ? `Un doute ? <a href="mailto:${contactEmail}?subject=${encodeURIComponent('Question de taille — ' + p.name)}">Écris-nous</a>, on te conseille avant paiement.`
    : 'Un doute ? Indique ta taille habituelle dans ta demande : on te conseille avant que tu paies.';

  shell.innerHTML = `<div class="container">
<nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a><span>/</span><a href="index.html#collection">Collection</a><span>/</span><span>${p.name}</span></nav>
<div class="pdp">
 <div><div class="pdp-gallery" data-gallery>${p.photos.map((u, i) => `<div class="pdp-slide"><img src="${u}" alt="${p.name}, vue ${i ? 'arrière' : 'avant'}" width="1200" height="1200" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}><span class="tag">0${i + 1} / ${i ? 'ARRIÈRE' : 'AVANT'}</span></div>`).join('')}</div><div class="pdp-dots" data-dots aria-hidden="true">${p.photos.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('')}</div></div>
 <div class="pdp-info">
  ${p.isNew ? '<span class="badge qc">Nouveau</span>' : ''}
  <h1 class="display">${p.name}</h1>
  <div class="pdp-variant">${p.variant}</div>
  <div class="pdp-price">${money(p.price)} <small>CAD</small></div>
  <p class="pdp-desc">${p.description}</p>
  <div class="pdp-facts"><span>${p.fit}</span><span>${p.material}</span><span>Imaginé au Québec</span></div>
  <div class="pdp-opt"><span class="label">Choisis ta taille</span><a class="text-link" href="#guide" data-guide>Guide des tailles</a></div>
  <div data-main-sizes>${sizeChips(p, 'main')}</div>
  <p class="size-hint" data-hint aria-live="polite"></p>
  <div class="pdp-buy" data-buy><div class="qty"><button type="button" data-qminus aria-label="Diminuer la quantité">−</button><span data-qty-display>1</span><button type="button" data-qplus aria-label="Augmenter la quantité">+</button></div><button class="btn" type="button" data-add>Ajouter au panier <span class="arrow" aria-hidden="true">↗</span></button></div>
  <div class="pdp-assure">${assure}</div>
  ${partner && pairPrice ? `<div class="pair"><div><span class="label">Le look complet</span><strong>−${look.percent} % avec ${partner.name.replace(' 1608', '')}</strong><p>Les deux pièces : <b>${money(pairPrice.total)}</b> au lieu de ${money(pairPrice.subtotal)}. Tu économises ${money(pairPrice.discount)}.</p></div><img src="${partner.photos[0]}" alt="${partner.name}" loading="lazy" width="92" height="92">
   <div class="pair-pick"><span class="label">Taille : ${partner.name.replace(' 1608', '')}</span><div data-pair-sizes>${sizeChips(partner, 'pair')}</div></div>
   <button class="btn btn-qc" type="button" data-pair-add>Ajouter les deux <span class="arrow" aria-hidden="true">↗</span></button></div>` : `<p class="duo-note"><b>Le duo −${CFG.duoPercent} %.</b> Combine deux modèles différents. Trois ou plus : <b>−${CFG.trioPercent} %</b>, appliqué automatiquement au panier.</p>`}
  <div class="acc">
   <details open><summary>Détails de la pièce</summary><ul>${p.features.map(f => `<li>${f}</li>`).join('')}</ul></details>
   <details id="guide" data-guide-box><summary>Guide des tailles</summary><p>Tailles offertes : ${p.sizes.join(' / ')}. Coupe : ${p.fit.toLowerCase()}. ${sizeHelp}</p></details>
   <details><summary>Livraison, paiement et retours</summary><p>Tu envoies ta demande, on te confirme le total exact (livraison et taxes incluses) puis tu paies par virement Interac. ${LEAD ? 'Chaque pièce est produite à la commande : compte ' + LEAD + ' après ton paiement. ' : ''}${freeOn ? 'Livraison gratuite dès ' + money(CFG.freeShippingOver).replace(',00', '') + ' d’articles après rabais. ' : ''}Les conditions de retour te sont confirmées avec ton total, avant tout paiement.</p></details>
  </div>
 </div>
</div></div>
<section class="editorial on-dark"><div class="container editorial-in"><div><span class="eyebrow">1608 / L’intention</span><h2 class="display">${p.story.title}</h2><p>${p.story.copy}</p></div><figure><img src="${p.photos[1]}" alt="${p.name}, vue arrière" loading="lazy" width="1000" height="1000"></figure></div></section>
<section class="section"><div class="container"><div class="section-head"><div><span class="eyebrow">1608 / Sélection</span><h2 class="display">Complète ton look.</h2></div><a class="text-link" href="index.html#collection">Toute la collection</a></div><div class="grid" data-related></div></div></section>`;

  /* Pièces suggérées : le partenaire d’abord, puis le reste */
  const rel = P.filter(x => x.id !== p.id).sort((a, b) => (b.id === p.pairedWith) - (a.id === p.pairedWith));
  $('[data-related]').innerHTML = rel.slice(0, 3).map(card).join('');

  /* Barre d’achat mobile : visible seulement quand le bouton principal sort de l’écran */
  const bar = $('[data-mobile-buy]');
  if (bar) {
    document.body.classList.add('has-mobile-buy');
    bar.hidden = false;
    bar.innerHTML = `<span>${p.name}<small>${money(p.price)}</small></span><button class="btn" type="button" data-add>Ajouter <span class="arrow" aria-hidden="true">↗</span></button>`;
    const target = $('[data-buy]');
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => bar.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 0)).observe(target);
  }

  /* Points de la galerie (mobile) */
  const gal = $('[data-gallery]'), dots = $$('[data-dots] i');
  gal.addEventListener('scroll', () => { const i = Math.round(gal.scrollLeft / gal.clientWidth); dots.forEach((d, n) => d.classList.toggle('on', n === i)); }, { passive: true });

  const hint = $('[data-hint]', shell), sizesWrap = $('[data-main-sizes] [data-sizes]', shell);
  const needSize = () => { sizesWrap.classList.add('is-error'); hint.textContent = 'Choisis ta taille pour continuer.'; hint.classList.add('is-error'); sizesWrap.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); };
  const purchase = () => { if (!size) return needSize(); addLines([{ id: p.id, size, qty }]); };
  let pairSize = null;
  document.addEventListener('click', e => {
    const chip = e.target.closest('.size-chip');
    if (chip && chip.dataset.for === 'main') { size = chip.dataset.size; pickSize(chip); hint.textContent = 'Taille ' + size + ' sélectionnée ✓'; hint.classList.remove('is-error'); return; }
    if (chip && chip.dataset.for === 'pair') { pairSize = chip.dataset.size; pickSize(chip); return; }
    if (e.target.closest('[data-add]')) { purchase(); return; }
    if (e.target.closest('[data-qminus]')) { qty = Math.max(1, qty - 1); $('[data-qty-display]').textContent = qty; return; }
    if (e.target.closest('[data-qplus]')) { qty = Math.min(10, qty + 1); $('[data-qty-display]').textContent = qty; return; }
    if (e.target.closest('[data-guide]')) { e.preventDefault(); const d = $('[data-guide-box]'); d.open = true; d.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); return; }
    if (e.target.closest('[data-pair-add]')) {
      if (!size) return needSize();
      if (!pairSize) { const w = $('[data-pair-sizes] [data-sizes]'); w.classList.add('is-error'); toast('Choisis aussi la taille de ' + partner.name.replace(' 1608', '').toLowerCase() + '.'); return; }
      addLines([{ id: p.id, size, qty: 1 }, { id: partner.id, size: pairSize, qty: 1 }]);
    }
  });
}

/* ───────── Textes qui suivent les réglages de catalog.js ───────── */
function fillConfig() {
  const free = freeOn ? money(CFG.freeShippingOver).replace(',00', '') : '';
  const look = CFG.looks[0];
  const map = {
    duo: '−' + CFG.duoPercent + ' %', trio: '−' + CFG.trioPercent + ' %', look: look ? '−' + look.percent + ' %' : '', lead: LEAD, 'lead-short': LEAD,
    'free-long': freeOn ? 'Livraison gratuite dès ' + free + ' d’articles après rabais. Sous ce montant, les frais te sont confirmés avant paiement.' : 'La livraison au Canada est confirmée avec ton total avant tout paiement.'
  };
  $$('[data-cfg]').forEach(el => { const v = map[el.dataset.cfg]; if (v) el.textContent = v; });
  $$('[data-free-ship]').forEach(el => { el.textContent = freeOn ? 'Gratuite dès ' + free + ' d’articles (après rabais).' : 'Frais confirmés avant paiement.'; });
}

/* ───────── Événements globaux ───────── */
function listeners() {
  document.addEventListener('click', e => {
    const open = e.target.closest('[data-open]'); if (open) { openOverlay(open.dataset.open); return; }
    if (e.target.closest('[data-close]') || e.target.closest('[data-backdrop]')) { closeOverlay(); return; }
    const quick = e.target.closest('[data-quick]'); if (quick) { openSheet(quick.dataset.quick); return; }
    const sheetChip = e.target.closest('[data-overlay="sheet"] .size-chip'); if (sheetChip) { sheetSize = sheetChip.dataset.size; pickSize(sheetChip); const h = $('[data-overlay="sheet"] [data-hint]'); h.textContent = ''; h.classList.remove('is-error'); return; }
    const add = e.target.closest('[data-sheet-add]');
    if (add) {
      if (!sheetSize) { $('[data-overlay="sheet"] [data-sizes]').classList.add('is-error'); const h = $('[data-overlay="sheet"] [data-hint]'); h.textContent = 'Choisis ta taille d’abord.'; h.classList.add('is-error'); return; }
      addLines([{ id: add.dataset.sheetAdd, size: sheetSize, qty: 1 }]); return;
    }
    const menu = e.target.closest('[data-menu]');
    if (menu) { const nav = $('[data-mobile-nav]'); const show = nav.hidden; nav.hidden = !show; menu.setAttribute('aria-expanded', String(show)); return; }
    const q = e.target.closest('[data-cartqty]');
    if (q) { const [i, d] = q.dataset.cartqty.split(':').map(Number); const l = cart[i]; if (!l) return; l.qty += d; if (l.qty <= 0) cart.splice(i, 1); else if (l.qty > 10) l.qty = 10; saveCart(); syncCart(); return; }
    const rm = e.target.closest('[data-remove]'); if (rm) { cart.splice(Number(rm.dataset.remove), 1); saveCart(); syncCart(); return; }
    const mobileLink = e.target.closest('[data-mobile-nav] a'); if (mobileLink) $('[data-mobile-nav]').hidden = true;
  });
  const si = $('[data-search-input]'); if (si) si.addEventListener('input', () => searchRender(si.value));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeOverlay(); const n = $('[data-mobile-nav]'); if (n) n.hidden = true; }
    if (e.key === 'Tab' && active) {
      const root = $(`[data-overlay="${active}"]`);
      const f = $$('button:not([disabled]),a[href],input:not([disabled])', root).filter(el => el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}
window.addEventListener('1608:cart-changed', () => { cart = loadCart(); syncCart(); });
window.addEventListener('storage', e => { if (e.key === KEY) { cart = loadCart(); syncCart(); } });

document.addEventListener('DOMContentLoaded', () => {
  shell(); listeners(); syncCart(); fillConfig();
  const page = document.body.dataset.page;
  if (page === 'home') initHome();
  if (page === 'product') initProduct();
});
})();
