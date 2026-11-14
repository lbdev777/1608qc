/* 1608 — demandes de commande par courriel, puis virement Interac manuel.
   AUCUN paiement, encaissement, ni enregistrement de commande automatique. */
(() => {
'use strict';
const P=window.STORE_PRODUCTS||[];
const config=window.STORE_MANUAL_PAYMENT||{interacEmail:'',ordersEmail:'',enabled:false};
const money=window.STORE_CURRENCY||(c=>new Intl.NumberFormat('fr-CA',{style:'currency',currency:'CAD'}).format(c/100));
const priceCart=lines=>window.STORE_BUNDLE_PRICING.calculate(lines);
const $=selector=>document.querySelector(selector);
const key='1608-cart-v2';
const find=id=>P.find(p=>p.id===id);
const validEmail=value=>typeof value==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
let cart=[];
try{
 const saved=JSON.parse(localStorage.getItem(key)||'[]');
 if(Array.isArray(saved))cart=saved.filter(x=>find(x.id)&&find(x.id).sizes.includes(x.size)&&Number.isInteger(x.qty)&&x.qty>=1&&x.qty<=10);
}catch(_){}
const canRequest=Boolean(config.enabled&&validEmail(config.ordersEmail)&&validEmail(config.interacEmail));

function save(){
 try{localStorage.setItem(key,JSON.stringify(cart))}catch(_){}
 window.dispatchEvent(new Event('1608:cart-changed'));
}
function subtotal(){return priceCart(cart).subtotal;}
function render(){
 const items=$('[data-checkout-items]'),mini=$('[data-mini-lines]');
 if(!items||!mini)return;
 if(cart.length===0){
  items.innerHTML='<div class="checkout-empty"><h3>Votre panier est vide.</h3><p>Découvrez la collection 1608.</p><a class="button dark" href="index.html#collection">VOIR LA COLLECTION ↗</a></div>';
  mini.innerHTML='<p style="color:#666;font-size:12px">Aucun article.</p>';
 }else{
  items.innerHTML=cart.map((item,i)=>{
   const p=find(item.id);
   return `<article class="checkout-item">
     <a class="checkout-item-photo" href="produit-${encodeURIComponent(p.id)}.html"><img src="${p.photos[0]}" alt="${p.name} — ${p.variant}" width="120" height="120"></a>
     <div><a href="produit-${encodeURIComponent(p.id)}.html"><h3>${p.name}</h3></a>
       <p>${p.variant} · TAILLE ${item.size}</p>
       <div class="checkout-item-qty" role="group" aria-label="Quantité ${p.name}">
       <button type="button" data-cqty="${i}:-1" aria-label="Diminuer la quantité">−</button><strong>${item.qty}</strong>
       <button type="button" data-cqty="${i}:1" aria-label="Augmenter la quantité">+</button></div>
       <button type="button" class="checkout-item-remove" data-cremove="${i}">Retirer</button>
     </div><strong class="checkout-item-price">${money(p.price*item.qty)}</strong></article>`;
  }).join('');
  mini.innerHTML=cart.map(item=>{
   const p=find(item.id);
   return `<div class="summary-line"><img src="${p.photos[0]}" alt="" loading="lazy"><div><b>${p.name}</b><p>${item.size} · QTÉ ${item.qty}</p></div><strong>${money(p.price*item.qty)}</strong></div>`;
  }).join('');
 }
 const pricing=priceCart(cart);
 $('[data-subtotal]').textContent=money(pricing.subtotal);
 $('[data-items-total]').textContent=money(pricing.total);
 $('[data-bundle-discount-row]').hidden=!pricing.percent;
 $('[data-bundle-discount-label]').textContent='Rabais ensemble / −'+pricing.percent+' %';
 $('[data-bundle-discount-value]').textContent='−'+money(pricing.discount);
 const promoProgress=$('[data-bundle-progress]');if(promoProgress){promoProgress.hidden=true;promoProgress.textContent='';}
 $('[data-pay-button]').disabled=!canRequest||cart.length===0;
 $('[data-pay-button]').textContent=cart.length===0?'AJOUTER UN ARTICLE':canRequest?'PRÉPARER MA DEMANDE ↗':'ADRESSE DE PAIEMENT À CONFIGURER';
 $('[data-pay-status]').textContent=canRequest
 ?'Après votre demande, attendez le total confirmé (articles, frais de livraison et taxes applicables) avant tout virement.'
 :'La réception des commandes n’est pas encore activée. Vous pouvez consulter le panier sans effectuer de paiement.';
}
function showRecipient(){
 const el=$('[data-interac-address]'),btn=$('[data-copy-interac]');
 if(!el||!btn)return;
 el.textContent=canRequest?config.interacEmail:'Adresse à configurer';
 btn.disabled=!canRequest;
 const alert=$('[data-checkout-alert]');
 if(canRequest&&alert)alert.hidden=true;
}
function requestRef(){
 // Référence de DEMANDE, créée sur l'appareil — pas un numéro de commande confirmé.
 let suffix;
 try{const bytes=new Uint8Array(4);crypto.getRandomValues(bytes);suffix=Array.from(bytes).map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();}
 catch(_){suffix=Math.floor(Math.random()*1e8).toString().padStart(8,'0')}
 const d=new Date();
 const day=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('');
 return 'RQ-'+day+'-'+suffix;
}
function getContact(){
 const fields=['manual-name','manual-email','manual-city','manual-postal'].map(id=>document.getElementById(id));
 for(const input of fields){
  if(!input.value.trim()){input.setCustomValidity('Ce champ est obligatoire.');input.reportValidity();input.setCustomValidity('');return null;}
  if(!input.checkValidity()){input.reportValidity();return null;}
 }
 const [name,email,city,postal]=fields.map(input=>input.value.trim());
 if(!/^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/i.test(postal.replace(/\s+/g,''))){
  const el=$('#manual-postal');el.setCustomValidity('Entrez un code postal canadien valide.');el.reportValidity();el.setCustomValidity('');return null;
 }
 return {name,email,city,postal};
}
function prepareRequest(){
 if(!canRequest||cart.length===0)return;
 const contact=getContact();if(!contact)return;
 const reference=requestRef();
 const lines=cart.map(item=>{
  const p=find(item.id);
  return `• ${p.name} — ${p.variant} — taille ${item.size} — quantité ${item.qty} — ${money(p.price*item.qty)}`;
 });
 const body=[
  'Bonjour 1608,',
  '',
  'Je souhaite faire confirmer la disponibilité et le total de cette demande de commande.',
  'RÉFÉRENCE DE DEMANDE : '+reference,
  '',
  ...lines,
  '',
  'SOUS-TOTAL DES ARTICLES : '+money(priceCart(cart).subtotal),
  'RABAIS ENSEMBLE ('+priceCart(cart).percent+' %) : −'+money(priceCart(cart).discount),
  'TOTAL DES ARTICLES APRÈS RABAIS : '+money(priceCart(cart).total),
  'Livraison et taxes applicables : À CONFIRMER AVANT PAIEMENT',
  '',
  'Nom : '+contact.name,
  'Courriel : '+contact.email,
  'Ville : '+contact.city,
  'Code postal : '+contact.postal.toUpperCase(),
  '',
  'Veuillez me confirmer le total et les conditions de livraison avant que je fasse mon virement Interac.',
  'Je comprends que ma demande n’est pas encore une commande acceptée.'
 ].join('\n');
 const draft=$('[data-manual-draft]');draft.hidden=false;
 $('[data-order-summary]').value=body;
 const uri='mailto:'+config.ordersEmail+'?subject='+encodeURIComponent('1608 — demande '+reference)+'&body='+encodeURIComponent(body);
 // Le navigateur ouvre seulement un brouillon. L'envoi exige une action du client dans son logiciel.
 window.location.href=uri;
 $('[data-pay-status]').textContent='Votre brouillon de courriel est prêt : vérifiez-le, puis cliquez sur Envoyer dans votre application. Aucun virement n’est requis avant confirmation du total.';
}
function copyText(text,button){
 const done=()=>{const old=button.textContent;button.textContent='COPIÉ ✓';setTimeout(()=>button.textContent=old,2000)};
 if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(done).catch(()=>fallback())}
 else fallback();
 function fallback(){
  const el=$('[data-order-summary]');
  if(el&&el.value===text){el.focus();el.select();try{if(document.execCommand('copy'))done();}catch(_){/* Text remains selected for manual copying. */}}
  else {prompt('Copiez cette adresse :',text)}
 }
}
document.addEventListener('DOMContentLoaded',()=>{
 showRecipient();render();
 document.addEventListener('click',event=>{
  const q=event.target.closest('[data-cqty]');
  if(q){
   const [i,delta]=q.dataset.cqty.split(':').map(Number),item=cart[i];if(!item)return;
   item.qty+=delta;if(item.qty<1)cart.splice(i,1);else if(item.qty>10)item.qty=10;
   save();render();return;
  }
  const remove=event.target.closest('[data-cremove]');
  if(remove){cart.splice(Number(remove.dataset.cremove),1);save();render();return}
  if(event.target.closest('[data-pay-button]')){prepareRequest();return}
  const address=event.target.closest('[data-copy-interac]');
  if(address&&canRequest){copyText(config.interacEmail,address);return}
  const summary=event.target.closest('[data-copy-summary]');
  if(summary){copyText($('[data-order-summary]').value,summary);return}
 });
});
})();
