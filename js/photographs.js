/* Spectrum 2026: "Most Popular Photograph" public vote + the floating vote button.
   - Voting is open only on Photography Day (VOTE_OPENS to VOTE_CLOSES, Sri Lanka time).
   - One vote per person per day (kept in this browser). Visitors never see counts; the admin portal does.
   - Photos come from SPECTRUM_PHOTOS in js/data.js (edited in Admin > Votes), shown in a new random order each visit.
   - Preview any state without waiting: add ?preview=before, ?preview=open or ?preview=closed to the address (display only). */
(function(){
  const SV=(typeof SITE!=='undefined'&&SITE&&SITE.vote)||{};/* times + texts are edited in Admin > Site */
  const okT=v=>typeof v==='string'&&!isNaN(Date.parse(v));
  const VOTE_OPENS=okT(SV.opens)?SV.opens:'2026-11-13T09:00:00+05:30',VOTE_CLOSES=okT(SV.closes)?SV.closes:'2026-11-13T17:00:00+05:30';
  const T0=Date.parse(VOTE_OPENS),T1=Date.parse(VOTE_CLOSES);
  const KEY='sscpc-photo-vote-day';
  const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
  const pad=n=>(n<10?'0':'')+n;
  const lk=t=>{const d=new Date(t+5.5*36e5),h=d.getUTCHours(),m=d.getUTCMinutes();return{day:d.getUTCDate(),mon:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()],monL:['January','February','March','April','May','June','July','August','September','October','November','December'][d.getUTCMonth()],h12:h%12||12,mm:pad(m),m:m,ap:h<12?'a.m.':'p.m.',ymd:d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate())}};
  const clock=t=>{const k=lk(t);return k.h12+':'+k.mm+' '+k.ap};
  const clockShort=t=>{const k=lk(t);return k.h12+(k.m?':'+k.mm:'')+' '+k.ap};
  const today=()=>lk(Date.now()).ymd;
  const previewMode=(()=>{try{const m=/[?&]preview=(before|open|closed)/.exec(location.search);return m?m[1]:''}catch(e){return ''}})();
  const state=()=>{if(previewMode)return previewMode;const n=Date.now();return n<T0?'before':n<T1?'open':'closed'};

  /* ---------- floating vote button ---------- */
  const fab=document.getElementById('vote-fab');
  const ICON='<img class="vf-img" src="icons/vote-icon.webp" alt="" width="28" height="28" decoding="async" draggable="false">';
  let fabState='';
  function paintFab(s){
    if(!fab)return;
    if(s==='closed'||SV.showButton===false){fab.hidden=true;fabState=s;return}
    fab.hidden=false;
    if(fabState!==s){
      const k=lk(T0);
      fab.className='vote-fab '+(s==='open'?'is-open':'is-before');
      fab.innerHTML='<span class="vf-ic">'+ICON+'</span><span class="vf-tx"><b>'+(s==='open'?'Vote now':'Vote on '+k.day+' '+k.mon)+'</b><span>'+(s==='open'?'Most popular photograph':'Most popular photo \u2022 opens '+clockShort(T0))+'</span></span>';
      fab.setAttribute('href','#vote');fab.removeAttribute('aria-disabled');fab.removeAttribute('tabindex');
      fab.setAttribute('aria-label',s==='open'?'Vote now for the most popular photograph':'Voting opens on '+k.day+' '+k.monL+' at '+clockShort(T0)+'. Open the vote page');
      fabState=s;
    }
  }
  /* sits at the top-left, opposite the small countdown on the top-right; hidden on the vote page itself */
  function placeFab(){
    if(!fab||fab.hidden)return;
    fab.style.display=location.hash==='#vote'?'none':'';
  }

  /* ---------- vote page ---------- */
  const grid=document.getElementById('ph-grid');
  const banner=document.getElementById('vt-banner');
  const leadEl=document.getElementById('vt-lead');
  const list=(typeof SPECTRUM_PHOTOS!=='undefined'?SPECTRUM_PHOTOS:[]).filter(p=>p&&p.photo).map((p,i)=>({p:p,n:i+1}));
  for(let i=list.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[list[i],list[j]]=[list[j],list[i]]}
  const thumb=p=>{const k=p.lastIndexOf('/');return p.slice(0,k+1)+'thumbs/'+p.slice(k+1)};
  const nm=it=>it.p.title||('Photo '+pad(it.n));
  const who=it=>[it.p.photographer,it.p.school].filter(Boolean).join(' \u2022 ')||nm(it);
  const endpoint=()=>{try{return typeof FORMS_ENDPOINT==='string'?FORMS_ENDPOINT:''}catch(e){return ''}};
  const deviceId=()=>{try{let id=localStorage.getItem('sscpc_vote_dev');if(!id||id.length<16){const a=new Uint8Array(12);(window.crypto||window.msCrypto).getRandomValues(a);id=Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');localStorage.setItem('sscpc_vote_dev',id)}return id}catch(e){return Array.from({length:24},()=>Math.floor(Math.random()*16).toString(16)).join('')}};
  let mine=null; /* {day, photo} when this browser has already voted today */
  const readMine=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'null');mine=v&&v.day===today()?v:null}catch(e){mine=mine&&mine.day===today()?mine:null}};
  const writeMine=v=>{mine=v;try{localStorage.setItem(KEY,JSON.stringify(v))}catch(e){}};
  const buttons=[];

  function paintButtons(s){
    readMine();
    buttons.forEach(o=>{
      const b=o.b;b.className='ph-vote';b.disabled=false;
      if(s==='closed'){b.textContent='Closed';b.classList.add('is-closed');b.disabled=true;b.setAttribute('aria-label','Voting has closed')}
      else if(s==='before'){b.textContent='Soon';b.classList.add('is-closed');b.disabled=true}
      else if(mine&&mine.photo===o.it.p.photo){b.textContent='\u2713 Voted';b.classList.add('is-mine');b.setAttribute('aria-label','You voted for '+nm(o.it))}
      else if(mine){b.textContent='Vote';b.classList.add('is-used');b.setAttribute('aria-label','You have already voted today')}
      else{b.textContent='Vote';b.setAttribute('aria-label','Vote for '+nm(o.it)+' by '+(o.it.p.photographer||'this photographer'))}
    });
  }
  function paintBanner(s){
    if(!banner)return;
    const k=lk(T0);
    banner.className='vt-banner is-'+s;
    if(s==='open')banner.innerHTML='<b>Voting is open</b> until '+clock(T1)+' today. Tap a photograph to view it, then press Vote. One vote per person per day.';
    else if(s==='before')banner.innerHTML='<b>Voting opens</b> on '+k.day+' '+k.monL+' at '+clock(T0)+', on Spectrum Photography Day. Come back then to choose your favourite photograph.';
    else banner.innerHTML='<b>Voting has closed.</b> Thank you to everyone who voted. The Most Popular Photograph will be announced at the ceremony.';
    if(grid)grid.hidden=s==='before';
  }
  if(leadEl)leadEl.textContent=(typeof SV.intro==='string'&&SV.intro.trim())?SV.intro.trim():(list.length||'The')+' photographs were selected from the Spectrum 2026 competition. Which one is your favourite? Choose one photograph and vote for it. You can vote once per day, and the results stay hidden until voting closes.';

  if(grid)list.forEach((it,i)=>{
    const li=el('li','ph-item'),card=el('button','ph-card');card.type='button';card.setAttribute('aria-label','View '+nm(it));
    const fr=el('span','ph-img ld'),im=document.createElement('img');im.loading='lazy';im.decoding='async';im.alt=nm(it)+(it.p.photographer?' by '+it.p.photographer:'');
    const done=()=>fr.classList.remove('ld');im.onload=done;im.onerror=()=>{im.onerror=done;im.src=it.p.photo};im.src=thumb(it.p.photo);
    fr.append(im);card.append(el('span','ph-no',pad(i+1)),fr);
    const foot=el('div','ph-foot'),cap=el('div','ph-cap');
    cap.append(el('b','ph-t',it.p.photographer||nm(it)));
    if(it.p.photographer&&it.p.school)cap.append(el('span','ph-sc',it.p.school));
    const b=el('button','ph-vote','Vote');b.type='button';
    foot.append(cap,b);li.append(card,foot);grid.append(li);
    const go=()=>openBox(it,card);card.onclick=go;b.onclick=go;buttons.push({b:b,it:it});
  });

  /* ---------- confirm window ---------- */
  const box=el('div','vm');box.hidden=true;box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Vote for this photograph');
  const bx=el('div','vm-box'),xb=el('button','vm-x','\u00d7');xb.type='button';xb.setAttribute('aria-label','Close');
  const imgw=el('div','vm-img'),big=document.createElement('img');imgw.append(big);
  const capEl=el('p','vm-cap'),msg=el('p','vm-msg');msg.setAttribute('aria-live','polite');
  const btns=el('div','vm-btns'),cl=el('button','vm-btn vm-close','Close'),ok=el('button','vm-btn vm-ok','Confirm my vote');cl.type='button';ok.type='button';
  btns.append(cl,ok);bx.append(imgw,xb,capEl,msg,btns);box.append(bx);document.body.append(box);
  let cur=null,opener=null,sending=false;
  function note(){
    if(!cur)return;
    const s=state();readMine();ok.disabled=false;ok.textContent='Confirm my vote';
    if(s!=='open'){msg.textContent=s==='before'?'Voting has not opened yet.':'Voting has closed. Thank you for taking part.';ok.disabled=true}
    else if(mine&&mine.photo===cur.p.photo){msg.textContent='\u2713 Your vote for '+nm(cur)+' has been counted. Thank you!';ok.disabled=true}
    else if(mine){msg.textContent='You have already voted today. Thank you for taking part!';ok.disabled=true}
    else msg.textContent='Vote for '+nm(cur)+'? You can only vote once today.';
  }
  function openBox(it,from){
    cur=it;opener=from||null;big.src=it.p.photo;big.alt=nm(it)+(it.p.photographer?' by '+it.p.photographer:'');
    capEl.textContent=who(it);note();box.hidden=false;document.documentElement.classList.add('vm-open');
    (ok.disabled?cl:ok).focus();
  }
  function closeBox(){box.hidden=true;document.documentElement.classList.remove('vm-open');big.removeAttribute('src');cur=null;if(opener&&document.contains(opener))opener.focus()}
  function confirm(){
    if(!cur||sending||state()!=='open')return;
    readMine();if(mine)return note();
    const it=cur,u=endpoint();
    const finish=()=>{writeMine({day:today(),photo:it.p.photo});sending=false;paintButtons(state());if(cur===it)note()};
    if(!u){finish();return}
    sending=true;ok.disabled=true;ok.textContent='Sending\u2026';
    const body=()=>new URLSearchParams({form:'photo-vote',photo:it.p.photo,title:it.p.title||'',photographer:it.p.photographer||'',device:deviceId()});
    const fail=m=>{sending=false;if(cur===it){ok.disabled=false;ok.textContent='Confirm my vote';msg.textContent=m}};
    /* Read the server's reply so a rejected vote is never shown as counted. If the reply cannot be read, resend once without reading it (safe: one vote per device per day on the server). */
    fetch(u,{method:'POST',body:body()}).then(r=>r.text()).then(t=>{
      let j;try{j=JSON.parse(t)}catch(e){j=null}
      if(j&&(j.ok||j.error==='already'))return finish();
      if(j&&j.error==='not_open')return fail('Voting has not opened yet.');
      if(j&&j.error==='closed')return fail('Voting has closed.');
      if(j&&j.error==='invalid')return fail('This vote could not be recognised. Please reload the page and try again.');
      fail('Your vote could not be saved. Please try again.');
    }).catch(()=>{
      fetch(u,{method:'POST',mode:'no-cors',keepalive:true,body:body()}).then(finish,()=>fail('We could not send your vote. Please check your connection and try again.'));
    });
  }
  xb.onclick=closeBox;cl.onclick=closeBox;ok.onclick=confirm;
  box.addEventListener('click',e=>{if(e.target===box)closeBox()});
  addEventListener('keydown',e=>{if(box.hidden)return;if(e.key==='Escape')closeBox();else if(e.key==='Tab'){const f=[xb,cl,ok].filter(x=>!x.disabled),i=f.indexOf(document.activeElement);if(!f.length)return;e.preventDefault();f[(i+(e.shiftKey?-1:1)+f.length)%f.length].focus()}});
  addEventListener('hashchange',()=>{if(!box.hidden)closeBox();placeFab()});

  /* ---------- keep everything in step with the clock ---------- */
  let last='';
  function tick(){
    const s=state();
    if(s!==last){last=s;paintFab(s);paintBanner(s);paintButtons(s);if(!box.hidden)note()}
    placeFab();
  }
  tick();setInterval(tick,1000);
  addEventListener('resize',placeFab);addEventListener('scroll',placeFab,{passive:true});
})();
