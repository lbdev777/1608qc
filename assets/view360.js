/* 1608 / Vue 360° des pièces.
   Données : window.STORE_VIEW360[id] = { frames:[url, …] } — des photos réelles prises
   en rotation (idéalement 24 ou 36 images, même cadrage, fond uni).
   Sans photos tournantes pour un modèle, le visualiseur fait pivoter en 3D les deux vraies
   photos (devant / dos). Aucune image n'est générée ni inventée. */
window.STORE_VIEW360 = window.STORE_VIEW360 || Object.freeze({
  /* exemple :
  'orbite-noir': { frames: ['assets/360/orbite-noir-01.webp', 'assets/360/orbite-noir-02.webp', … ] }
  */
});
(()=>{
'use strict';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=(s,r=document)=>r.querySelector(s);
const mod=(n,m)=>((n%m)+m)%m;
let dlg=null,stateRef=null;

function framesFor(p){
  const m=(window.STORE_VIEW360||{})[p.id];
  return m&&Array.isArray(m.frames)&&m.frames.length>=8?m.frames:null;
}
function build(){
  if(dlg)return dlg;
  dlg=document.createElement('dialog');dlg.className='v360';dlg.setAttribute('aria-label','Vue 360° de la pièce');
  dlg.innerHTML=`<div class="v360-box">
    <header class="v360-head"><div><b class="v360-title"></b><span class="v360-mode"></span></div><button type="button" class="v360-close" data-close aria-label="Fermer la vue 360°">Fermer ✕</button></header>
    <div class="v360-stage" tabindex="0" role="application" aria-label="Zone de rotation. Glisse ou utilise les flèches gauche et droite pour tourner la pièce.">
      <div class="v360-frames" hidden><img class="v360-frame" alt="" draggable="false"></div>
      <div class="v360-card" hidden><div class="v360-card-in"><img class="v360-face v360-front" alt="" draggable="false"><img class="v360-face v360-back" alt="" draggable="false"></div></div>
      <span class="v360-hint" aria-hidden="true">← Glisse pour tourner →</span>
      <span class="v360-label" aria-live="polite"></span>
    </div>
    <footer class="v360-foot">
      <button type="button" class="v360-btn" data-left aria-label="Tourner vers la gauche">◀</button>
      <button type="button" class="v360-btn v360-play" data-auto aria-pressed="false">Rotation auto</button>
      <button type="button" class="v360-btn" data-right aria-label="Tourner vers la droite">▶</button>
      <button type="button" class="v360-btn v360-reset" data-reset>Face avant</button>
    </footer>
    <p class="v360-note"></p></div>`;
  document.body.appendChild(dlg);
  dlg.addEventListener('click',e=>{if(e.target===dlg||e.target.closest('[data-close]'))dlg.close()});
  dlg.addEventListener('close',()=>{if(stateRef){stateRef.stop();stateRef=null}});
  return dlg;
}
function open(p){
  const d=build();const frames=framesFor(p);
  $('.v360-title',d).textContent=p.name+' — '+p.variant;
  const stage=$('.v360-stage',d),fr=$('.v360-frames',d),card=$('.v360-card',d),label=$('.v360-label',d),note=$('.v360-note',d),hint=$('.v360-hint',d);
  hint.style.opacity='1';
  let pos=0,vel=0,auto=false,raf=0,dragging=false,lastX=0,lastT=0;
  const autoBtn=$('[data-auto]',d);
  let N,render,labelFor,perPx;
  if(frames){
    N=frames.length;fr.hidden=false;card.hidden=true;
    const img=$('.v360-frame',fr);img.alt=p.name+' — vue en rotation';
    frames.forEach(u=>{const i=new Image();i.src=u});
    $('.v360-mode',d).textContent='Vue 360° · '+N+' images';
    note.textContent='Photos réelles de la pièce, prises en rotation.';
    perPx=N/Math.max(320,stage.clientWidth||600)*1.15;
    render=()=>{const i=mod(Math.round(pos),N);img.src=frames[i];const deg=Math.round(i/N*360);label.textContent=deg+'°'};
  }else{
    N=360;fr.hidden=true;card.hidden=false;
    const f=$('.v360-front',card),b=$('.v360-back',card),inn=$('.v360-card-in',card);
    f.src=p.photos[0];f.alt=p.name+' — devant';b.src=p.photos[1]||p.photos[0];b.alt=p.name+' — dos';
    $('.v360-mode',d).textContent='Rotation devant / dos';
    note.textContent='Les deux vraies photos du modèle pivotent en 3D. La vue 360° complète sera disponible dès que des photos en rotation auront été ajoutées pour cette pièce.';
    perPx=360/Math.max(320,stage.clientWidth||600)*1.1;
    render=()=>{const a=mod(pos,360);inn.style.transform='rotateY('+a+'deg)';const front=a<90||a>270;label.textContent=Math.abs(a-180)<35?'DOS':(a<35||a>325)?'DEVANT':front?'¾ AVANT':'¾ ARRIÈRE'};
  }
  render();
  const step=()=>{
    if(!dragging){
      if(auto)pos+=frames?0.18:0.9;
      if(Math.abs(vel)>0.01){pos+=vel;vel*=0.93}else vel=0;
      render();
    }
    raf=requestAnimationFrame(step);
  };
  const setAuto=v=>{auto=v;autoBtn.setAttribute('aria-pressed',String(v));autoBtn.textContent=v?'Pause':'Rotation auto'};
  const nudge=dir=>{setAuto(false);pos+=dir*(frames?1:20);render()};
  const down=e=>{dragging=true;lastX=e.clientX;lastT=performance.now();vel=0;setAuto(false);hint.style.opacity='0';stage.setPointerCapture(e.pointerId);stage.classList.add('is-drag')};
  const move=e=>{if(!dragging)return;const dx=e.clientX-lastX,now=performance.now();pos-=dx*perPx*(frames?1:-1);const dt=Math.max(1,now-lastT);vel=-dx*perPx*(frames?1:-1)/dt*14;lastX=e.clientX;lastT=now;render()};
  const up=()=>{dragging=false;stage.classList.remove('is-drag');if(Math.abs(vel)>6)vel=Math.sign(vel)*6};
  stage.onpointerdown=down;stage.onpointermove=move;stage.onpointerup=up;stage.onpointercancel=up;
  stage.onkeydown=e=>{if(e.key==='ArrowLeft'){e.preventDefault();nudge(-1)}else if(e.key==='ArrowRight'){e.preventDefault();nudge(1)}else if(e.key===' '){e.preventDefault();setAuto(!auto)}};
  $('[data-left]',d).onclick=()=>nudge(-1);$('[data-right]',d).onclick=()=>nudge(1);
  autoBtn.onclick=()=>setAuto(!auto);
  $('[data-reset]',d).onclick=()=>{setAuto(false);vel=0;pos=0;render()};
  if(!reduce){setAuto(true)}
  stateRef={stop:()=>cancelAnimationFrame(raf),get pos(){return pos},get N(){return N}};
  window.__v360=stateRef;
  raf=requestAnimationFrame(step);
  d.showModal();stage.focus();
}
function inject(){
  const thumbs=$('.gallery-thumbs');if(!thumbs||$('.view360-btn'))return;
  const id=document.body.dataset.productId;const p=(window.STORE_PRODUCTS||[]).find(x=>x.id===id);if(!p)return;
  const b=document.createElement('button');b.type='button';b.className='view360-btn';
  b.innerHTML='<span class="view360-ico" aria-hidden="true">360°</span><span><b>Voir en 3D</b><small>'+(framesFor(p)?'Rotation complète, photos réelles':'Faire tourner devant / dos')+'</small></span>';
  b.addEventListener('click',()=>open(p));
  thumbs.after(b);
}
const start=()=>{inject();new MutationObserver(inject).observe(document.body,{childList:true,subtree:true})};
if(document.readyState==='loading')addEventListener('DOMContentLoaded',start);else start();
})();
