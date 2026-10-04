(function(){
  const lang=(e,t)=>{if(/[\u0D80-\u0DFF]/.test(t))e.lang='si';else e.removeAttribute('lang')};
  const $=id=>document.getElementById(id),grid=$('albums-grid'),viewer=$('viewer'),thumbs=$('thumbs'),lb=$('lb');
  let cur=0,idx=0,opener=null;
  /* hooks used by js/gallery-tools.js (downloads, favourites, share, requests) */
  const api=window.GalleryAPI={albums:ALBUMS,vis:()=>true,onThumb:null,open:openAlbum,show:j=>show(j),get cur(){return cur},get idx(){return idx}};
  const ev=(n,d)=>document.dispatchEvent(new CustomEvent(n,{detail:d||{}}));
  function nxt(d){const n=ALBUMS[cur].photos.length;let k=idx;for(let t=0;t<n;t++){k=(k+d+n)%n;if(api.vis(k))return k}return idx}
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tilt(w,b){
    if(still)return;
    const set=(k,v)=>b.style.setProperty(k,v);
    w.addEventListener('pointermove',e=>{
      const r=w.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
      set('--ry',((x-.5)*16).toFixed(2)+'deg');set('--rx',((.5-y)*16).toFixed(2)+'deg');
      set('--mx',(x*100).toFixed(1)+'%');set('--my',(y*100).toFixed(1)+'%');
      set('--tx',((.5-x)*14).toFixed(1)+'px');set('--ty',((.5-y)*14).toFixed(1)+'px');
    });
    ['pointerleave','pointercancel'].forEach(t=>w.addEventListener(t,()=>{
      ['--rx','--ry','--tx','--ty','--mx','--my'].forEach(k=>b.style.removeProperty(k));
    }));
  }
  const items=[];
  ALBUMS.forEach((a,i)=>{
    const w=document.createElement('div');w.className='aw';
    const b=document.createElement('button');b.type='button';b.className='album';
    const c=a.photos.length;
    b.innerHTML='<span class="inner"><span class="tag"></span><img alt=""><span class="holo"></span><span class="cap"><b></b><small></small><em>Open album</em></span></span>';
    b.querySelector('.tag').textContent='ALBUM '+String(i+1).padStart(2,'0');
    b.querySelector('img').src=a.cover||a.photos[0];
    b.querySelector('b').textContent=a.name;lang(b.querySelector('b'),a.name);
    b.querySelector('small').textContent=String(c).padStart(2,'0')+(c===1?' photo':' photos');
    b.setAttribute('aria-label','Open album '+a.name);
    b.onclick=()=>openAlbum(i);w.append(b);grid.append(w);tilt(w,b);items.push({a,w});
  });
  const soon=document.createElement('div');soon.className='album-soon';soon.textContent='More albums coming soon';grid.append(soon);
  const empty=document.createElement('div');empty.className='album-soon';empty.hidden=true;empty.textContent='No albums match these filters';grid.append(empty);
  (function(){
    const fbar=$('filters');if(!fbar||ALBUMS.length<2)return;
    const yr=a=>{const m=((a.info&&a.info.date)||'').match(/\b(20\d\d)\b/);return m?m[1]:''};
    const years=[...new Set(ALBUMS.map(yr).filter(Boolean))].sort().reverse();
    let fy='All';
    function apply(){
      items.forEach(({a,w})=>{w.hidden=!(fy==='All'||yr(a)===fy)});
      soon.hidden=!(fy==='All');empty.hidden=items.some(i=>!i.w.hidden);
    }
    function row(label,list,pick){
      const r=document.createElement('div');r.className='f-row';
      const l=document.createElement('span');l.className='f-l';l.textContent=label;r.append(l);
      ['All',...list].forEach((v,i)=>{
        const b=document.createElement('button');b.type='button';b.className='chip';b.textContent=v;b.setAttribute('aria-pressed',i===0);
        b.onclick=()=>{pick(v);r.querySelectorAll('.chip').forEach(c=>c.setAttribute('aria-pressed',c===b));apply()};
        r.append(b);
      });
      fbar.append(r);
    }
    if(years.length>1)row('Year',years,v=>fy=v);
  })();
  function openAlbum(i){
    cur=i;const a=ALBUMS[i];$('v-title').textContent=a.name;lang($('v-title'),a.name);thumbs.textContent='';
    const fb=$('v-fb');fb.hidden=!a.facebook;if(a.facebook)fb.href=a.facebook;
    const box=$('v-info'),inf=a.info;box.textContent='';box.hidden=!inf;
    if(inf){
      const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null){e.textContent=x;lang(e,x)}return e};
      const inner=el('div','info-in'),list=el('ul','info-list');
      inner.append(el('div','info-h','Album info'));
      [['Event',a.name],['Date',inf.date],['Venue',inf.venue]].forEach(([k,v])=>{const li=el('li');li.append(el('em',0,k),el('span',0,v));list.append(li)});
      [['Captured by',inf.captured],['Edited by',inf.edited]].forEach(([k,arr])=>{const li=el('li'),u=el('ul');li.append(el('em',0,k));arr.forEach(n=>{
        if(window.execMemberId&&window.execMemberId(n)){
          const item=el('li'),b=el('button','name-btn',n);b.type='button';b.title='Executive committee member: view profile';
          b.onclick=()=>{b.classList.add('seen');window.goToMember(n)};item.append(b);u.append(item);
        }else u.append(el('li',0,n));
      });li.append(u);list.append(li)});
      inner.append(list);box.append(inner);
    }
    a.photos.forEach((p,j)=>{
      const w=document.createElement('div');w.className='th';w.dataset.i=j;
      const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Open photo '+(j+1)+' of '+a.name);
      const im=document.createElement('img');im.loading='lazy';im.decoding='async';im.alt='';
      /* small spinner (fades in only if the photo is slow) until this photo has loaded */
      w.classList.add('ld');const done=()=>w.classList.remove('ld');im.onload=done;
      if(a.thumbs){im.onerror=()=>{im.onerror=done;im.src=p};im.src=a.thumbs+p.split('/').pop()}else{im.onerror=done;im.src=p}
      b.append(im);b.onclick=()=>{if(api.onThumb&&api.onThumb(j,b))return;show(j,b)};w.append(b);thumbs.append(w);
    });
    grid.hidden=true;viewer.hidden=false;if($('filters'))$('filters').hidden=true;$('albums').scrollIntoView();
    ev('gallery:album',{i});
  }
  $('back').onclick=()=>{ev('gallery:back');viewer.hidden=true;grid.hidden=false;if($('filters'))$('filters').hidden=false;$('albums').scrollIntoView()};
  const pad=n=>String(n).padStart(2,'0');
  function show(j,el){
    const a=ALBUMS[cur];idx=(j+a.photos.length)%a.photos.length;
    if(el)opener=el;
    const im=$('lb-img'),fr=im.parentNode,tk=$('lb-ticks');
    im.classList.remove('focus');fr.classList.remove('lock');void im.offsetWidth;
    im.classList.add('focus');fr.classList.add('lock');
    fr.classList.add('ldg');im.onload=im.onerror=()=>fr.classList.remove('ldg');
    im.src=a.photos[idx];im.alt='Photo '+(idx+1)+' from '+a.name;
    if(im.complete&&im.naturalWidth)fr.classList.remove('ldg');
    [idx+1,idx-1].forEach(k=>{new Image().src=a.photos[(k+a.photos.length)%a.photos.length]});
    $('lb-t').textContent=a.name;lang($('lb-t'),a.name);
    $('lb-c').textContent='IMG '+pad(idx+1)+' / '+pad(a.photos.length);
    tk.style.display=a.photos.length>60?'none':'';
    if(tk.dataset.a!==String(cur)){
      tk.textContent='';
      a.photos.forEach((p,k)=>{const t=document.createElement('span');t.onclick=()=>show(k);tk.append(t)});
      tk.dataset.a=cur;
    }
    [...tk.children].forEach((t,k)=>t.classList.toggle('on',k===idx));
    lb.hidden=false;$('lb-x').focus();
    ev('gallery:photo',{i:cur,j:idx});
  }
  function close(){lb.hidden=true;if(opener)opener.focus()}
  $('lb-x').onclick=close;$('lb-p').onclick=()=>show(nxt(-1));$('lb-n').onclick=()=>show(nxt(1));
  lb.addEventListener('click',e=>{if(e.target===lb)close()});
  let sx=null;
  lb.addEventListener('touchstart',e=>{sx=e.touches[0].clientX},{passive:true});
  lb.addEventListener('touchend',e=>{
    if(sx===null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;
    if(Math.abs(dx)>50)show(nxt(dx<0?1:-1));
  });
  addEventListener('keydown',e=>{
    if(lb.hidden)return;
    if(e.key==='Escape')close();else if(e.key==='ArrowLeft')show(nxt(-1));else if(e.key==='ArrowRight')show(nxt(1));
  });
  window.openAlbumByName=name=>{
    const i=ALBUMS.findIndex(a=>a.name===name);
    if(i<0){location.hash='#gallery';return}
    if(location.hash==='#gallery'){openAlbum(i);return}
    addEventListener('hashchange',()=>openAlbum(i),{once:true});location.hash='#gallery';
  };
})();
