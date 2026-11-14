/* Guides de tailles vérifiés sur les captures du fournisseur. Les mesures sont celles
   du vêtement posé à plat et chaque tableau correspond à sa référence produit. */
(() => {
  'use strict';
  const GUIDES=Object.freeze({
    'signature-brode':{
      name:'SIGNATURE 1608',ref:'RU0118',type:'standard',
      columns:['LONGUEUR','ÉPAULES','POITRINE À PLAT','MANCHES'],
      rows:[['S',63,53,61,55],['M',65,55,63,56],['L',67,57,65,57],['XL',69,59,67,58],['2XL',71,61,69,60]]
    },
    'terrain-camo':{
      name:'TERRAIN 1608',ref:'UT0347',type:'standard',
      columns:['LONGUEUR','ÉPAULES','POITRINE À PLAT','MANCHES'],
      rows:[['S',62,62,68,53],['M',64,64,70,54],['L',66,66,72,55],['XL',68,68,74,56],['2XL',70,70,76,57]]
    },
    'horizon-noir':{
      name:'HORIZON 1608',ref:'RO0286',type:'standard',
      columns:['LONGUEUR','ÉPAULES','POITRINE À PLAT','MANCHES'],
      rows:[['S',70,65,66,53.5],['M',72,67,68,54.5],['L',74,69,70,55.5],['XL',76,71,72,56.5],['2XL',78,73,74,57.5]]
    },
    'contraste-marine':{
      name:'CONTRASTE 1608',ref:'UT0280',type:'raglan',
      columns:['LONGUEUR','POITRINE À PLAT','MANCHES RAGLAN'],
      rows:[['S',65,63,82],['M',67,65,83.5],['L',69,67,85],['XL',71,69,86.5],['2XL',73,71,88]]
    }
  });
  function diagramFor(type){
    if(type==='raglan'){
      return '<svg viewBox="0 0 320 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schéma raglan : 1 longueur du vêtement, 2 poitrine à plat, 3 longueur de manche raglan.">'+
       '<g fill="#f5f6f2" stroke="#263027" stroke-width="2" stroke-linejoin="round">'+
       '<path d="M140 35 Q131 15 160 12 Q189 15 180 35 L217 52 263 89 307 230 268 244 225 126 221 272 99 272 95 126 52 244 13 230 57 89 103 52Z"/>'+
       '<path d="M140 35 Q160 60 180 35 M103 52 Q125 78 110 126 M217 52 Q195 78 210 126 M99 272 H221" fill="none"/>'+
       '</g>'+
       '<g fill="none" stroke="#879d86" stroke-width="3" stroke-linecap="round">'+
       '<path d="M160 68 V269 M99 137 H221 M194 35 L243 88 L285 234"/>'+
       '</g>'+
       '<g fill="#283e2b"><circle cx="176" cy="174" r="13"/><circle cx="160" cy="137" r="13"/><circle cx="252" cy="119" r="13"/></g>'+
       '<g fill="#fff" font-family="Arial,sans-serif" font-size="12" font-weight="700" text-anchor="middle">'+
       '<text x="176" y="178">1</text><text x="160" y="141">2</text><text x="252" y="123">3</text></g></svg>';
    }
    return '<svg viewBox="0 0 320 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schéma d’un hoodie : 1 longueur, 2 épaules, 3 poitrine à plat, 4 manches.">'+
      '<g fill="#f4f5f0" stroke="#263027" stroke-width="2" stroke-linejoin="round">'+
      '<path d="M136 37 Q120 10 160 8 Q200 10 184 37 L207 53 250 73 308 180 273 201 228 128 222 267 98 267 92 128 47 201 12 180 70 73 113 53Z"/>'+
      '<path d="M136 37 Q158 59 160 63 Q163 59 184 37M113 53 Q160 76 207 53M98 267 H222" fill="none"/>'+
      '</g>'+
      '<g fill="none" stroke="#879d86" stroke-width="3" stroke-linecap="round"><path d="M160 73 V260 M117 56 H203 M99 130 H221 M238 84 L293 178"/></g>'+
      '<g fill="#283e2b"><circle cx="175" cy="170" r="13"/><circle cx="160" cy="55" r="13"/><circle cx="157" cy="130" r="13"/><circle cx="269" cy="122" r="13"/></g>'+
      '<g fill="#fff" font-family="Arial,sans-serif" font-size="12" font-weight="700" text-anchor="middle">'+
      '<text x="175" y="175">1</text><text x="160" y="59">2</text><text x="157" y="134">3</text><text x="269" y="126">4</text>'+
      '</g></svg>';
  }
  function buildModal(g){
    const entries=g.rows.map(row=>'<tr><th scope="row">'+row[0]+'</th>'+row.slice(1).map(n=>'<td data-value-cm="'+n+'">'+n+'</td>').join('')+'</tr>').join('');
    const columns=g.columns.map(col=>'<th scope="col">'+col+'</th>').join('');
    const standardSteps=[
      '<li><strong>Longueur</strong><p>Du point où la couture de l’épaule rejoint le col jusqu’au bas du vêtement.</p></li>',
      '<li><strong>Épaules</strong><p>D’une couture d’épaule à l’autre.</p></li>',
      '<li><strong>Poitrine à plat</strong><p>D’un côté à l’autre, juste sous les aisselles. Ce n’est pas le tour de poitrine.</p></li>',
      '<li><strong>Manches</strong><p>De la jonction de l’épaule à la manche jusqu’au poignet.</p></li>'
    ];
    const raglanSteps=[
      '<li><strong>Longueur</strong><p>Du haut du vêtement, près du col, jusqu’au bas.</p></li>',
      '<li><strong>Poitrine à plat</strong><p>D’un côté à l’autre, juste sous les aisselles. Ce n’est pas le tour de poitrine.</p></li>',
      '<li><strong>Manches raglan</strong><p>Suivre la ligne du schéma, depuis le haut de la manche près du col jusqu’au poignet.</p></li>'
    ];
    return [
      '<dialog class="sizeguide-modal" data-sizeguide-modal aria-labelledby="sizeguide-title" aria-describedby="sizeguide-description">',
      '<div class="sizeguide-head"><div><span class="sizeguide-overline">1608 / '+g.name+' / '+g.ref+'</span><h2 id="sizeguide-title">GUIDE DES TAILLES<span>.</span></h2></div><button type="button" class="sizeguide-dismiss" data-sizeguide-close aria-label="Fermer le guide">×</button></div>',
      '<div class="sizeguide-body">',
      '<p id="sizeguide-description" class="sizeguide-intro">Mesures du vêtement à plat, fournies pour <strong>'+g.name+'</strong>. Une variation de <strong>1 à 3 cm</strong> est possible.</p>',
      '<div class="sizeguide-tabs" role="group" aria-label="Unités de mesure"><button type="button" data-sizeguide-unit="cm" aria-pressed="true">CENTIMÈTRES</button><button type="button" data-sizeguide-unit="in" aria-pressed="false">POUCES</button></div>',
      '<div class="sizeguide-scroll" role="region" aria-label="Tableau des mesures défilable" tabindex="0"><table class="sizeguide-table"><caption>Mesures du vêtement '+g.name+'</caption><thead><tr><th scope="col">TAILLE</th>'+columns+'</tr></thead><tbody>',entries,'</tbody></table></div>',
      '<div class="sizeguide-bottom"><div class="sizeguide-how"><h3>COMMENT MESURER</h3><ol>',(g.type==='raglan'?raglanSteps:standardSteps).join(''),'</ol></div><figure class="sizeguide-figure">',diagramFor(g.type),'<figcaption>MESURES À PLAT / SCHÉMA INDICATIF</figcaption></figure></div>',
      '<div class="sizeguide-foot"><span>Variation possible de 1 à 3 cm selon la fabrication.</span><button type="button" data-sizeguide-close>FERMER LE GUIDE ↗</button></div>',
      '</div></dialog>'
    ].join('');
  }
  function mount(){
    const productId=document.body?.dataset.productId;
    const guide=GUIDES[productId];
    if(!guide)return;
    document.body.insertAdjacentHTML('beforeend',buildModal(guide));
    const modal=document.querySelector('[data-sizeguide-modal]');
    if(!modal)return;
    document.querySelector('[data-size-guide]')?.remove();
    const openGuide=()=>{
      if(!modal.open && typeof modal.showModal==='function')modal.showModal();
      else if(!modal.open)modal.setAttribute('open','');
    };
    let opener=null;
    // Intercepter avant le gestionnaire générique du site.
    document.addEventListener('click',event=>{
      const btn=event.target.closest('[data-guide-open]');
      if(!btn)return;
      event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
      opener=btn;
      openGuide();
    },true);
    modal.querySelectorAll('[data-sizeguide-close]').forEach(btn=>btn.addEventListener('click',()=>modal.close()));
    modal.querySelectorAll('[data-sizeguide-unit]').forEach(btn=>btn.addEventListener('click',()=>{
      const cm=btn.dataset.sizeguideUnit==='cm';
      modal.querySelectorAll('[data-sizeguide-unit]').forEach(item=>item.setAttribute('aria-pressed',String(item===btn)));
      modal.querySelectorAll('[data-value-cm]').forEach(td=>{
        const value=Number(td.dataset.valueCm);
        td.textContent=cm?String(value):(value/2.54).toFixed(2);
      });
    }));
    modal.addEventListener('click',event=>{if(event.target===modal)modal.close()});
    modal.addEventListener('close',()=>{if(opener?.isConnected)opener.focus()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
