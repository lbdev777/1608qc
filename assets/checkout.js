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
 // En attendant l'ouverture d'un vrai compte marchand et la connexion serveur.
 button.disabled=true;
 button.textContent=cart.length?'DEMANDE INTERAC À ACTIVER ↗':'AJOUTER UN ARTICLE';
 button.setAttribute('aria-label',button.textContent.trim());
}
document.addEventListener('DOMContentLoaded',()=>{
 render();save();
 document.addEventListener('click',event=>{
  const qty=event.target.closest('[data-cqty]');
  if(qty){
   const [i,delta]=qty.dataset.cqty.split(':').map(Number);
   const item=cart[i];if(!item)return;
   item.qty+=delta;
   if(item.qty<=0)cart.splice(i,1);else if(item.qty>10)item.qty=10;
   save();render();return;
  }
  const remove=event.target.closest('[data-cremove]');
  if(remove){cart.splice(Number(remove.dataset.cremove),1);save();render();return;}
 });
});
})();
