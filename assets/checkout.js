/* 1608 — caisse : demande de commande par courriel, puis virement Interac manuel.
   AUCUN paiement, encaissement ni enregistrement de commande automatique. */
(() => {
'use strict';
const P = window.STORE_PRODUCTS || [];
const CFG = window.STORE_CONFIG;
const cfg = window.STORE_MANUAL_PAYMENT || { interacEmail: '', ordersEmail: '', enabled: false };
const money = window.STORE_CURRENCY;
const priceOf = lines => window.STORE_BUNDLE_PRICING.calculate(lines);
const $ = s => document.querySelector(s);
const KEY = '1608-cart-v2';
const find = id => P.find(p => p.id === id);
const validEmail = v => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const canRequest = Boolean(cfg.enabled && validEmail(cfg.ordersEmail) && validEmail(cfg.interacEmail));
const freeOn = CFG.freeShippingOver > 0;
let cart = [];
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (Array.isArray(saved)) cart = saved.filter(x => find(x.id) && find(x.id).sizes.includes(x.size) && Number.isInteger(x.qty) && x.qty >= 1 && x.qty <= 10);
} catch (_) {}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (_) {}
  window.dispatchEvent(new Event('1608:cart-changed'));
}

function render() {
  const items = $('[data-items]'), mini = $('[data-mini]'); if (!items || !mini) return;
  if (!cart.length) {
    items.innerHTML = '<div class="co-empty"><h3 class="display">Ton panier est vide.</h3><p class="muted">Découvre la collection 1608.</p><a class="btn" href="index.html#collection">Voir la collection <span class="arrow" aria-hidden="true">↗</span></a></div>';
    mini.innerHTML = '<p class="helper">Aucun article.</p>';
  } else {
    items.innerHTML = cart.map((it, i) => {
      const p = find(it.id);
      return `<article class="co-item"><a href="produit-${p.id}.html"><img src="${p.photos[0]}" alt="${p.name}, ${p.variant}" width="96" height="96"></a>
<div><h3><a class="plain" href="produit-${p.id}.html">${p.name}</a></h3><p>${p.variant} · Taille ${it.size}</p>
<div class="mini-qty" role="group" aria-label="Quantité ${p.name}"><button type="button" data-cqty="${i}:-1" aria-label="Diminuer la quantité">−</button><span>${it.qty}</span><button type="button" data-cqty="${i}:1" aria-label="Augmenter la quantité">+</button></div>
<button class="remove" type="button" data-cremove="${i}">Retirer</button></div>
<strong>${money(p.price * it.qty)}</strong></article>`;
    }).join('');
    mini.innerHTML = cart.map(it => { const p = find(it.id); return `<div class="sum-line"><img src="${p.photos[0]}" alt="" loading="lazy" width="56" height="56"><div><b>${p.name}</b><p>${it.size} · Qté ${it.qty}</p></div><strong>${money(p.price * it.qty)}</strong></div>`; }).join('');
  }
  const pr = priceOf(cart);
  $('[data-subtotal]').textContent = money(pr.subtotal);
  $('[data-total]').textContent = money(pr.total);
  $('[data-discount-row]').hidden = !pr.percent;
  $('[data-discount-label]').textContent = 'Rabais ensemble −' + pr.percent + ' %';
  $('[data-discount-value]').textContent = '−' + money(pr.discount);
  $('[data-shipping]').textContent = freeOn && pr.freeShipping ? 'Gratuite' : 'À confirmer';

  /* Barres de progression : livraison gratuite + rabais ensemble */
  const perks = $('[data-perks]');
  let h = '';
  if (cart.length && freeOn) {
    const ok = pr.freeShipping, pct = Math.min(100, Math.round(pr.total / pr.threshold * 100));
    h += `<div><div class="perk-label${ok ? ' ok' : ''}"><span>${ok ? '✓ Livraison gratuite débloquée' : 'Plus que ' + money(pr.toFreeShipping) + ' pour la livraison gratuite'}</span></div><div class="bar${ok ? ' ok' : ''}"><i data-w="${pct}"></i></div></div>`;
  }
  if (cart.length && pr.next) h += `<div><div class="perk-label"><span>${pr.next.text}</span></div><div class="bar"><i data-w="${pr.models === 2 ? 66 : 33}"></i></div></div>`;
  perks.hidden = !h; perks.innerHTML = h;
  perks.querySelectorAll('[data-w]').forEach(el => { el.style.width = el.dataset.w + '%'; });

  const btn = $('[data-pay]');
  btn.disabled = !canRequest || !cart.length;
  btn.firstChild.textContent = !cart.length ? 'Ajoute un article ' : canRequest ? 'Préparer ma demande ' : 'Commandes bientôt ouvertes ';
  $('[data-closed-notice]').hidden = canRequest;
  $('[data-status]').textContent = canRequest
    ? 'Après ta demande, attends ton total confirmé (articles, livraison et taxes) avant tout virement.'
    : 'La réception des commandes n’est pas encore ouverte. Tu peux préparer ton panier sans rien payer.';
}

function showRecipient() {
  const el = $('[data-interac-address]'), btn = $('[data-copy-interac]'); if (!el || !btn) return;
  el.textContent = canRequest ? cfg.interacEmail : 'Adresse communiquée avec ton total';
  btn.disabled = !canRequest;
}

