/* 1608 / no tracking, no external dependency; preview effects only. */
(() => {
  'use strict';
  const teaser=document.querySelector('[data-teaser]');
  const trigger=document.querySelector('[data-reveal]');
  if(teaser&&trigger){
    trigger.addEventListener('click',()=>{
      const on=!teaser.closest('.teaser').classList.contains('is-revealed');
      teaser.closest('.teaser').classList.toggle('is-revealed',on);
      trigger.setAttribute('aria-pressed',String(on));
      const label=trigger.querySelector('[data-reveal-label]');
      if(label)label.textContent=on?'REFERMER L’APERÇU':'DÉVOILER UN DÉTAIL';
    });
  }
  const egg=document.querySelector('[data-secret-toggle]');
  const text=document.getElementById('secret-message');
  if(egg&&text)egg.addEventListener('click',()=>{
    const show=text.hidden;
    text.hidden=!show;
    egg.setAttribute('aria-expanded',String(show));
  });
})();
