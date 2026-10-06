/* Scroll-reveal: items fade, rise and un-blur into place every time they enter the screen (scrolling down, back up and down again).
   It replays EVERY time a visitor enters a tab (Home, About, Gallery, Spectrum, Committee, Contact, Register...),
   not just the first time. The footer is deliberately never animated.
   Fails safe: with no IntersectionObserver or with "reduce motion" switched on, nothing is hidden or animated. */
(function(){
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  var SEL=['.sec .wrap > *','.helpdesk .wrap > *','.ab-hero-copy > *','.ab-stats > *','.albums-grid > *','.thumbs > *',
    '#members-list > *','.cards > *','.contact-layout > *','.helpdesk .hd-card','.spec-card','.ann'].join(',');
  var root=document.documentElement;
  var known=new WeakSet(),skip=new WeakSet();
  root.classList.add('rv-on');

  /* IN: an item enters the screen -> play its animation (again, every time) */
  var io=new IntersectionObserver(function(es){
    es.filter(function(e){return e.isIntersecting&&e.target.classList.contains('rv')&&!e.target.classList.contains('rv-in')})
      .sort(function(a,b){var A=a.boundingClientRect,B=b.boundingClientRect;return A.top-B.top||A.left-B.left})
      .forEach(function(e,i){
        var el=e.target;
        el.style.setProperty('--rv-d',Math.min(i,8)*110+'ms');   /* items arriving together appear one after another */
        el.classList.add('rv-in');
      });
  },{threshold:0,rootMargin:'0px 0px -14% 0px'});

  /* OUT: an item has completely left the screen -> hide it again, ready to animate when scrolled back */
  var out=new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting||skip.has(e.target))return;
      var el=e.target;
      el.classList.remove('rv-in');
      el.style.removeProperty('--rv-d');
      el.classList.add('rv');
    });
  },{threshold:0});

  /* when an item has finished appearing, hand it back to its normal styles (hover effects etc.) */
  document.addEventListener('animationend',function(e){
    var el=e.target;
    if(!el.classList||!el.classList.contains('rv-in')||String(e.animationName).indexOf('rvIn')!==0)return;
    el.classList.remove('rv','rv-in');el.style.removeProperty('--rv-d');
  });

  /* hide an element and wait for it to scroll into view */
  function arm(el){
    if(skip.has(el))return;
    io.unobserve(el);out.unobserve(el);
    el.classList.remove('rv-in');
    el.style.removeProperty('--rv-d');
    el.classList.add('rv');
    io.observe(el);out.observe(el);
  }
  /* pick up new elements (albums, photo tiles and members are added by scripts) */
  function tag(scope){
    (scope||document).querySelectorAll(SEL).forEach(function(el){
      if(known.has(el))return;known.add(el);
      if(getComputedStyle(el).animationName!=='none'){skip.add(el);return}   /* leave items that already have their own animation */
      arm(el);
    });
  }
  /* replay: re-hide everything inside a tab so it animates in again */
  function replay(view){
    tag(view);
    view.querySelectorAll(SEL).forEach(arm);
  }
  function replayActive(){
    document.querySelectorAll('.view.active').forEach(replay);
  }

  tag();

  /* a tab has just become the active one */
  new MutationObserver(function(ms){
    ms.forEach(function(m){
      var t=m.target;
      if(m.type==='attributes'&&t.classList&&t.classList.contains('view')&&t.classList.contains('active')){
        var was=(m.oldValue||'').split(/\s+/).indexOf('active')>-1;
        if(!was)replay(t);
      }
    });
  }).observe(document.body,{attributes:true,attributeFilter:['class'],attributeOldValue:true,subtree:true});

  /* clicking the tab you are already on, or any hash change, also replays it */
  window.addEventListener('hashchange',function(){requestAnimationFrame(replayActive)});
  document.addEventListener('click',function(e){
    var a=e.target.closest&&e.target.closest('.menu a, .brand, .foot-nav a');
    if(a)requestAnimationFrame(function(){requestAnimationFrame(replayActive)});
  });

  /* new elements added while the page is running */
  var queued=false;
  new MutationObserver(function(ms){
    if(queued||!ms.some(function(m){return Array.prototype.some.call(m.addedNodes,function(n){return n.nodeType===1})}))return;
    queued=true;requestAnimationFrame(function(){queued=false;tag()});
  }).observe(document.body,{childList:true,subtree:true});
})();
