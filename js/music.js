/* SSCPC background music player: plays audio/track-1..5 one after another, forever (5 -> 1).
   Bottom-right. Round button = music icon. Hover (or keyboard focus / a tap on touch screens) slides out
   three controls: Previous, Play/Pause, Next. No progress line.
   Previous: one click restarts the current song, a quick double click goes to the previous song.
   Browsers block autoplay, so music starts on the visitor's first tap/click/key press, unless they
   switched it off earlier (remembered on their device). */
(function(){
  var TRACKS=[
    {src:'audio/track-1.mp3',title:'Slow Building Movement',artist:'BTVN Labs'},
    {src:'audio/track-2.mp3',title:'Cinematic Night Journey',artist:'BTVN Labs'},
    {src:'audio/track-3.mp3',title:'Quiet Space',artist:'BTVN Labs'},
    {src:'audio/track-4.mp3',title:'Noctlonging',artist:'BTVN Labs'},
    {src:'audio/track-5.mp3',title:'静谧的呼吸',artist:'BTVN Labs'}
  ];
  var KEY='sscpc-music', VOL=.5, FADE=800, DBL=450, TOUCH_OPEN_MS=5000;
  var a=new Audio(), idx=0, wanted=true, resume=false, errs=0, fadeT=null, armed=false, lastPrev=0, closeT=null;
  var touch=window.matchMedia&&matchMedia('(hover: none)').matches;
  a.preload='none'; a.volume=0;
  try{ wanted=localStorage.getItem(KEY)!=='off'; }catch(e){}
  function save(v){ try{ localStorage.setItem(KEY,v?'on':'off'); }catch(e){} }

  function ico(d){ return '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">'+d+'</svg>'; }
  var I={
    prev:ico('<rect x="5" y="5" width="2.6" height="14" rx="1"/><path d="M19 5.6v12.8a.8.8 0 0 1-1.25.66L9.2 12.66a.8.8 0 0 1 0-1.32l8.55-6.4A.8.8 0 0 1 19 5.6Z"/>'),
    next:ico('<rect x="16.4" y="5" width="2.6" height="14" rx="1"/><path d="M5 5.6v12.8a.8.8 0 0 0 1.25.66l8.55-6.4a.8.8 0 0 0 0-1.32l-8.55-6.4A.8.8 0 0 0 5 5.6Z"/>'),
    play:ico('<path d="M8 5.7v12.6a.8.8 0 0 0 1.22.68l10.1-6.3a.8.8 0 0 0 0-1.36L9.22 5.02A.8.8 0 0 0 8 5.7Z"/>'),
    pause:ico('<rect x="6.5" y="5" width="3.8" height="14" rx="1.2"/><rect x="13.7" y="5" width="3.8" height="14" rx="1.2"/>')
  };

  var w=document.createElement('div');
  w.className='mus-wrap'; w.id='music-player';
  w.innerHTML=
    '<div class="mus-ctl" role="group" aria-label="Music controls">'+
      '<button type="button" class="mus-c mus-prev" aria-label="Restart song. Double-click for previous song.">'+I.prev+'</button>'+
      '<button type="button" class="mus-c mus-pp"></button>'+
      '<button type="button" class="mus-c mus-next" aria-label="Next song">'+I.next+'</button>'+
    '</div>'+
    '<button type="button" id="music-btn" class="mus">'+
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">'+
      '<g class="mus-bars"><rect x="4" y="8" width="3" height="8" rx="1.5"/><rect x="10.5" y="4" width="3" height="16" rx="1.5"/><rect x="17" y="8" width="3" height="8" rx="1.5"/></g>'+
      '<path class="mus-off" d="M4 20 20 4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'+
    '</button>';
  document.body.appendChild(w);
  var b=w.querySelector('#music-btn'), bPrev=w.querySelector('.mus-prev'), bPP=w.querySelector('.mus-pp'), bNext=w.querySelector('.mus-next');

  function ui(){
    var on=!a.paused;
    b.classList.toggle('on',on);
    b.setAttribute('aria-pressed',on?'true':'false');
    b.setAttribute('aria-label',on?'Pause background music':'Play background music');
    bPP.innerHTML=on?I.pause:I.play;
    bPP.setAttribute('aria-label',on?'Pause music':'Play music');
  }
  function fade(to,done){
    clearInterval(fadeT);
    var from=a.volume, t0=Date.now();
    fadeT=setInterval(function(){
      var k=Math.min(1,(Date.now()-t0)/FADE);
      try{ a.volume=from+(to-from)*k; }catch(e){}
      if(k>=1){ clearInterval(fadeT); if(done) done(); }
    },40);
  }
  function load(i){
    idx=(i+TRACKS.length)%TRACKS.length;
    a.src=TRACKS[idx].src;
    if('mediaSession' in navigator && window.MediaMetadata)
      navigator.mediaSession.metadata=new MediaMetadata({title:TRACKS[idx].title,artist:TRACKS[idx].artist||'SSCPC',album:'SSCPC Soundtrack'});
  }
  function play(){
    if(!a.src) load(idx);
    var p=a.play();
    if(p&&p.then) p.then(function(){ errs=0; fade(VOL); ui(); }).catch(function(){ ui(); arm(); });
    else { fade(VOL); ui(); }
  }
  function pause(){ fade(0,function(){ a.pause(); ui(); }); }
  function go(step){            /* jump to another song and play it */
    wanted=true; save(true);
    load(idx+step); a.volume=VOL;
    var p=a.play();
    if(p&&p.then) p.then(function(){ errs=0; ui(); }).catch(ui); else ui();
  }
  function togglePlay(){
    if(a.paused){ wanted=true; save(true); a.volume=0; play(); }
    else { wanted=false; save(false); pause(); }
  }
  /* Previous: one click = back to the start of this song; a second click within DBL ms = previous song */
  function prevClick(){
    var now=Date.now();
    if(now-lastPrev<DBL){ lastPrev=0; go(-1); }
    else { lastPrev=now; if(!a.src) load(idx); try{ a.currentTime=0; }catch(e){} }
  }

  a.addEventListener('ended',function(){ go(1); });
  a.addEventListener('error',function(){ if(++errs<TRACKS.length&&wanted) go(1); else ui(); });
  a.addEventListener('play',ui); a.addEventListener('pause',ui);

  bPP.addEventListener('click',function(){ togglePlay(); keepOpen(); });
  bNext.addEventListener('click',function(){ go(1); keepOpen(); });
  bPrev.addEventListener('click',function(){ prevClick(); keepOpen(); });

  /* round button: mouse = play/pause. Touch screens have no hover, so a tap opens/closes the controls */
  function keepOpen(){
    if(!touch) return;
    clearTimeout(closeT);
    closeT=setTimeout(function(){ w.classList.remove('open'); },TOUCH_OPEN_MS);
  }
  b.addEventListener('click',function(){
    if(!touch){ togglePlay(); return; }
    if(w.classList.contains('open')){ clearTimeout(closeT); w.classList.remove('open'); }
    else { w.classList.add('open'); keepOpen(); if(a.paused) togglePlay(); }
  });
  document.addEventListener('pointerdown',function(e){
    if(touch&&!w.contains(e.target)){ clearTimeout(closeT); w.classList.remove('open'); }
  });

  /* autoplay is blocked until the visitor interacts: start on their first tap/click/key */
  function onGesture(e){
    if(w.contains(e.target)) return;
    disarm();
    if(wanted&&a.paused) play();
  }
  function arm(){ if(armed) return; armed=true;
    ['pointerdown','touchend','keydown'].forEach(function(t){ addEventListener(t,onGesture,true); }); }
  function disarm(){ armed=false;
    ['pointerdown','touchend','keydown'].forEach(function(t){ removeEventListener(t,onGesture,true); }); }

  /* pause while the tab is hidden, resume when the visitor comes back */
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){ resume=!a.paused; if(resume) a.pause(); }
    else if(resume&&wanted){ resume=false; a.play().catch(function(){}); }
  });

  if('mediaSession' in navigator){
    try{
      navigator.mediaSession.setActionHandler('nexttrack',function(){ go(1); });
      /* lock-screen Previous: restart if the song has played a few seconds, otherwise the previous song */
      navigator.mediaSession.setActionHandler('previoustrack',function(){ if(a.currentTime>3) a.currentTime=0; else go(-1); });
    }catch(e){}
  }

  load(0); ui();
  if(wanted){ var p=a.play(); if(p&&p.then) p.then(function(){ fade(VOL); ui(); }).catch(arm); }
})();
