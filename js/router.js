(function(){
  const ids=['home','about','gallery','spectrum','members','contact','register','join','what-is-spectrum'];
  function go(){
    let id=location.hash.slice(1);if(!ids.includes(id))id='home';
    ids.forEach(v=>document.getElementById(v).classList.toggle('active',v===id));
    document.querySelectorAll('.menu a').forEach(a=>{
      const on=a.getAttribute('href')==='#'+(id==='what-is-spectrum'?'spectrum':id);a.classList.toggle('on',on);
      if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    /* the pinned scroll intro (#intro) only plays on the Home tab -- every
       other tab hides it outright so clicking straight to About, Gallery,
       etc. lands right on that section with nothing to scroll through */
    document.documentElement.classList.toggle('on-home',id==='home');
    scrollTo({top:0,behavior:'instant'});
  }
  addEventListener('hashchange',go);go();
})();
