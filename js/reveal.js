/* Smooth scroll-reveal: items fade and rise into place as they enter the screen (same feel as the home intro).
   Fails safe: with no IntersectionObserver or with "reduce motion" switched on, nothing is hidden or animated. */
(function(){
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  var SEL=['.sec .wrap > *','.helpdesk .wrap > *','.ab-hero-copy > *','.ab-stats > *','.albums-grid > *','.thumbs > *',
    '#members-list > *','.cards > *','.contact-layout > *','.foot-grid > *','.helpdesk .hd-card','.spec-card','.ann'].join(',');
  var seen=new WeakSet(),root=document.documentElement;
  root.classList.add('rv-on');
  var io=new IntersectionObserver(function(es){
    es.filter(function(e){return e.isIntersecting})
      .sort(function(a,b){var A=a.boundingClientRect,B=b.boundingClientRect;return A.top-B.top||A.left-B.left})
      .forEach(function(e,i){
        var el=e.target;io.unobserve(el);
        el.style.setProperty('--rv-d',Math.min(i,8)*70+'ms');   /* items arriving together appear one after another */
        el.classList.add('rv-in');
      });
  },{threshold:0,rootMargin:'0px 0px -6% 0px'});
  /* when an item has finished appearing, hand it back to its normal styles (hover effects etc.) */
  document.addEventListener('animationend',function(e){
    var el=e.target;
    if(!el.classList||!el.classList.contains('rv-in')||String(e.animationName).indexOf('rvIn')!==0)return;
    el.classList.remove('rv','rv-in');el.style.removeProperty('--rv-d');
  });
  function tag(){
    document.querySelectorAll(SEL).forEach(function(el){
      if(seen.has(el))return;seen.add(el);
      if(getComputedStyle(el).animationName!=='none')return;   /* leave items that already have their own animation */
      el.classList.add('rv');io.observe(el);
    });
  }
  tag();
  var queued=false;
  new MutationObserver(function(ms){
    if(queued||!ms.some(function(m){return Array.prototype.some.call(m.addedNodes,function(n){return n.nodeType===1})}))return;
    queued=true;requestAnimationFrame(function(){queued=false;tag()});   /* albums, photo tiles and members are added by scripts */
  }).observe(document.body,{childList:true,subtree:true});
})();
