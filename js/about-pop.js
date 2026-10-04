/* About page photos: on touch devices (no hover) a tap pops a photo up,
   tapping it again or tapping anywhere else puts it back. On desktop the
   same effect is done by CSS :hover, so this does nothing there. */
(function(){
  if(!window.matchMedia('(hover: none)').matches) return;
  var sel='.ab-c1,.ab-c2,.ab-c3,.ab-f1,.ab-f2';
  var imgs=document.querySelectorAll(sel);
  function closeAll(except){
    imgs.forEach(function(i){ if(i!==except) i.classList.remove('is-popped'); });
  }
  imgs.forEach(function(img){
    img.addEventListener('click',function(e){
      e.stopPropagation();
      var on=!img.classList.contains('is-popped');
      closeAll(img);
      img.classList.toggle('is-popped',on);
    });
  });
  document.addEventListener('click',function(){ closeAll(null); });
})();
