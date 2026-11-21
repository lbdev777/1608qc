/* 1608 / Administration interne. Aucune donnée secrète : le catalogue est public,
   les saisies (coûts, commandes, notes) restent dans localStorage de ce navigateur. */
(()=>{
'use strict';
const KEY='1608-admin-v1';
const STATUSES=['Demande reçue','Total confirmé','Payé (Interac)','En production','Expédié','Livré','Annulé'];
const SECTIONS=[
 ['apercu','Aperçu','Vue d’ensemble de la boutique et de ton avancement.'],
 ['catalogue','Catalogue','Toutes les pièces, leurs tailles, photos, fiches et guides.'],
 ['marges','Prix & marges','Saisis tes vrais coûts fournisseur : les marges se calculent seules, duo et trio compris.'],
 ['simulateur','Simulateur','Teste un panier : rabais, total et marge estimée.'],
 ['commandes','Commandes','Suivi manuel des demandes reçues par courriel, du premier contact à la livraison.'],
 ['guides','Guides de tailles','Couverture des guides par modèle.'],
 ['lancement','Lancement','Ce qu’il reste à confirmer avant d’ouvrir les commandes.'],
 ['miseenligne','Mise en ligne','Plan pour tout remettre en ligne, étape par étape, sans rien activer à ta place.'],
 ['sante','Santé du site','Analyse automatique des pages, images et liens.'],
 ['activite','Activité GitHub','Derniers changements et branches du dépôt.'],
 ['notes','Notes & sauvegarde','Journal personnel, export et import de tes données.']
];
const LAUNCH=[
 ['interac','Adresse Interac confirmée et ajoutée à la configuration','Dans assets/payment-config.js (adresse publique seulement).'],
 ['orders','Courriel de réception des commandes confirmé','Celui qui reçoit les demandes du formulaire de caisse.'],
 ['lead','Délai de livraison réel confirmé auprès de Tapstitch','À afficher seulement une fois vérifié.'],
 ['ship','Tarifs et seuil de livraison décidés','La caisse annonce « confirmé avant de payer » tant que ce n’est pas fixé.'],
 ['returns','Conditions de retour et d’échange rédigées','Ventes finales / droits légaux : texte validé par toi.'],
 ['costs','Coûts fournisseur saisis pour les 9 modèles','Onglet Prix & marges.'],
 ['margins','Marges vérifiées, duo et trio inclus','Aucun rabais ne doit te faire vendre à perte.'],
 ['sample','Commande test passée chez Tapstitch','Qualité, taille réelle, impression et délai constatés.'],
 ['guides','Guides de tailles validés pour tous les modèles','Données fournisseur uniquement.'],
 ['photos','Photos finales : vraies photos, aucune image générée','Pas de mannequins ni de rendus inventés.'],
 ['phone','Parcours complet testé sur ton vrai téléphone','Panier, caisse, guide de tailles, ajout rapide.'],
 ['browsers','Test Safari et Firefox','Pas encore vérifié.'],
 ['swap','Plan du changement vers 1608qc.com écrit','Qui change quoi, dans quel ordre, et comment revenir en arrière.'],
 ['public','Page d’attente 1608-PUBLIC intacte jusqu’à ton autorisation','Ne rien remplacer sans ton feu vert explicite.'],
 ['admin','admin.html retirée ou protégée avant la mise en ligne publique','Cette page n’a aucune authentification.']
];
const $=(s,r=document)=>r.querySelector(s);const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let P=[];let fmt=c=>(c/100).toFixed(2)+' $';
let db={costs:{},orders:[],checks:{},notes:[],target:''};
function load(){try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');db={costs:d.costs||{},orders:d.orders||[],checks:d.checks||{},notes:d.notes||[],target:d.target||''}}catch(_){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch(_){alert('Impossible d’enregistrer dans ce navigateur (stockage bloqué).')}}
const prod=id=>P.find(p=>p.id===id);
const catName={hoodies:'Cotons ouatés',denim:'Denim',pants:'Pantalons'};
const money=c=>Number.isFinite(c)?fmt(c).replace('.',','):'—';
const toCents=v=>{const n=parseFloat(String(v).replace(',','.'));return Number.isFinite(n)&&n>=0?Math.round(n*100):null};
const unit=id=>{const c=db.costs[id];if(!c||c.cost==null)return null;return {cost:c.cost,ship:c.ship||0}};
function marginAt(p,pct){const u=unit(p.id);if(!u)return null;const price=Math.round(p.price*(1-pct/100));return {amt:price-u.cost-u.ship,pct:price?((price-u.cost-u.ship)/price*100):0,price}}
function calc(lines){return window.STORE_BUNDLE_PRICING.calculate(lines)}
function orderLines(o){const m={};o.items.forEach(i=>m[i.id]=(m[i.id]||0)+i.qty);return Object.entries(m).map(([id,qty])=>({id,qty}))}
function csv(rows,name){const t=rows.map(r=>r.map(c=>'"'+String(c??'').replace(/"/g,'""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+t],{type:'text/csv'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
const dateFr=d=>new Date(d).toLocaleDateString('fr-CA',{year:'numeric',month:'short',day:'numeric'});
const ico=(k,t)=>`<span class="ico ${k}" aria-hidden="true">${t}</span>`;
const bar=(v,max)=>`<div class="bar"><i style="width:${max?Math.min(100,v/max*100):0}%"></i></div>`;
let cache={};
async function getText(u){if(cache[u]!=null)return cache[u];try{const r=await fetch(u,{cache:'no-cache'});cache[u]=r.ok?await r.text():'';}catch(_){cache[u]=''}return cache[u]}
async function guideInfo(){const t=await getText('assets/size-guide-v2.js');return P.map(p=>{const i=t.indexOf("'"+p.id+"':");const has=i>=0;let ref='',type='',rows=0;if(has){const seg=t.slice(i,i+1400);ref=(seg.match(/ref:'([^']+)'/)||[])[1]||'';type=(seg.match(/type:'([^']+)'/)||[])[1]||'';const rs=seg.match(/rows:\[(.*?)\]\s*\}/s);rows=rs?(rs[1].match(/\['/g)||[]).length:0}return {id:p.id,has,ref,type,rows}})}

/* ---------- vues ---------- */
const views={};
views.apercu=async()=>{
 const prices=P.map(p=>p.price);const avg=prices.reduce((a,b)=>a+b,0)/(prices.length||1);
 const cats={};P.forEach(p=>cats[p.category]=(cats[p.category]||0)+1);
 const g=await guideInfo();const gc=g.filter(x=>x.has).length;
 const filled=P.filter(p=>unit(p.id)).length;
 const lp=LAUNCH.filter(([k])=>db.checks[k]).length;
 const ord=db.orders;const byStatus=STATUSES.map(s=>[s,ord.filter(o=>o.status===s).length]);
 const paid=ord.filter(o=>['Payé (Interac)','En production','Expédié','Livré'].includes(o.status));
 const rev=paid.reduce((t,o)=>t+calc(orderLines(o)).total,0);
 let est=0,estN=0;paid.forEach(o=>{const c=calc(orderLines(o));let cost=0,ok=true;o.items.forEach(i=>{const u=unit(i.id);if(!u)ok=false;else cost+=(u.cost+u.ship)*i.qty});if(ok){est+=c.total-cost;estN++}});
 const pay=window.STORE_MANUAL_PAYMENT||{};
 return `<div class="grid g4">
 <div class="card kpi"><b>${P.length}</b><span>modèles au catalogue</span></div>
 <div class="card kpi"><b>${money(avg)}</b><span>prix moyen · de ${money(Math.min(...prices))} à ${money(Math.max(...prices))}</span></div>
 <div class="card kpi"><b>${lp}/${LAUNCH.length}</b><span>étapes de lancement cochées</span>${bar(lp,LAUNCH.length)}</div>
 <div class="card kpi"><b>${ord.length}</b><span>commandes suivies (local) · ${paid.length} payées</span></div></div>
 <div class="grid g2" style="margin-top:14px">
 <div class="card"><h2>Paiement et commandes</h2>
  <div class="row"><span>Paiement par la boutique</span><span class="tag ${pay.enabled?'ok':'bad'}">${pay.enabled?'ACTIVÉ':'DÉSACTIVÉ'}</span></div>
  <div class="row"><span>Adresse Interac</span><span class="tag ${pay.interacEmail?'ok':'warn'}">${pay.interacEmail?'configurée':'à configurer'}</span></div>
  <div class="row"><span>Courriel des commandes</span><span class="tag ${pay.ordersEmail?'ok':'warn'}">${pay.ordersEmail?'configuré':'à configurer'}</span></div>
  <p class="small muted">La caisse prépare un brouillon de courriel : ce n’est pas encore un vrai système de commande. Rien n’est activé sans ton autorisation.</p></div>
 <div class="card"><h2>Données financières (tes saisies)</h2>
  <div class="row"><span>Coûts saisis</span><b>${filled}/${P.length} modèles</b></div>
  <div class="row"><span>Revenu des commandes payées</span><b>${money(rev)}</b></div>
  <div class="row"><span>Marge estimée (commandes dont les coûts sont connus)</span><b>${estN?money(est):'—'}</b></div>
  <p class="small muted">Avant taxes et frais de livraison. Rien n’est calculé tant que tu n’as pas entré tes coûts réels.</p></div>
 <div class="card"><h2>Catalogue par catégorie</h2>${Object.entries(cats).map(([c,n])=>`<div class="row"><span>${esc(catName[c]||c)}</span><b>${n}</b></div>`).join('')}
  <div class="row"><span>Guides de tailles</span><b>${gc}/${P.length}</b></div></div>
 <div class="card"><h2>Commandes par statut</h2>${byStatus.map(([s,n])=>`<div class="row"><span>${esc(s)}</span><b>${n}</b></div>`).join('')}</div></div>
 <div class="card" style="margin-top:14px"><h2>Prix des modèles</h2>${P.slice().sort((a,b)=>b.price-a.price).map(p=>`<div class="row"><span style="min-width:150px">${esc(p.name)} <span class="muted small">${esc(p.variant)}</span></span><span style="flex:1;margin:0 14px">${bar(p.price,Math.max(...prices))}</span><b>${money(p.price)}</b></div>`).join('')}</div>`;
};

views.catalogue=async()=>{
 const g=await guideInfo();const v3=(await getText('assets/view360.js')).replace(/\/\*[\s\S]*?\*\//g,'');
 const has360=id=>new RegExp("'"+id+"'\\s*:\\s*\\{\\s*frames").test(v3);
 const rows=P.map(p=>{const gi=g.find(x=>x.id===p.id);return `<tr data-id="${p.id}"><td><img class="thumb" src="${esc(p.photos[0])}" alt=""></td><td><b>${esc(p.name)}</b> ${p.isNew?'<span class="tag new">NOUVEAU</span>':''}<br><span class="muted small">${esc(p.variant)}</span></td><td>${esc(catName[p.category]||p.category)}</td><td>${esc(p.ref||'—')}</td><td class="num">${money(p.price)}</td><td>${p.sizes.join(' · ')}</td><td>${p.photos.length}</td><td>${gi.has?'<span class="tag ok">oui</span>':'<span class="tag bad">non</span>'}</td><td>${has360(p.id)?'<span class="tag ok">360° réel</span>':'<span class="tag warn">devant / dos</span>'}</td><td><button class="adm-btn ghost sm" data-detail="${p.id}">Détails</button> <a class="adm-btn ghost sm" style="text-decoration:none;display:inline-flex;align-items:center" href="produit-${p.id}.html" target="_blank" rel="noopener">Fiche ↗</a></td></tr>`}).join('');
 return `<div class="tools"><input type="search" placeholder="Rechercher un modèle…" data-search aria-label="Rechercher"><select data-cat aria-label="Catégorie"><option value="">Toutes les catégories</option>${Object.entries(catName).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><button class="adm-btn ghost" data-csv-cat>Exporter CSV</button></div>
 <div class="tbl-wrap"><table data-cattable><thead><tr><th></th><th>Modèle</th><th>Catégorie</th><th>Réf. fournisseur</th><th class="num">Prix</th><th>Tailles</th><th>Photos</th><th>Guide</th><th>Vue 3D</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
 <dialog data-dlg></dialog>`;
};
views.catalogue.bind=root=>{
 const filt=()=>{const q=$('[data-search]',root).value.toLowerCase(),c=$('[data-cat]',root).value;$$('tbody tr',root).forEach(tr=>{const p=prod(tr.dataset.id);tr.hidden=!((!c||p.category===c)&&(!q||(p.name+p.variant+p.ref).toLowerCase().includes(q)))})};
 $('[data-search]',root).addEventListener('input',filt);$('[data-cat]',root).addEventListener('change',filt);
 $('[data-csv-cat]',root).addEventListener('click',()=>csv([['id','nom','variante','catégorie','réf fournisseur','prix $','tailles','coupe','matière']].concat(P.map(p=>[p.id,p.name,p.variant,p.category,p.ref,(p.price/100).toFixed(2),p.sizes.join('/'),p.fit,p.material])),'catalogue-1608.csv'));
 root.addEventListener('click',e=>{const b=e.target.closest('[data-detail]');if(!b)return;const p=prod(b.dataset.detail);const d=$('[data-dlg]',root);
  d.innerHTML=`<div class="dlg"><button class="adm-btn ghost sm dlg-close" data-x>Fermer ✕</button><h2>${esc(p.name)}</h2><p class="muted">${esc(p.variant)} · ${esc(p.fit)} · ${esc(p.material)}</p><div class="photos">${p.photos.map(s=>`<img src="${esc(s)}" alt="">`).join('')}</div><p>${esc(p.description)}</p><ul>${(p.features||[]).map(f=>`<li>${esc(f)}</li>`).join('')}</ul><div class="row"><span>Prix</span><b>${money(p.price)}</b></div><div class="row"><span>Référence fournisseur</span><b>${esc(p.ref||'—')}</b></div><div class="row"><span>Tailles</span><b>${p.sizes.join(', ')}</b></div><div class="row"><span>Identifiant</span><code>${esc(p.id)}</code></div></div>`;
  d.showModal();d.querySelector('[data-x]').onclick=()=>d.close()});
};

views.marges=async()=>{
 const rows=P.map(p=>{const c=db.costs[p.id]||{};const m0=marginAt(p,0),m10=marginAt(p,10),m15=marginAt(p,15);
  const cell=m=>m?`<span class="${m.amt<0?'tag bad':''}">${money(m.amt)} <span class="muted small">(${m.pct.toFixed(0)} %)</span></span>`:'—';
  const minp=db.target&&unit(p.id)?Math.ceil((unit(p.id).cost+unit(p.id).ship)/(1-Number(db.target)/100)):null;
  return `<tr><td><b>${esc(p.name)}</b></td><td class="num">${money(p.price)}</td><td class="num"><input type="number" min="0" step="0.01" data-cost="${p.id}" value="${c.cost!=null?(c.cost/100).toFixed(2):''}" placeholder="0,00" aria-label="Coût ${esc(p.name)}"></td><td class="num"><input type="number" min="0" step="0.01" data-ship="${p.id}" value="${c.ship?(c.ship/100).toFixed(2):''}" placeholder="0,00" aria-label="Livraison ${esc(p.name)}"></td><td class="num">${cell(m0)}</td><td class="num">${cell(m10)}</td><td class="num">${cell(m15)}</td><td class="num">${minp?money(minp):'—'}</td></tr>`}).join('');
 const filled=P.filter(p=>unit(p.id));const avg=filled.length?filled.reduce((t,p)=>t+marginAt(p,0).pct,0)/filled.length:null;
 const losing=P.filter(p=>unit(p.id)&&marginAt(p,15).amt<0);
 return `<div class="card" style="margin-bottom:14px"><p style="margin:0"><b>Rien n’est pré-rempli.</b> Entre ce que Tapstitch te facture réellement par pièce (produit + impression) et, si tu les paies, les frais d’expédition par pièce. Montants en dollars canadiens, avant taxes. Ces valeurs restent dans ton navigateur.</p></div>
 <div class="grid g3" style="margin-bottom:14px"><div class="card kpi"><b>${filled.length}/${P.length}</b><span>modèles avec coûts saisis</span></div><div class="card kpi"><b>${avg==null?'—':avg.toFixed(0)+' %'}</b><span>marge moyenne au plein prix</span></div><div class="card kpi"><b>${losing.length}</b><span>modèle(s) à perte avec −15 %</span>${losing.length?`<span class="tag bad">${esc(losing.map(p=>p.name).join(', '))}</span>`:''}</div></div>
 <div class="tools"><label class="small">Marge visée (%) <input type="number" min="0" max="95" step="1" data-target value="${esc(db.target)}" style="width:80px" placeholder="—"></label><button class="adm-btn ghost" data-csv-m>Exporter CSV</button></div>
 <div class="tbl-wrap"><table><thead><tr><th>Modèle</th><th class="num">Prix</th><th class="num">Coût fournisseur $</th><th class="num">Livraison / pièce $</th><th class="num">Marge plein prix</th><th class="num">Marge duo −10 %</th><th class="num">Marge trio / uniforme −15 %</th><th class="num">Prix min. pour la marge visée</th></tr></thead><tbody>${rows}</tbody></table></div>
 <p class="small muted">Marge = prix après rabais − coût − livraison. Le « prix minimum » apparaît quand tu fixes une marge visée.</p>`;
};
views.marges.bind=root=>{
 const refresh=()=>{save();route(true)};
 root.addEventListener('change',e=>{const t=e.target;
  if(t.dataset.cost){const c=db.costs[t.dataset.cost]=db.costs[t.dataset.cost]||{};c.cost=toCents(t.value);if(c.cost==null)delete c.cost;refresh()}
  else if(t.dataset.ship){const c=db.costs[t.dataset.ship]=db.costs[t.dataset.ship]||{};c.ship=toCents(t.value)||0;refresh()}
  else if('target' in t.dataset){db.target=t.value;refresh()}});
 $('[data-csv-m]',root).addEventListener('click',()=>csv([['modèle','prix','coût','livraison','marge plein prix','marge duo','marge trio']].concat(P.map(p=>{const a=marginAt(p,0),b=marginAt(p,10),c=marginAt(p,15),u=unit(p.id)||{};return [p.name,(p.price/100).toFixed(2),u.cost!=null?(u.cost/100).toFixed(2):'',u.ship?(u.ship/100).toFixed(2):'',a?(a.amt/100).toFixed(2):'',b?(b.amt/100).toFixed(2):'',c?(c.amt/100).toFixed(2):'']})),'marges-1608.csv'));
};

views.simulateur=async()=>{
 return `<div class="grid g2"><div class="card"><h2>Panier simulé</h2><div class="tools"><select data-sim-add aria-label="Ajouter un modèle"><option value="">+ Ajouter un modèle…</option>${P.map(p=>`<option value="${p.id}">${esc(p.name)} — ${money(p.price)}</option>`).join('')}</select><button class="adm-btn ghost sm" data-sim-clear>Vider</button></div><div data-sim-lines></div></div>
 <div class="card"><h2>Résultat</h2><div data-sim-out></div><p class="small muted">Règles du site : 2 modèles différents −10 %, 3 ou plus −15 %, UNIFORME ZIP + JOGGER −15 %. Les rabais ne se cumulent pas. Taxes et livraison en sus.</p></div></div>`;
};
views.simulateur.bind=root=>{
 let lines=[];
 const draw=()=>{
  $('[data-sim-lines]',root).innerHTML=lines.length?lines.map((l,i)=>`<div class="row"><span>${esc(prod(l.id).name)}</span><span><input type="number" min="1" max="10" value="${l.qty}" data-q="${i}" style="width:64px"> <button class="adm-btn danger sm" data-rm="${i}" aria-label="Retirer">✕</button></span></div>`).join(''):'<p class="muted">Ajoute des modèles pour simuler.</p>';
  const out=$('[data-sim-out]',root);if(!lines.length){out.innerHTML='<p class="muted">—</p>';return}
  const c=calc(lines);let cost=0,ok=true;lines.forEach(l=>{const u=unit(l.id);if(!u)ok=false;else cost+=(u.cost+u.ship)*l.qty});
  out.innerHTML=`<div class="row"><span>Sous-total</span><b>${money(c.subtotal)}</b></div><div class="row"><span>Rabais (${c.percent} %)</span><b>−${money(c.discount)}</b></div><div class="row"><span>Total des articles</span><b style="font-size:20px">${money(c.total)}</b></div><div class="row"><span>Modèles différents</span><b>${c.models}</b></div><div class="row"><span>Marge estimée</span><b>${ok?money(c.total-cost)+' ('+(c.total?((c.total-cost)/c.total*100).toFixed(0):0)+' %)':'saisis tes coûts'}</b></div>`};
 root.addEventListener('change',e=>{const t=e.target;if(t.dataset.simAdd!==undefined&&t.value){const f=lines.find(l=>l.id===t.value);if(f)f.qty=Math.min(10,f.qty+1);else lines.push({id:t.value,qty:1});t.value='';draw()}else if(t.dataset.q!==undefined){lines[+t.dataset.q].qty=Math.max(1,Math.min(10,parseInt(t.value)||1));draw()}});
 root.addEventListener('click',e=>{const r=e.target.closest('[data-rm]');if(r){lines.splice(+r.dataset.rm,1);draw()}if(e.target.closest('[data-sim-clear]')){lines=[];draw()}});
 draw();
};

views.commandes=async()=>{
 const opts=P.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
 const list=db.orders.slice().sort((a,b)=>b.date.localeCompare(a.date));
 const tbl=list.length?`<div class="tbl-wrap"><table><thead><tr><th>N°</th><th>Date</th><th>Client</th><th>Articles</th><th class="num">Total articles</th><th>Statut</th><th></th></tr></thead><tbody>${list.map(o=>{const c=calc(orderLines(o));return `<tr data-o="${o.id}"><td><b>${esc(o.id)}</b></td><td>${dateFr(o.date)}</td><td>${esc(o.client)}<br><span class="muted small">${esc(o.contact||'')}${o.city?' · '+esc(o.city):''}</span></td><td>${o.items.map(i=>`${esc(prod(i.id)?.name||i.id)} ${esc(i.size)} ×${i.qty}`).join('<br>')}</td><td class="num">${money(c.total)}${c.discount?`<br><span class="muted small">rabais −${money(c.discount)}</span>`:''}</td><td><select data-status="${o.id}">${STATUSES.map(s=>`<option ${s===o.status?'selected':''}>${s}</option>`).join('')}</select></td><td>${/^\S+@\S+\.\S+$/.test(o.contact||'')?`<a class="adm-btn ghost sm" style="text-decoration:none;display:inline-flex;align-items:center" href="mailto:${esc(o.contact)}?subject=${encodeURIComponent('1608 — commande '+o.id)}">Écrire</a> `:''}<button class="adm-btn ghost sm" data-edit="${o.id}">Modifier</button> <button class="adm-btn danger sm" data-del="${o.id}">Supprimer</button></td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">Aucune commande suivie. Ajoute chaque demande reçue par courriel pour suivre le paiement, la production et l’envoi.</div>';
 const oe=(window.STORE_MANUAL_PAYMENT||{}).ordersEmail||'';
 return `<div class="card" style="margin-bottom:14px">${oe?`<p style="margin:0 0 8px">Les demandes de la caisse arriveront à <b>${esc(oe)}</b> <button class="adm-btn ghost sm" data-copy="${esc(oe)}">Copier</button></p>`:''}<p style="margin:0">La caisse ne crée pas encore de vraie commande : elle ouvre un brouillon de courriel. Ce tableau est ton <b>registre manuel</b>, enregistré dans ce navigateur seulement (sauvegarde-le avec l’export).</p></div>
 <div class="tools"><button class="adm-btn" data-new>+ Nouvelle commande</button><button class="adm-btn ghost" data-from-cart>Créer depuis mon panier</button><select data-ofilter aria-label="Filtrer par statut"><option value="">Tous les statuts</option>${STATUSES.map(s=>`<option>${s}</option>`).join('')}</select><button class="adm-btn ghost" data-csv-o>Exporter CSV</button></div>
 <div class="steps" aria-label="Étapes">${STATUSES.slice(0,6).map(s=>`<span>${s}</span>`).join('')}</div><br>${tbl}
 <dialog data-odlg></dialog><template data-opts>${opts}</template>`;
};
views.commandes.bind=root=>{
 const nextId=()=>{const y=new Date().getFullYear();const n=db.orders.filter(o=>o.id.startsWith('C'+y)).length+1;return 'C'+y+'-'+String(n).padStart(3,'0')};
 const sizesFor=id=>(prod(id)?.sizes)||[];
 const open=o=>{const d=$('[data-odlg]',root);const cur=o||{id:nextId(),date:new Date().toISOString(),client:'',contact:'',city:'',items:[{id:P[0].id,size:P[0].sizes[0],qty:1}],status:STATUSES[0],note:'',tracking:''};
  const items=cur.items.map(i=>({...i}));
  const render=()=>{d.innerHTML=`<form class="dlg" method="dialog"><button type="button" class="adm-btn ghost sm dlg-close" data-x>Fermer ✕</button><h2>${o?'Modifier':'Nouvelle'} commande ${esc(cur.id)}</h2>
  <div class="grid g2"><div class="field"><label>Client</label><input type="text" name="client" value="${esc(cur.client)}" required></div><div class="field"><label>Courriel ou téléphone</label><input type="text" name="contact" value="${esc(cur.contact)}"></div><div class="field"><label>Ville</label><input type="text" name="city" value="${esc(cur.city)}"></div><div class="field"><label>Statut</label><select name="status">${STATUSES.map(s=>`<option ${s===cur.status?'selected':''}>${s}</option>`).join('')}</select></div></div>
  <h3 style="margin:8px 0">Articles</h3>${items.map((it,i)=>`<div class="row"><select data-i="${i}" data-f="id">${P.map(p=>`<option value="${p.id}" ${p.id===it.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select><select data-i="${i}" data-f="size">${sizesFor(it.id).map(z=>`<option ${z===it.size?'selected':''}>${z}</option>`).join('')}</select><input type="number" min="1" max="10" value="${it.qty}" data-i="${i}" data-f="qty" style="width:64px"><button type="button" class="adm-btn danger sm" data-rmi="${i}">✕</button></div>`).join('')}
  <p><button type="button" class="adm-btn ghost sm" data-addi>+ Ajouter un article</button></p>
  <div class="field"><label>Suivi d’envoi</label><input type="text" name="tracking" value="${esc(cur.tracking||'')}"></div><div class="field"><label>Notes</label><textarea name="note">${esc(cur.note||'')}</textarea></div>
  <div class="row"><span>Total des articles</span><b>${money(calc(orderLines({items})).total)}</b></div><p class="small muted">Taxes et livraison confirmées avec le client, hors de ce calcul.</p>
  <button class="adm-btn" value="ok">Enregistrer</button></form>`;
  const f=d.querySelector('form');d.querySelector('[data-x]').onclick=()=>d.close();
  f.addEventListener('change',e=>{const t=e.target;if(t.dataset.f){const it=items[+t.dataset.i];if(t.dataset.f==='qty')it.qty=Math.max(1,Math.min(10,parseInt(t.value)||1));else{it[t.dataset.f]=t.value;if(t.dataset.f==='id')it.size=sizesFor(t.value)[0]}keep();render()}});
  f.addEventListener('click',e=>{if(e.target.dataset.addi!==undefined){keep();items.push({id:P[0].id,size:P[0].sizes[0],qty:1});render()}const r=e.target.closest('[data-rmi]');if(r&&items.length>1){keep();items.splice(+r.dataset.rmi,1);render()}});
  f.addEventListener('submit',e=>{keep();const fd=new FormData(f);const rec={...cur,client:fd.get('client').trim(),contact:fd.get('contact').trim(),city:fd.get('city').trim(),status:fd.get('status'),tracking:fd.get('tracking').trim(),note:fd.get('note').trim(),items};
   const i=db.orders.findIndex(x=>x.id===rec.id);if(i>=0)db.orders[i]=rec;else db.orders.push(rec);save();route(true)});
  function keep(){const fd=new FormData(f);['client','contact','city','status','tracking','note'].forEach(k=>cur[k]=fd.get(k)??cur[k])}};
  render();d.showModal()};
 root.addEventListener('click',e=>{
  const cp=e.target.closest('[data-copy]');if(cp){navigator.clipboard?.writeText(cp.dataset.copy).then(()=>{cp.textContent='Copié ✓'});return}
  if(e.target.closest('[data-new]'))open();
  const ed=e.target.closest('[data-edit]');if(ed)open(db.orders.find(o=>o.id===ed.dataset.edit));
  const del=e.target.closest('[data-del]');if(del&&confirm('Supprimer cette commande du registre ?')){db.orders=db.orders.filter(o=>o.id!==del.dataset.del);save();route(true)}
  if(e.target.closest('[data-from-cart]')){let c=[];try{c=JSON.parse(localStorage.getItem('1608-cart-v2')||'[]')}catch(_){}c=c.filter(i=>prod(i.id));if(!c.length){alert('Ton panier de ce navigateur est vide. Ajoute des pièces depuis la boutique d’abord.');return}
   db.orders.push({id:nextId(),date:new Date().toISOString(),client:'(à compléter)',contact:'',city:'',items:c.map(i=>({id:i.id,size:i.size,qty:i.qty})),status:STATUSES[0],note:'Créée depuis le panier du navigateur.',tracking:''});save();route(true)}
  if(e.target.closest('[data-csv-o]'))csv([['n°','date','client','contact','ville','articles','total articles $','statut','suivi','notes']].concat(db.orders.map(o=>[o.id,o.date,o.client,o.contact,o.city,o.items.map(i=>`${prod(i.id)?.name||i.id} ${i.size} x${i.qty}`).join(' | '),(calc(orderLines(o)).total/100).toFixed(2),o.status,o.tracking,o.note])),'commandes-1608.csv')});
 root.addEventListener('change',e=>{const t=e.target;if(t.dataset.status){const o=db.orders.find(x=>x.id===t.dataset.status);o.status=t.value;save();route(true)}
  if(t.dataset.ofilter!==undefined){$$('tbody tr',root).forEach(tr=>{const o=db.orders.find(x=>x.id===tr.dataset.o);tr.hidden=!!t.value&&o.status!==t.value})}});
};

views.guides=async()=>{
 const g=await guideInfo();const n=g.filter(x=>x.has).length;
 return `<div class="grid g3" style="margin-bottom:14px"><div class="card kpi"><b>${n}/${P.length}</b><span>modèles avec un guide de tailles</span>${bar(n,P.length)}</div></div>
 <div class="tbl-wrap"><table><thead><tr><th>Modèle</th><th>Réf. fournisseur</th><th>Tailles vendues</th><th>Guide</th><th>Type de schéma</th><th class="num">Lignes de tailles</th><th>Cohérence</th></tr></thead><tbody>${g.map(x=>{const p=prod(x.id);const okRows=x.rows===p.sizes.length;return `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.ref||'—')}${x.ref&&x.ref!==p.ref?` <span class="tag warn">guide : ${esc(x.ref)}</span>`:''}</td><td>${p.sizes.join(' · ')}</td><td>${x.has?'<span class="tag ok">présent</span>':'<span class="tag bad">manquant</span>'}</td><td>${esc(x.type||'—')}</td><td class="num">${x.has?x.rows:'—'}</td><td>${!x.has?'—':okRows?'<span class="tag ok">tailles alignées</span>':'<span class="tag warn">à vérifier</span>'}</td></tr>`}).join('')}</tbody></table></div>
 <p class="small muted">Les mesures proviennent des fiches Tapstitch fournies. Elles ne sont jamais reprises d’un autre modèle. Écart d’usage annoncé : 1 à 3 cm.</p>`;
};

views.lancement=async()=>{
 const pay=window.STORE_MANUAL_PAYMENT||{};const g=await guideInfo();
 const auto=[
  [!!pay.interacEmail,'Adresse Interac dans la configuration publique'],
  [!!pay.ordersEmail,'Courriel des commandes dans la configuration publique'],
  [pay.enabled===true,'Paiement activé (ne l’active que sur ton feu vert)'],
  [g.every(x=>x.has),'Un guide de tailles pour chaque modèle'],
  [P.every(p=>unit(p.id)),'Coûts saisis pour tous les modèles']];
 const done=LAUNCH.filter(([k])=>db.checks[k]).length;
 return `<div class="grid g2"><div class="card"><h2>Détectées automatiquement</h2>${auto.map(([ok,t])=>`<div class="row"><span>${ok?ico('ok','✓'):ico('idle','–')} ${esc(t)}</span><span class="tag ${ok?'ok':'warn'}">${ok?'fait':'à faire'}</span></div>`).join('')}</div>
 <div class="card kpi"><b>${done}/${LAUNCH.length}</b><span>étapes cochées par toi</span>${bar(done,LAUNCH.length)}<p class="small muted" style="margin-top:12px">Aucune étape n’est cochée à ta place. Les points d’argent, de livraison et de retours dépendent de tes décisions et de ton fournisseur.</p></div></div>
 <div class="card" style="margin-top:14px"><h2>Check-list de lancement</h2>${LAUNCH.map(([k,t,s])=>`<label class="chk"><input type="checkbox" data-chk="${k}" ${db.checks[k]?'checked':''}><span><b>${esc(t)}</b><small>${esc(s)}</small></span></label>`).join('')}</div>
 <div class="card" style="margin-top:14px"><h2>Règles du dossier de transfert</h2><ul style="margin:0;padding-left:18px"><li>Toutes les modifications de la boutique vont sur <code>boutique-preview</code>.</li><li>Ne jamais remplacer la page d’attente (<code>1608-PUBLIC</code>) sans autorisation explicite.</li><li>Ne pas activer le checkout sans configuration marchande confirmée.</li><li>Aucune adresse Interac, courriel, coût, marge, délai ou condition inventés.</li><li>Aucune clé secrète, mot de passe ou jeton dans les fichiers publics.</li><li>Pas de faux compteurs, faux avis ni fausse rareté. Vraies photos seulement.</li></ul></div>`;
};
views.lancement.bind=root=>root.addEventListener('change',e=>{const k=e.target.dataset.chk;if(k){db.checks[k]=e.target.checked;save();route(true)}});

views.miseenligne=async()=>{
 const pay=window.STORE_MANUAL_PAYMENT||{};const g=await guideInfo();
 const [idx,co]=await Promise.all([getText('index.html'),getText('checkout.html')]);
 const pre=[
  [!!pay.interacEmail,'Adresse Interac configurée ('+(pay.interacEmail||'—')+')'],
  [!!pay.ordersEmail,'Courriel de réception des commandes configuré'],
  [g.every(x=>x.has),'Guides de tailles pour les '+P.length+' modèles'],
  [P.every(p=>unit(p.id)),'Coûts fournisseur saisis (onglet Prix & marges)'],
  [!!db.checks.lead,'Délai de livraison confirmé (étape cochée)'],
  [!!db.checks.returns,'Conditions de retour validées (étape cochée)'],
  [!!db.checks.sample,'Commande test Tapstitch passée (étape cochée)'],
  [!!db.checks.admin,'admin.html retirée ou protégée (étape cochée)']];
 const ready=pre.filter(x=>x[0]).length;
 return `<div class="grid g2"><div class="card kpi"><b>${ready}/${pre.length}</b><span>vérifications prêtes</span>${bar(ready,pre.length)}<p class="small muted" style="margin-top:12px">Le paiement reste <b>${pay.enabled?'activé':'désactivé'}</b> (<code>enabled: ${!!pay.enabled}</code>). Il ne sera activé qu’avec ton feu vert explicite.</p></div>
 <div class="card"><h2>Avant de commencer</h2>${pre.map(([ok,t])=>`<div class="row"><span>${ok?ico('ok','✓'):ico('idle','–')} ${esc(t)}</span><span class="tag ${ok?'ok':'warn'}">${ok?'prêt':'à faire'}</span></div>`).join('')}</div></div>
 <div class="card" style="margin-top:14px"><h2>Plan de mise en ligne</h2><p class="small muted">Rien de ceci n’est exécuté par cette page. Chaque étape demande ton autorisation.</p>
 <ol style="margin:0;padding-left:20px;line-height:1.7">
 <li><b>Geler la version.</b> Choisir le dernier commit de <code>boutique-preview</code> à publier et le noter ici (Notes).</li>
 <li><b>Tester sur github.io.</b> Téléphone réel, Safari et Firefox : accueil, fiche, guide de tailles, ajout rapide, panier, caisse (brouillon de courriel).</li>
 <li><b>Envoyer un courriel test</b> depuis la caisse vers l’adresse des commandes et vérifier la réception. <a class="adm-btn ghost sm" style="text-decoration:none;display:inline-flex" href="mailto:${esc(pay.ordersEmail||'')}?subject=${encodeURIComponent('1608 — test de réception')}">Écrire à l’adresse des commandes</a></li>
 <li><b>Retirer ou protéger <code>admin.html</code></b> avant que le dépôt serve le domaine public.</li>
 <li><b>Sauvegarder la page d’attente actuelle</b> (<code>1608-PUBLIC</code>) : ne rien y modifier, noter son dernier commit pour pouvoir y revenir.</li>
 <li><b>Basculer le domaine</b> 1608qc.com vers la boutique (réglages Pages / DNS). Seulement avec ton autorisation explicite.</li>
 <li><b>Vérifier en ligne</b> avec l’onglet Santé du site, puis activer le paiement dans <code>payment-config.js</code> seulement une fois tout confirmé.</li>
 <li><b>Retour arrière prévu :</b> remettre le domaine sur <code>1608-PUBLIC</code> (la page d’attente reste intacte). Aucune perte : les commandes viennent par courriel.</li></ol></div>
 <div class="card" style="margin-top:14px"><h2>État de la configuration publique</h2>
  <div class="row"><span>Mention « aperçu » dans la caisse</span><span class="tag ${/aperçu|apercu|configurer/i.test(co)?'warn':'ok'}">${/aperçu|apercu|configurer/i.test(co)?'encore affichée':'retirée'}</span></div>
  <div class="row"><span>Bandeau « commandes pas encore ouvertes » (en-tête, toutes les pages)</span><span class="tag warn">à retirer à l’ouverture</span></div>
  <p class="small muted">À l’ouverture, il faudra aussi retirer ces mentions d’aperçu : je le fais à ta demande, en même temps que l’activation.</p></div>`;
};
views.sante=async()=>`<div class="tools"><button class="adm-btn" data-run>Lancer l’analyse</button><span class="muted small" data-prog></span></div><div data-res><div class="empty">L’analyse charge chaque page, vérifie les titres, descriptions, images, liens et le poids des photos. Elle ne modifie rien.</div></div>`;
views.sante.bind=root=>{
 $('[data-run]',root).addEventListener('click',async e=>{
  const btn=e.currentTarget;btn.disabled=true;const prog=$('[data-prog]',root),res=$('[data-res]',root);cache={};
  const pages=['index.html','checkout.html',...P.map(p=>`produit-${p.id}.html`),'produit.html'];
  const rows=[];const linkSet=new Set();let done=0;
  for(const u of pages){prog.textContent=`Pages ${++done}/${pages.length}…`;
   try{const r=await fetch(u,{cache:'no-cache'});const txt=r.ok?await r.text():'';const doc=new DOMParser().parseFromString(txt,'text/html');
    const t=(doc.title||'').trim(),md=doc.querySelector('meta[name=description]')?.content||'';
    const noalt=$$('img',doc).filter(i=>!i.hasAttribute('alt')).length;
    $$('a[href],link[href],script[src]',doc).forEach(a=>{const h=a.getAttribute('href')||a.getAttribute('src');if(h&&!/^(#|mailto:|tel:|https?:|javascript:|data:)/.test(h))linkSet.add(h.split('#')[0].split('?')[0])});
    rows.push({u,status:r.status,kb:Math.round(txt.length/1024),t,md,h1:$$('h1',doc).length,noalt,canon:!!doc.querySelector('link[rel=canonical]')})}
   catch(_){rows.push({u,status:0,kb:0,t:'',md:'',h1:0,noalt:0})}}
  const links=[...linkSet].filter(Boolean);const broken=[];let li=0;
  for(const l of links){prog.textContent=`Ressources ${++li}/${links.length}…`;try{const r=await fetch(l,{method:'HEAD',cache:'no-cache'});if(!r.ok)broken.push(l)}catch(_){broken.push(l)}}
  const imgs=[...new Set(P.flatMap(p=>p.photos))];const big=[];const miss=[];let ii=0,total=0;
  for(const s of imgs){prog.textContent=`Photos ${++ii}/${imgs.length}…`;try{const r=await fetch(s,{method:'HEAD',cache:'no-cache'});if(!r.ok)miss.push(s);else{const k=Math.round((+r.headers.get('content-length')||0)/1024);total+=k;if(k>350)big.push(s+' ('+k+' Ko)')}}catch(_){miss.push(s)}}
  const issues=rows.filter(r=>r.status!==200||!r.t||!r.md||r.noalt).length+broken.length+miss.length;
  res.innerHTML=`<div class="grid g4" style="margin-bottom:14px"><div class="card kpi"><b>${rows.filter(r=>r.status===200).length}/${rows.length}</b><span>pages accessibles</span></div><div class="card kpi"><b>${links.length-broken.length}/${links.length}</b><span>ressources internes trouvées</span></div><div class="card kpi"><b>${imgs.length-miss.length}/${imgs.length}</b><span>photos de produits présentes · ${total} Ko</span></div><div class="card kpi"><b>${issues}</b><span>point(s) à regarder</span></div></div>
  ${broken.length?`<div class="card" style="margin-bottom:14px"><h2>Ressources introuvables</h2>${broken.map(b=>`<div class="row"><code>${esc(b)}</code><span class="tag bad">404</span></div>`).join('')}</div>`:''}
  ${miss.length?`<div class="card" style="margin-bottom:14px"><h2>Photos manquantes</h2>${miss.map(b=>`<div class="row"><code>${esc(b)}</code></div>`).join('')}</div>`:''}
  ${big.length?`<div class="card" style="margin-bottom:14px"><h2>Photos lourdes (> 350 Ko)</h2>${big.map(b=>`<div class="row"><code>${esc(b)}</code><span class="tag warn">à compresser</span></div>`).join('')}</div>`:''}
  <div class="tbl-wrap"><table><thead><tr><th>Page</th><th>HTTP</th><th class="num">Ko</th><th>Titre</th><th>Description</th><th class="num">H1</th><th class="num">Images sans alt</th><th>Canonique</th></tr></thead><tbody>${rows.map(r=>`<tr><td><a href="${esc(r.u)}" target="_blank" rel="noopener">${esc(r.u)}</a></td><td><span class="tag ${r.status===200?'ok':'bad'}">${r.status||'erreur'}</span></td><td class="num">${r.kb}</td><td>${r.t?esc(r.t.slice(0,48))+(r.t.length>48?'…':''):'<span class="tag bad">absent</span>'}</td><td>${r.md?'<span class="tag ok">oui</span>':'<span class="tag warn">absente</span>'}</td><td class="num">${r.h1}</td><td class="num">${r.noalt?`<span class="tag bad">${r.noalt}</span>`:'0'}</td><td>${r.canon?'oui':'—'}</td></tr>`).join('')}</tbody></table></div>
  <p class="small muted">Analyse du ${new Date().toLocaleString('fr-CA')}. Les pages produit sont remplies par JavaScript : leur contenu détaillé n’est pas lu ici, seulement le gabarit.</p>`;
  prog.textContent='';btn.disabled=false})};

views.activite=async()=>`<div class="tools"><button class="adm-btn" data-gh>Charger l’activité GitHub</button><span class="muted small">Dépôt public lbdev777/1608qc · lecture seule, sans identifiant.</span></div><div data-gh-out><div class="empty">Clique pour afficher les derniers changements de la branche <code>boutique-preview</code>.</div></div>`;
views.activite.bind=root=>$('[data-gh]',root).addEventListener('click',async()=>{
 const out=$('[data-gh-out]',root);out.innerHTML='<p class="muted">Chargement…</p>';
 try{const [c,b]=await Promise.all([fetch('https://api.github.com/repos/lbdev777/1608qc/commits?sha=boutique-preview&per_page=20').then(r=>{if(!r.ok)throw new Error(r.status);return r.json()}),fetch('https://api.github.com/repos/lbdev777/1608qc/branches').then(r=>r.ok?r.json():[])]);
  out.innerHTML=`<div class="grid g2"><div class="card"><h2>Branches</h2>${b.map(x=>`<div class="row"><code>${esc(x.name)}</code>${x.name==='boutique-preview'?'<span class="tag ok">branche de travail</span>':x.name==='main'?'<span class="tag warn">ancienne page d’attente</span>':''}</div>`).join('')||'<p class="muted">—</p>'}</div><div class="card kpi"><b>${c.length}</b><span>derniers commits chargés</span></div></div><div class="card" style="margin-top:14px"><h2>Derniers changements</h2>${c.map(x=>`<div class="ln"><time>${dateFr(x.commit.author.date)}</time><div><b>${esc(x.commit.message.split('\n')[0])}</b><br><span class="muted small"><code>${esc(x.sha.slice(0,7))}</code> · ${esc(x.commit.author.name)}</span></div></div>`).join('')}</div>`}
 catch(err){out.innerHTML=`<div class="empty">Impossible de joindre GitHub (${esc(err.message||'réseau')}). L’API publique limite les requêtes : réessaie dans quelques minutes.</div>`}});

views.notes=async()=>{
 return `<div class="grid g2"><div class="card"><h2>Journal</h2><div class="field"><label>Nouvelle note</label><textarea data-note placeholder="Décisions, idées, appels au fournisseur…"></textarea></div><button class="adm-btn" data-add-note>Ajouter</button><div style="margin-top:14px">${db.notes.length?db.notes.slice().reverse().map((n,i)=>`<div class="ln"><time>${dateFr(n.date)}</time><div>${esc(n.text).replace(/\n/g,'<br>')}<br><button class="adm-btn danger sm" data-del-note="${db.notes.length-1-i}" style="margin-top:6px">Supprimer</button></div></div>`).join(''):'<p class="muted">Aucune note.</p>'}</div></div>
 <div class="card"><h2>Sauvegarde</h2><p>Tes coûts, commandes, cases cochées et notes vivent dans ce navigateur. Si tu changes d’appareil ou vides les données du site, elles disparaissent : <b>exporte régulièrement</b>.</p><div class="tools"><button class="adm-btn" data-export-all2>Exporter en JSON</button><label class="adm-btn ghost" style="display:inline-flex;align-items:center;cursor:pointer">Importer un JSON<input type="file" accept="application/json" data-import hidden></label><button class="adm-btn danger" data-reset>Tout effacer</button></div><p class="small muted">Le fichier exporté contient tes coûts : ne le mets pas dans le dépôt GitHub public.</p></div></div>`;
};
views.notes.bind=root=>{
 root.addEventListener('click',e=>{
  if(e.target.closest('[data-add-note]')){const t=$('[data-note]',root).value.trim();if(!t)return;db.notes.push({date:new Date().toISOString(),text:t});save();route(true)}
  const d=e.target.closest('[data-del-note]');if(d){db.notes.splice(+d.dataset.delNote,1);save();route(true)}
  if(e.target.closest('[data-export-all2]'))exportAll();
  if(e.target.closest('[data-reset]')&&confirm('Effacer coûts, commandes, cases et notes de ce navigateur ?')&&confirm('Vraiment tout effacer ? Cette action est définitive.')){db={costs:{},orders:[],checks:{},notes:[],target:''};save();route(true)}});
 $('[data-import]',root).addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;f.text().then(t=>{try{const d=JSON.parse(t);if(typeof d!=='object'||!d)throw 0;db={costs:d.costs||{},orders:Array.isArray(d.orders)?d.orders:[],checks:d.checks||{},notes:Array.isArray(d.notes)?d.notes:[],target:d.target||''};save();route(true)}catch(_){alert('Fichier invalide.')}})});
};
function exportAll(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));a.download='admin-1608-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

/* ---------- routage ---------- */
let current='';
async function route(force){
 const id=(location.hash||'#apercu').slice(1);const sec=SECTIONS.find(s=>s[0]===id)||SECTIONS[0];
 if(!force&&current===sec[0])return;current=sec[0];
 const y=scrollY;
 $('[data-title]').textContent=sec[1];$('[data-sub]').textContent=sec[2];document.title=sec[1]+' — Administration 1608';
 $$('[data-nav] a').forEach(a=>a.toggleAttribute('aria-current',a.dataset.id===sec[0]));
 $$('[data-nav] a').forEach(a=>{if(a.dataset.id===sec[0])a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 const ob=$('[data-nav] a[data-id="commandes"] small');if(ob)ob.textContent=db.orders.length;
 const root=$('[data-view]');root.innerHTML='<p class="muted">Chargement…</p>';
 const html=await views[sec[0]]();root.innerHTML=html;views[sec[0]].bind?.(root);
 if(force)scrollTo(0,y);else scrollTo(0,0);
 const pay=window.STORE_MANUAL_PAYMENT||{};const pill=$('[data-pay-pill]');pill.textContent=pay.enabled?'Paiement activé':'Paiement désactivé';pill.classList.toggle('ok',!!pay.enabled);
}
function init(){
 P=window.STORE_PRODUCTS?[...window.STORE_PRODUCTS]:[];
 load();
 $('[data-nav]').innerHTML=SECTIONS.map(s=>`<a href="#${s[0]}" data-id="${s[0]}">${s[1]}${s[0]==='commandes'?`<small>${db.orders.length}</small>`:s[0]==='catalogue'?`<small>${P.length}</small>`:''}</a>`).join('');
 $('[data-export-all]').addEventListener('click',exportAll);
 addEventListener('hashchange',()=>route(false));route(true);
}
if(document.readyState==='loading')addEventListener('DOMContentLoaded',init);else init();
})();
