/* 1608 / ATELIER — subtle interactions, no decorative scroll animations. */
(() => {
 'use strict';
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const ready=()=>{
  const header=document.querySelector('.site-header');
  if(header){
   let pending=false;
   window.addEventListener('scroll',()=>{
    if(pending)return;pending=true;
    requestAnimationFrame(()=>{header.classList.toggle('is-scrolled',scrollY>18);pending=false;});
   },{passive:true});
   header.classList.toggle('is-scrolled',scrollY>18);
  }
  // Only one question expanded at a time.
  const faqs=[...document.querySelectorAll('.atelier-faq-list details')];
  faqs.forEach(item=>item.addEventListener('toggle',()=>{
   if(!item.open)return;
   faqs.forEach(other=>{if(other!==item)other.open=false;});
  }));
  // Gesture support for front/back photos. Uses native thumbnail button handlers.
  if(document.body.dataset.page==='product'){
   const gallery=document.querySelector('[data-gallery-main]');
   if(!gallery)return;
   let start=null;
   gallery.addEventListener('touchstart',event=>{
    const touch=event.changedTouches[0];
    if(touch)start={x:touch.clientX,y:touch.clientY};
   },{passive:true});
   gallery.addEventListener('touchend',event=>{
    if(!start)return;
    const touch=event.changedTouches[0];if(!touch)return;
    const dx=touch.clientX-start.x,dy=touch.clientY-start.y;start=null;
    if(Math.abs(dx)<45||Math.abs(dx)<Math.abs(dy)*1.5)return;
    const active=document.querySelector('[data-gallery-thumb][aria-pressed="true"]');
    const idx=Number(active?.dataset.galleryThumb||0);
    const next=dx<0?Math.min(1,idx+1):Math.max(0,idx-1);
    if(next!==idx)document.querySelector('[data-gallery-thumb="'+next+'"]')?.click();
   },{passive:true});
  }
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
 else ready();
})();
