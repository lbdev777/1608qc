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
'terrain-camo':{title:"SORTIR DU CADRE.",copy:"Devant, la signature reste discrète. Derrière, un paysage prend toute la place. Le camouflage forêt rencontre une coupe boxy."},
'horizon-noir':{title:"DEUX FACES. UNE SIGNATURE.",copy:"Un logo devant, un globe derrière. HORIZON prend une silhouette noire essentielle et lui donne sa perspective."},
'signature-brode':{title:"RIEN À AJOUTER.",copy:"Le lettrage brodé fait tout le travail. Un détail blanc sur noir, une coupe boxy et un dos volontairement uni."},
'contraste-marine':{title:"LE CONTRASTE JUSTE.",copy:"Marine profond. Capuche ivoire. Deux fleurs de lys en façade, un emblème au dos. Les détails portent la pièce."},
'archive-denim':{title:"LE DENIM, SANS DÉTOUR.",copy:"Un gris délavé, une coupe large et un marquage vertical. ARCHIVE joue sur les proportions, pas sur les artifices."},
'heritage-noir':{title:"SIGNÉ DE PARTOUT.",copy:"Une signature compacte devant, des manches travaillées et un dos graphique. HÉRITAGE rassemble les codes 1608."}
};
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
<div class="site-announcement">1608 / VÊTEMENTS CONÇUS AU QUÉBEC — APERÇU DE LA COLLECTION</div>
<header class="site-header"><div class="header-inner">
<a class="wordmark" href="index.html" aria-label="1608 accueil">1608<span>MILLE-SIX-CENT-HUIT</span></a>
<nav class="nav-main" aria-label="Navigation"><a href="index.html#collection">COLLECTION</a><a href="index.html#notre-histoire">LA MARQUE</a><a href="index.html#questions">FAQ</a></nav>
<div class="header-actions">
<button class="header-icon" type="button" data-search-open aria-label="Rechercher un produit">${iconSearch}</button>
<button class="header-icon" type="button" data-cart-open aria-label="Ouvrir le panier">${iconBag}<span class="bag-count" data-cart-count hidden>0</span></button>
<button class="header-icon menu-button" type="button" data-menu-toggle aria-label="Ouvrir le menu" aria-expanded="false">${iconMenu}</button>
</div></div><nav class="mobile-nav" data-mobile-nav hidden aria-label="Navigation mobile"><a href="index.html#collection">LA COLLECTION</a><a href="index.html#notre-histoire">NOTRE HISTOIRE</a><a href="index.html#questions">QUESTIONS FRÉQUENTES</a></nav></header>`;
}
function footer(){
return `<footer class="site-footer"><div class="container"><div class="footer-main"><div><div class="footer-logo">1608.</div><p>Une marque indépendante imaginée au Québec.</p></div><div class="footer-links"><div><a href="index.html#collection">Collection</a><a href="index.html#notre-histoire">À propos</a></div><div><a href="index.html#questions">FAQ</a><a href="index.html#questions">Informations</a></div></div></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} 1608 — MILLE-SIX-CENT-HUIT</span><span>CONÇU AU QUÉBEC · EXPÉRIENCE DE DÉMONSTRATION</span></div></div></footer>`;
}
function card(p) {
const n=String(P.indexOf(p)+1).padStart(3,'0');
return `<article class="product-card" data-category="${p.category}"><a href="${productUrl(p.id)}" aria-label="Voir la fiche de ${p.name}, ${p.variant} — ${currency(p.price)}">
<div class="product-visual"><span class="card-index">1608 / ${n}</span><img class="product-primary" src="${p.photos[0]}" alt="${p.name} — vue avant" loading="lazy" width="900" height="900"><img class="product-alt" src="${p.photos[1]}" alt="" loading="lazy" width="900" height="900"><span class="card-open">DÉCOUVRIR LA PIÈCE <span aria-hidden="true">↗</span></span></div>
<div class="card-copy"><div class="card-meta"><span>${p.fit}</span><span>${p.material}</span></div><div class="card-title"><h3>${p.name}</h3><b>${currency(p.price)}</b></div><p class="card-sub">${p.variant}</p></div></a></article>`;
}
function mountShell(){
const h=$('[data-site-header]'),f=$('[data-site-footer]');if(h)h.innerHTML=header();if(f)f.innerHTML=footer();
document.body.insertAdjacentHTML('beforeend',`
<div class="backdrop" data-backdrop></div>
<aside class="drawer" data-cart-drawer role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="cart-heading">
 <div class="drawer-head"><h2 id="cart-heading">VOTRE PANIER <span data-drawer-count></span></h2><button type="button" data-overlay-close aria-label="Fermer le panier">×</button></div>
 <div class="drawer-body" data-cart-lines></div>
 <div class="drawer-footer"><div class="drawer-subtotal"><span>ARTICLES</span><b data-cart-subtotal>0 $</b></div><div class="drawer-promo" data-cart-promo hidden><span data-cart-promo-label>RABAIS ENSEMBLE</span><b data-cart-discount>−0 $</b></div><div class="drawer-total"><span>TOTAL DES ARTICLES</span><strong data-cart-total>0 $</strong></div><p class="drawer-bundle-hint" data-cart-bundle-hint>2 modèles différents = −10 % · 3 modèles = −15 %.</p><button class="button dark" type="button" data-checkout-info>PASSER À LA CAISSE <span class="button-arrow">↗</span></button><p>Collection en prévisualisation. Aucune commande ni aucun paiement n’est accepté actuellement. Frais et délais à confirmer au lancement.</p></div>
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
$('[data-cart-bundle-hint]').textContent=pricing.percent===15?'TRIO ACTIVÉ / 15 % SUR LES ARTICLES':pricing.percent===10?'DUO ACTIVÉ / AJOUTE UN 3E MODÈLE POUR 15 %':'2 modèles différents = −10 % · 3 modèles ou plus = −15 %';
if(!cart.length){el.innerHTML='<div class="drawer-empty"><strong>Votre panier est vide.</strong><p>Explorez les pièces de la collection 1608.</p><a href="index.html#collection" class="button outline" data-overlay-close>VOIR LA COLLECTION ↗</a></div>';return;}
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
function addToCart(id,size,qty){
const p=productById(id);if(!p||!p.sizes.includes(size)||!Number.isInteger(qty)||qty<1||qty>10)return false;
const existing=cart.find(line=>line.id===id&&line.size===size);
if(existing){if(existing.qty+qty>10){toast('Maximum 10 exemplaires par taille.');return false}existing.qty+=qty}
else cart.push({id,size,qty});
save();syncCart();openOverlay('cart');toast('Pièce ajoutée au panier.');return true;
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
function draw(filter){const filtered=filter==='all'?P:P.filter(p=>p.category===filter);grid.innerHTML=filtered.map(card).join('');}
draw('all');
$$('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{$$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));draw(btn.dataset.filter)}));
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
    <span class="product-number">COLLECTION 1608 / ${index} SUR ${String(P.length).padStart(3,'0')}</span>
    <h1 class="display">${p.name}</h1>
    <div class="product-variant">${p.variant}</div>
    <div class="product-price">${currency(p.price)} <span style="font-size:11px;color:#777;font-weight:500">CAD</span></div>
    <p class="product-desc">${p.description}</p>
    <div class="product-facts"><span>${p.fit}</span><span>${p.material}</span><span>IMAGINÉ AU QUÉBEC</span></div>
    <div class="option-label"><span>01 / CHOISIR UNE TAILLE</span><button type="button" class="text-link" data-guide-open>Guide des tailles</button></div>
    <div class="size-list" data-size-list-placeholder role="group" aria-label="Choisir une taille">${p.sizes.map(size=>`<button class="size-option" type="button" data-size="${size}" aria-pressed="false">${size}</button>`).join('')}</div>
    <p class="size-feedback" data-size-feedback>SÉLECTIONNE TA TAILLE POUR CONTINUER.</p>
    <p class="size-error" data-size-error role="status"></p>
    <div class="option-label"><span>02 / QUANTITÉ</span></div>
    <div class="purchase-row"><div class="quantity"><button type="button" data-qty-minus aria-label="Diminuer quantité">−</button><span data-quantity>1</span><button type="button" data-qty-plus aria-label="Augmenter quantité">+</button></div>
      <button class="button dark" type="button" data-add-main>AJOUTER AU PANIER <span class="button-arrow" aria-hidden="true">↗</span></button>
    </div>
    <p class="product-bundle-offer"><strong>LE DUO. −10 %.</strong><span>Combine deux modèles différents. Trois ou plus ? Le rabais passe à −15 % automatiquement.</span><a href="index.html#collection">COMPOSER UN ENSEMBLE ↗</a></p>
    <p class="preview-note">Compose ton panier sans paiement immédiat. Les commandes et les frais de livraison seront confirmés avant toute vente.</p>
    <div class="proof-grid"><div><span>01 / ORIGINE</span><b>IMAGINÉ AU QUÉBEC</b></div><div><span>02 / COUPE</span><b>${p.fit}</b></div><div><span>03 / DÉTAIL</span><b>${p.material}</b></div><div><span>04 / DISPONIBILITÉ</span><b>AVANT-VENTE NON OUVERTE</b></div></div>
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
  <span class="eyebrow">1608 / L'INTENTION DERRIÈRE LA PIÈCE</span>
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
$$('[data-size]').forEach(btn=>btn.addEventListener('click',()=>{chosenSize=btn.dataset.size;$$('[data-size]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));$('[data-size-error]').textContent='';const feedback=$('[data-size-feedback]');if(feedback)feedback.textContent='TAILLE '+chosenSize+' SÉLECTIONNÉE ✓';}));
$('[data-guide-open]')?.addEventListener('click',()=>{const details=$('[data-size-guide]');details.open=true;details.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'center'});});
$('[data-qty-minus]')?.addEventListener('click',()=>{quantity=Math.max(1,quantity-1);$('[data-quantity]').textContent=quantity});
$('[data-qty-plus]')?.addEventListener('click',()=>{quantity=Math.min(10,quantity+1);$('[data-quantity]').textContent=quantity});
function purchase(){if(!chosenSize){$('[data-size-error]').textContent='Choisis une taille avant d’ajouter au panier.';$('[data-size-list-placeholder]')?.scrollIntoView({behavior:reduceMotion?'auto':'smooth',block:'center'});$$('[data-size]')[0]?.focus();return}addToCart(p.id,chosenSize,quantity)}
$('[data-add-main]')?.addEventListener('click',purchase);
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
