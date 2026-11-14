/* 1608 / mouvement : apparition au défilement, progression, en-tête. Sans dépendance. */
(()=>{
  'use strict';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root=document.documentElement;
  // barre de progression
  const bar=document.createElement('div');bar.className='qc-progress';bar.setAttribute('aria-hidden','true');document.body.appendChild(bar);
  let ticking=false;
  const onScroll=()=>{
    if(ticking)return;ticking=true;
    requestAnimationFrame(()=>{
      const max=root.scrollHeight-innerHeight;
      bar.style.transform='scaleX('+(max>0?Math.min(1,scrollY/max):0)+')';
      document.querySelector('.site-header')?.classList.toggle('is-scrolled',scrollY>8);
      ticking=false;
    });
  };
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  // apparition
  const SEL='.section-head,.filter-row,.product-card,.bundle-feature-copy>*,.bundle-feature-tile,.story>*,.faq-layout>*,.related .product-card,.product-gallery,.product-info>*,.breadcrumbs,.brand-gallery-grid figure,.checkout-intro,.checkout-layout>*,.cart-page>*';
  const io=('IntersectionObserver' in window&&!reduce)?new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-in');io.unobserve(e.target)}});
  },{rootMargin:'0px 0px -8% 0px',threshold:.08}):null;
  const seen=new WeakSet();
  const tag=()=>{
    document.querySelectorAll(SEL).forEach(el=>{
      if(seen.has(el))return;seen.add(el);
      if(!io){el.classList.add('is-in');return}
      const sibs=el.parentElement?[...el.parentElement.children].filter(c=>c.matches(SEL)):[];
      el.style.setProperty('--qc-i',String(Math.min(sibs.indexOf(el)%6,5)));
      el.classList.add('qc-reveal');io.observe(el);
    });
  };
  tag();
  new MutationObserver(tag).observe(document.body,{childList:true,subtree:true});
  // sécurité : rien ne reste caché
  setTimeout(()=>document.querySelectorAll('.qc-reveal:not(.is-in)').forEach(el=>{const r=el.getBoundingClientRect();if(r.top<innerHeight)el.classList.add('is-in')}),2500);
  // pastille du panier : petit rebond quand le nombre change
  const watch=()=>{
    const c=document.querySelector('.bag-count');if(!c||c.dataset.qc)return;c.dataset.qc='1';
    let last=c.textContent;
    new MutationObserver(()=>{if(c.textContent!==last){last=c.textContent;c.classList.remove('qc-bump');void c.offsetWidth;c.classList.add('qc-bump')}}).observe(c,{childList:true,characterData:true,subtree:true});
  };
  watch();setTimeout(watch,600);
})();
