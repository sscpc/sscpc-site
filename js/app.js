/* offline support (the site is dark-only) */
(function(){
  if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))
    addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{})});
})();
