/* 1608 — visualisation de caisse. Pas de collecte bancaire côté client.
 * Le passage réel n'est activé que par un processeur configuré côté serveur.
 */
(() => {
'use strict';
const PRODUCTS = window.STORE_PRODUCTS||[];
const money = window.STORE_CURRENCY||(c=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(c/100));
const $ = selector=>document.querySelector(selector);
const findProduct = id => PRODUCTS.find(p=>p.id===id);
const key = '1608-cart-v2';
let cart=[];
try {
 const saved=JSON.parse(localStorage.getItem(key)||'[]');
 if(Array.isArray(saved))cart=saved.filter(item=>findProduct(item.id)&&findProduct(item.id).sizes.includes(item.size)&&Number.isInteger(item.qty)&&item.qty>=1&&item.qty<=10);
} catch(_){}
let ready=false;
function save(){
 try{localStorage.setItem(key,JSON.stringify(cart));}catch(_){}
 // Shared site.js already uses this key; refresh its header badges via reload-less event.
 document.querySelectorAll('[data-cart-count]').forEach(el=>{const n=cart.reduce((t,p)=>t+p.qty,0);el.textContent=n;el.hidden=n===0;});
}
function render(){
 const items=$('[data-checkout-items]'),mini=$('[data-mini-lines]');
 const subtotal=cart.reduce((sum,item)=>sum+(findProduct(item.id)?.price||0)*item.qty,0);
 if(!cart.length) {
  items.innerHTML='<div class="checkout-empty"><h3>Votre panier est vide.</h3><p>Découvrez la collection 1608 avant de passer en caisse.</p><a class="button dark" href="index.html#collection">VOIR LA COLLECTION ↗</a></div>';
  mini.innerHTML='<p style="color:#666;font-size:12px">Aucun article dans le panier.</p>';
 } else {
  items.innerHTML=cart.map((item,index)=>{
   const p=findProduct(item.id);
   return `<article class="checkout-item"><a class="checkout-item-photo" href="produit.html?id=${encodeURIComponent(p.id)}"><img src="${p.photos[0]}" alt="${p.name} — ${p.variant}" width="120" height="120"></a>
    <div><a href="produit.html?id=${encodeURIComponent(p.id)}"><h3>${p.name}</h3></a><p>${p.variant} · TAILLE ${item.size}</p><div class="checkout-item-qty" role="group" aria-label="Quantité ${p.name}"><button type="button" data-cqty="${index}:-1" aria-label="Diminuer la quantité">−</button><strong>${item.qty}</strong><button type="button" data-cqty="${index}:1" aria-label="Augmenter la quantité">+</button></div><button type="button" class="checkout-item-remove" data-cremove="${index}">Retirer</button></div>
    <strong class="checkout-item-price">${money(p.price*item.qty)}</strong></article>`;
  }).join('');
  mini.innerHTML=cart.map(item=>{const p=findProduct(item.id);return `<div class="summary-line"><img src="${p.photos[0]}" alt="" loading="lazy"><div><b>${p.name}</b><p>${item.size} · QTÉ ${item.qty}</p></div><strong>${money(p.price*item.qty)}</strong></div>`;}).join('');
 }
 $('[data-subtotal]').textContent=money(subtotal);
 $('[data-items-total]').textContent=money(subtotal);
 updatePayButton();
}
function updatePayButton(){
 const button=$('[data-pay-button]');
 const hasItems=cart.length>0;
 button.disabled=!ready||!hasItems;
 button.textContent=ready&&hasItems?'CONTINUER VERS LE PAIEMENT ↗':ready?'AJOUTER UN ARTICLE':'PAIEMENT NON ACTIVÉ ↗';
 button.setAttribute('aria-label',button.textContent.trim());
}
async function detectGateway(){
 // GitHub Pages is a static preview, not an API server.
 if(location.hostname.endsWith('github.io'))return;
 try{
  const response=await fetch('api/payment-status',{headers:{'Accept':'application/json'},cache:'no-store',credentials:'same-origin'});
  if(!response.ok)return;
  const status=await response.json();
  if(status?.ready!==true)return;
  ready=true;updatePayButton();
  $('[data-pay-status]').textContent='Le paiement sera traité sur une page Stripe hébergée. Le montant total, incluant les frais et taxes applicables, sera affiché avant toute autorisation.';
  // Only advertise payment methods actually enabled by the payment provider.
  const interac=document.querySelector('input[name="payment-method"][value="interac"]')?.closest('label');
  if(interac&&status.interacWalletsReady===true)interac.querySelector('.method-state').textContent='SELON ADMISSIBILITÉ';
  else if(interac){interac.hidden=true;const card=document.querySelector('input[name="payment-method"][value="card"]');card.checked=true;}
  document.querySelector('input[name="payment-method"][value="card"]')?.closest('label')?.querySelector('.method-state').replaceChildren(document.createTextNode('DISPONIBLE'));
  const alert=$('.checkout-alert');if(alert)alert.hidden=true;
 }catch(e){/* Remain in safe preview state. */}
}
async function redirectToHostedPayment(){
 if(!ready||cart.length===0)return;
 const button=$('[data-pay-button]');button.disabled=true;button.textContent='REDIRECTION SÉCURISÉE…';
 try{
  const response=await fetch('api/create-checkout-session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({items:cart.map(({id,size,qty})=>({id,size,qty}))})});
  const data=await response.json();
  if(!response.ok||typeof data.url!=='string')throw new Error(data?.error||'La caisse est momentanément indisponible.');
  const url=new URL(data.url);
  if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw new Error('Adresse de paiement non reconnue.');
  window.location.assign(url.href);
 }catch(error){
  $('[data-pay-status]').textContent='Impossible de démarrer le paiement. Aucun montant n’a été débité. Réessaie plus tard.';
  updatePayButton();
 }
}
document.addEventListener('DOMContentLoaded',()=>{
 render();save();detectGateway();
 document.addEventListener('click',event=>{
  const qty=event.target.closest('[data-cqty]');
  if(qty){const [i,delta]=qty.dataset.cqty.split(':').map(Number);const item=cart[i];if(!item)return;item.qty+=delta;if(item.qty<=0)cart.splice(i,1);else if(item.qty>10)item.qty=10;save();render();return;}
  const remove=event.target.closest('[data-cremove]');if(remove){cart.splice(Number(remove.dataset.cremove),1);save();render();return;}
  if(event.target.closest('[data-pay-button]'))redirectToHostedPayment();
 });
 document.querySelectorAll('input[name="payment-method"]').forEach(input=>input.addEventListener('change',()=>{
  const explainer=$('[data-payment-explainer]');
  explainer.textContent=input.value==='interac'
   ?'Débit Interac fonctionne via Apple Pay ou Google Pay, selon la banque et l’appareil du client. Ce n’est pas un virement Interac.'
   :'Une fois activé, le paiement bancaire sera saisi sur la page sécurisée du fournisseur et non sur 1608.';
 }));
});
})();
