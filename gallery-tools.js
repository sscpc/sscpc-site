/* Gallery extras: download (one photo / selected / whole album as ZIP / full-quality link),
   favourites and share.
   Works on top of js/gallery.js through window.GalleryAPI. */
(function(){
  const API=window.GalleryAPI;if(!API)return;
  const $=id=>document.getElementById(id);
  const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
  const pad=n=>String(n).padStart(2,'0');
  const ICON={
    heart:'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
    down:'<path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M4 20h16"/>',
    flag:'<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>',
    check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    link:'<path d="M14 4h6v6m0-6-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    sel:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 3 3 5-6"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'
  };
  const icon=n=>'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+ICON[n]+'</svg>';
  function btn(cls,ic,label){const b=el('button',cls);b.type='button';b.innerHTML=(ic?icon(ic):'')+'<span>'+label+'</span>';return b}

  /* ---------- helpers ---------- */
  const albumId=a=>((a.cover||a.photos[0]).split('/').slice(-2,-1)[0])||'';
  const base=()=>location.origin+location.pathname;
  const baseName=p=>p.split('/').pop();
  const noExt=p=>baseName(p).replace(/\.[^.]+$/,'');
  const ext=p=>(baseName(p).match(/\.([a-z0-9]+)$/i)||[,'jpg'])[1].toLowerCase();
  const albumUrl=a=>base()+'?album='+encodeURIComponent(albumId(a))+'#gallery';
  const photoUrl=(a,j)=>base()+'?album='+encodeURIComponent(albumId(a))+'&photo='+encodeURIComponent(noExt(a.photos[j]))+'#gallery';
  const slug=(a,i)=>{const s=(albumId(a)||a.name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');return s.length>2?s:'album-'+(i+1)};
  const fileName=(a,i,j)=>'SSCPC_'+slug(a,i)+'_'+pad(j+1)+'.'+ext(a.photos[j]);
  const A=()=>API.albums[API.cur];

  /* ---------- toast ---------- */
  let toastT=null;
  function toast(msg){
    let t=$('gt-toast');if(!t){t=el('div','gt-toast');t.id='gt-toast';t.setAttribute('role','status');document.body.append(t)}
    t.textContent=msg;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2600);
  }

  /* ---------- favourites (kept on this device only) ---------- */
  let favs=new Set();
  try{favs=new Set(JSON.parse(localStorage.getItem('sscpc-favs')||'[]'))}catch(e){}
  const saveFavs=()=>{try{localStorage.setItem('sscpc-favs',JSON.stringify([...favs]))}catch(e){}};
  const favCount=()=>A().photos.filter(p=>favs.has(p)).length;
  let favOnly=false;
  function toggleFav(j){
    const p=A().photos[j];
    if(favs.has(p))favs.delete(p);else favs.add(p);
    saveFavs();refresh();
  }

  /* ---------- download helpers ---------- */
  function saveBlob(blob,name){
    const u=URL.createObjectURL(blob),a=el('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(u),30000);
  }
  async function downloadOne(j){
    const a=A();
    try{
      const r=await fetch(a.photos[j]);if(!r.ok)throw 0;
      saveBlob(await r.blob(),fileName(a,API.cur,j));toast('Photo downloaded');
    }catch(e){window.open(a.photos[j],'_blank','noopener')}
  }
  let zipCtl=null;
  async function downloadZip(list,label){
    if(zipCtl)return;
    const a=A(),i=API.cur;
    if(!list.length){toast('No photos to download');return}
    if(list.length>60&&!confirm('This will download '+list.length+' photos'+(list.length>150?' as several ZIP files (150 photos each)':' as one ZIP file')+'. It can be large, so use Wi-Fi if you can. Continue?'))return;
    zipCtl=new AbortController();
    const box=$('gt-prog')||(()=>{const b=el('div','gt-prog');b.id='gt-prog';b.setAttribute('role','status');
      b.innerHTML='<div class="gt-prog-t"></div><div class="gt-prog-bar"><i></i></div><button type="button" class="gt-prog-x">Cancel</button>';document.body.append(b);return b})();
    const txt=box.querySelector('.gt-prog-t'),bar=box.querySelector('i');box.classList.add('on');
    box.querySelector('.gt-prog-x').onclick=()=>zipCtl&&zipCtl.abort();
    /* big albums are saved as several ZIP files of at most 150 photos, so phones and browsers do not run out of memory */
    const PART=150,parts=Math.ceil(list.length/PART);let done=0;
    try{
      for(let pi=0;pi<parts;pi++){
        const sub=list.slice(pi*PART,(pi+1)*PART),files=new Array(sub.length);let next=0;
        const tag=parts>1?' (part '+(pi+1)+' of '+parts+')':'';
        const say=()=>{txt.textContent='Preparing '+label+tag+'… '+done+' / '+list.length;bar.style.width=(done/list.length*100)+'%'};
        say();
        async function worker(){
          while(next<sub.length){
            const k=next++,j=sub[k];
            const r=await fetch(a.photos[j],{signal:zipCtl.signal});if(!r.ok)throw new Error('fetch');
            files[k]={name:fileName(a,i,j),data:new Uint8Array(await r.arrayBuffer())};
            done++;say();
          }
        }
        await Promise.all([1,2,3,4,5].map(worker));
        txt.textContent='Building ZIP'+tag+'…';
        await new Promise(r=>setTimeout(r,30));
        saveBlob(new Blob([makeZip(files)],{type:'application/zip'}),'SSCPC_'+slug(a,i)+(label==='favourites'?'_favourites':label==='selected photos'?'_selected':'')+(parts>1?'_part'+(pi+1)+'of'+parts:'')+'.zip');
        await new Promise(r=>setTimeout(r,600));
      }
      toast(parts>1?parts+' ZIP files downloaded':'ZIP downloaded');
    }catch(e){
      toast(e&&e.name==='AbortError'?'Download cancelled':'Download failed. Please try again.');
    }finally{box.classList.remove('on');zipCtl=null}
  }

  /* ---------- toolbar under the album title ---------- */
  let tools,bFav,bSel,bDlFav;let selMode=false;const sel=new Set();
  function buildTools(){
    const old=$('v-tools');if(old)old.remove();
    const a=A();tools=el('div','gt-tools');tools.id='v-tools';
    bSel=btn('chip gt-chip','sel','Select');bSel.setAttribute('aria-pressed','false');
    bSel.onclick=()=>setSelect(!selMode);
    bFav=btn('chip gt-chip','heart','Favourites');bFav.setAttribute('aria-pressed','false');
    bFav.onclick=()=>{favOnly=!favOnly;refresh()};
    bDlFav=btn('chip gt-chip','down','Download favourites');bDlFav.onclick=()=>downloadZip(a.photos.map((p,j)=>favs.has(p)?j:-1).filter(j=>j>=0),'favourites');
    const bAll=btn('chip gt-chip','down','Download album (ZIP)');bAll.onclick=()=>downloadZip(a.photos.map((_,j)=>j),'album');
    tools.append(bSel,bFav,bDlFav,bAll);
    if(a.originals){const l=el('a','chip gt-chip');l.href=a.originals;l.target='_blank';l.rel='noopener';l.innerHTML=icon('link')+'<span>Full-quality photos</span>';tools.append(l)}
    const bSh=btn('chip gt-chip','share','Share album');bSh.onclick=()=>share(albumUrl(a),a.name);
    tools.append(bSh);
    const info=$('v-info');info.parentNode.insertBefore(tools,info);
  }

  /* ---------- selection ---------- */
  let bar;
  function buildBar(){
    bar=el('div','gt-bar');bar.id='gt-bar';bar.hidden=true;
    const c=el('span','gt-bar-c');c.id='gt-bar-c';
    const all=btn('gt-bar-b','',  'Select all');all.onclick=()=>{visibleIdx().forEach(j=>sel.add(j));refresh()};
    const clr=btn('gt-bar-b','','Clear');clr.onclick=()=>{sel.clear();refresh()};
    const dl=btn('gt-bar-b gt-bar-go','down','Download ZIP');dl.id='gt-bar-dl';dl.onclick=()=>downloadZip([...sel].sort((x,y)=>x-y),'selected photos');
    const done=btn('gt-bar-b','','Done');done.onclick=()=>setSelect(false);
    bar.append(c,all,clr,dl,done);document.body.append(bar);
  }
  function setSelect(on){selMode=on;if(!on)sel.clear();refresh()}
  const visibleIdx=()=>A().photos.map((p,j)=>(!favOnly||favs.has(p))?j:-1).filter(j=>j>=0);
  API.onThumb=(j,b)=>{if(!selMode)return false;sel.has(j)?sel.delete(j):sel.add(j);refresh();return true};

  /* ---------- thumbnails: hearts + ticks ---------- */
  function decorateThumbs(){
    document.querySelectorAll('#thumbs .th').forEach(w=>{
      if(w.querySelector('.th-fav'))return;
      const j=+w.dataset.i;
      const h=el('button','th-fav');h.type='button';h.innerHTML=icon('heart');
      h.onclick=e=>{e.stopPropagation();toggleFav(j)};w.append(h);
      const t=el('span','th-tick');t.innerHTML=icon('check');t.setAttribute('aria-hidden','true');w.append(t);
    });
  }

  /* ---------- refresh everything that depends on state ---------- */
  function refresh(){
    const a=A();if(!a||!tools)return;
    const n=favCount();if(!n)favOnly=false;
    bFav.setAttribute('aria-pressed',favOnly);bFav.querySelector('span').textContent='Favourites ('+n+')';bFav.disabled=!n;
    bDlFav.hidden=!n;bSel.setAttribute('aria-pressed',selMode);
    document.querySelectorAll('#thumbs .th').forEach(w=>{
      const j=+w.dataset.i,p=a.photos[j],f=favs.has(p);
      w.hidden=favOnly&&!f;
      w.classList.toggle('sel',sel.has(j));w.classList.toggle('selmode',selMode);
      const h=w.querySelector('.th-fav');if(h){h.classList.toggle('on',f);h.setAttribute('aria-pressed',f);h.setAttribute('aria-label',(f?'Remove from favourites: photo ':'Add to favourites: photo ')+(j+1))}
      w.firstChild.setAttribute('aria-pressed',selMode?sel.has(j):'false');if(!selMode)w.firstChild.removeAttribute('aria-pressed');
    });
    bar.hidden=!selMode;$('gt-bar-c').textContent=sel.size+' selected';$('gt-bar-dl').disabled=!sel.size;
    API.vis=k=>!favOnly||favs.has(a.photos[k]);
    lbRefresh();
  }

  /* ---------- lightbox tools ---------- */
  let lbFav;
  function buildLb(){
    const bottom=document.querySelector('#lb .pv-bottom');if(!bottom||$('gt-lb'))return;
    const row=el('div','gt-lb');row.id='gt-lb';
    lbFav=btn('gt-lb-b','heart','Favourite');lbFav.onclick=()=>toggleFav(API.idx);
    const sh=btn('gt-lb-b','share','Share');sh.onclick=()=>share(photoUrl(A(),API.idx),A().name);
    const dl=btn('gt-lb-b','down','Download');dl.onclick=()=>downloadOne(API.idx);
    row.append(lbFav,sh,dl);bottom.prepend(row);
  }
  function lbRefresh(){
    if(!lbFav||$('lb').hidden)return;
    const f=favs.has(A().photos[API.idx]);
    lbFav.classList.toggle('on',f);lbFav.setAttribute('aria-pressed',f);lbFav.querySelector('span').textContent=f?'Favourited':'Favourite';
  }

  /* ---------- modal base ---------- */
  let modal=null,modalOpener=null;
  /* while a popup is open, keys must not reach the photo viewer behind it (Esc closes only the popup) */
  document.addEventListener('keydown',e=>{
    if(!modal)return;
    e.stopPropagation();
    if(e.key==='Escape'){e.preventDefault();closeModal()}
  },true);
  function closeModal(){if(!modal)return;modal.remove();modal=null;if(modalOpener&&document.contains(modalOpener))modalOpener.focus()}
  function openModal(title,node){
    closeModal();modalOpener=document.activeElement;
    modal=el('div','gt-modal');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label',title);
    const box=el('div','gt-box'),x=el('button','gt-x','×');x.type='button';x.setAttribute('aria-label','Close');x.onclick=closeModal;
    box.append(x,el('h4','gt-h',title),node);modal.append(box);document.body.append(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
    const first=modal.querySelector('input,select,textarea,button.gt-copy,button:not(.gt-x)')||x;first.focus();
  }

  /* ---------- share ---------- */
  async function share(url,name){
    const data={title:name+' – SSCPC',text:name+' – St. Sylvester\'s College Photography Club',url};
    if(navigator.share){try{await navigator.share(data);return}catch(e){if(e&&e.name==='AbortError')return}}
    const wrap=el('div','gt-share');
    const inp=el('input');inp.readOnly=true;inp.value=url;inp.setAttribute('aria-label','Link');inp.onfocus=()=>inp.select();
    const row=el('div','gt-share-row');
    const cp=btn('gt-copy','link','Copy link');
    cp.onclick=async()=>{try{await navigator.clipboard.writeText(url);toast('Link copied')}catch(e){inp.select();document.execCommand&&document.execCommand('copy');toast('Link copied')}};
    const wa=el('a','gt-copy');wa.href='https://wa.me/?text='+encodeURIComponent(data.text+' '+url);wa.target='_blank';wa.rel='noopener';wa.textContent='WhatsApp';
    const fb=el('a','gt-copy');fb.href='https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(url);fb.target='_blank';fb.rel='noopener';fb.textContent='Facebook';
    row.append(cp,wa,fb);wrap.append(inp,row);openModal('Share',wrap);
  }

  /* ---------- events from gallery.js ---------- */
  function onAlbum(){
    selMode=false;sel.clear();favOnly=false;
    if(!bar)buildBar();buildLb();buildTools();decorateThumbs();refresh();
  }
  document.addEventListener('gallery:album',onAlbum);
  document.addEventListener('gallery:back',()=>{selMode=false;sel.clear();if(bar)bar.hidden=true;const t=$('v-tools');if(t)t.remove();tools=null});
  document.addEventListener('gallery:photo',lbRefresh);
  addEventListener('storage',e=>{if(e.key==='sscpc-favs'){try{favs=new Set(JSON.parse(e.newValue||'[]'))}catch(x){}if(tools)refresh()}});

  /* ---------- shared links: ?album=<folder>&photo=<file name without extension> ---------- */
  function deepLink(){
    const q=new URLSearchParams(location.search),id=q.get('album');if(!id)return;
    const i=API.albums.findIndex(a=>albumId(a)===id);if(i<0)return;
    const go=()=>{
      API.open(i);
      const ph=q.get('photo');if(!ph)return;
      const j=API.albums[i].photos.findIndex(p=>noExt(p)===ph);
      if(j>=0)setTimeout(()=>API.show(j),60);
    };
    if(location.hash!=='#gallery'){addEventListener('hashchange',()=>setTimeout(go,60),{once:true});location.hash='#gallery'}
    else setTimeout(go,60);
  }
  deepLink();
})();
