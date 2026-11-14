/* SIGNATURE 1608 / RU0118
   Données fabricant fournies par la marque. Poitrine mesurée à plat. */
(() => {
 'use strict';
 if(!document.body || document.body.dataset.productId!=='signature-brode')return;
 const measurements=[
  ['S',63,53,61,55],
  ['M',65,55,63,56],
  ['L',67,57,65,57],
  ['XL',69,59,67,58],
  ['2XL',71,61,69,60]
 ];
 const entries=measurements.map(row=>'<tr><th scope="row">'+row[0]+'</th>'+row.slice(1).map(n=>'<td data-value-cm="'+n+'">'+n+'</td>').join('')+'</tr>').join('');
 const diagram='<svg viewBox="0 0 320 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schéma du chandail : 1 longueur, 2 épaules, 3 largeur de poitrine à plat et 4 longueur de manche.">'+
  '<g fill="#f4f5f0" stroke="#263027" stroke-width="2" stroke-linejoin="round">'+
   '<path d="M136 37 Q120 10 160 8 Q200 10 184 37 L207 53 250 73 308 180 273 201 228 128 222 267 98 267 92 128 47 201 12 180 70 73 113 53Z"/>'+
   '<path d="M136 37 Q158 59 160 63 Q163 59 184 37M113 53 Q160 76 207 53M98 267 H222" fill="none"/>'+
  '</g>'+
  '<g fill="none" stroke="#879d86" stroke-width="3" stroke-linecap="round"><path d="M160 73 V260 M117 56 H203 M99 130 H221 M238 84 L293 178"/></g>'+
  '<g fill="#283e2b"><circle cx="175" cy="170" r="13"/><circle cx="160" cy="55" r="13"/><circle cx="157" cy="130" r="13"/><circle cx="269" cy="122" r="13"/></g>'+
  '<g fill="#fff" font-family="Arial,sans-serif" font-size="12" font-weight="700" text-anchor="middle">'+
   '<text x="175" y="175">1</text><text x="160" y="59">2</text><text x="157" y="134">3</text><text x="269" y="126">4</text>'+
  '</g></svg>';
 const html=[
 '<dialog class="sizeguide-modal" data-sizeguide-modal aria-labelledby="sizeguide-title" aria-describedby="sizeguide-description" aria-modal="true">',
 '<div class="sizeguide-head"><div><span class="sizeguide-overline">1608 / SIGNATURE / RU0118</span><h2 id="sizeguide-title">GUIDE DES TAILLES<span>.</span></h2></div><button type="button" class="sizeguide-dismiss" data-sizeguide-close aria-label="Fermer le guide">×</button></div>',
 '<div class="sizeguide-body">',
 '<p id="sizeguide-description" class="sizeguide-intro">Mesures du vêtement à plat, fournies pour le <strong>SIGNATURE 1608</strong>. Une variation de <strong>1 à 3 cm</strong> est possible.</p>',
 '<div class="sizeguide-tabs" role="group" aria-label="Unités de mesure"><button type="button" data-sizeguide-unit="cm" aria-pressed="true">CENTIMÈTRES</button><button type="button" data-sizeguide-unit="in" aria-pressed="false">POUCES</button></div>',
 '<div class="sizeguide-scroll" role="region" aria-label="Tableau des mesures défilable" tabindex="0"><table class="sizeguide-table"><caption>Mesures du vêtement SIGNATURE 1608</caption><thead><tr><th scope="col">TAILLE</th><th scope="col">LONGUEUR</th><th scope="col">ÉPAULES</th><th scope="col">POITRINE À PLAT</th><th scope="col">MANCHES</th></tr></thead><tbody>',entries,'</tbody></table></div>',
 '<div class="sizeguide-bottom"><div class="sizeguide-how"><h3>COMMENT MESURER</h3><ol>',
 '<li><strong>Longueur</strong><p>Du point où la couture de l’épaule rejoint le col jusqu’au bas du vêtement.</p></li>',
 '<li><strong>Épaules</strong><p>D’une couture d’épaule à l’autre.</p></li>',
 '<li><strong>Poitrine à plat</strong><p>D’un côté à l’autre, juste sous les aisselles. Ce n’est pas le tour de poitrine.</p></li>',
 '<li><strong>Manches</strong><p>De la couture de l’épaule au poignet.</p></li>',
 '</ol></div><figure class="sizeguide-figure">',diagram,'<figcaption>MESURES À PLAT / SCHÉMA INDICATIF</figcaption></figure></div>',
 '<div class="sizeguide-foot"><span>Variation possible de 1 à 3 cm selon la fabrication.</span><button type="button" data-sizeguide-close>FERMER LE GUIDE ↗</button></div>',
 '</div></dialog>'
 ].join('');
 let opener=null;
 function mount(){
  document.body.insertAdjacentHTML('beforeend',html);
  const modal=document.querySelector('[data-sizeguide-modal]');
  if(!modal)return;
  // Do not present the previous generic disclaimer twice.
  document.querySelector('[data-size-guide]')?.remove();
  document.addEventListener('click',event=>{
   const btn=event.target.closest('[data-guide-open]');
   if(!btn)return;
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
   opener=btn;
   if(typeof modal.showModal==='function')modal.showModal();
   else modal.setAttribute('open','');
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
  modal.addEventListener('click',e=>{if(e.target===modal)modal.close()});
  modal.addEventListener('close',()=>{if(opener?.isConnected)opener.focus()});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
 else mount();
})();
