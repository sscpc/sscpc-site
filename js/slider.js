(function(){
  const root=document.getElementById('ann-slider');
  if(!root||typeof SLIDES==='undefined'||!SLIDES.length)return;
  const stage=root.querySelector('.stage'),segBox=root.querySelector('.segs'),count=root.querySelector('.count');
  const T=(typeof SLIDE_SECONDS==='number'?SLIDE_SECONDS:6.5)*1000,MOVE=900,N=SLIDES.length;
  const pad=n=>String(n).padStart(2,'0'),reflow=el=>void el.offsetWidth;
  root.style.setProperty('--t',T+'ms');

  /* details panel that pops up from the bottom of a tapped poster */
  function fmt(text,box){
    text.trim().split(/\n\s*\n/).forEach(par=>{
      const p=document.createElement('p');
      par.split('\n').forEach((line,i)=>{
        if(i)p.append(document.createElement('br'));
        let last=0;
        line.replace(/\*([^*]+)\*|(https?:\/\/[^\s]+)|(\b0\d{2}[\s-]?\d{3}[\s-]?\d{4}\b)|(#\w+)/g,(m,b,u,t,h,off)=>{
          p.append(line.slice(last,off));last=off+m.length;
          if(b){const e=document.createElement('strong');e.textContent=b;p.append(e)}
          else if(u){const a=document.createElement('a');a.href=u;a.textContent=u.replace(/^https?:\/\//,'');a.target='_blank';a.rel='noopener';p.append(a)}
          else if(t){const a=document.createElement('a');a.href='tel:+94'+t.replace(/\D/g,'').slice(1);a.textContent=t;p.append(a)}
          else{const e=document.createElement('span');e.className='tag';e.textContent=h;p.append(e)}
          return m;
        });
        p.append(line.slice(last));
      });
      box.append(p);
    });
  }
  let openItem=null;
  function closeInfo(){
    if(!openItem)return;
    openItem.pw.classList.remove('open');openItem.hint.setAttribute('aria-expanded','false');
    openItem=null;setHold('info',false);
  }
  function toggleInfo(it){
    if(openItem===it){closeInfo();return}
    closeInfo();it.pw.classList.add('open');it.hint.setAttribute('aria-expanded','true');
    openItem=it;setHold('info',true);
  }

  const slides=SLIDES.map(s=>{
    const d=document.createElement('div');d.className='sl';
    d.style.setProperty('--img',"url('"+s.image+"')");
    const pw=document.createElement('div');pw.className='pw';
    const im=new Image();im.src=s.image;im.alt=s.alt||'Spectrum announcement';
    im.onload=()=>pw.style.setProperty('--ar',im.naturalWidth/im.naturalHeight);
    pw.append(im);
    if(s.text){
      pw.classList.add('has');
      const hint=document.createElement('button');hint.type='button';hint.className='hint';
      hint.setAttribute('aria-label','Show details');hint.setAttribute('aria-expanded','false');
      const cap=document.createElement('div');cap.className='cap';
      const x=document.createElement('button');x.type='button';x.className='cap-x';x.setAttribute('aria-label','Close details');x.textContent='\u00d7';
      cap.append(x);fmt(s.text,cap);
      pw.append(hint,cap);
      const it={pw,hint};
      pw.addEventListener('click',e=>{if(e.target.closest('.cap a'))return;toggleInfo(it)});
    }
    d.append(pw);stage.append(d);return d;
  });
  const segs=SLIDES.map((s,i)=>{
    const b=document.createElement('button');b.type='button';b.className='seg';
    b.setAttribute('aria-label','Show announcement '+(i+1));b.append(document.createElement('i'));
    b.onclick=()=>goTo(i);segBox.append(b);return b;
  });

  let cur=0,busy=false,timer=null,startedAt=0,remaining=T,paused=true;
  const hold=new Set(['off']);
  root.classList.add('paused');

  function mark(){
    segs.forEach((b,i)=>{b.classList.toggle('on',i===cur);b.classList.toggle('done',i<cur)});
    if(count)count.textContent=pad(cur+1)+' / '+pad(N);
  }
  function restart(){
    clearTimeout(timer);remaining=T;startedAt=Date.now();
    if(!paused)timer=setTimeout(next,remaining);
  }
  function next(){
    if(busy){timer=setTimeout(next,200);return}
    goTo((cur+1)%N,1);
  }
  function pause(){
    if(paused)return;paused=true;root.classList.add('paused');
    clearTimeout(timer);remaining=Math.max(300,remaining-(Date.now()-startedAt));
  }
  function resume(){
    if(!paused)return;paused=false;root.classList.remove('paused');
    startedAt=Date.now();timer=setTimeout(next,remaining);
  }
  function setHold(k,on){on?hold.add(k):hold.delete(k);hold.size?pause():resume()}

  function goTo(n,dir){
    if(busy||n===cur)return;
    closeInfo();
    dir=dir||(n>cur?1:-1);
    const a=slides[cur],b=slides[n];busy=true;
    if(dir<0){b.classList.add('reset','left');reflow(b);b.classList.remove('reset')}
    root.classList.add('moving');
    b.classList.remove('left');b.classList.add('on');
    a.classList.remove('on');if(dir>0)a.classList.add('left');
    cur=n;mark();restart();
    setTimeout(()=>{
      a.classList.add('reset');a.classList.remove('left');reflow(a);a.classList.remove('reset');
      root.classList.remove('moving');busy=false;
    },MOVE+60);
  }

  document.getElementById('ann-prev').onclick=()=>goTo((cur-1+N)%N,-1);
  document.getElementById('ann-next').onclick=()=>goTo((cur+1)%N,1);

  root.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')setHold('hover',true)});
  root.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')setHold('hover',false)});
  root.addEventListener('focusin',()=>setHold('focus',true));
  root.addEventListener('focusout',()=>setHold('focus',false));
  document.addEventListener('visibilitychange',()=>setHold('hidden',document.hidden));
  let sx=null;
  root.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;setHold('touch',true)},{passive:true});
  root.addEventListener('touchend',e=>{
    if(sx!==null){const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>50)goTo((cur+(dx<0?1:-1)+N)%N,dx<0?1:-1)}
    sx=null;setHold('touch',false);
  });
  if('IntersectionObserver' in window)new IntersectionObserver(es=>setHold('off',!es[0].isIntersecting),{threshold:.25}).observe(root);
  else setHold('off',false);

  slides[0].classList.add('reset','on');reflow(slides[0]);slides[0].classList.remove('reset');
  mark();
})();
