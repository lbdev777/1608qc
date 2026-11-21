/* Suivi de commande : courriel + numéro. Toutes les données sont insérées avec textContent. */
(()=>{'use strict';
const cfg=window.STORE_MANUAL_PAYMENT||{};
const api=typeof cfg.apiUrl==='string'?cfg.apiUrl.replace(/\/$/,''):'';
const $=s=>document.querySelector(s);
const money=c=>(c/100).toFixed(2).replace('.',',')+' $';
const el=(t,x,c)=>{const e=document.createElement(t);if(x!=null)e.textContent=x;if(c)e.className=c;return e};
const when=s=>new Date(s).toLocaleString('fr-CA',{dateStyle:'long',timeStyle:'short'});
const LABEL={'Commande reçue':'Commande reçue','Total confirmé':'Montant confirmé','Payé (Interac)':'Paiement reçu','En production':'En production','Expédié':'Expédiée','Livré':'Livrée','Annulé':'Annulée'};
const NEXT={'Commande reçue':'Nous vous écrivons le montant exact à virer par Interac.','Total confirmé':'Faites votre virement Interac. La commande est confirmée dès sa réception.','Payé (Interac)':'Virement reçu : votre commande est confirmée.','En production':'Votre commande est en production.','Expédié':'Votre commande est en route.','Livré':'Merci ! Votre commande est livrée.','Annulé':'Cette commande est annulée.'};
function show(j){
 const r=$('#sv-result');r.hidden=false;r.textContent='';
 r.append(el('h2','Commande #'+j.id));
 r.append(el('p',LABEL[j.status]||j.status,'sv-status'));
 r.append(el('p',NEXT[j.status]||'','manual-helper'));
 const ul=el('ul');ul.style.cssText='margin:12px 0;padding-left:18px';
 j.items.forEach(i=>ul.append(el('li',i.name+' — taille '+i.size+' × '+i.qty)));r.append(ul);
 if(j.discount)r.append(el('p','Rabais ensemble : −'+money(j.discount),'manual-helper'));
 r.append(el('p','Total des articles : '+money(j.total)+' (livraison et taxes confirmées par courriel)','manual-helper'));
 r.append(el('p','Passée le '+when(j.created_at),'manual-helper'));
 if(j.history&&j.history.length){const h=el('ul');h.style.cssText='margin:8px 0;padding-left:18px;font-size:13px';j.history.forEach(e=>h.append(el('li',when(e.at)+' · '+(LABEL[e.status]||e.status))));r.append(h)}
}
async function go(){
 const msg=$('#sv-msg'),btn=$('#sv-go');msg.textContent='';
 const email=$('#sv-email').value.trim(),number=$('#sv-number').value.trim();
 if(!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)){msg.textContent='Entrez un courriel valide, par exemple prenom@exemple.ca.';return}
 if(!/^#?\d{4,8}$/.test(number)){msg.textContent='Entrez votre numéro de commande (4 chiffres ou plus), par exemple 3001.';return}
 if(!api){msg.textContent='Le suivi n’est pas encore disponible.';return}
 btn.disabled=true;msg.textContent='Recherche…';$('#sv-result').hidden=true;
 try{
  const r=await fetch(api+'/api/order-status',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,number})});
  const j=await r.json().catch(()=>({}));
  if(r.ok&&j.ok){msg.textContent='';show(j)}else msg.textContent=j.error||'Erreur. Réessayez.';
 }catch(_){msg.textContent='Connexion impossible. Réessayez dans un instant.'}
 btn.disabled=false;
}
document.addEventListener('DOMContentLoaded',()=>{
 try{const l=JSON.parse(localStorage.getItem('1608-last-order')||'null');if(l){if(l.email)$('#sv-email').value=l.email;if(l.id)$('#sv-number').value=l.id}}catch(_){}
 $('#sv-go').addEventListener('click',go);
 ['#sv-email','#sv-number'].forEach(s=>$(s).addEventListener('keydown',e=>{if(e.key==='Enter')go()}));
});
})();
