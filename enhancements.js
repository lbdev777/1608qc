/* 1608 / interactions additionnelles. Aucune vente réelle avant configuration du paiement. */
(() => {
  'use strict';
  const horizon=PRODUCTS.find(product=>product.id==='horizon-noir');
  if(!horizon) return;
  const byId=id=>document.getElementById(id);

  // Présenter chaque pièce comme un objet de design, avec les vraies vues avant/arrière.
  document.querySelectorAll('.product-card').forEach((card,i)=>{
    const p=PRODUCTS[i];
    if(!p)return;
    const stage=card.querySelector('.product-visual');
    const current=stage&&stage.querySelector('img');
    if(stage&&current&&p.images&&p.images[1]){
      const second=document.createElement('img');
      second.src=p.images[1];second.alt='';second.setAttribute('aria-hidden','true');
      second.loading='lazy';second.width=900;second.height=900;second.className='flip-preview';
      stage.appendChild(second);
    }
    const badge=stage?.querySelector('.product-label');
    if(badge)badge.textContent=`1608 / ${String(i+1).padStart(3,'0')}`;
    const quick=document.createElement('span');
    quick.className='product-quickview';quick.innerHTML='VOIR LES DÉTAILS <b aria-hidden="true">↗</b>';
    stage?.appendChild(quick);
    const details=card.querySelector('.product-details');
    const name=details?.querySelector('.product-name');
    const price=details?.querySelector('.price');
    if(details&&name&&price){
      const top=document.createElement('div');top.className='product-headline';
      details.insertBefore(top,name);top.append(name,price);
    }
    const note=details?.querySelector('.product-note');
    if(note)note.textContent=i===0?'COUPE BOXY · CAMO FORÊT':i===1?'COUPE OVERSIZED · NOIR':i===2?'BRODERIE · COUPE BOXY':'RAGLAN · MARINE / IVOIRE';
    const opener=card.querySelector('button');
    if(opener)opener.setAttribute('aria-label','Voir '+p.name+' — '+money(p.price));
  });

  // Pièce éditoriale n°2, placée comme un vrai mini-lookbook.
  const section=document.createElement('section');
  section.className='horizon-spotlight';
  section.setAttribute('aria-labelledby','horizon-heading');
  section.innerHTML=`
    <div class="horizon-copy">
      <div class="horizon-topline"><span>1608 / 002</span><span>LE MONDE EN NOIR ET BLANC.</span></div>
      <div class="horizon-maincopy">
        <p class="section-tag">DEUXIÈME PIÈCE / NOIR INTÉGRAL</p>
        <h2 id="horizon-heading">HORIZON<span>1608.</span></h2>
        <p>Discret à l'avant. Une autre perspective à l'arrière. La signature 1608 rencontre un globe graphique sur une silhouette oversized.</p>
        <div class="horizon-price">69,00 $ CAD <small>· S — 2XL</small></div>
        <button class="horizon-cta" id="horizon-open" type="button">DÉCOUVRIR HORIZON <span aria-hidden="true">↗</span></button>
      </div>
      <div class="horizon-bottomline"><span>MILLE-SIX-CENT-HUIT</span><span>02 / 04</span></div>
    </div>
    <div class="horizon-gallery" aria-label="Photographies du coton ouaté HORIZON 1608">
      <button class="horizon-shot" type="button" data-horizon-view="0" aria-label="Vue avant de HORIZON 1608"><img src="${horizon.images[0]}" alt="Coton ouaté noir, logo blanc 1608 sur la poitrine" loading="lazy" width="320" height="320"><span>01 / DEVANT <b>↗</b></span></button>
      <button class="horizon-shot" type="button" data-horizon-view="1" aria-label="Vue arrière de HORIZON 1608"><img src="${horizon.images[1]}" alt="Coton ouaté noir, globe et inscription Mille-Six-Cent-Huit dans le dos" loading="lazy" width="320" height="320"><span>02 / DOS <b>↗</b></span></button>
    </div>`;
  document.querySelector('.products-section')?.before(section);

  // Les pastilles de taille utilisent le sélecteur existant comme source de vérité.
  const originalOpen=openProduct;
  openProduct=function(id){
    originalOpen(id);
    const chipArea=byId('size-chips');
    const select=byId('size-select');
    if(!chipArea||!select)return;
    chipArea.replaceChildren();
    currentProduct.sizes.forEach(size=>{
      const chip=document.createElement('button');
      chip.type='button';chip.className='size-chip';chip.textContent=size;
      chip.setAttribute('aria-pressed','false');
      chip.addEventListener('click',()=>{
        select.value=size;
        chipArea.querySelectorAll('button').forEach(item=>item.setAttribute('aria-pressed',String(item===chip)));
        byId('product-message').textContent='';
      });
      chipArea.appendChild(chip);
    });
    // Les miniatures doivent toujours correspondre au produit choisi.
    syncThumbnails(0);
  };
  const originalSetImage=setProductImage;
  function syncThumbnails(index){
    const images=currentProduct?.images||[];
    document.querySelectorAll('[data-product-view]').forEach(btn=>{
      const n=Number(btn.dataset.productView);
      const img=btn.querySelector('img');
      if(img&&images[n])img.src=images[n];
      btn.hidden=!images[n];
      btn.setAttribute('aria-pressed',String(n===index));
    });
  }
  setProductImage=function(index){
    originalSetImage(index);
    syncThumbnails(index);
    const img=byId('modal-img');
    if(img?.animate&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      img.animate([{opacity:.6,transform:'scale(.978)'},{opacity:1,transform:'scale(1)'}],{duration:240,easing:'ease-out'});
    }
  };
  const sizeSelect=byId('size-select');
  if(sizeSelect){
    sizeSelect.classList.add('visually-hidden');
    const chipArea=document.createElement('div');
    chipArea.id='size-chips';chipArea.className='size-chips';chipArea.setAttribute('role','group');chipArea.setAttribute('aria-label','Choisir une taille');
    sizeSelect.after(chipArea);
  }
  byId('horizon-open')?.addEventListener('click',()=>openProduct(horizon.id));
  section.querySelectorAll('[data-horizon-view]').forEach(btn=>btn.addEventListener('click',()=>{
    openProduct(horizon.id);
    setProductImage(Number(btn.dataset.horizonView));
  }));

  const count=document.querySelector('.catalogue-count');
  if(count)count.textContent=`${String(PRODUCTS.length).padStart(3,'0')} PIÈCES`;
  const announcement=document.querySelector('.announcement span');
  if(announcement)announcement.textContent='1608 / QUATRE PIÈCES. UNE DIRECTION.';

  // Prévisualisation clairement annoncée : ne jamais feindre d'avoir encaissé une commande.
  const checkoutButton=byId('checkout-button');
  if(checkoutButton){
    checkoutButton.firstChild.textContent='CAISSE EN PRÉPARATION ';
    checkoutButton.addEventListener('click',event=>{
      event.preventDefault();event.stopImmediatePropagation();
      byId('checkout-message').textContent='La boutique est en prévisualisation. Le paiement n’est pas encore activé; le panier reste enregistré sur cet appareil.';
    },true);
  }
  const footerNote=document.querySelector('.drawer-footer>p');
  if(footerNote)footerNote.textContent='Aperçu interactif. Frais et livraison confirmés avant l’ouverture des commandes.';
  const questions=document.querySelectorAll('.faq-items details');
  if(questions[1])questions[1].querySelector('p').textContent='Les quatre modèles sont proposés en tailles S à 2XL. Le guide de mesures exact sera publié avant l’ouverture des ventes.';
  document.querySelectorAll('.product-full-button').forEach(btn=>btn.addEventListener('pointerdown',()=>{
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      btn.animate([{transform:'scale(1)'},{transform:'scale(.992)'},{transform:'scale(1)'}],{duration:180});
  }));
})();