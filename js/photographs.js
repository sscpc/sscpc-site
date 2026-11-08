/* Spectrum 2026 photographs page.
   Shows only: photo, photo name, photographer name and school (from SPECTRUM_PHOTOS in js/data.js, edited in Admin > Photographs).
   The order is shuffled every time the page is opened. */
(function(){
  const grid=document.getElementById('ph-grid');
  if(!grid||typeof SPECTRUM_PHOTOS==='undefined')return;
  const list=SPECTRUM_PHOTOS.filter(p=>p&&p.photo);
  for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]]}
  const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
  const thumb=p=>{const k=p.lastIndexOf('/');return p.slice(0,k+1)+'thumbs/'+p.slice(k+1)};
  const alt=p=>(p.title||'Photograph')+(p.photographer?' by '+p.photographer:'');
  const caption=(p,c)=>{const f=el('div',c);f.append(el('b','ph-t',p.title||''));if(p.photographer)f.append(el('span','ph-by',p.photographer));if(p.school)f.append(el('span','ph-sc',p.school));return f};

  list.forEach((p,i)=>{
    const li=el('li','ph-item'),b=el('button','ph-card');b.type='button';b.setAttribute('aria-label','View '+alt(p));
    const fr=el('span','ph-img ld'),im=document.createElement('img');im.loading='lazy';im.decoding='async';im.alt=alt(p);
    const done=()=>fr.classList.remove('ld');im.onload=done;im.onerror=()=>{im.onerror=done;im.src=p.photo};im.src=thumb(p.photo);
    fr.append(im);b.append(fr,caption(p,'ph-cap'));b.onclick=()=>open(i,b);li.append(b);grid.append(li);
  });

  /* viewer */
  const box=el('div','ph-lb');box.hidden=true;box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Photograph viewer');
  const x=el('button','ph-x','×');x.type='button';x.setAttribute('aria-label','Close');
  const pv=el('button','ph-nav ph-prev','‹');pv.type='button';pv.setAttribute('aria-label','Previous photograph');
  const nx=el('button','ph-nav ph-next','›');nx.type='button';nx.setAttribute('aria-label','Next photograph');
  const fig=el('figure','ph-fig'),big=document.createElement('img');fig.append(big);
  box.append(x,pv,fig,nx);document.body.append(box);
  let cur=0,opener=null,cap=null;
  function show(i){
    cur=(i+list.length)%list.length;const p=list[cur];
    big.classList.remove('in');big.alt=alt(p);big.src=p.photo;void big.offsetWidth;big.classList.add('in');
    if(cap)cap.remove();cap=caption(p,'ph-lcap');fig.append(cap);
    [cur+1,cur-1].forEach(k=>{new Image().src=list[(k+list.length)%list.length].photo});
  }
  function open(i,from){opener=from||null;show(i);box.hidden=false;document.documentElement.classList.add('ph-open');x.focus()}
  function close(){box.hidden=true;document.documentElement.classList.remove('ph-open');big.removeAttribute('src');if(opener)opener.focus()}
  x.onclick=close;pv.onclick=()=>show(cur-1);nx.onclick=()=>show(cur+1);
  box.addEventListener('click',e=>{if(e.target===box||e.target===fig)close()});
  addEventListener('keydown',e=>{if(box.hidden)return;if(e.key==='Escape')close();else if(e.key==='ArrowLeft')show(cur-1);else if(e.key==='ArrowRight')show(cur+1)});
  let sx=null;box.addEventListener('touchstart',e=>{sx=e.touches[0].clientX},{passive:true});
  box.addEventListener('touchend',e=>{if(sx===null)return;const d=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(d)>50)show(cur+(d<0?1:-1))});
  addEventListener('hashchange',()=>{if(!box.hidden)close()});
})();
