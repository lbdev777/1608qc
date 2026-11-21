/* Page des commandes (protégée par Cloudflare Access). Toutes les données sont insérées via textContent. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const money=c=>(c/100).toFixed(2).replace('.',',')+' $';
let statuses=[],filter='',orders=[];
const el=(t,txt,cls)=>{const e=document.createElement(t);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;return e};
async function api(path,opt){
 const r=await fetch('/api/admin/'+path,{credentials:'same-origin',...opt,headers:{'content-type':'application/json'}});
 if(!r.ok)throw new Error(r.status===403?'Accès refusé (connexion Cloudflare Access requise).':r.status===503?'Administration non configurée côté serveur.':'Erreur '+r.status);
 return r.json();
}
function card(o){
 const li=el('li',null,'cm-card');
 li.append(el('h2',o.id+' · '+money(o.total)));
 li.append(el('div',new Date(o.created_at).toLocaleString('fr-CA')+' · '+o.status,'cm-meta'));
 const ul=el('ul',null,'cm-items');
 o.items.forEach(i=>ul.append(el('li',(i.id)+' — '+i.size+' ×'+i.qty)));li.append(ul);
 if(o.discount)li.append(el('div','Rabais ensemble −'+money(o.discount),'cm-meta'));
 const c=o.customer||{},cu=el('div',null,'cm-cust');
 [c.name,c.email,c.phone,[c.street,c.city,c.postal].filter(Boolean).join(', '),c.note&&('Note : '+c.note)].filter(Boolean).forEach(t=>{cu.append(el('div',t))});
 li.append(cu);
 if(o.notify_pending)li.append(el('div','⚠ Notification Telegram non confirmée'+(o.notify_error?' ('+o.notify_error+')':''),'cm-warn'));
 const row=el('div',null,'cm-row'),sel=el('select');
 statuses.forEach(s=>{const op=el('option',s);op.value=s;if(s===o.status)op.selected=true;sel.append(op)});
 const note=el('input');note.placeholder='Note interne (facultatif)';note.maxLength=500;note.value=o.note||'';
 const ok=el('button','Enregistrer');
 ok.onclick=async()=>{ok.disabled=true;try{await api('orders/'+encodeURIComponent(o.id)+'/status',{method:'POST',body:JSON.stringify({status:sel.value,note:note.value})});await load()}catch(e){alert(e.message)}ok.disabled=false};
 row.append(sel,note,ok);
 const re=el('button','Renvoyer alerte');re.onclick=async()=>{re.disabled=true;try{await api('orders/'+encodeURIComponent(o.id)+'/notify',{method:'POST',body:'{}'});await load()}catch(e){alert(e.message)}re.disabled=false};
 row.append(re);li.append(row);return li;
}
function draw(){
 const f=$('#cm-filters');f.textContent='';
 ['',...statuses].forEach(s=>{const b=el('button',s||'Toutes');b.setAttribute('aria-pressed',String(s===filter));b.onclick=()=>{filter=s;draw()};f.append(b)});
 const list=orders.filter(o=>!filter||o.status===filter),ul=$('#cm-list');ul.textContent='';
 list.forEach(o=>ul.append(card(o)));
 $('#cm-state').textContent=list.length?list.length+' commande(s)':'Aucune commande.';
}
async function load(){
 try{const j=await api('orders');orders=j.orders;statuses=j.statuses;draw()}catch(e){$('#cm-state').textContent=e.message}
}
$('#cm-refresh').onclick=load;load();setInterval(load,60000);
})();
