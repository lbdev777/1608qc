/* 1608 — demandes de commande, puis virement Interac manuel. AUCUN paiement en ligne.
   Mode API (config.apiUrl défini) : la demande est envoyée au serveur sécurisé 1608 (Cloudflare), qui l'enregistre
   et avertit le propriétaire. Une copie est gardée sur l'appareil tant que le serveur n'a pas confirmé réception
   (aucune demande perdue en cas de panne réseau). Sans apiUrl : brouillon de courriel (ancien mode). */
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
const apiUrl=typeof config.apiUrl==='string'&&/^https:\/\//.test(config.apiUrl)?config.apiUrl.replace(/\/$/,''):'';
const canRequest=Boolean(config.enabled&&validEmail(config.interacEmail)&&(apiUrl||validEmail(config.ordersEmail)));
const PENDING='1608-pending-v1';
const readPending=()=>{try{const v=JSON.parse(localStorage.getItem(PENDING)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}};
const writePending=v=>{try{localStorage.setItem(PENDING,JSON.stringify(v))}catch(_){}};
function newIdem(){const b=new Uint8Array(16);try{crypto.getRandomValues(b)}catch(_){for(let i=0;i<16;i++)b[i]=Math.random()*256}return Array.from(b).map(v=>v.toString(16).padStart(2,'0')).join('')}
async function sendOrder(entry){
 const ctl=typeof AbortController==='function'?new AbortController():null;const t=ctl&&setTimeout(()=>ctl.abort(),15000);
 try{
  const r=await fetch(apiUrl+'/api/orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(entry.payload),signal:ctl?ctl.signal:undefined});
  const j=await r.json().catch(()=>({}));
  if(r.ok&&j.ok)return{ok:true,id:j.id,total:j.total};
  // 4xx = demande refusée (inutile de réessayer) ; 429/5xx = on garde et on réessaie
  return{ok:false,final:r.status>=400&&r.status<500&&r.status!==429&&r.status!==408,error:j.error||'Erreur réseau'};
 }catch(_){return{ok:false,final:false,error:'Connexion impossible'}}
 finally{if(t)clearTimeout(t)}
}
async function flushPending(){
 if(!apiUrl)return[];
 const done=[];let list=readPending();
 for(const e of list.slice()){
  const res=await sendOrder(e);
  if(res.ok){done.push({id:res.id,total:res.total});list=readPending().filter(x=>x.idem!==e.idem);writePending(list)}
  else if(res.final){list=readPending().filter(x=>x.idem!==e.idem);writePending(list)}
 }
 return done;
}
function showConfirmation(res){
 const draft=$('[data-manual-draft]');
 if(draft)draft.hidden=true;
 const st=$('[data-pay-status]');
 st.innerHTML='';
 const b=document.createElement('strong');b.textContent='Demande reçue ✓ Numéro : '+res.id;
 const p=document.createElement('span');p.textContent=' Gardez ce numéro. Nous vous écrivons avec le total confirmé (livraison et taxes incluses) avant tout virement Interac.';
 st.append(b,p);
}

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
 $('[data-pay-button]').textContent=cart.length===0?'AJOUTER UN ARTICLE':canRequest?(apiUrl?'ENVOYER MA DEMANDE ↗':'PRÉPARER MA DEMANDE ↗'):'ADRESSE DE PAIEMENT À CONFIGURER';
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
const FIELD_RULES={
 name:{label:'nom complet',test:v=>v.length>=2&&/\s|.{4,}/.test(v),msg:'Entrez votre prénom et votre nom.'},
 email:{label:'courriel',test:v=>/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(v)&&!/\.\./.test(v),msg:'Entrez un courriel valide, par exemple prenom@exemple.ca.'},
 street:{label:'adresse',test:v=>v.length>=5&&/\d/.test(v),msg:'Entrez votre adresse complète avec le numéro civique.'},
 city:{label:'ville',test:v=>v.length>=2,msg:'Entrez votre ville.'},
 postal:{label:'code postal',test:v=>/^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/i.test(v.replace(/\s+/g,'')),msg:'Entrez un code postal canadien valide, par exemple G5L 1A1.'}
};
function fieldError(input,message){
 let box=input.parentElement.querySelector('.field-error');
 if(message){
  if(!box){box=document.createElement('span');box.className='field-error';box.id=input.id+'-err';box.setAttribute('role','alert');input.parentElement.appendChild(box)}
  box.textContent=message;input.setAttribute('aria-invalid','true');input.setAttribute('aria-describedby',box.id);
 }else{
  if(box)box.remove();input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');
 }
}
function getContact(){
 const ids=['name','email',...(apiUrl?['street']:[]),'city','postal'];
 const values={};let first=null;
 for(const id of ids){
  const input=document.getElementById('manual-'+id);if(!input)continue;
  const v=input.value.trim();values[id]=v;
  const rule=FIELD_RULES[id];
  const msg=v===''?'Ce champ est obligatoire.':(rule.test(v)?'':rule.msg);
  fieldError(input,msg);
  if(msg&&!first)first=input;
 }
 if(first){first.focus();first.scrollIntoView({block:'center',behavior:'smooth'});return null}
 const phone=($('#manual-phone')||{}).value||'';
 return {name:values.name,email:values.email.toLowerCase(),city:values.city,postal:values.postal.toUpperCase(),phone:phone.trim(),street:values.street||''};
}
async function submitToApi(contact){
 const btn=$('[data-pay-button]'),st=$('[data-pay-status]');
 if(btn.disabled)return;btn.disabled=true;st.textContent='Envoi sécurisé en cours…';
 const entry={idem:newIdem(),at:Date.now(),payload:{idem:'',items:cart.map(i=>({id:i.id,size:i.size,qty:i.qty})),customer:contact,website:($('#manual-website')||{}).value||''}};
 entry.payload.idem=entry.idem;
 writePending([...readPending(),entry]);               // copie locale AVANT l'envoi
 let res=await sendOrder(entry);
 if(!res.ok&&!res.final){await new Promise(r=>setTimeout(r,2500));res=await sendOrder(entry)}
 if(res.ok){
  writePending(readPending().filter(x=>x.idem!==entry.idem));
  cart=[];save();render();showConfirmation(res);return;
 }
 if(res.final){writePending(readPending().filter(x=>x.idem!==entry.idem));btn.disabled=false;st.textContent='Demande refusée : '+res.error+' Vérifiez vos informations.';return}
 btn.disabled=false;
 st.textContent='Connexion impossible pour le moment. Votre demande est gardée sur cet appareil et sera renvoyée automatiquement dès que la connexion revient (gardez cette page ouverte ou revenez sur le site). Vous pouvez aussi nous écrire à '+(validEmail(config.ordersEmail)?config.ordersEmail:'notre courriel')+'.';
}
function prepareRequest(){
 if(!canRequest||cart.length===0)return;
 const contact=getContact();if(!contact)return;
 if(apiUrl){submitToApi(contact);return}
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
 document.querySelectorAll('.manual-fields input').forEach(i=>{i.addEventListener('input',()=>{if(i.getAttribute('aria-invalid'))fieldError(i,'')});});
 const reveal=()=>{document.querySelectorAll('[data-api-only]').forEach(e=>e.hidden=!apiUrl);document.querySelectorAll('[data-mail-only]').forEach(e=>e.hidden=!!apiUrl)};reveal();
 const retry=()=>flushPending().then(d=>{if(d.length&&$('[data-pay-status]'))showConfirmation(d[d.length-1])});
 retry();window.addEventListener('online',retry);setInterval(()=>{if(readPending().length)retry()},30000);
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
