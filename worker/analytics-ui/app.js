/* Analytique 1608 : tout le contenu dynamique est inséré avec textContent / attributs SVG (aucun innerHTML). */
(()=>{'use strict';
const $=s=>document.querySelector(s),NS='http://www.w3.org/2000/svg';
const money=c=>(c/100).toFixed(2).replace('.',',')+' $';
const num=n=>new Intl.NumberFormat('fr-CA').format(n);
const NAMES=window.__NAMES||{};
let range='24h',data=null,live=[],orders=[];
const el=(t,x,c)=>{const e=document.createElement(t);if(x!=null)e.textContent=x;if(c)e.className=c;return e};
function delta(id,cur,prev,isMoney){
 const d=$(id);d.className='delta';d.textContent='';
 if(!prev&&!cur){return}
 if(!prev){d.textContent='nouveau';return}
 const p=Math.round((cur-prev)/prev*100);d.classList.add(p>=0?'up':'down');d.textContent=(p>=0?'▲ ':'▼ ')+Math.abs(p)+' % vs période précédente';
}
function bars(id,rows,cls){
 const box=$(id);box.textContent='';
 if(!rows.length){box.append(el('p','Aucune donnée pour l’instant.','muted small'));return}
 const max=Math.max(...rows.map(r=>r.v),1);
 rows.forEach(r=>{const row=el('div',null,'row');row.append(el('span',r.l,'lb'),el('span',num(r.v),'vl'));const b=el('div',null,'bar '+(cls||'')),i=document.createElement('i');i.style.width=Math.max(3,Math.round(r.v/max*100))+'%';b.append(i);row.append(b);box.append(row)});
}
function funnel(f,sessions){
 const box=$('#funnel');box.textContent='';
 const steps=[['Sessions',sessions],['Ont vu une pièce',f.product||0],['Ajout au panier',f.cart||0],['Passage en caisse',f.checkout||0],['Commande',f.purchase||0]];
 steps.forEach(([l,v],i)=>{const pct=sessions?Math.round(v/sessions*100):0;const row=el('div',null,'fun');row.append(el('span',l+(i?' · '+pct+' %':'')),el('span',num(v),'vl'));const b=el('div',null,'bar'),bi=document.createElement('i');bi.style.width=Math.max(2,pct)+'%';b.append(bi);row.append(b);box.append(row)});
}
function chart(series,orderSeries){
 const svg=$('#chart');svg.textContent='';
 const pts=series;if(!pts.length){$('#axis').textContent='';return}
 const max=Math.max(...pts.map(p=>p.v),1),W=400,H=100,n=pts.length;
 const x=i=>n===1?W/2:i/(n-1)*W,y=v=>H-6-v/max*(H-14);
 const line=pts.map((p,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(p.v).toFixed(1)).join(' ');
 const a=document.createElementNS(NS,'path');a.setAttribute('d',line+` L${x(n-1)} ${H} L${x(0)} ${H} Z`);a.setAttribute('class','ar');svg.append(a);
 const l=document.createElementNS(NS,'path');l.setAttribute('d',line);l.setAttribute('class','ln');svg.append(l);
 const om=Object.fromEntries(orderSeries.map(o=>[o.b,o.v]));
 pts.forEach((p,i)=>{if(om[p.b]){const c=document.createElementNS(NS,'circle');c.setAttribute('cx',x(i));c.setAttribute('cy',y(p.v));c.setAttribute('r','3.2');c.setAttribute('class','od');svg.append(c)}});
 const fmt=b=>range==='24h'?new Date(b+':00:00Z').toLocaleTimeString('fr-CA',{hour:'2-digit',minute:'2-digit'}):new Date(b+'T12:00:00Z').toLocaleDateString('fr-CA',{day:'numeric',month:'short'});
 $('#axis').textContent='';$('#axis').append(el('span',fmt(pts[0].b)),el('span',fmt(pts[n-1].b)));
}
function render(d){
 data=d;$('#state').textContent='';
 $('#k-live').textContent=num(d.live);$('#k-sales').textContent=money(d.sales);$('#k-sessions').textContent=num(d.sessions);$('#k-orders').textContent=num(d.orders);
 delta('#d-sales',d.sales,d.prev.sales);delta('#d-sessions',d.sessions,d.prev.sessions);delta('#d-orders',d.orders,d.prev.orders);
 chart(d.series,d.orderSeries);funnel(d.funnel,d.sessions);
 bars('#locs',d.locations.map(r=>({l:r.city+' · '+r.country,v:r.c})));
 bars('#prods',d.products.map(r=>({l:NAMES[r.product]||r.product,v:r.c})),'b2');
 bars('#pages',d.pages.map(r=>({l:r.path==='/'||r.path==='/index.html'?'Accueil':r.path.replace(/^\//,''),v:r.c})));
 const dn={mobile:'Téléphone',desktop:'Ordinateur',tablet:'Tablette'};
 bars('#devs',d.devices.map(r=>({l:dn[r.device]||r.device,v:r.c})),'b2');
 bars('#refs',d.refs.map(r=>({l:r.ref,v:r.c})));
 live=d.livePoints;orders=d.orderPoints;
}
async function load(){
 try{const r=await fetch('/api/stats?range='+range,{credentials:'same-origin'});if(!r.ok)throw new Error(r.status===403?'Accès refusé.':'Erreur '+r.status);render(await r.json())}
 catch(e){$('#state').textContent=e.message}
}
document.querySelectorAll('#range button').forEach(b=>b.addEventListener('click',()=>{range=b.dataset.r;document.querySelectorAll('#range button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));load()}));
/* ---------- globe ---------- */
const cv=$('#globe'),cx=cv.getContext('2d');
let lon0=-70,lat0=40,zoom=1,dragging=false,last=null,auto=true,dpr=1,W=0,H=0,t0=performance.now();
const L=window.LAND,RINGS=[];
/* Contours réels des terres (Natural Earth 110m), décodés puis densifiés pour bien épouser la sphère. */
if(L){const D=Math.PI/180;L.r.forEach(f=>{let x=f[0],y=f[1];const pts=[[x*L.u,y*L.u]];for(let k=2;k<f.length;k+=2){x+=f[k];y+=f[k+1];pts.push([x*L.u,y*L.u])}
 const out=[];for(let k=0;k<pts.length;k++){const a=pts[k],b=pts[(k+1)%pts.length],n=Math.max(1,Math.ceil(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))/2));for(let t=0;t<n;t++){const lo=(a[0]+(b[0]-a[0])*t/n)*D,la=(a[1]+(b[1]-a[1])*t/n)*D;out.push([Math.cos(la)*Math.sin(lo),Math.sin(la),Math.cos(la)*Math.cos(lo)])}}
 RINGS.push(out)})}
function size(){const r=cv.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);W=r.width;H=r.height;cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0)}
function proj(lat,lon,R,cxp,cyp){const φ=lat,λ=lon-lon0*Math.PI/180,φ0=lat0*Math.PI/180;const c=Math.sin(φ0)*Math.sin(φ)+Math.cos(φ0)*Math.cos(φ)*Math.cos(λ);if(c<=0)return null;return[cxp+R*Math.cos(φ)*Math.sin(λ),cyp-R*(Math.cos(φ0)*Math.sin(φ)-Math.sin(φ0)*Math.cos(φ)*Math.cos(λ)),c]}
function frame(now){
 requestAnimationFrame(frame);if(document.hidden||!W)return;
 if(auto&&!dragging)lon0+=0.03;
 const R=Math.min(W,H)*0.44*zoom,mx=W/2,my=H/2;cx.clearRect(0,0,W,H);
 const g=cx.createRadialGradient(mx-R*.3,my-R*.35,R*.1,mx,my,R);g.addColorStop(0,'#eef8fb');g.addColorStop(1,'#cfe6f7');
 cx.fillStyle=g;cx.beginPath();cx.arc(mx,my,R,0,7);cx.fill();
 const sl=Math.sin(lat0*Math.PI/180),cl=Math.cos(lat0*Math.PI/180),sb=Math.sin(lon0*Math.PI/180),cb=Math.cos(lon0*Math.PI/180);
 /* grille discrète */
 cx.strokeStyle='rgba(60,110,150,.10)';cx.lineWidth=.6;
 for(let la=-60;la<=60;la+=30){cx.beginPath();let on=false;for(let lo=-180;lo<=180;lo+=4){const p=proj(la*Math.PI/180,lo*Math.PI/180,R,mx,my);if(!p){on=false;continue}on?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]);on=true}cx.stroke()}
 for(let lo=-180;lo<180;lo+=30){cx.beginPath();let on=false;for(let la=-90;la<=90;la+=4){const p=proj(la*Math.PI/180,lo*Math.PI/180,R,mx,my);if(!p){on=false;continue}on?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]);on=true}cx.stroke()}
 /* terres : surfaces pleines ; les points derrière l'horizon sont ramenés sur le bord du globe */
 cx.fillStyle='#d9e4dc';cx.strokeStyle='#8fa89c';cx.lineWidth=.8;cx.lineJoin='round';
 for(const ring of RINGS){
  let vis=false;const pts=new Array(ring.length);
  for(let k=0;k<ring.length;k++){const v=ring[k];
   const x1=v[0]*cb-v[2]*sb,z1=v[0]*sb+v[2]*cb,y1=v[1];
   const y2=y1*cl-z1*sl,z2=y1*sl+z1*cl;
   let px=x1,py=y2;if(z2<0){const m=Math.hypot(px,py)||1;px/=m;py/=m}else vis=true;
   pts[k]=[mx+px*R,my-py*R]}
  if(!vis)continue;
  cx.beginPath();cx.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)cx.lineTo(pts[k][0],pts[k][1]);cx.closePath();cx.fill();cx.stroke()}
 const t=(now-t0)/1000;
 for(const v of live){const p=proj(v.lat*Math.PI/180,v.lon*Math.PI/180,R,mx,my);if(!p)continue;const k=(t%2)/2;cx.fillStyle='rgba(47,111,214,.25)';cx.beginPath();cx.arc(p[0],p[1],4+k*14,0,7);cx.fill();cx.fillStyle='#2f6fd6';cx.beginPath();cx.arc(p[0],p[1],4,0,7);cx.fill()}
 for(const o of orders){const p=proj(o.lat*Math.PI/180,o.lon*Math.PI/180,R,mx,my);if(!p)continue;cx.fillStyle='#7c5cf0';cx.beginPath();cx.arc(p[0],p[1],5,0,7);cx.fill();cx.strokeStyle='#fff';cx.lineWidth=1.5;cx.stroke();cx.beginPath();cx.moveTo(p[0],p[1]);cx.lineTo(p[0],p[1]-14);cx.strokeStyle='#7c5cf0';cx.stroke();cx.beginPath();cx.arc(p[0],p[1]-16,4,0,7);cx.fillStyle='#7c5cf0';cx.fill()}
}
cv.addEventListener('pointerdown',e=>{dragging=true;auto=false;last=[e.clientX,e.clientY];cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',e=>{if(!dragging)return;const k=.25/zoom;lon0-=(e.clientX-last[0])*k;lat0=Math.max(-80,Math.min(80,lat0+(e.clientY-last[1])*k));last=[e.clientX,e.clientY]});
cv.addEventListener('pointerup',()=>{dragging=false});
cv.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.7,Math.min(3,zoom*(e.deltaY<0?1.1:.9)))},{passive:false});
$('#zin').onclick=()=>{zoom=Math.min(3,zoom*1.25)};$('#zout').onclick=()=>{zoom=Math.max(.7,zoom/1.25)};$('#home').onclick=()=>{lon0=-70;lat0=40;zoom=1;auto=true};
window.addEventListener('resize',size);size();requestAnimationFrame(frame);
load();setInterval(load,30000);
})();
