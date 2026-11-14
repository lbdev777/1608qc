/* 1608 / architecture sans Shopify — navigation native, états légers, aucune vente simulée. */
(() => {
'use strict';
const P = window.STORE_PRODUCTS || [];
const currency = window.STORE_CURRENCY || (c=>`${(c/100).toFixed(2)} $`);
const priceCart=lines=>window.STORE_BUNDLE_PRICING.calculate(lines);
const $ = (s,scope=document) => scope.querySelector(s);
const $$ = (s,scope=document) => [...scope.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const productUrl = id => 'produit-'+encodeURIComponent(id)+'.html';
const productById = id => P.find(p=>p.id===id);
const productStories={
'orbite-noir':{title:'LE CENTRE DE GRAVITÉ.',copy:'Devant, les fleurs de lys encadrent 1608. Derrière, une orbite, un globe et notre signature QC/CA. Deux vues, une identité qui reste en tête.'},
'terrain-camo':{title:"SORTIR DU CADRE.",copy:"Devant, la signature reste discrète. Derrière, un paysage prend toute la place. Le camouflage forêt rencontre une coupe boxy."},
'horizon-noir':{title:"DEUX FACES. UNE SIGNATURE.",copy:"Un logo devant, un globe derrière. HORIZON prend une silhouette noire essentielle et lui donne sa perspective."},
'signature-brode':{title:"RIEN À AJOUTER.",copy:"Le lettrage brodé fait tout le travail. Un détail blanc sur noir, une coupe boxy et un dos volontairement uni."},
'contraste-marine':{title:"LE CONTRASTE JUSTE.",copy:"Marine profond. Capuche ivoire. Deux fleurs de lys en façade, un emblème au dos. Les détails portent la pièce."},
'archive-denim':{title:"LE DENIM, SANS DÉTOUR.",copy:"Un gris délavé, une coupe large et un marquage vertical. ARCHIVE joue sur les proportions, pas sur les artifices."},
'heritage-noir':{title:"SIGNÉ DE PARTOUT.",copy:"Une signature compacte devant, des manches travaillées et un dos graphique. HÉRITAGE rassemble les codes 1608."}
};
productStories['uniforme-zip']={title:'LE ZIP. LA SIGNATURE.',copy:'Un effet délavé, une signature manuscrite et un grand 1608 au dos. Combine-le au jogger coordonné pour faire le look complet.'};
productStories['uniforme-jogger']={title:'LA SILHOUETTE COMPLÈTE.',copy:'Une jambe ample, une signature discrète et les bons détails. Le jogger vient compléter le zip UNIFORME 1608.'};
let cart=[];
try {
  const saved=JSON.parse(localStorage.getItem('1608-cart-v2')||'[]');
  if(Array.isArray(saved))cart=saved.filter(x=>productById(x.id)&&productById(x.id).sizes.includes(x.size)&&Number.isInteger(x.qty)&&x.qty>0&&x.qty<=10);
}catch(_){}
let activeOverlay=null, lastFocus=null, toastTimer=null;
let selectedProduct=null, chosenSize=null, quantity=1, currentImage=0;

const iconSearch='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.9" cy="10.9" r="7.2"></circle><path d="m16.5 16.5 5 5"></path></svg>';
const iconBag='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h16l-1 13H5L4 8Z"></path><path d="M9 9V6a3 3 0 0 1 6 0v3"></path></svg>';
const iconMenu='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>';
function header(){
return `<a class="skip-link" href="#main">Aller au contenu</a>
<div class="hm-bar" role="region" aria-label="Informations"><span>Aperçu de la collection · commandes pas encore ouvertes</span><span>Duo −10 % · Trio −15 % sur des modèles différents</span><span>Total, livraison et taxes confirmés avant de payer</span><span>Imaginé au Québec</span></div>
<header class="site-header"><div class="header-inner">
<a class="wordmark" href="index.html" aria-label="1608, accueil"><span class="wordmark-number">1608</span><span class="wordmark-sub">MILLE-SIX-CENT-HUIT</span></a>
<nav class="nav-main" aria-label="Navigation"><a href="index.html#collection">Tout voir</a><a href="index.html?cat=hoodies#collection">Cotons ouatés</a><a href="index.html?cat=denim#collection">Denim</a><a href="index.html?cat=pants#collection">Pantalons</a><a href="index.html#l-uniforme">L'uniforme</a><a href="index.html#notre-histoire">La marque</a></nav>
<div class="header-actions">
<button class="header-icon" type="button" data-search-open aria-label="Rechercher">${iconSearch}</button>
<button class="header-icon" type="button" data-cart-open aria-label="Ouvrir le panier">${iconBag}<span class="bag-count" data-cart-count hidden>0</span></button>
<button class="header-icon menu-button" type="button" data-menu-toggle aria-label="Ouvrir le menu" aria-expanded="false">${iconMenu}</button>
</div></div>
<nav class="mobile-nav" data-mobile-nav hidden aria-label="Menu mobile">
<a href="index.html#collection">Tout voir</a><a href="index.html?cat=hoodies#collection">Cotons ouatés</a><a href="index.html?cat=denim#collection">Denim</a><a href="index.html?cat=pants#collection">Pantalons</a><a href="index.html#l-uniforme">L'uniforme</a>
<a href="index.html#notre-histoire">La marque</a><a href="index.html#questions">Infos</a>
</nav></header>`;
}
function footer(){
return `<footer class="site-footer ed-footer">
<div class="ed-footer-main">
<div><a class="ed-footer-logo" href="index.html" aria-label="1608, retour à l'accueil">1608.</a><p>Mille-Six-Cent-Huit<br>Une marque indépendante du Québec.</p></div>
<nav aria-label="Pied de page"><a href="index.html#collection">Collection</a><a href="index.html#l-uniforme">L'uniforme</a><a href="index.html#notre-histoire">La marque</a><a href="index.html#questions">Informations</a></nav>
</div>
<div class="ed-footer-bottom"><span>© ${new Date().getFullYear()} 1608</span><span>QUÉBEC, CANADA</span><span>Boutique en aperçu — aucun paiement accepté</span></div></footer>`;
}
function wishList(){try{return JSON.parse(localStorage.getItem('1608-wish')||'[]')}catch(_){return []}}
function saveWish(list){try{localStorage.setItem('1608-wish',JSON.stringify(list))}catch(_){}}
const iconHeart='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 2.6C20.5 15 12 20.5 12 20.5Z"></path></svg>';
function card(p){
const liked=wishList().includes(p.id);
return `<article class="product-card" data-category="${p.category}" data-id="${p.id}">
<a class="card-link" href="${productUrl(p.id)}" aria-label="Découvrir ${p.name}, ${p.variant}, ${currency(p.price)}">
<div class="product-visual">
<img class="product-primary" src="${p.photos[0]}" alt="${p.name} — devant" loading="lazy" decoding="async" width="900" height="900">
<img class="product-alt" src="${p.photos[1]}" alt="" loading="lazy" decoding="async" width="900" height="900"></div>
<div class="card-copy"><div class="card-title"><h3>${p.name.replace(' 1608','')}</h3><b>${currency(p.price)}</b></div>
<p class="card-sub">${p.variant.toLowerCase()}</p></div></a>
<button class="wish" type="button" data-wish="${p.id}" aria-pressed="${liked}" aria-label="${liked?'Retirer des favoris':'Ajouter aux favoris'} : ${p.name}">${iconHeart}</button>
<div class="quick" data-quick="${p.id}">
<button class="quick-toggle" type="button" data-quick-toggle aria-expanded="false" aria-label="Ajout rapide : ${p.name}"><span aria-hidden="true">+</span></button>
<div class="quick-panel" role="group" aria-label="Choisir une taille pour ${p.name}"><span class="quick-title">Ajout rapide · taille</span><div class="quick-sizes">${p.sizes.map(z=>`<button type="button" data-quick-size="${p.id}:${z}" aria-label="Ajouter ${p.name} en taille ${z} au panier">${z}</button>`).join('')}</div></div>
</div></article>`;
}
function mountShell(){
const h=$('[data-site-header]'),f=$('[data-site-footer]');if(h)h.innerHTML=header();if(f)f.innerHTML=footer();
document.body.insertAdjacentHTML('beforeend',`
<div class="backdrop" data-backdrop></div>
<aside class="drawer" data-cart-drawer role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="cart-heading">
 <div class="drawer-head"><h2 id="cart-heading">Votre panier <span data-drawer-count></span></h2><button type="button" data-overlay-close aria-label="Fermer le panier">×</button></div>
 <div class="drawer-body" data-cart-lines></div>
 <div class="drawer-footer"><div class="drawer-subtotal"><span>ARTICLES</span><b data-cart-subtotal>0 $</b></div><div class="drawer-promo" data-cart-promo hidden><span data-cart-promo-label>RABAIS ENSEMBLE</span><b data-cart-discount>−0 $</b></div><div class="drawer-total"><span>TOTAL DES ARTICLES</span><strong data-cart-total>0 $</strong></div><button class="button dark" type="button" data-checkout-info>Voir le récapitulatif <span class="button-arrow">↗</span></button><p>Collection en prévisualisation. Aucune commande ni aucun paiement n’est accepté actuellement. Frais et délais à confirmer au lancement.</p></div>
</aside>
<div class="search-panel" data-search-panel role="dialog" aria-modal="true" aria-hidden="true" aria-label="Recherche de produits"><div class="search-head"><input type="search" data-search-input placeholder="Rechercher une pièce…" aria-label="Rechercher une pièce" autocomplete="off"><button type="button" data-overlay-close aria-label="Fermer la recherche">×</button></div><div class="search-results" data-search-results></div></div>
<div class="toast" data-toast role="status" aria-live="polite"></div>`);
$$('[data-cart-drawer], [data-search-panel]').forEach(panel=>{panel.inert=true;});
}
function save(){try{localStorage.setItem('1608-cart-v2',JSON.stringify(cart));}catch(_){}}
function cartCount(){return cart.reduce((n,x)=>n+x.qty,0)}
function syncCart(){
const pricing=priceCart(cart);
$$('[data-cart-count]').forEach(el=>{const n=cartCount();el.textContent=n;el.hidden=n===0});
const n=$('[data-drawer-count]');if(n)n.textContent='('+cartCount()+')';
const el=$('[data-cart-lines]');if(!el)return;
$('[data-cart-total]').textContent=currency(pricing.total);
$('[data-cart-subtotal]').textContent=currency(pricing.subtotal);
$('[data-cart-promo]').hidden=!pricing.percent;
$('[data-cart-promo-label]').textContent='ENSEMBLE 1608 / −'+pricing.percent+' %';
$('[data-cart-discount]').textContent='−'+currency(pricing.discount);

if(!cart.length){el.innerHTML='<div class="drawer-empty"><strong>Votre panier est vide.</strong><p>Explorez les pièces de la collection 1608.</p><a href="index.html#collection" class="button outline" data-overlay-close>Voir la collection ↗</a></div>';return;}
el.innerHTML=cart.map((line,i)=>{const p=productById(line.id);if(!p)return '';return `
<div class="cart-line"><a href="${productUrl(p.id)}"><img src="${p.photos[0]}" alt="${p.name}"></a><div><a href="${productUrl(p.id)}"><h3>${p.name}</h3></a><p>${p.variant} · TAILLE ${line.size}</p><strong>${currency(p.price*line.qty)}</strong>
<div class="cart-line-actions"><button type="button" data-cart-change="${i}:-1" aria-label="Diminuer la quantité">−</button><span>${line.qty}</span><button type="button" data-cart-change="${i}:1" aria-label="Augmenter la quantité">+</button><button type="button" class="cart-remove" data-cart-remove="${i}">Retirer</button></div></div></div>`;}).join('');
}
function toast(message){const el=$('[data-toast]');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3200)}
function openOverlay(which){
closeOverlay(false);
lastFocus=document.activeElement;activeOverlay=which;
$('[data-backdrop]').classList.add('is-open');
const element=which==='cart'?$('[data-cart-drawer]'):$('[data-search-panel]');
element.inert=false;
element.classList.add('is-open');element.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
if(which==='cart')syncCart();
setTimeout(()=>{const target=which==='search'?$('[data-search-input]'):$('[data-cart-drawer] [data-overlay-close]');target?.focus()},120);
}
function closeOverlay(restore=true){
if(activeOverlay){
for(const sel of ['[data-cart-drawer]','[data-search-panel]']){const panel=$(sel);if(panel){panel.classList.remove('is-open');panel.setAttribute('aria-hidden','true');panel.inert=true;}}
$('[data-backdrop]')?.classList.remove('is-open');document.body.style.overflow='';activeOverlay=null;
if(restore&&lastFocus?.isConnected)lastFocus.focus();
}
}
/* Validation atomique : jamais une moitié d'ensemble ajoutée si l'autre taille atteint 10. */
function addItemsToCart(items,message){
 const next=cart.map(line=>({...line}));
 for(const item of items){
  const product=productById(item.id);
  if(!product||!product.sizes.includes(item.size)||!Number.isInteger(item.qty)||item.qty<1||item.qty>10)return false;
  const existing=next.find(line=>line.id===item.id&&line.size===item.size);
  if(existing){
   if(existing.qty+item.qty>10){toast('Maximum 10 exemplaires par taille.');return false;}
   existing.qty+=item.qty;
  }else next.push({...item});
 }
 cart=next;save();syncCart();openOverlay('cart');toast(message);return true;
}
function addToCart(id,size,qty){
 return addItemsToCart([{id,size,qty}],'Pièce ajoutée au panier.');
}
function search(query){
const el=$('[data-search-results]');if(!el)return;
const q=(query||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
if(!q){el.innerHTML='<p class="upper" style="color:#777">RECHERCHEZ PAR NOM, STYLE OU MATIÈRE.</p>';return}
const results=P.filter(p=>[p.name,p.variant,p.fit,p.material].join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(q));
el.innerHTML=results.length?results.map(p=>`<a class="search-result" href="${productUrl(p.id)}"><img src="${p.photos[0]}" alt=""><span>${p.name}<small>${p.variant}</small></span><b>${currency(p.price)}</b></a>`).join(''):'<p>Aucune pièce trouvée.</p>';
}
function initHome(){
const gallery=$('[data-campaign-gallery]');
if(gallery){
 const images=$$('[data-campaign-image]',gallery);
 // Never display a broken or mismatched image while media uploads are incomplete.
 if(images.length) Promise.all(images.map(img=>new Promise((resolve,reject)=>{
   const probe=new Image();probe.onload=resolve;probe.onerror=reject;probe.src=img.getAttribute('src');
 }))).then(()=>{gallery.hidden=false}).catch(()=>{gallery.hidden=true});
}
const grid=$('[data-product-grid]');if(!grid)return;
const count=$('[data-collection-count]');if(count)count.textContent=String(P.length).padStart(2,'0')+' PIÈCES';
const state={cat:'all',sort:'default',sizes:[]};
const params=new URLSearchParams(location.search);
if(['hoodies','denim','pants','wish'].includes(params.get('cat')))state.cat=params.get('cat');
function visible(){
 let list=P.filter(p=>state.cat==='all'||(state.cat==='wish'?wishList().includes(p.id):p.category===state.cat));
 if(state.sizes.length)list=list.filter(p=>state.sizes.some(z=>p.sizes.includes(z)));
 if(state.sort==='asc')list=[...list].sort((x,y)=>x.price-y.price);
 if(state.sort==='desc')list=[...list].sort((x,y)=>y.price-x.price);
 return list;
}
function draw(){
 const list=visible();
 grid.innerHTML=list.length?list.map(card).join(''):'<p class="grid-empty">'+(state.cat==='wish'?'Aucun favori pour l’instant. Touche le cœur sur une pièce pour la garder ici.':'Aucune pièce ne correspond à ces filtres.')+'</p>';
 if(count)count.textContent=String(list.length).padStart(2,'0')+(list.length>1?' PIÈCES':' PIÈCE');
 $$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===state.cat)));
 $$('[data-size-filter]').forEach(b=>b.setAttribute('aria-pressed',String(state.sizes.includes(b.dataset.sizeFilter))));
 const w=$('[data-wish-count]');if(w)w.textContent=wishList().length?'('+wishList().length+')':'';
}
draw();
$$('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{state.cat=btn.dataset.filter;draw()}));
$$('[data-size-filter]').forEach(btn=>btn.addEventListener('click',()=>{const z=btn.dataset.sizeFilter;state.sizes=state.sizes.includes(z)?state.sizes.filter(x=>x!==z):[...state.sizes,z];draw()}));
$('[data-sort]')?.addEventListener('change',e=>{state.sort=e.target.value;draw()});
$('[data-clear-filters]')?.addEventListener('click',()=>{state.cat='all';state.sort='default';state.sizes=[];const so=$('[data-sort]');if(so)so.value='default';draw()});
grid.addEventListener('click',e=>{
 const wish=e.target.closest('[data-wish]');
 if(wish){const id=wish.dataset.wish;let l=wishList();const on=!l.includes(id);l=on?[...l,id]:l.filter(x=>x!==id);saveWish(l);
  wish.setAttribute('aria-pressed',String(on));toast(on?'Ajouté aux favoris.':'Retiré des favoris.');
  const w=$('[data-wish-count]');if(w)w.textContent=l.length?'('+l.length+')':'';
  if(state.cat==='wish')draw();return}
 const tog=e.target.closest('[data-quick-toggle]');
 if(tog){const q=tog.closest('.quick');const open=!q.classList.contains('is-open');$$('.quick.is-open',grid).forEach(x=>{x.classList.remove('is-open');x.querySelector('[data-quick-toggle]').setAttribute('aria-expanded','false')});
  if(open){q.classList.add('is-open');tog.setAttribute('aria-expanded','true')}return}
 const sz=e.target.closest('[data-quick-size]');
 if(sz){const [id,size]=sz.dataset.quickSize.split(':');addToCart(id,size,1);
  const q=sz.closest('.quick');q?.classList.remove('is-open');q?.querySelector('[data-quick-toggle]')?.setAttribute('aria-expanded','false')}
});
document.addEventListener('click',e=>{if(!e.target.closest('.quick'))$$('.quick.is-open',grid).forEach(x=>{x.classList.remove('is-open');x.querySelector('[data-quick-toggle]').setAttribute('aria-expanded','false')})});
}
function updateGallery(i){
if(!selectedProduct)return;
currentImage=i;
const main=$('[data-gallery-main]'),img=$('[data-gallery-image]');
if(img){img.src=selectedProduct.photos[i];img.alt=`${selectedProduct.name} — vue ${i===0?'avant':'arrière'}`;}
if(main)main.setAttribute('aria-label','Agrandir la vue '+(i===0?'avant':'arrière'));
const idx=$('[data-gallery-index]');if(idx)idx.textContent=`${String(i+1).padStart(2,'0')} / 02`;
$$('[data-gallery-thumb]').forEach(btn=>btn.setAttribute('aria-pressed',String(Number(btn.dataset.galleryThumb)===i)));
if(main)main.classList.remove('zoomed');
}

/* Une seule promotion lisible par fiche; la remise vient du calcul du vrai panier. */
function renderProductOffer(p){
 const matching=p.pairedWith&&productById(p.pairedWith);
 if(!matching)return '';
 const pricing=priceCart([{id:p.id,qty:1},{id:matching.id,qty:1}]);
 const pairName=matching.id==='uniforme-zip'?'ZIP':'JOGGER';
 return `<section class="outfit-offer" aria-label="Offre ensemble ${p.name} et ${matching.name}">
  <div class="outfit-heading"><span>1608 / L'ENSEMBLE UNIFORME</span><strong>−${pricing.percent} % ENSEMBLE</strong></div>
  <div class="outfit-main">
   <a class="outfit-image" href="${productUrl(matching.id)}" aria-label="Voir ${matching.name}">
    <img src="${matching.photos[0]}" alt="${matching.name}, pièce assortie" loading="lazy" width="250" height="250">
   </a>
   <div class="outfit-details">
    <h2>LE LOOK<br>COMPLET.</h2>
    <span class="outfit-items">UNIFORME ZIP + UNIFORME JOGGER</span>
    <div class="outfit-prices"><del>${currency(pricing.subtotal)}</del><strong>${currency(pricing.total)}</strong></div>
    <span class="outfit-savings">ÉCONOMISE ${currency(pricing.discount)} SUR LES DEUX PIÈCES</span>
   </div>
  </div>
  <div class="outfit-controls">
   <div class="outfit-size-group"><label for="outfit-paired-size">TAILLE DU ${pairName} ASSORTI</label>
    <select id="outfit-paired-size" data-outfit-size>
      <option value="">Choisir une taille</option>
      ${matching.sizes.map(size=>`<option value="${size}">${size}</option>`).join('')}
    </select></div>
   <button class="outfit-add" type="button" data-add-outfit>AJOUTER L'ENSEMBLE <span aria-hidden="true">↗</span></button>
  </div>
  <p class="outfit-error" role="status" data-outfit-error></p>
  <div class="outfit-foot"><span>1 DE CHAQUE · TAILLES AU CHOIX · AVANT TAXES ET LIVRAISON</span>
    <a href="${productUrl(matching.id)}">VOIR LE ${pairName} <span aria-hidden="true">↗</span></a>
  </div>
 </section>`;
}
function initProduct(){
const id=document.body.dataset.productId || new URLSearchParams(location.search).get('id');
const p=productById(id);
if(!p){$('#main').innerHTML='<div class="container" style="padding:100px 0 180px"><span class="eyebrow">1608 / 404</span><h1 class="display" style="font-size:clamp(55px,8vw,110px)">PIÈCE INTROUVABLE.</h1><p>Cette fiche n’existe pas dans notre collection.</p><a class="button dark" href="index.html#collection">VOIR LA COLLECTION →</a></div>';document.title='Pièce introuvable — 1608';return;}
selectedProduct=p;chosenSize=null;quantity=1;
document.title=`${p.name} — ${p.variant} | 1608`;
const meta=$('meta[name="description"]');if(meta)meta.content=p.description;
const setSocialMeta=(selector,value)=>{const el=$(selector);if(el)el.content=value;};
setSocialMeta('meta[property="og:title"]',p.name+' — '+p.variant+' | 1608');
setSocialMeta('meta[property="og:description"]',p.description);
setSocialMeta('meta[property="og:image"]',new URL(p.photos[0],document.baseURI).href);
setSocialMeta('meta[property="og:url"]',new URL(productUrl(p.id),document.baseURI).href);
let canonical=$('link[rel="canonical"]');
if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical);}
canonical.href=new URL(productUrl(p.id),document.baseURI).href;
const index=String(P.indexOf(p)+1).padStart(3,'0');
const target=$('[data-product-shell]');
target.innerHTML=`
<div class="container" id="product-top"><nav class="breadcrumbs" aria-label="Fil d’Ariane"><a href="index.html">ACCUEIL</a><span>/</span><a href="index.html#collection">COLLECTION</a><span>/</span><span>${p.name}</span></nav>
<div class="product-layout">
  <div class="product-gallery">
    <button class="gallery-main" data-gallery-main type="button" aria-label="Agrandir la vue avant"><span class="gallery-index" data-gallery-index>01 / 02</span><img data-gallery-image src="${p.photos[0]}" alt="${p.name} — vue avant" width="1200" height="1200"></button>
    <div class="gallery-thumbs" role="group" aria-label="Photographies du vêtement">
      ${p.photos.map((url,i)=>`<button type="button" class="gallery-thumb" data-gallery-thumb="${i}" aria-label="Afficher la vue ${i===0?'avant':'arrière'}" aria-pressed="${i===0}"><img src="${url}" alt="" width="550" height="550" loading="lazy"><span>${i===0?'01 / AVANT':'02 / ARRIÈRE'}</span></button>`).join('')}
    </div>
  </div>
  <div class="product-info">
    ${p.isNew?'<div class="product-new">NOUVELLE PIÈCE / COLLECTION 1608</div>':''}
    <span class="product-number">1608 / COLLECTION 01 — RÉF. ${p.ref}</span>
    <h1 class="display">${p.name}</h1>
    <div class="product-variant">${p.variant} <span class="product-madehere">· IMAGINÉ AU QUÉBEC</span></div>
    <div class="product-price">${currency(p.price)} <span style="font-size:11px;color:#777;font-weight:500">CAD</span></div>
    <p class="product-desc">${p.description}</p>
    <div class="product-facts"><span>${p.fit}</span><span>${p.material}</span><span>IMAGINÉ AU QUÉBEC</span></div>
    <div class="option-label"><span>01 / CHOISIR UNE TAILLE</span><button type="button" class="text-link" data-guide-open>Guide des tailles ↗</button></div>
    <div class="size-list" data-size-list-placeholder role="group" aria-label="Choisir une taille">${p.sizes.map(size=>`<button class="size-option" type="button" data-size="${size}" aria-pressed="false">${size}</button>`).join('')}</div>
    <p class="size-feedback" data-size-feedback>SÉLECTIONNE TA TAILLE POUR CONTINUER.</p>
    <p class="size-error" data-size-error role="status"></p>
    <div class="option-label"><span>02 / QUANTITÉ</span></div>
    <div class="purchase-row"><div class="quantity"><button type="button" data-qty-minus aria-label="Diminuer quantité">−</button><span data-quantity>1</span><button type="button" data-qty-plus aria-label="Augmenter quantité">+</button></div>
      <button class="button dark" type="button" data-add-main>AJOUTER AU PANIER <span class="button-arrow" aria-hidden="true">↗</span></button>
    </div>
    ${renderProductOffer(p)}
    <p class="preview-note">La collection est en aperçu : aucun paiement n'est accepté. Livraison et taxes applicables à confirmer avant l'ouverture.</p>
    <div class="product-specs" aria-label="Informations sur la pièce">
      <div><span>CONCEPTION</span><strong>IMAGINÉ AU QUÉBEC</strong></div>
      <div><span>COUPE</span><strong>${p.fit}</strong></div>
      <div><span>DÉTAIL</span><strong>${p.material}</strong></div>
    </div>
    <div class="product-accordion">
      <details><summary>DÉTAILS DE LA PIÈCE</summary><ul>${p.features.map(x=>`<li>${x}</li>`).join('')}</ul></details>
      <details data-size-guide><summary>GUIDE DES TAILLES</summary><p>Tailles proposées : ${p.sizes.join(' / ')}. Les mesures exactes du fabricant seront affichées avant l’ouverture des commandes. Pour l’instant, les tailles ne constituent pas une recommandation personnalisée.</p></details>
      <details><summary>LIVRAISON ET RETOURS</summary><p>Livraison envisagée au Canada. Les frais, délais de préparation et modalités de retour seront confirmés et publiés avant tout paiement.</p></details>
    </div>
  </div></div></div>`;
