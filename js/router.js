(function(){
  const ids=['home','about','gallery','spectrum','members','contact','register','join','what-is-spectrum'];
  const root=document.documentElement;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  const idOf=()=>{const h=location.hash.slice(1);return ids.includes(h)?h:'home'};
  let shown=null,busy=false,queued=null,expect=false;

  /* highlight the menu link for a tab */
  function mark(id){
    document.querySelectorAll('.menu a').forEach(a=>{
      const on=a.getAttribute('href')==='#'+(id==='what-is-spectrum'?'spectrum':id);a.classList.toggle('on',on);
      if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
  }

  /* switch the visible tab (instant -- the light sweep below hides this moment) */
  function go(){
    const id=idOf();
    ids.forEach(v=>document.getElementById(v).classList.toggle('active',v===id));
    mark(id);
    /* the pinned scroll intro (#intro) only plays on the Home tab -- every
       other tab hides it outright so clicking straight to About, Gallery,
       etc. lands right on that section with nothing to scroll through */
    root.classList.toggle('on-home',id==='home');
    scrollTo({top:0,behavior:'instant'});
    shown=id;
  }

  /* ---------- light sweep: a slanted dark curtain with a bright leading edge ----------
     Pass 1: the edge races left -> right and covers the page.
     While fully covered the tab is swapped.  Pass 2: the curtain leaves, the new tab is revealed. */
  const ov=document.createElement('div');
  ov.id='tsweep';ov.setAttribute('aria-hidden','true');
  ov.innerHTML='<div class="ts-panel"></div><div class="ts-glow"></div><div class="ts-line"></div><div class="ts-trail"></div>';
  document.body.appendChild(ov);
  const layers=Array.from(ov.children);
  const panel=layers[0],glow=layers[1],line=layers[2],trail=layers[3];
  let S=0,L=0,MID=0,END=0;

  function measure(){
    const W=root.clientWidth,H=innerHeight;
    S=Math.round(H*.45);                 /* how far the edge leans */
    const E=Math.round(W*.5);            /* extra curtain width = how long the screen stays fully covered */
    L=W+S+E;MID=W+S+E/2;END=W+L+S;
  }
  const poly=(l,r)=>'polygon('+l+'px 0,'+r+'px 0,'+(r-S)+'px 100%,'+(l-S)+'px 100%)';
  function clip(el,v){el.style.clipPath=v;el.style.webkitClipPath=v}
  function paint(a){
    const b=a-L;
    clip(panel,poly(b,a));clip(glow,poly(a-80,a-9));clip(line,poly(a-9,a));clip(trail,poly(b,b+3));
  }
  const eIn=t=>Math.pow(t,1.6),eOut=t=>1-Math.pow(1-t,1.6);
  function run(a0,a1,ms,ease){
    return new Promise(res=>{
      let fin=false;
      const end=()=>{if(fin)return;fin=true;paint(a1);res()};
      const t0=performance.now();
      (function f(){
        const p=Math.min((performance.now()-t0)/ms,1);
        paint(a0+(a1-a0)*ease(p));
        if(p<1&&!fin)requestAnimationFrame(f);else end();
      })();
      setTimeout(end,ms+150);            /* safety net if the browser pauses animation frames */
    });
  }
  const MS=470;

  /* change the hash while the screen is covered and wait until the router has swapped the tab */
  function swapTo(id){
    return new Promise(res=>{
      let d=false;
      const fin=()=>{if(d)return;d=true;removeEventListener('hashchange',h);res()};
      const h=()=>setTimeout(fin,0);
      expect=true;addEventListener('hashchange',h);
      location.hash='#'+id;
      setTimeout(()=>{if(d)return;expect=false;if(shown!==idOf())go();fin()},400);
    });
  }
  async function uncover(){
    await run(MID,END,MS,eOut);
    ov.classList.remove('on');layers.forEach(l=>clip(l,''));
    busy=false;
    const q=queued;queued=null;
    if(q&&q!==shown)start(q);else if(idOf()!==shown)go();
  }
  async function start(id){
    busy=true;measure();ov.classList.add('on');paint(0);
    await run(0,MID,MS,eIn);
    await swapTo(id);
    uncover();
  }

  /* any in-page link to a tab (menu, logo, buttons, footer...) plays the sweep */
  document.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||reduce.matches)return;
    const a=e.target.closest&&e.target.closest('a[href^="#"]');
    if(!a||(a.target&&a.target!=='_self'))return;
    const id=a.getAttribute('href').slice(1);
    if(!ids.includes(id)||id===shown&&!busy)return;
    e.preventDefault();
    mark(id==='what-is-spectrum'?'spectrum':id);
    if(busy){queued=id;return}
    start(id);
  });

  addEventListener('hashchange',()=>{
    if(expect){expect=false;go();return}
    if(busy){go();return}
    /* back/forward button or a script changed the hash: swap now, hidden by an instant cover, then sweep away */
    if(reduce.matches||idOf()===shown){go();return}
    busy=true;measure();ov.classList.add('on');paint(MID);
    go();uncover();
  });
  go();
})();
