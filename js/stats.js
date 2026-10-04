/* About page stats: numbers count up and the three stats rise in one after
   another every time the About tab is opened (the pages are switched by
   router.js, so we watch for the 'active' class). The final values are
   already in the HTML, so search engines, screen readers and anyone with
   reduced-motion switched on just see the finished numbers. */
(function(){
  var about=document.getElementById('about');
  if(!about) return;
  var stats=about.querySelectorAll('.ab-stat');
  var nums=about.querySelectorAll('.ab-stat b[data-count]');
  if(!stats.length) return;
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DURATION=1600, STAGGER=150, raf=null;

  /* the infinity sign can't count, so it gets its own fade/scale-in */
  stats.forEach(function(s,i){
    s.style.setProperty('--sd',(i*STAGGER/1000)+'s');
    if(!s.querySelector('b[data-count]')) s.classList.add('st-inf');
  });

  function ease(t){ return 1-Math.pow(1-t,4); }   /* ease-out: quick start, soft landing */

  function play(){
    if(reduce) return;
    if(raf) cancelAnimationFrame(raf);
    stats.forEach(function(s){ s.classList.remove('st-play'); });
    void about.offsetWidth;                         /* restart the CSS animation */
    stats.forEach(function(s){ s.classList.add('st-play'); });

    var start=null;
    nums.forEach(function(n){ n.textContent='0'+(n.dataset.suffix||''); });
    function tick(ts){
      if(start===null) start=ts;
      var t=Math.min(1,(ts-start)/DURATION), k=ease(t);
      nums.forEach(function(n){
        n.textContent=Math.round(k*(+n.dataset.count))+(n.dataset.suffix||'');
      });
      raf=t<1?requestAnimationFrame(tick):null;
    }
    raf=requestAnimationFrame(tick);
  }

  function stop(){
    if(raf){ cancelAnimationFrame(raf); raf=null; }
    nums.forEach(function(n){ n.textContent=n.dataset.count+(n.dataset.suffix||''); });
  }

  var wasActive=about.classList.contains('active');
  new MutationObserver(function(){
    var on=about.classList.contains('active');
    if(on&&!wasActive) play();
    if(!on&&wasActive) stop();
    wasActive=on;
  }).observe(about,{attributes:true,attributeFilter:['class']});

  if(wasActive) play();
})();