function requestRef() {
  /* Référence de DEMANDE créée sur l’appareil : ce n’est pas un numéro de commande confirmé. */
  let suffix;
  try { const b = new Uint8Array(4); crypto.getRandomValues(b); suffix = Array.from(b).map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase(); }
  catch (_) { suffix = Math.floor(Math.random() * 1e8).toString().padStart(8, '0'); }
  const d = new Date();
  return 'RQ-' + [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('') + '-' + suffix;
}

function getContact() {
  const fields = ['manual-name', 'manual-email', 'manual-city', 'manual-postal'].map(id => document.getElementById(id));
  for (const input of fields) {
    if (!input.value.trim()) { input.setCustomValidity('Ce champ est obligatoire.'); input.reportValidity(); input.setCustomValidity(''); return null; }
    if (!input.checkValidity()) { input.reportValidity(); return null; }
  }
  const [name, email, city, postal] = fields.map(i => i.value.trim());
  if (!/^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/i.test(postal.replace(/\s+/g, ''))) {
    const el = document.getElementById('manual-postal'); el.setCustomValidity('Entre un code postal canadien valide.'); el.reportValidity(); el.setCustomValidity(''); return null;
  }
  return { name, email, city, postal };
}

function prepareRequest() {
  if (!canRequest || !cart.length) return;
  const contact = getContact(); if (!contact) return;
  const ref = requestRef(), pr = priceOf(cart);
  const lines = cart.map(it => { const p = find(it.id); return `• ${p.name} — ${p.variant} — taille ${it.size} — quantité ${it.qty} — ${money(p.price * it.qty)}`; });
  const body = [
    'Bonjour 1608,', '',
    'Je souhaite faire confirmer la disponibilité et le total de cette demande de commande.',
    'RÉFÉRENCE DE DEMANDE : ' + ref, '',
    ...lines, '',
    'SOUS-TOTAL DES ARTICLES : ' + money(pr.subtotal),
    pr.percent ? 'RABAIS ENSEMBLE (' + pr.percent + ' %) : −' + money(pr.discount) : 'RABAIS ENSEMBLE : aucun',
    'TOTAL DES ARTICLES APRÈS RABAIS : ' + money(pr.total),
    'Livraison : ' + (freeOn && pr.freeShipping ? 'GRATUITE (seuil atteint), à confirmer par écrit' : 'À CONFIRMER AVANT PAIEMENT'),
    'Taxes applicables : À CONFIRMER AVANT PAIEMENT', '',
    'Nom : ' + contact.name, 'Courriel : ' + contact.email, 'Ville : ' + contact.city, 'Code postal : ' + contact.postal.toUpperCase(), '',
    'Merci de me confirmer le total et les conditions de livraison avant que je fasse mon virement Interac.',
    'Je comprends que ma demande n’est pas encore une commande acceptée.'
  ].join('\n');
  $('[data-draft]').hidden = false;
  $('[data-summary]').value = body;
  /* Le navigateur ouvre seulement un brouillon : l’envoi exige une action du client. */
  window.location.href = 'mailto:' + cfg.ordersEmail + '?subject=' + encodeURIComponent('1608 — demande ' + ref) + '&body=' + encodeURIComponent(body);
  $('[data-status]').textContent = 'Ton brouillon de courriel est prêt : vérifie-le, puis clique sur Envoyer dans ton application. Aucun virement n’est requis avant la confirmation du total.';
}

function copyText(text, button) {
  const done = () => { const old = button.textContent; button.textContent = 'Copié ✓'; setTimeout(() => { button.textContent = old; }, 2000); };
  const fallback = () => { const el = $('[data-summary]'); if (el && el.value === text) { el.focus(); el.select(); try { if (document.execCommand('copy')) done(); } catch (_) {} } else { window.prompt('Copie cette adresse :', text); } };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done).catch(fallback); else fallback();
}

document.addEventListener('DOMContentLoaded', () => {
  showRecipient(); render();
  document.addEventListener('click', e => {
    const q = e.target.closest('[data-cqty]');
    if (q) { const [i, d] = q.dataset.cqty.split(':').map(Number), it = cart[i]; if (!it) return; it.qty += d; if (it.qty < 1) cart.splice(i, 1); else if (it.qty > 10) it.qty = 10; save(); render(); return; }
    const rm = e.target.closest('[data-cremove]'); if (rm) { cart.splice(Number(rm.dataset.cremove), 1); save(); render(); return; }
    if (e.target.closest('[data-pay]')) { prepareRequest(); return; }
    const addr = e.target.closest('[data-copy-interac]'); if (addr && canRequest) { copyText(cfg.interacEmail, addr); return; }
    const sum = e.target.closest('[data-copy-summary]'); if (sum) copyText($('[data-summary]').value, sum);
  });
  /* Le tiroir du panier (site.js) et la caisse partagent le même stockage : on recharge si le tiroir modifie le panier. */
  window.addEventListener('1608:cart-saved', () => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
      cart = Array.isArray(saved) ? saved.filter(x => find(x.id) && find(x.id).sizes.includes(x.size) && Number.isInteger(x.qty) && x.qty >= 1 && x.qty <= 10) : [];
    } catch (_) { cart = []; }
    render();
  });
});
})();
