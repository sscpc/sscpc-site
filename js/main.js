/* menu */
const burger=document.getElementById('burger'),menu=document.getElementById('menu');
function setBurger(o){
  burger.setAttribute('aria-expanded',o);
  burger.setAttribute('aria-label',o?'Close menu':'Open menu');
  burger.title=o?'Close':'Menu';
}
burger.addEventListener('click',()=>setBurger(menu.classList.toggle('open')));
menu.addEventListener('click',e=>{if(e.target.tagName==='A'){menu.classList.remove('open');setBurger(false)}});

/* countdown to 6 Nov 2026, 9:00 a.m. (Sri Lanka time) */
const T=new Date(EVENT_DATE).getTime();
const pad=n=>String(n).padStart(2,'0');
function tick(){
  const s=Math.floor((T-Date.now())/1000);
  const pcd=document.getElementById('pcd');
  if(s<=0){
    const cd=document.getElementById('cd');if(cd)cd.hidden=true;
    const live=document.getElementById('live');if(live)live.hidden=false;
    if(pcd)pcd.hidden=true;
    window.spectrumOver=true;
    return;
  }
  const put=(id,v,max)=>{const e=document.getElementById(id);if(!e)return;e.textContent=pad(v);if(max)e.parentNode.style.setProperty('--p',Math.min(v/max,1))};
  const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60),sec=s%60;
  put('cd-d',d,100);put('cd-h',h,24);put('cd-m',m,60);put('cd-s',sec,60);
  put('pcd-d',d);put('pcd-h',h);put('pcd-m',m);put('pcd-s',sec);
}
tick();setInterval(tick,1000);

/* loading screen: 9_second_loading_screen_v7 — 3 dots, back dot arcs
   up and over the front two each step. 9 steps x 1s = 9 seconds total. */
(function(){
  const root=document.documentElement,loader=document.getElementById('loader');
  if(!loader){root.classList.remove('loading','intro-hold');return}
  const maroon=document.getElementById('ld-maroon'),ivory=document.getElementById('ld-ivory'),navy=document.getElementById('ld-navy');
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Sweep-out: #loader slides off to the left (angled slightly up) while the home page
     is already sitting underneath it. Scroll stays locked until the sweep ends. Then the
     home text/button fade in on their own after --intro-ui-delay (see style.css). */
  let finished=false;
  function finish(){
    if(finished)return;finished=true;
    const sweepMs=reduce?0:(parseFloat(getComputedStyle(loader).getPropertyValue('--ld-sweep-time'))||1)*1000;
    root.classList.remove('intro-hold');
    root.classList.add('intro-enter');
    loader.classList.add('done');
    setTimeout(()=>root.classList.remove('loading'),sweepMs);
    setTimeout(()=>loader.remove(),sweepMs+300);
    setTimeout(()=>root.classList.remove('intro-enter'),sweepMs+4500);
  }
  if(!maroon||!ivory||!navy){finish();return}
  if(reduce){finish();return}

  const cs=getComputedStyle(loader);
  const GAP=parseFloat(cs.getPropertyValue('--ld-gap'))||42;
  const RADIUS=parseFloat(cs.getPropertyValue('--ld-radius'))||52;
  const TOTAL_STEPS=9,STEP_TIME=1000;

  let order=[maroon,ivory,navy]; /* order[i] = dot currently in slot i (0=left/first, 2=right/last) */

  function setDot(dot,x,y){dot.style.transform='translate3d('+x+'px,'+y+'px,0)'}

  setDot(maroon,-GAP,0);setDot(ivory,0,0);setDot(navy,GAP,0);

  function easeInOut(t){return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}

  function runStep(){
    return new Promise(resolve=>{
      const first=order[0],second=order[1],last=order[2];
      const start=performance.now();
      function frame(now){
        const raw=Math.min((now-start)/STEP_TIME,1);
        const t=easeInOut(raw);
        /* last/right dot travels from above in a smooth arc to the front */
        const theta=Math.PI*t;
        setDot(last,GAP*Math.cos(theta),-RADIUS*Math.sin(theta));
        /* first -> second; second -> third */
        setDot(first,-GAP+GAP*t,0);
        setDot(second,GAP*t,0);
        if(raw<1)requestAnimationFrame(frame);
        else{
          order=[last,first,second];
          setDot(order[0],-GAP,0);setDot(order[1],0,0);setDot(order[2],GAP,0);
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  async function startLoader(){
    for(let i=0;i<TOTAL_STEPS;i++)await runStep();
    setDot(maroon,-GAP,0);setDot(ivory,0,0);setDot(navy,GAP,0);
    finish();
  }
  startLoader();
  setTimeout(finish,TOTAL_STEPS*STEP_TIME+4000); /* safety fallback */
})();