const story=productStories[p.id] || {title:'UNE PIÈCE. UNE SIGNATURE.',copy:p.description};
const next=P[(P.indexOf(p)+1)%P.length];
target.insertAdjacentHTML('beforeend',`
<section class="product-editorial" aria-labelledby="editorial-title">
 <div class="product-editorial-copy">
  <span class="eyebrow">1608 / LE DÉTAIL QUI FAIT LA DIFFÉRENCE</span>
  <h2 class="display" id="editorial-title">${story.title}</h2>
  <p>${story.copy}</p>
  <div class="product-editorial-rule"><span>DEVANT / DOS</span><span>${p.name} — ${p.variant}</span></div>
  <a href="#product-top" class="editorial-link">REVOIR LA PIÈCE <span aria-hidden="true">↗</span></a>
 </div>
 <div class="product-editorial-media">
  <img src="${p.photos[1]}" alt="${p.name} — vue arrière" loading="lazy" width="1000" height="1000">
  <span>1608 / VUE ARRIÈRE</span>
 </div>
</section>
<div class="container product-next">
 <span>EXPLORER LA PIÈCE SUIVANTE</span>
 <a href="${productUrl(next.id)}"><strong>${next.name}</strong><span aria-hidden="true">↗</span></a>
</div>`);
const related=P.filter(x=>x.id!==p.id).sort((a,b)=>(a.category===p.category?-1:1)-(b.category===p.category?-1:1)).slice(0,3);
const relatedGrid=$('[data-related-grid]');if(relatedGrid)relatedGrid.innerHTML=related.map(card).join('');
$$('[data-gallery-thumb]').forEach(btn=>btn.addEventListener('click',()=>updateGallery(Number(btn.dataset.galleryThumb))));
$('[data-gallery-main]')?.addEventListener('click',e=>e.currentTarget.classList.toggle('zoomed'));
$$('[data-size]').forEach(btn=>btn.addEventListener('click',()=>{
 chosenSize=btn.dataset.size;
 $$('[data-size]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
 $('[data-size-error]').textContent='';
 const feedback=$('[data-size-feedback]');if(feedback)feedback.textContent='TAILLE '+chosenSize+' SÉLECTIONNÉE ✓';
 const pairSelect=$('[data-outfit-size]');
 if(pairSelect&&!pairSelect.value&&[...pairSelect.options].some(option=>option.value===chosenSize))pairSelect.value=chosenSize;
 const pairError=$('[data-outfit-error]');if(pairError)pairError.textContent='';
}));
$('[data-guide-open]')?.addEventListener('click',event=>{
 event.preventDefault();
 const modal=document.querySelector('[data-sizeguide-modal]');
 if(modal){
  if(!modal.open && typeof modal.showModal==='function')modal.showModal();
  else if(!modal.open)modal.setAttribute('open','');
  return;
 }
 const hasVerifiedGuide=['signature-brode','terrain-camo','horizon-noir','contraste-marine'].includes(p.id);
 if(hasVerifiedGuide){
  toast('Le guide des tailles se charge. Actualise la page si nécessaire.');
  return;
 }
 const details=$('[data-size-guide]');
 if(details){details.open=true;details.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'center'});}
});
$('[data-qty-minus]')?.addEventListener('click',()=>{quantity=Math.max(1,quantity-1);$('[data-quantity]').textContent=quantity});
$('[data-qty-plus]')?.addEventListener('click',()=>{quantity=Math.min(10,quantity+1);$('[data-quantity]').textContent=quantity});
function purchase(){if(!chosenSize){$('[data-size-error]').textContent='Choisis une taille avant d’ajouter au panier.';$('[data-size-list-placeholder]')?.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'center'});$$('[data-size]')[0]?.focus();return}addToCart(p.id,chosenSize,quantity)}
$('[data-add-main]')?.addEventListener('click',purchase);
$('[data-outfit-size]')?.addEventListener('change',()=>{
 const error=$('[data-outfit-error]');if(error)error.textContent='';
});
$('[data-add-outfit]')?.addEventListener('click',()=>{
 const pair=productById(p.pairedWith);
 if(!pair)return;
 if(!chosenSize){
  $('[data-size-error]').textContent='Choisis d’abord ta taille pour cette pièce.';
  $('[data-size-list-placeholder]')?.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'center'});
  $$('[data-size]')[0]?.focus();
  return;
 }
 const sizeControl=$('[data-outfit-size]');
 const pairSize=sizeControl?.value;
 if(!pairSize||!pair.sizes.includes(pairSize)){
  $('[data-outfit-error]').textContent='Choisis la taille de la pièce assortie.';
  sizeControl?.focus();return;
 }
 if(addItemsToCart([{id:p.id,size:chosenSize,qty:1},{id:pair.id,size:pairSize,qty:1}],'Ensemble ajouté. Remise appliquée au panier.')){
  $('[data-outfit-error]').textContent='';
 }
});
const sticky=$('[data-mobile-product]');if(sticky){sticky.hidden=false;sticky.innerHTML=`<span>${p.name}<strong>${currency(p.price)}</strong></span><button class="button dark" type="button" data-add-mobile>AJOUTER ↗</button>`;sticky.querySelector('[data-add-mobile]').addEventListener('click',purchase);}
}
function listeners(){
document.addEventListener('click',e=>{
const openCart=e.target.closest('[data-cart-open]');if(openCart){openOverlay('cart');return}
if(e.target.closest('[data-search-open]')){openOverlay('search');search('');return}
if(e.target.closest('[data-overlay-close]')||e.target.closest('[data-backdrop]')){closeOverlay();return}
const menu=e.target.closest('[data-menu-toggle]');if(menu){const nav=$('[data-mobile-nav]');const next=nav.hidden;nav.hidden=!next;menu.setAttribute('aria-expanded',String(next));return}
const change=e.target.closest('[data-cart-change]');if(change){const [i,n]=change.dataset.cartChange.split(':').map(Number);const line=cart[i];if(!line)return;line.qty+=n;if(line.qty<=0)cart.splice(i,1);save();syncCart();return}
const remove=e.target.closest('[data-cart-remove]');if(remove){cart.splice(Number(remove.dataset.cartRemove),1);save();syncCart();return}
if(e.target.closest('[data-checkout-info]')){location.href='checkout.html';return}
});
$('[data-search-input]')?.addEventListener('input',e=>search(e.target.value));
document.addEventListener('keydown',e=>{
if(e.key==='Escape'){closeOverlay();$('[data-mobile-nav]')&&( $('[data-mobile-nav]').hidden=true);}
if(e.key==='Tab'&&activeOverlay){const root=activeOverlay==='cart'?$('[data-cart-drawer]'):$('[data-search-panel]');const focusables=$$('button:not([disabled]),a[href],input:not([disabled])',root).filter(el=>el.offsetParent!==null);if(focusables.length){const first=focusables[0],last=focusables[focusables.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}
});
$('[data-mobile-nav]')?.addEventListener('click',e=>{if(e.target.closest('a'))$('[data-mobile-nav]').hidden=true});
}
window.addEventListener('1608:cart-changed',()=>{
 try{
  const saved=JSON.parse(localStorage.getItem('1608-cart-v2')||'[]');
  cart=Array.isArray(saved)?saved.filter(x=>productById(x.id)&&productById(x.id).sizes.includes(x.size)&&Number.isInteger(x.qty)&&x.qty>=1&&x.qty<=10):[];
 }catch(_){cart=[];}
 syncCart();
});
document.addEventListener('DOMContentLoaded',()=>{
mountShell();syncCart();listeners();
if(document.body.dataset.page==='product')initProduct();else if(document.body.dataset.page==='home')initHome();
});
})();
